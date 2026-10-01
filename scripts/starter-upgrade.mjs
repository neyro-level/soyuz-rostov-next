import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	lstatSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateStarterVersion } from "./starter-ownership.mjs";
import { validateStarterReleaseManifest } from "./starter-release.mjs";

const limits = {
	archiveBytes: 64 * 1024 * 1024,
	files: 5000,
	fileBytes: 16 * 1024 * 1024,
	expandedBytes: 256 * 1024 * 1024,
};
const digest = (value) => createHash("sha256").update(value).digest("hex");

function safeRelativePath(value, label = "archive path") {
	if (typeof value !== "string" || !value || value.includes("\\"))
		throw new Error(`${label} is not normalized.`);
	if (
		value.startsWith("/") ||
		/^[a-z]:\//i.test(value) ||
		value.split("/").some((part) => !part || part === "." || part === "..")
	) {
		throw new Error(`${label} must stay inside the repository.`);
	}
	return value;
}

function safeTarget(root, path, { allowMissingLeaf = true } = {}) {
	const absoluteRoot = resolve(root);
	const normalized = safeRelativePath(path);
	const target = resolve(absoluteRoot, normalized);
	const fromRoot = relative(absoluteRoot, target);
	if (!fromRoot || fromRoot.startsWith("..") || isAbsolute(fromRoot))
		throw new Error(`Target path escapes repository: ${path}.`);
	let cursor = absoluteRoot;
	for (const [index, part] of normalized.split("/").entries()) {
		cursor = resolve(cursor, part);
		if (existsSync(cursor) && lstatSync(cursor).isSymbolicLink())
			throw new Error(`Target path traverses a symlink: ${path}.`);
		if (
			!existsSync(cursor) &&
			index < normalized.split("/").length - 1 &&
			!allowMissingLeaf
		)
			break;
	}
	return target;
}

function readJsonBounded(path, maxBytes = limits.archiveBytes) {
	const absolute = resolve(path);
	const stats = lstatSync(absolute);
	if (!stats.isFile() || stats.isSymbolicLink())
		throw new Error("Upgrade archive must be a regular file.");
	if (stats.size > maxBytes)
		throw new Error("Upgrade archive exceeds the compressed-size limit.");
	return JSON.parse(readFileSync(absolute, "utf8"));
}

