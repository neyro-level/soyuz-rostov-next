import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "docs", "CORE_5_5_COMPLIANCE_MATRIX.md");

function read(relativePath) {
	return readFileSync(path.join(root, relativePath), "utf8");
}

function filesUnder(relativePath) {
	const directory = path.join(root, relativePath);
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (
			entry.isDirectory() &&
			[".git", ".next", "node_modules"].includes(entry.name)
		) {
			return [];
		}
		const next = path.join(relativePath, entry.name);
		if (entry.isDirectory()) return filesUnder(next);
		return /\.(?:css|js|jsx|mjs|ts|tsx)$/.test(entry.name) ? [next] : [];
	});
}

assert.ok(
	existsSync(matrixPath),
	"docs/CORE_5_5_COMPLIANCE_MATRIX.md must exist",
);

const matrix = readFileSync(matrixPath, "utf8");
const packageJson = JSON.parse(read("package.json"));

const hardContractIds = Array.from({ length: 37 }, (_, index) =>
	`HC-${String(index + 1).padStart(2, "0")}`,
);
for (const id of hardContractIds) {
	assert.ok(matrix.includes(`| \`${id}\` |`), `missing hard contract row ${id}`);
}

for (const status of ["PASS", "DEVIATION", "N/A"]) {
	assert.ok(matrix.includes(`\`${status}\``), `matrix must define ${status}`);
}
assert.ok(
	!/\bTODO\b|\bTBD\b|\?{3,}/.test(matrix),
	"compliance matrix must not contain unresolved placeholders",
);

for (const heading of [
	"## UI Core v5.0 Matrix",
	"## Always-On Schema Classification",
	"## Public Data-Access Layout Review",
	"## Module Governance Consistency",
	"## Mechanical Guard Coverage",
]) {
	assert.ok(matrix.includes(heading), `missing section ${heading}`);
}

for (const topic of [
	"primitive foundation",
	"REUSE -> VARIANT -> CREATE",
	"design values",
	"Server/Client boundaries",
	"DTO boundary",
	"forms",
	"accessibility",
	"media",
	"SEO page contract",
	"dark mode",
	"motion",
	"drift audit",
]) {
	assert.ok(matrix.includes(topic), `missing UI topic ${topic}`);
}

for (const collection of [
	"Regions",
	"Cities",
	"Districts",
	"Developers",
	"Developments",
	"LifecycleEvents",
]) {
	assert.ok(
		matrix.includes(`| \`${collection}\` |`),
		`missing collection classification ${collection}`,
	);
}
for (const classification of [
	"base platform capability",
	"activated optional module",
	"operational collection",
]) {
	assert.ok(
		matrix.includes(classification),
		`missing collection classification type ${classification}`,
	);
}

for (const dataAccessMarker of [
	"overrideAccess:false",
	"explicit select",
	"explicit depth",
	"explicit limit",
	"publication predicate",
	"DTO only",
]) {
	assert.ok(
		matrix.includes(dataAccessMarker),
		`missing data-access layout marker ${dataAccessMarker}`,
	);
}

for (const moduleState of [
	"`novostroyki` | `prepared`",
	"`journal` | `disabled`",
	"`agents` | `disabled`",
]) {
	assert.ok(matrix.includes(moduleState), `missing module state ${moduleState}`);
}

const guardSurfaces = [
	"overrideAccess",
	"Local API access mode",
	"raw SQL boundary",
	"private fields",
	"wildcard CORS",
	"direct configurable outbound fetch",
	"secret exposure",
	"top-level next/* in jobs/ingest/cache",
	"UI persistence dependencies",
	"dark mode",
	"design literals",
	"module URL reservations",
];
for (const surface of guardSurfaces) {
	assert.ok(matrix.includes(surface), `missing mechanical guard ${surface}`);
}

const architectureGuard = read("scripts/quality/architecture-guard.mjs");
const selfTest = read("scripts/quality/architecture-rules.self-test.mjs");
const localApiMode = read("scripts/quality/local-api-mode.mjs");
const securityBoundaries = read("scripts/verify-security-boundaries.mjs");
const uiCore = read("scripts/quality/ui-core.mjs");
const moduleGovernance = read("scripts/quality/module-governance.mjs");
const designDoc = read("docs/DESIGN.md");

const guardEvidence = [
	[architectureGuard, "systemOverrideAccess import outside System Gateway whitelist"],
	[localApiMode, "payload.${operation} missing explicit Local API mode"],
	[selfTest, "unapproved raw SQL fixture must fail"],
	[securityBoundaries, "anonymous generic read must be role-denied"],
	[architectureGuard, "wildcard image hostname"],
	[securityBoundaries, "CORS must be exact-origin driven"],
	[architectureGuard, "direct fetch is forbidden outside Safe Outbound Client"],
	[architectureGuard, "obvious embedded secret"],
	[selfTest, "top-level cache runtime fixture must fail"],
	[selfTest, "UI browser persistence fixture must fail"],
	[designDoc, "Dark theme: DISABLED."],
	[uiCore, "new UI design literal"],
	[moduleGovernance, "prepared novostroyki public route"],
];
for (const [source, marker] of guardEvidence) {
	assert.ok(source.includes(marker), `guard evidence marker missing: ${marker}`);
}
for (const file of [...filesUnder("src"), ...filesUnder("packages")]) {
	const source = read(file);
	assert.equal(
		/(?:^|["'`\s])dark:[a-z]/m.test(source),
		false,
		`${file}: project-authored dark: usage is forbidden while dark theme is disabled`,
	);
}
assert.ok(
	read("src/app/globals.css").includes("@custom-variant dark"),
	"globals.css must keep the dormant Tailwind dark variant mapping documented by DESIGN.md",
);

assert.ok(
	packageJson.scripts["verify:core-compliance"] ===
		"node scripts/verify-core-compliance-matrix.mjs",
	"package.json must expose verify:core-compliance",
);
for (const scriptName of ["quality:architecture-guards", "quality:guards"]) {
	assert.ok(
		packageJson.scripts[scriptName]?.includes("pnpm verify:core-compliance"),
		`${scriptName} must include verify:core-compliance`,
	);
}

console.log(
	"verify:core-compliance: PASS (37 Core rows, UI matrix, classifications and guard coverage)",
);
