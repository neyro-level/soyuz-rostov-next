import { createHash } from "node:crypto";
import {
	existsSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const contractsRoot = path.join(root, "packages", "contracts");
const command = process.argv[2];
const scope = process.argv
	.find((arg) => arg.startsWith("--scope="))
	?.split("=")[1] ?? "base";
if (!['base', 'journal'].includes(scope)) fail("scope must be base or journal");
const sourceRoot =
	scope === "journal"
		? path.join(contractsRoot, "src", "journal")
		: path.join(contractsRoot, "src");
const lockPath = path.join(
	contractsRoot,
	scope === "journal" ? "journal.lock.json" : "contracts.lock.json",
);
const packagePath = path.join(contractsRoot, "package.json");
const publicIndexPath = path.join(contractsRoot, "src", "index.ts");

function fail(message) {
	console.error(`contracts: ${message}`);
	process.exit(1);
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value) {
	return value.replace(/\r\n?/g, "\n");
}

function fileSha256(file) {
	return sha256(normalizeText(readFileSync(file, "utf8")));
}

function collect(directory) {
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true })
		.flatMap((entry) => {
			const absolute = path.join(directory, entry.name);
			if (scope === "base" && entry.isDirectory() && absolute === path.join(contractsRoot, "src", "journal")) return [];
			return entry.isDirectory() ? collect(absolute) : [absolute];
		})
		.filter(
			(file) => statSync(file).isFile() && /\.(?:ts|tsx|json)$/.test(file),
		)
		.sort();
}

function buildManifest(metadata) {
	const files = collect(sourceRoot).map((absolute) => {
		const relative = path.relative(root, absolute).replaceAll("\\", "/");
		return { path: relative, sha256: fileSha256(absolute) };
	});
	const aggregate = files
		.map((file) => `${file.path}:${file.sha256}\n`)
		.join("");
	return {
		schemaVersion: 2,
		contractVersion: metadata.contractVersion,
		state: metadata.state,
		algorithm: "sha256-normalized-lf",
		files,
		aggregateSha256: sha256(aggregate),
	};
}

function readConstExport(file, name) {
	const source = readFileSync(file, "utf8");
	const match = source.match(
		new RegExp(`export\\s+const\\s+${name}\\s*=\\s*["']([^"']+)["']\\s+as\\s+const`),
	);
	return match?.[1];
}

function assertBaseMetadata(current) {
	if (scope !== "base") return;
	const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
	const publicVersion = readConstExport(publicIndexPath, "contractVersion");
	const publicState = readConstExport(publicIndexPath, "contractState");
	if (packageJson.version !== current.contractVersion) {
		fail(
			`package version ${packageJson.version} does not match lock ${current.contractVersion}`,
		);
	}
	if (publicVersion !== current.contractVersion) {
		fail(
			`public contractVersion ${publicVersion ?? "missing"} does not match lock ${current.contractVersion}`,
		);
	}
	if (publicState !== current.state) {
		fail(
			`public contractState ${publicState ?? "missing"} does not match lock ${current.state}`,
		);
	}
}

if (!existsSync(lockPath)) fail("contracts.lock.json is missing");
const current = JSON.parse(readFileSync(lockPath, "utf8"));
if (
	current.schemaVersion !== 2 ||
	current.algorithm !== "sha256-normalized-lf"
) {
	fail("unsupported lock schema or algorithm");
}
const expected = buildManifest(current);
const same = JSON.stringify(current) === JSON.stringify(expected);

if (command === "test-line-endings") {
	const lf = "export const value = true;\n";
	const crlf = lf.replaceAll("\n", "\r\n");
	const cr = lf.replaceAll("\n", "\r");
	if (
		sha256(normalizeText(lf)) !== sha256(normalizeText(crlf)) ||
		sha256(normalizeText(lf)) !== sha256(normalizeText(cr))
	) {
		fail("line-ending normalization is not deterministic");
	}
	console.log("contracts: line-ending normalization PASS");
} else if (command === "check") {
	if (!same) fail("lock drift detected; run pnpm contracts:diff");
	assertBaseMetadata(current);
	console.log(`contracts: PASS (${scope} ${current.state} ${current.contractVersion})`);
} else if (command === "diff") {
	if (same) console.log("contracts: no changes");
	else {
		console.log(
			JSON.stringify({ locked: current, working: expected }, null, 2),
		);
		process.exitCode = 1;
	}
} else if (command === "lock") {
	if (current.state === "frozen") {
		const nextVersion = process.argv
			.find((arg) => arg.startsWith("--version="))
			?.split("=")[1];
		const adr = process.env.CONTRACT_ADR;
		if (process.env.CONTRACT_CHANGE_APPROVED !== "true")
			fail("frozen change requires owner approval");
		if (!nextVersion || nextVersion === current.contractVersion)
			fail("frozen change requires a version bump");
		if (!adr || !existsSync(path.resolve(root, adr)))
			fail("frozen change requires an existing CONTRACT_ADR");
		expected.contractVersion = nextVersion;
	}
	writeFileSync(lockPath, `${JSON.stringify(expected, null, "\t")}\n`);
	console.log(`contracts: lock updated (${scope} ${expected.state} ${expected.contractVersion})`);
} else if (command === "freeze") {
	const version = process.argv
		.find((arg) => arg.startsWith("--version="))
		?.split("=")[1];
	const feasibilityPath = path.join(root, "docs", "CONTRACT_FEASIBILITY.md");
	if (process.env.CONTRACT_FREEZE_APPROVED !== "true")
		fail("freeze requires owner approval");
	if (!version || !/^[1-9]\d*\.\d+\.\d+$/.test(version))
		fail("freeze requires --version=<stable semver>");
	if (
		!existsSync(feasibilityPath) ||
		!/^Статус:\s*`VERIFIED`/m.test(readFileSync(feasibilityPath, "utf8"))
	) {
		fail("freeze requires VERIFIED docs/CONTRACT_FEASIBILITY.md");
	}
	const frozen = buildManifest({ contractVersion: version, state: "frozen" });
	writeFileSync(lockPath, `${JSON.stringify(frozen, null, "\t")}\n`);
	console.log(`contracts: ${scope} frozen at ${version}`);
} else {
	fail("use check, diff, lock, freeze or test-line-endings");
}