export function validateUpgradeArchive(value) {
	if (
		!value ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		value.schemaVersion !== 1
	)
		throw new Error("Upgrade archive schemaVersion must equal 1.");
	if (
		!value.from ||
		typeof value.from !== "object" ||
		Array.isArray(value.from)
	) {
		throw new Error(
			"Upgrade archive must declare its exact source starter version.",
		);
	}
	const from = validateStarterVersion({
		schemaVersion: 1,
		tag: value.from.tag,
		sha: value.from.sha,
		manifestVersion: 1,
		hashes: { "archive/source": "0".repeat(64) },
	});
	if (
		!Array.isArray(value.entries) ||
		!value.entries.length ||
		value.entries.length > limits.files
	)
		throw new Error(
			"Upgrade archive file count is invalid or exceeds the limit.",
		);
	const seen = new Set();
	let expandedBytes = 0;
	const contents = new Map();
	for (const entry of value.entries) {
		if (entry?.type !== "file")
			throw new Error(
				"Upgrade archive accepts regular files only; links are forbidden.",
			);
		const path = safeRelativePath(entry.path);
		if (seen.has(path))
			throw new Error(`Upgrade archive contains duplicate path: ${path}.`);
		seen.add(path);
		if (
			!Number.isInteger(entry.size) ||
			entry.size < 0 ||
			entry.size > limits.fileBytes
		)
			throw new Error(
				`Upgrade archive entry size is invalid or excessive: ${path}.`,
			);
		if (typeof entry.contentBase64 !== "string")
			throw new Error(`Upgrade archive content is missing: ${path}.`);
		const content = Buffer.from(entry.contentBase64, "base64");
		if (content.length !== entry.size)
			throw new Error(`Upgrade archive entry size mismatch: ${path}.`);
		if (
			!/^[0-9a-f]{64}$/.test(entry.sha256) ||
			digest(content) !== entry.sha256
		)
			throw new Error(`Upgrade archive hash mismatch: ${path}.`);
		expandedBytes += content.length;
		if (expandedBytes > limits.expandedBytes)
			throw new Error("Upgrade archive exceeds the expanded-size limit.");
		contents.set(path, content);
	}
	const sourceHashes = Object.fromEntries(
		[...contents].map(([path, content]) => [path, digest(content)]),
	);
	const deletePaths = value.deletes ?? [];
	if (
		!Array.isArray(deletePaths) ||
		new Set(deletePaths).size !== deletePaths.length
	) {
		throw new Error(
			"Upgrade archive deletes must be an array of unique paths.",
		);
	}
	const deleted = new Set(
		deletePaths.map((path) => safeRelativePath(path, "delete path")),
	);
	for (const path of deleted) {
		if (contents.has(path))
			throw new Error(
				`Upgrade archive cannot write and delete the same path: ${path}.`,
			);
		if (path.startsWith("migrations/"))
			throw new Error(`Upgrade cannot remove an existing migration: ${path}.`);
	}
	const compositePaths = validateComposites(value.composites, contents);
	const packageMerge = validatePackageMerge(
		value.packageMerge,
		contents,
		compositePaths,
	);
	const adopt = value.adopt ?? {};
	if (!adopt || typeof adopt !== "object" || Array.isArray(adopt)) {
		throw new Error("Upgrade archive adopt contract must be an object.");
	}
	const adopted = new Map();
	for (const [rawPath, expectedHash] of Object.entries(adopt)) {
		const path = safeRelativePath(rawPath, "adopt path");
		if (!contents.has(path) || compositePaths.includes(path)) {
			throw new Error(
				`Adopted path must be a non-composite archived file: ${path}.`,
			);
		}
		if (!/^[0-9a-f]{64}$/.test(expectedHash))
			throw new Error(`Adopted path hash is invalid: ${path}.`);
		adopted.set(path, expectedHash);
	}
	const regeneration = value.regeneration;
	if (
		!regeneration ||
		typeof regeneration !== "object" ||
		Array.isArray(regeneration) ||
		regeneration.schemaVersion !== 1 ||
		!Array.isArray(regeneration.steps)
	) {
		throw new Error(
			"Upgrade archive requires a schemaVersion 1 regeneration contract.",
		);
	}
	const regenerated = new Map();
	for (const [index, step] of regeneration.steps.entries()) {
		if (!step || typeof step !== "object" || Array.isArray(step)) {
			throw new Error(`Regeneration step ${index} must be an object.`);
		}
		const script = safeRelativePath(
			step.script,
			`regeneration.steps[${index}].script`,
		);
		if (!script.startsWith("scripts/") || !contents.has(script)) {
			throw new Error(
				`Regeneration script must be an archived scripts/ file: ${script}.`,
			);
		}
		if (
			!step.outputs ||
			typeof step.outputs !== "object" ||
			Array.isArray(step.outputs) ||
			!Object.keys(step.outputs).length
		) {
			throw new Error(`Regeneration step ${index} must declare output hashes.`);
		}
		if (
			step.verifyBeforeRegeneration !== undefined &&
			typeof step.verifyBeforeRegeneration !== "boolean"
		) {
			throw new Error(
				`Regeneration step ${index} verifyBeforeRegeneration must be a boolean.`,
			);
		}
		if (
			step.allowTemplateContent !== undefined &&
			typeof step.allowTemplateContent !== "boolean"
		) {
			throw new Error(
				`Regeneration step ${index} allowTemplateContent must be a boolean.`,
			);
		}
		const previousOutputs = step.previousOutputs;
		if (
			previousOutputs !== undefined &&
			(!previousOutputs ||
				typeof previousOutputs !== "object" ||
				Array.isArray(previousOutputs))
		) {
			throw new Error(
				`Regeneration step ${index} previousOutputs must be an object.`,
			);
		}
		const removeOutputs = step.removeOutputs ?? [];
		if (
			!Array.isArray(removeOutputs) ||
			new Set(removeOutputs).size !== removeOutputs.length
		) {
			throw new Error(
				`Regeneration step ${index} removeOutputs must be an array of unique paths.`,
			);
		}
		for (const [outputPath, outputHash] of Object.entries(step.outputs)) {
			const path = safeRelativePath(
				outputPath,
				`regeneration.steps[${index}].outputs`,
			);
			if (!/^[0-9a-f]{64}$/.test(outputHash)) {
				throw new Error(`Regeneration output hash is invalid: ${path}.`);
			}
			if (contents.has(path) && step.allowTemplateContent !== true) {
				throw new Error(
					`Generated output must not be archived as a platform file: ${path}.`,
				);
			}
			if (regenerated.has(path)) {
				throw new Error(
					`Regeneration output is declared more than once: ${path}.`,
				);
			}
			if (
				path === "src/project/brand.css" &&
				step.verifyBeforeRegeneration !== true
			) {
				throw new Error(
					"Generated brand output must verify its existing deterministic result before regeneration.",
				);
			}
			regenerated.set(path, outputHash);
		}
		for (const [outputPath, outputHash] of Object.entries(
			previousOutputs ?? {},
		)) {
			const path = safeRelativePath(
				outputPath,
				`regeneration.steps[${index}].previousOutputs`,
			);
			if (!Object.hasOwn(step.outputs, path))
				throw new Error(
					`Previous regeneration output is absent from next outputs: ${path}.`,
				);
			if (!/^[0-9a-f]{64}$/.test(outputHash))
				throw new Error(
					`Previous regeneration output hash is invalid: ${path}.`,
				);
		}
		for (const outputPath of removeOutputs) {
			const path = safeRelativePath(
				outputPath,
				`regeneration.steps[${index}].removeOutputs`,
			);
			if (Object.hasOwn(step.outputs, path)) {
				throw new Error(
					`Removed regeneration output is also declared as next output: ${path}.`,
				);
			}
		}
	}
	const migrationPaths = [...contents.keys()].filter((path) =>
		path.startsWith("migrations/"),
	);
	const migrationOwners = value.migrationOwners;
	if (!migrationPaths.length && migrationOwners !== undefined) {
		throw new Error(
			"Upgrade archive declares migration owners without migrations.",
		);
	}
	if (migrationPaths.length) {
		if (
			!migrationOwners ||
			typeof migrationOwners !== "object" ||
			Array.isArray(migrationOwners)
		) {
			throw new Error(
				"Upgrade archive migrations require an explicit migrationOwners contract.",
			);
		}
		for (const migrationPath of migrationPaths) {
			const owners = migrationOwners[migrationPath];
			if (!Array.isArray(owners) || !owners.length) {
				throw new Error(
					`Migration owner contract is missing: ${migrationPath}.`,
				);
			}
			for (const ownerPath of owners) {
				const normalizedOwner = safeRelativePath(
					ownerPath,
					"migration owner path",
				);
				if (!normalizedOwner.startsWith("src/project/collections/")) {
					throw new Error(
						`Migration owner must be a collection schema file: ${normalizedOwner}.`,
					);
				}
				if (!contents.has(normalizedOwner)) {
					throw new Error(
						`Migration owner is absent from upgrade archive: ${normalizedOwner}.`,
					);
				}
			}
		}
		for (const migrationPath of Object.keys(migrationOwners)) {
			if (!migrationPaths.includes(migrationPath)) {
				throw new Error(
					`Migration owner contract references an absent migration: ${migrationPath}.`,
				);
			}
		}
	}
	const release = validateStarterReleaseManifest(value.release, {
		expectedTag: value.tag,
		expectedSha: value.sha,
		expectedHashes: sourceHashes,
	});
	const hashes = Object.fromEntries(
		Object.entries(sourceHashes).filter(
			([path]) => !compositePaths.includes(path),
		),
	);
	return {
		from: { tag: from.tag, sha: from.sha },
		tag: release.tag,
		sha: release.sha,
		manifestVersion: release.starterOwnedManifestVersion,
		hashes,
		deleted,
		contents,
		compositePaths,
		packageMerge,
		adopted,
		regeneration: regeneration.steps.map((step) => ({
			script: step.script,
			allowTemplateContent: step.allowTemplateContent === true,
			removeOutputs: (step.removeOutputs ?? []).map((path) =>
				safeRelativePath(path, "regeneration remove output"),
			),
			outputs: step.outputs,
			previousOutputs: step.previousOutputs,
			verifyBeforeRegeneration: step.verifyBeforeRegeneration === true,
		})),
		regenerated,
	};
}

