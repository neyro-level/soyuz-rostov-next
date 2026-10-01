import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, realpathSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

const digestPattern = /^[0-9a-f]{64}$/;
const ownerKinds = ["platform", "client", "generated", "composite"];

function normalizePath(value, label) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`${label} must be a non-empty path.`);
	}
	const normalized = value.trim().replaceAll("\\", "/");
	if (
		normalized.startsWith("/") ||
		/^[a-z]:\//i.test(normalized) ||
		normalized.endsWith("/") ||
		normalized.split("/").some((part) => !part || part === "." || part === "..")
	) {
		throw new Error(`${label} must be a normalized repository-relative path.`);
	}
	return normalized;
}

function containsPath(parent, child) {
	return child === parent || child.startsWith(`${parent}/`);
}

function readRules(value, label, { composite = false, allowEmpty = false } = {}) {
	if (!Array.isArray(value) || (!allowEmpty && !value.length)) {
		throw new Error(`${label} must ${allowEmpty ? "be an array" : "contain at least one rule"}.`);
	}
	return value.map((rule, index) => {
		if (!rule || typeof rule !== "object" || Array.isArray(rule)) {
			throw new Error(`${label}[${index}] must be an object.`);
		}
		if (!['file', 'tree'].includes(rule.type)) {
			throw new Error(`${label}[${index}].type must be file or tree.`);
		}
		const path = normalizePath(rule.path, `${label}[${index}].path`);
		const except = rule.except === undefined
			? []
			: rule.except.map((entry, exceptIndex) => {
				const excluded = normalizePath(entry, `${label}[${index}].except[${exceptIndex}]`);
				if (rule.type !== "tree" || !containsPath(path, excluded) || excluded === path) {
					throw new Error(`${label}[${index}].except must name a child of its tree.`);
				}
				return excluded;
			});
		if (new Set(except).size !== except.length) {
			throw new Error(`${label}[${index}] contains duplicate exceptions.`);
		}
		if (composite) {
			if (rule.type !== "file" || rule.strategy !== "structured") {
				throw new Error(`${label}[${index}] must be a structured file rule.`);
			}
		} else if (rule.strategy !== undefined) {
			throw new Error(`${label}[${index}].strategy is only valid for composite files.`);
		}
		return { path, type: rule.type, except, ...(composite ? { strategy: rule.strategy } : {}) };
	});
}

function assertContainedPath(root, relativePath) {
	const absoluteRoot = resolve(root);
	const absolute = resolve(absoluteRoot, relativePath);
	const fromRoot = relative(absoluteRoot, absolute);
	if (!fromRoot || fromRoot.startsWith("..") || isAbsolute(fromRoot)) {
		throw new Error(`Starter-owned path escapes repository: ${relativePath}.`);
	}
	let cursor = absoluteRoot;
	for (const part of relativePath.split("/")) {
		cursor = resolve(cursor, part);
		if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink()) {
			throw new Error(`Starter-owned path must not traverse a symlink: ${relativePath}.`);
		}
	}
	if (existsSync(absolute)) {
		const real = realpathSync.native(absolute);
		if (real !== absoluteRoot && !real.startsWith(`${absoluteRoot}${sep}`)) {
			throw new Error(`Starter-owned path resolves outside repository: ${relativePath}.`);
		}
	}
	return absolute;
}

export function readStarterOwnedManifest(root = process.cwd(), manifestPath = "starter-owned.json") {
	const normalizedManifestPath = normalizePath(manifestPath, "manifestPath");
	const absolute = assertContainedPath(root, normalizedManifestPath);
	if (!existsSync(absolute)) throw new Error(`Starter ownership manifest is missing: ${normalizedManifestPath}.`);
	const manifest = JSON.parse(readFileSync(absolute, "utf8"));
	if (manifest.schemaVersion !== 2) throw new Error("starter-owned schemaVersion must equal 2.");
	const cloneRuntimeScope = readRules(manifest.cloneRuntimeScope, "cloneRuntimeScope");
	if (!manifest.ownership || typeof manifest.ownership !== "object" || Array.isArray(manifest.ownership)) {
		throw new Error("starter-owned ownership must be an object.");
	}
	const keys = Object.keys(manifest.ownership).sort();
	if (JSON.stringify(keys) !== JSON.stringify([...ownerKinds].sort())) {
		throw new Error("starter-owned ownership must declare platform, client, generated and composite rules.");
	}
	const ownership = Object.fromEntries(ownerKinds.map((owner) => [
		owner,
		readRules(manifest.ownership[owner], `ownership.${owner}`, { composite: owner === "composite", allowEmpty: owner !== "platform" && owner !== "composite" }),
	]));
	const allRules = ownerKinds.flatMap((owner) => ownership[owner].map((rule) => ({ ...rule, owner })));
	const allRulePaths = allRules.map((rule) => rule.path);
	if (new Set(allRulePaths).size !== allRulePaths.length) {
		throw new Error("starter-owned contains duplicate ownership paths.");
	}
	for (const rule of [...cloneRuntimeScope, ...allRules]) {
		const path = assertContainedPath(root, rule.path);
		if (!existsSync(path)) throw new Error(`Starter-owned rule points to an unknown path: ${rule.path}.`);
		const stats = lstatSync(path);
		if ((rule.type === "file" && !stats.isFile()) || (rule.type === "tree" && !stats.isDirectory())) {
			throw new Error(`Starter-owned rule type does not match path: ${rule.path}.`);
		}
	}
	const scopePaths = cloneRuntimeScope.map((rule) => rule.path);
	if (new Set(scopePaths).size !== scopePaths.length) throw new Error("starter-owned contains duplicate runtime scope paths.");
	const parsed = { schemaVersion: 2, cloneRuntimeScope, ownership, manifestPath: normalizedManifestPath };
	validateCloneRuntimeOwnership(root, parsed);
	return parsed;
}

