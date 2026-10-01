import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
	return readFileSync(path, "utf8").replaceAll("\r\n", "\n");
}

const packageJson = JSON.parse(read("package.json"));
const lockfile = read("pnpm-lock.yaml");
const workspace = read("pnpm-workspace.yaml");
const nodeVersion = read(".node-version").trim();
const dockerfile = read("Dockerfile");
const sourcecraftCi = read(".sourcecraft/ci.yaml");
const riskyScript = read("scripts/ci/sourcecraft-merge-risky.sh");
const releaseArtifactGuard = read("scripts/verify-release-artifact.mjs");

const expected = {
	nodeVersion: "24.21.0",
	packageManager: "pnpm@11.28.2",
	nodeDockerBuild: "node:24.21.0-bookworm-slim",
	nodeDockerCi: "node:24.21.0-bookworm",
	nodeArchive: "node-v24.21.0-linux-x64.tar.xz",
	next: "16.3.8",
	payload: "3.90.2",
	"@payloadcms/next": "3.90.2",
	"@payloadcms/db-postgres": "3.90.2",
	undici: "7.30.0",
	react: "19.2.8",
	"react-dom": "19.2.8",
	sharp: "0.35.4",
	zod: "^4.6.5",
	tailwindcss: "^4",
};

assert.equal(nodeVersion, expected.nodeVersion);
assert.equal(packageJson.engines?.node, `>=${expected.nodeVersion} <25`);
assert.equal(packageJson.packageManager, expected.packageManager);
assert.match(workspace, /overrides:\n\s+undici:\s+7\.30\.0/);

const exactToolchainFiles = {
	Dockerfile: dockerfile,
	".sourcecraft/ci.yaml": sourcecraftCi,
	"scripts/ci/sourcecraft-merge-risky.sh": riskyScript,
	"scripts/verify-release-artifact.mjs": releaseArtifactGuard,
};
assert.ok(dockerfile.includes(`FROM ${expected.nodeDockerBuild} AS build`));
assert.ok(dockerfile.includes(`FROM ${expected.nodeDockerBuild} AS runtime`));
assert.ok(dockerfile.includes(`corepack prepare ${expected.packageManager} --activate`));
assert.ok(sourcecraftCi.includes(`image: ${expected.nodeDockerCi}`));
assert.ok(sourcecraftCi.includes(`corepack prepare ${expected.packageManager} --activate`));
assert.ok(riskyScript.includes(`https://nodejs.org/dist/v${expected.nodeVersion}/${expected.nodeArchive}`));
assert.ok(riskyScript.includes(`tar -xJf ${expected.nodeArchive}`));
assert.ok(riskyScript.includes(`corepack prepare ${expected.packageManager} --activate`));
assert.ok(releaseArtifactGuard.includes(expected.nodeDockerBuild));
for (const [path, source] of Object.entries(exactToolchainFiles)) {
	const obsoleteToolchains = [
		`pnpm@${["11", "5", "1"].join(".")}`,
		`node:${["24", "20", "0"].join(".")}`,
		`node-v${["24", "20", "0"].join(".")}`,
	];
	for (const obsolete of obsoleteToolchains) {
		assert.ok(!source.includes(obsolete), `${path} still contains obsolete executable ${obsolete}`);
	}
}

for (const [name, version] of Object.entries(expected)) {
	if (
		[
			"nodeVersion",
			"packageManager",
			"nodeDockerBuild",
			"nodeDockerCi",
			"nodeArchive",
			"tailwindcss",
		].includes(name)
	) continue;
	assert.equal(
		packageJson.dependencies?.[name],
		version,
		`package.json dependency ${name} must stay pinned to ${version}`,
	);
}
assert.equal(packageJson.devDependencies?.tailwindcss, expected.tailwindcss);
assert.equal(packageJson.devDependencies?.["@tailwindcss/postcss"], "^4");

assert.equal(
	packageJson.scripts?.["verify:dependency-security"],
	"node scripts/verify-dependency-security.mjs",
);
assert.equal(
	packageJson.scripts?.["verify:safe-outbound"],
	"node --experimental-strip-types scripts/verify-safe-outbound.mjs",
);

for (const needle of [
	"lockfileVersion:",
	"overrides:",
	"undici: 7.30.0",
	"next@16.3.8",
	"'@next/env@16.3.8'",
	"'@payloadcms/db-postgres@3.90.2'",
	"'@payloadcms/next@3.90.2'",
	"payload@3.90.2",
	"undici@7.30.0",
]) {
	assert.ok(lockfile.includes(needle), `pnpm-lock.yaml missing ${needle}`);
}

for (const obsolete of [
	"specifier: 16.3.5",
	"next@16.3.5",
	"specifier: 3.90.1",
	"payload@3.90.1",
	"specifier: 7.29.0",
	"undici@7.29.0",
	"undici: 7.29.0",
]) {
	assert.ok(!lockfile.includes(obsolete), `pnpm-lock.yaml still contains ${obsolete}`);
}

console.log("verify-dependency-security: ok");