function readPackageNameList(value, label) {
	if (
		!Array.isArray(value) ||
		new Set(value).size !== value.length ||
		value.some((item) => typeof item !== "string" || !item)
	) {
		throw new Error(`${label} must be an array of unique package names.`);
	}
	return value;
}

function validateComposites(value, contents) {
	if (!Array.isArray(value) || value.length !== 1) {
		throw new Error(
			"Upgrade archive must declare exactly one composite-file contract.",
		);
	}
	const [composite] = value;
	if (!composite || typeof composite !== "object" || Array.isArray(composite)) {
		throw new Error("Composite-file contract must be an object.");
	}
	const path = safeRelativePath(composite.path, "composite path");
	if (
		path !== "package.json" ||
		composite.strategy !== "structured" ||
		composite.handler !== "package-json"
	) {
		throw new Error(
			"Only package.json may use the structured composite-file handler.",
		);
	}
	if (!contents.has(path))
		throw new Error(
			"Composite-file source is absent from the upgrade archive.",
		);
	return [path];
}

function validatePackageMerge(value, contents, compositePaths) {
	if (
		!value ||
		typeof value !== "object" ||
		Array.isArray(value) ||
		value.schemaVersion !== 1
	) {
		throw new Error(
			"Upgrade archive requires a schemaVersion 1 packageMerge contract.",
		);
	}
	if (!compositePaths.includes("package.json") || !contents.has("package.json"))
		throw new Error(
			"Package merge requires package.json in the upgrade archive.",
		);
	const preserve = value.preserve;
	if (!preserve || typeof preserve !== "object" || Array.isArray(preserve)) {
		throw new Error("Package merge must declare approved client extensions.");
	}
	const sections = ["dependencies", "devDependencies", "scripts"];
	if (Object.keys(preserve).some((key) => !sections.includes(key))) {
		throw new Error(
			"Package merge preserve contract contains an unsupported section.",
		);
	}
	const contract = Object.fromEntries(
		sections.map((section) => [
			section,
			readPackageNameList(
				preserve[section] ?? [],
				`packageMerge.preserve.${section}`,
			),
		]),
	);
	contract.omitScripts = readPackageNameList(
		value.omitScripts ?? [],
		"packageMerge.omitScripts",
	);
	try {
		const source = JSON.parse(contents.get("package.json").toString("utf8"));
		if (!source || typeof source !== "object" || Array.isArray(source))
			throw new Error("not an object");
	} catch {
		throw new Error("Upgrade archive package.json must contain a JSON object.");
	}
	return contract;
}