function walkFiles(root, relativePath) {
	const absolute = assertContainedPath(root, relativePath);
	const stats = lstatSync(absolute);
	if (stats.isFile()) return [relativePath];
	if (!stats.isDirectory()) throw new Error(`Starter-owned path is not a file or directory: ${relativePath}.`);
	return readdirSync(absolute, { withFileTypes: true })
		.filter((entry) => !["node_modules", ".next"].includes(entry.name))
		.sort((left, right) => left.name.localeCompare(right.name, "en"))
		.flatMap((entry) => {
			const child = `${relativePath}/${entry.name}`;
			if (entry.isSymbolicLink()) throw new Error(`Starter-owned path must not contain a symlink: ${child}.`);
			return entry.isDirectory() ? walkFiles(root, child) : [child];
		});
}

function candidateFiles(root, rule) {
	if (!existsSync(resolve(root, ".git"))) return walkFiles(root, rule.path);
	const result = execFileSync(
		"git",
		["ls-files", "--cached", "--others", "--exclude-standard", "-z", "--", rule.path],
		{ cwd: root, encoding: "utf8" },
	)
		.split("\0")
		.filter(Boolean)
		.map((path) => path.replaceAll("\\", "/"));
	return rule.type === "file" ? result.filter((path) => path === rule.path) : result.filter((path) => containsPath(rule.path, path));
}

function ruleFiles(root, rule) {
	return candidateFiles(root, rule).filter((path) => !rule.except.some((excluded) => containsPath(excluded, path)));
}

function validateCloneRuntimeOwnership(root, manifest) {
	const runtimeFiles = new Set(manifest.cloneRuntimeScope.flatMap((rule) => candidateFiles(root, rule)));
	const ownersByFile = new Map([...runtimeFiles].map((path) => [path, []]));
	for (const owner of ownerKinds) {
		for (const rule of manifest.ownership[owner]) {
			for (const path of ruleFiles(root, rule)) {
				if (ownersByFile.has(path)) ownersByFile.get(path).push(owner);
			}
		}
	}
	for (const [path, owners] of ownersByFile) {
		if (!owners.length) throw new Error(`Unclassified tracked runtime source: ${path}.`);
		if (owners.length > 1) throw new Error(`Runtime ownership overlap: ${path} (${owners.join(", ")}).`);
	}
	return ownersByFile;
}

export function starterOwnedFiles(root = process.cwd(), manifest = readStarterOwnedManifest(root)) {
	const files = new Set();
	for (const rule of manifest.ownership.platform) {
		const matches = ruleFiles(root, rule);
		if (!matches.length) throw new Error(`Starter-owned rule has no tracked files: ${rule.path}.`);
		for (const path of matches) {
			assertContainedPath(root, path);
			files.add(path);
		}
	}
	return [...files].sort();
}

export function hashStarterOwnedFiles(root = process.cwd(), manifest = readStarterOwnedManifest(root)) {
	return Object.fromEntries(starterOwnedFiles(root, manifest).map((path) => [
		path,
		createHash("sha256").update(readFileSync(resolve(root, path))).digest("hex"),
	]));
}

export function validateStarterVersion(value, { expectedTag, expectedSha } = {}) {
	if (!value || typeof value !== "object" || Array.isArray(value) || value.schemaVersion !== 1) {
		throw new Error(".starter-version schemaVersion must equal 1.");
	}
	if (typeof value.tag !== "string" || !value.tag) throw new Error(".starter-version tag is missing.");
	if (!/^[0-9a-f]{40}$/.test(value.sha)) throw new Error(".starter-version SHA is invalid.");
	if (!Number.isInteger(value.manifestVersion) || value.manifestVersion < 1) {
		throw new Error(".starter-version manifestVersion is invalid.");
	}
	if (!value.hashes || typeof value.hashes !== "object" || Array.isArray(value.hashes) || !Object.keys(value.hashes).length) {
		throw new Error(".starter-version hashes are missing.");
	}
	for (const [path, hash] of Object.entries(value.hashes)) {
		normalizePath(path, `.starter-version hashes.${path}`);
		if (!digestPattern.test(hash)) throw new Error(`.starter-version hash is invalid: ${path}.`);
	}
	if (expectedTag && value.tag !== expectedTag) throw new Error(".starter-version tag mismatch.");
	if (expectedSha && value.sha !== expectedSha) throw new Error(".starter-version SHA mismatch.");
	const serialized = JSON.stringify(value);
	if (/([a-z]:\\|\/Users\/|\\Users\\)/i.test(serialized)) throw new Error(".starter-version contains a machine path.");
	return value;
}
