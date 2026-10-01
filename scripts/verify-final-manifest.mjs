import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const manifestPath = path.join(root, "config/final-verification-manifest.json");
const packagePath = path.join(root, "package.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
const pnpmEntrypoint = process.env.npm_execpath;

assert.ok(
	pnpmEntrypoint,
	"final verification must be launched through pnpm so npm_execpath is available",
);

const requiredCapabilities = [
	"schema",
	"required-integration",
	"ui-core",
	"client-readiness",
	"clone-matrix",
	"global-indexing",
	"metadata-adapter",
	"sitemap-failure",
	"https-origin",
	"tracking-query",
	"robots-clean-param",
	"filtered-query-load",
	"legacy-canonical-targets",
	"seo-template-matrix",
	"development-gate-passport",
	"ownership-v2",
	"starter-upgrade-e2e",
	"design-source-of-truth",
	"active-doc-state",
	"souz-source-integrity",
	"synthetic-geo-matrix",
	"five-profile-clone-matrix",
	"tracking-traffic-smoke",
	"seo-crawl-matrix",
	"ui-browser-proof",
	"security-regression",
];

assert.equal(manifest.schemaVersion, 1, "unsupported verification manifest");
assert.equal(
	manifest.verificationId,
	"AMS-REALTY-BAZA-STARTER-CURRENT-FINAL-VERIFICATION",
);
assert.equal(manifest.verificationVersion, "current");
assert.ok(Array.isArray(manifest.suites) && manifest.suites.length > 0);

const commandOwners = new Map();
const capabilityOwners = new Map();
for (const suite of manifest.suites) {
	assert.equal(
		typeof suite.command,
		"string",
		"suite command must be a string",
	);
	assert.ok(suite.command.length > 0, "suite command must not be empty");
	assert.notEqual(
		suite.command,
		"verify",
		"final verifier cannot invoke itself",
	);
	assert.equal(
		typeof packageJson.scripts?.[suite.command],
		"string",
		`package.json is missing owner command ${suite.command}`,
	);
	assert.ok(
		!commandOwners.has(suite.command),
		`duplicate suite invocation: ${suite.command}`,
	);
	commandOwners.set(suite.command, true);
	assert.ok(
		Array.isArray(suite.capabilities) && suite.capabilities.length > 0,
		`${suite.command} must own at least one capability`,
	);
	for (const capability of suite.capabilities) {
		assert.equal(typeof capability, "string");
		assert.ok(
			!capabilityOwners.has(capability),
			`duplicate capability owner: ${capability} (${capabilityOwners.get(capability)} and ${suite.command})`,
		);
		capabilityOwners.set(capability, suite.command);
	}
}

for (const capability of requiredCapabilities) {
	assert.ok(
		capabilityOwners.has(capability),
		`missing required capability: ${capability}`,
	);
}

console.log(
	`verify: manifest PASS (${manifest.suites.length} unique commands, ${capabilityOwners.size} uniquely owned capabilities)`,
);

if (process.argv.includes("--check")) process.exit(0);

const gitStatus = execFileSync("git", ["status", "--porcelain"], {
	cwd: root,
	encoding: "utf8",
}).trim();
assert.equal(
	gitStatus,
	"",
	"final verification requires a clean exact-SHA checkout; commit the candidate first",
);
const sha = execFileSync("git", ["rev-parse", "HEAD"], {
	cwd: root,
	encoding: "utf8",
}).trim();

for (const suite of manifest.suites) {
	console.log(`\n=== ${suite.command} ===`);
	const isNativeExecutable = /\.(?:exe|cmd|bat)$/i.test(pnpmEntrypoint);
	execFileSync(isNativeExecutable ? pnpmEntrypoint : process.execPath, [
		...(isNativeExecutable ? [] : [pnpmEntrypoint]),
		"run",
		suite.command,
	], {
		cwd: root,
		stdio: "inherit",
		env: process.env,
	});
}

console.log(`verify: PASS exact SHA ${sha}`);