function mergePackageJson(currentSource, upstreamSource, contract) {
	let current;
	let upstream;
	try {
		current = JSON.parse(currentSource);
		upstream = JSON.parse(upstreamSource);
	} catch {
		throw new Error(
			"Package merge requires valid current and upstream package.json objects.",
		);
	}
	if (
		!current ||
		typeof current !== "object" ||
		Array.isArray(current) ||
		!upstream ||
		typeof upstream !== "object" ||
		Array.isArray(upstream)
	) {
		throw new Error(
			"Package merge requires valid current and upstream package.json objects.",
		);
	}
	if (typeof current.name !== "string" || !current.name)
		throw new Error("Package merge requires a client package name.");
	const merged = structuredClone(upstream);
	merged.name = current.name;
	for (const section of ["dependencies", "devDependencies", "scripts"]) {
		if (
			merged[section] !== undefined &&
			(!merged[section] ||
				typeof merged[section] !== "object" ||
				Array.isArray(merged[section]))
		) {
			throw new Error(
				`Upstream package ${section} must be an object when declared.`,
			);
		}
		for (const key of contract[section]) {
			if (current[section]?.[key] !== undefined) {
				if (
					typeof current[section][key] !== "string" ||
					!current[section][key]
				) {
					throw new Error(
						`Approved client package extension is invalid: ${section}.${key}.`,
					);
				}
				merged[section] ??= {};
				merged[section][key] = current[section][key];
			}
		}
	}
	for (const script of contract.omitScripts) {
		delete merged.scripts?.[script];
	}
	return `${JSON.stringify(merged, null, "\t")}\n`;
}

function writeJson(path, value) {
	mkdirSync(dirname(path), { recursive: true });
	writeFileSync(path, `${JSON.stringify(value, null, "\t")}\n`);
}

function readVersion(root) {
	const path = join(root, ".starter-version");
	if (!existsSync(path)) throw new Error("Client .starter-version is missing.");
	return validateStarterVersion(JSON.parse(readFileSync(path, "utf8")));
}

function assertNoDirtyClientOwnedPaths(root, starterPaths) {
	let status = "";
	try {
		status = execFileSync(
			"git",
			["status", "--porcelain", "--untracked-files=all"],
			{
				cwd: root,
				encoding: "utf8",
				stdio: ["ignore", "pipe", "ignore"],
			},
		);
	} catch {
		return;
	}
	for (const line of status.split(/\r?\n/).filter(Boolean)) {
		const rawPath = line
			.slice(3)
			.split(" -> ")
			.at(-1)
			.replaceAll("\\", "/")
			.replace(/^"|"$/g, "");
		if (
			rawPath === ".starter-version" ||
			rawPath.startsWith(".starter-upgrade/") ||
			starterPaths.has(rawPath)
		)
			continue;
		throw new Error(
			`Dirty client-owned path blocks starter upgrade: ${rawPath}.`,
		);
	}
}

function backupFile(root, backupRoot, path) {
	const source = safeTarget(root, path);
	if (!existsSync(source)) return { existed: false };
	const target = safeTarget(backupRoot, path);
	mkdirSync(dirname(target), { recursive: true });
	writeFileSync(target, readFileSync(source));
	return { existed: true };
}

function recoverUpgrade(root, journalPath) {
	if (!existsSync(journalPath))
		throw new Error("No interrupted starter upgrade journal exists.");
	const journal = JSON.parse(readFileSync(journalPath, "utf8"));
	if (journal.status !== "pending" || !Array.isArray(journal.backups))
		throw new Error("Starter upgrade journal is not recoverable.");
	for (const backup of journal.backups) {
		const target = safeTarget(root, backup.path);
		const source = safeTarget(journal.backupRoot, backup.path);
		if (backup.existed) {
			mkdirSync(dirname(target), { recursive: true });
			writeFileSync(target, readFileSync(source));
		} else {
			rmSync(target, { force: true });
		}
	}
	writeFileSync(join(root, ".starter-version"), journal.previousVersion);
	journal.status = "recovered";
	writeJson(journalPath, journal);
	return { status: "recovered", restored: journal.backups.length };
}

export function runStarterUpgrade({
	root = process.cwd(),
	archivePath,
	recover = false,
	interruptAfter = 0,
} = {}) {
	const absoluteRoot = resolve(root);
	const stateRoot = join(absoluteRoot, ".starter-upgrade");
	const journalPath = join(stateRoot, "journal.json");
	if (recover) return recoverUpgrade(absoluteRoot, journalPath);
	if (existsSync(journalPath)) {
		const prior = JSON.parse(readFileSync(journalPath, "utf8"));
		if (prior.status === "pending")
			throw new Error(
				"Interrupted starter upgrade requires --recover before another run.",
			);
	}
	if (!archivePath)
		throw new Error(
			"starter:upgrade requires --archive=<verified JSON archive>.",
		);
	const previousVersionPath = join(absoluteRoot, ".starter-version");
	const previousVersionSource = readFileSync(previousVersionPath, "utf8");
	const previous = readVersion(absoluteRoot);
	const next = validateUpgradeArchive(readJsonBounded(archivePath));
	const compositePaths = new Set(next.compositePaths);
	const nextVersionHashes = { ...previous.hashes, ...next.hashes };
	for (const path of next.deleted) delete nextVersionHashes[path];
	for (const [path, hash] of next.regenerated) nextVersionHashes[path] = hash;
	if (
		previous.tag === next.tag &&
		previous.sha === next.sha &&
		JSON.stringify(previous.hashes) === JSON.stringify(nextVersionHashes)
	) {
		return { status: "already-current", tag: next.tag, sha: next.sha };
	}
	if (previous.tag !== next.from.tag || previous.sha !== next.from.sha) {
		throw new Error(
			`Upgrade archive source does not match client starter version: expected ${next.from.tag}@${next.from.sha}.`,
		);
	}
	for (const step of next.regeneration) {
		for (const [path, expectedHash] of Object.entries(
			step.previousOutputs ?? {},
		)) {
			const output = safeTarget(absoluteRoot, path, {
				allowMissingLeaf: false,
			});
			if (
				!existsSync(output) ||
				!lstatSync(output).isFile() ||
				digest(readFileSync(output)) !== expectedHash
			) {
				throw new Error(
					`Generated output has drifted before regeneration: ${path}.`,
				);
			}
		}
	}
	assertNoDirtyClientOwnedPaths(
		absoluteRoot,
		new Set(
			Object.keys(previous.hashes).filter((path) => !compositePaths.has(path)),
		),
	);

	const conflicts = [];
	const writes = [];
	const deletes = [];
	const allPaths = new Set(
		[...Object.keys(next.hashes), ...next.deleted].filter(
			(path) => !compositePaths.has(path),
		),
	);
	for (const path of [...allPaths].sort()) {
		const target = safeTarget(absoluteRoot, path);
		const exists = existsSync(target);
		const priorHash = previous.hashes[path];
		const nextHash = next.hashes[path];
		const localHash =
			exists && lstatSync(target).isFile()
				? digest(readFileSync(target))
				: null;
		if (priorHash && localHash !== priorHash) {
			conflicts.push({
				path,
				reason: exists ? "locally-modified" : "locally-deleted",
			});
			continue;
		}
		if (!priorHash && exists && next.adopted.get(path) !== localHash) {
			conflicts.push({ path, reason: "new-upstream-path-collides" });
			continue;
		}
		if (nextHash && localHash !== nextHash) writes.push(path);
		if (next.deleted.has(path) && exists) {
			deletes.push(path);
		}
	}
	const reportPath = join(stateRoot, "report.json");
	if (conflicts.length) {
		for (const conflict of conflicts) {
			if (next.contents.has(conflict.path)) {
				const rejection = safeTarget(absoluteRoot, `${conflict.path}.rej`);
				mkdirSync(dirname(rejection), { recursive: true });
				writeFileSync(rejection, next.contents.get(conflict.path));
			}
		}
		const report = {
			schemaVersion: 1,
			status: "conflicts",
			from: { tag: previous.tag, sha: previous.sha },
			to: { tag: next.tag, sha: next.sha },
			conflicts,
		};
		writeJson(reportPath, report);
		return report;
	}
	const packagePath = safeTarget(absoluteRoot, "package.json", {
		allowMissingLeaf: false,
	});
	if (!existsSync(packagePath) || !lstatSync(packagePath).isFile())
		throw new Error("Client package.json is missing.");
	const mergedPackage = mergePackageJson(
		readFileSync(packagePath, "utf8"),
		next.contents.get("package.json").toString("utf8"),
		next.packageMerge,
	);
	const generatedManifestRelativePath = "docs/CLONE_GENERATED_OUTPUTS.json";
	const generatedManifestPath = safeTarget(
		absoluteRoot,
		generatedManifestRelativePath,
	);
	let mergedGeneratedManifest = null;
	if (existsSync(generatedManifestPath)) {
		if (!lstatSync(generatedManifestPath).isFile()) {
			throw new Error(
				"Clone generated-output manifest must be a regular file.",
			);
		}
		const manifest = JSON.parse(readFileSync(generatedManifestPath, "utf8"));
		if (
			manifest?.schemaVersion !== 1 ||
			!manifest.outputs ||
			typeof manifest.outputs !== "object" ||
			Array.isArray(manifest.outputs) ||
			typeof manifest.outputs["package.json"] !== "string"
		) {
			throw new Error("Clone generated-output manifest is invalid.");
		}
		manifest.outputs["package.json"] = digest(Buffer.from(mergedPackage));
		for (const step of next.regeneration) {
			for (const path of step.removeOutputs ?? []) {
				delete manifest.outputs[path];
			}
			for (const [path, hash] of Object.entries(step.outputs)) {
				manifest.outputs[path] = hash;
			}
		}
		mergedGeneratedManifest = `${JSON.stringify(manifest, null, "\t")}\n`;
	}

	const backupRoot = join(
		stateRoot,
		"backups",
		`${previous.sha}-to-${next.sha}`,
	);
	const regenerated = [...next.regenerated.keys()].sort();
	const touched = [
		...new Set([
			...writes,
			...deletes,
			...regenerated,
			"package.json",
			...(mergedGeneratedManifest ? [generatedManifestRelativePath] : []),
		]),
	].sort();
	const backups = touched.map((path) => ({
		path,
		...backupFile(absoluteRoot, backupRoot, path),
	}));
	const journal = {
		schemaVersion: 1,
		status: "pending",
		backupRoot,
		previousVersion: previousVersionSource,
		backups,
		writes,
		deletes,
		composite: next.compositePaths,
		regenerated,
	};
	writeJson(journalPath, journal);
	let applied = 0;
	for (const path of writes) {
		const target = safeTarget(absoluteRoot, path);
		mkdirSync(dirname(target), { recursive: true });
		const temporary = `${target}.starter-upgrade.tmp`;
		writeFileSync(temporary, next.contents.get(path));
		renameSync(temporary, target);
		applied += 1;
		if (interruptAfter && applied >= interruptAfter)
			throw new Error("Synthetic starter upgrade interruption.");
	}
	for (const path of deletes)
		rmSync(safeTarget(absoluteRoot, path), { force: true });
	const packageTemporary = `${packagePath}.starter-upgrade.tmp`;
	writeFileSync(packageTemporary, mergedPackage);
	renameSync(packageTemporary, packagePath);
	applied += 1;
	if (interruptAfter && applied >= interruptAfter)
		throw new Error("Synthetic starter upgrade interruption.");
	if (mergedGeneratedManifest) {
		const manifestTemporary = `${generatedManifestPath}.starter-upgrade.tmp`;
		writeFileSync(manifestTemporary, mergedGeneratedManifest);
		renameSync(manifestTemporary, generatedManifestPath);
		applied += 1;
		if (interruptAfter && applied >= interruptAfter)
			throw new Error("Synthetic starter upgrade interruption.");
	}
	for (const step of next.regeneration) {
		const script = safeTarget(absoluteRoot, step.script, {
			allowMissingLeaf: false,
		});
		const generatedOutputsExist = Object.keys(step.outputs).every((path) => {
			const output = safeTarget(absoluteRoot, path, {
				allowMissingLeaf: false,
			});
			return existsSync(output) && lstatSync(output).isFile();
		});
		if (
			step.verifyBeforeRegeneration &&
			generatedOutputsExist &&
			!step.previousOutputs
		) {
			execFileSync(process.execPath, [script, "--check"], {
				cwd: absoluteRoot,
				stdio: "pipe",
			});
		}
		execFileSync(process.execPath, [script], {
			cwd: absoluteRoot,
			stdio: "pipe",
		});
		for (const [path, expectedHash] of Object.entries(step.outputs)) {
			const output = safeTarget(absoluteRoot, path, {
				allowMissingLeaf: false,
			});
			if (
				!existsSync(output) ||
				!lstatSync(output).isFile() ||
				digest(readFileSync(output)) !== expectedHash
			) {
				throw new Error(
					`Generated output does not match the regeneration contract: ${path}.`,
				);
			}
		}
		applied += 1;
		if (interruptAfter && applied >= interruptAfter)
			throw new Error("Synthetic starter upgrade interruption.");
	}
	const nextVersion = validateStarterVersion({
		schemaVersion: 1,
		tag: next.tag,
		sha: next.sha,
		manifestVersion: next.manifestVersion,
		hashes: nextVersionHashes,
	});
	writeJson(previousVersionPath, nextVersion);
	journal.status = "complete";
	writeJson(journalPath, journal);
	const report = {
		schemaVersion: 1,
		status: "applied",
		from: { tag: previous.tag, sha: previous.sha },
		to: { tag: next.tag, sha: next.sha },
		writes,
		deletes,
		composite: next.compositePaths,
		regenerated,
		backupRoot,
	};
	writeJson(reportPath, report);
	return report;
}

function option(name) {
	const prefix = `--${name}=`;
	return process.argv
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const result = runStarterUpgrade({
		root: option("root") ? resolve(option("root")) : process.cwd(),
		archivePath: option("archive"),
		recover: process.argv.includes("--recover"),
		interruptAfter: Number(
			process.env.AMS_STARTER_UPGRADE_INTERRUPT_AFTER || 0,
		),
	});
	console.log(JSON.stringify(result));
	if (result.status === "conflicts") process.exitCode = 2;
}
