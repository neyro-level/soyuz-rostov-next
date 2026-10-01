import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const releaseStatePath = join(root, "docs/STARTER_RELEASE_STATE.md");
const backlogPath = join(root, "docs/04_BACKLOG.md");
const constitutionLockPath = join(root, "config/ams-constitution.lock.json");
const packagePath = join(root, "package.json");
const lockfilePath = join(root, "pnpm-lock.yaml");
const fullSha = /^[a-f0-9]{40}$/;
const starterTag = /^starter-v2\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)$/;

function read(path) {
	return readFileSync(path, "utf8");
}

function readJson(path) {
	return JSON.parse(read(path));
}

function tableRows(markdown) {
	const rows = new Map();
	for (const line of markdown.split(/\r?\n/)) {
		if (!line.startsWith("|")) continue;
		const cells = line
			.split("|")
			.slice(1, -1)
			.map((cell) => cell.trim());
		if (cells.length < 3 || cells[0] === "---" || cells[0] === "Поле") continue;
		rows.set(cells[0], { value: cells[1], evidence: cells[2] });
	}
	return rows;
}

function cell(rows, key) {
	const row = rows.get(key);
	assert.ok(row, `release-state row is missing: ${key}`);
	assert.ok(row.value, `release-state value is empty: ${key}`);
	return row.value;
}

function codeValue(value) {
	const match = value.match(/`([^`]+)`/);
	return match?.[1] ?? value.trim();
}

function assertNotMovingReleaseBaseline(value, key) {
	assert.doesNotMatch(
		value,
		/(?:^|[`/\s])(main|latest|origin\/main)(?:$|[`/\s])/i,
		`${key} must not treat a moving ref as an immutable released starter baseline`,
	);
}

function assertRuntimeVersion(rows, label, value) {
	const runtime = cell(rows, "Runtime versions");
	assert.ok(
		runtime.includes(label) && runtime.includes(`\`${value}\``),
		`Runtime versions row must declare ${label} ${value}`,
	);
}

function assertLockSpecifier(lockfile, name, version) {
	const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	assert.match(
		lockfile,
		new RegExp(`['"]?${escapedName}['"]?:[\\s\\S]*?specifier: ${version}[\\s\\S]*?version: ${version}`),
		`pnpm-lock.yaml importer must pin ${name} ${version}`,
	);
}

function parseSeverityRegistry(backlog) {
	const match = backlog.match(/Active blocker registry:\s*`P0=(\d+)`;\s*`P1=(\d+)`;\s*`P2=(\d+)`/);
	assert.ok(match, "docs/04_BACKLOG.md must contain Active blocker registry");
	return { P0: Number(match[1]), P1: Number(match[2]), P2: Number(match[3]) };
}

function severityValue(rows, key) {
	const match = cell(rows, key).match(/`?(\d+)`?\s+known/i);
	assert.ok(match, `${key} must declare a numeric known count`);
	return Number(match[1]);
}

function gitTagSha(tag) {
	try {
		return execFileSync("git", ["rev-list", "-n", "1", tag], {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "";
	}
}

assert.equal(existsSync(releaseStatePath), true, "docs/STARTER_RELEASE_STATE.md is missing");
assert.equal(existsSync(backlogPath), true, "docs/04_BACKLOG.md is missing");
assert.equal(existsSync(constitutionLockPath), true, "constitution lock manifest is missing");

const releaseState = read(releaseStatePath);
const rows = tableRows(releaseState);
const packageJson = readJson(packagePath);
const lockfile = read(lockfilePath);
const constitutionLock = readJson(constitutionLockPath);

for (const key of [
	"Canonical SourceCraft repository",
	"Repository mode",
	"GitHub mirror",
	"AMS Realty Platform Core",
	"AMS UI Core",
	"Runtime versions",
	"Ownership manifest",
	"Current immutable released starter tag",
	"Released tag SHA",
	"Open P0",
	"Open P1",
	"Open P2",
	"Production/live proof",
]) {
	cell(rows, key);
}

assert.equal(
	codeValue(cell(rows, "Canonical SourceCraft repository")),
	"integrator-p/ams-realty-baza-starter",
	"canonical repository drift",
);
assert.equal(
	codeValue(cell(rows, "Repository mode")),
	"SOURCECRAFT_PRIMARY_GITHUB_MIRROR",
	"repository mode drift",
);
assert.match(
	cell(rows, "GitHub mirror"),
	/mirror-only/i,
	"GitHub mirror row must keep GitHub as mirror-only",
);

assertRuntimeVersion(rows, "Node", packageJson.engines.node);
assertRuntimeVersion(rows, "pnpm", packageJson.packageManager.replace(/^pnpm@/, ""));
for (const [label, packageName] of [
	["Next.js", "next"],
	["React", "react"],
	["Payload", "payload"],
	["@payloadcms/db-postgres", "@payloadcms/db-postgres"],
	["@payloadcms/next", "@payloadcms/next"],
]) {
	assertRuntimeVersion(rows, label, packageJson.dependencies[packageName]);
	assertLockSpecifier(lockfile, packageName, packageJson.dependencies[packageName]);
}

assert.equal(codeValue(cell(rows, "AMS Realty Platform Core")), constitutionLock.core.version);
assert.equal(codeValue(cell(rows, "AMS UI Core")).replace(/^v/, ""), constitutionLock.ui.version);

const releaseTagValue = cell(rows, "Current immutable released starter tag");
const releaseShaValue = cell(rows, "Released tag SHA");
assertNotMovingReleaseBaseline(releaseTagValue, "Current immutable released starter tag");
assertNotMovingReleaseBaseline(releaseShaValue, "Released tag SHA");
if (codeValue(releaseTagValue) === "NOT CREATED") {
	assert.equal(codeValue(releaseShaValue), "NOT CREATED", "unreleased state must not declare a release SHA");
	assert.match(
		cell(rows, "Production/live proof"),
		/NOT RUN \/ NOT AUTHORIZED/,
		"unreleased state must keep production unauthorized",
	);
} else {
	const tag = codeValue(releaseTagValue);
	const sha = codeValue(releaseShaValue);
	assert.match(tag, starterTag, "current release tag must be immutable starter-v2.MINOR.PATCH");
	assert.match(sha, fullSha, "released tag SHA must be a full lowercase Git SHA");
	const actualTagSha = gitTagSha(tag);
	assert.equal(actualTagSha, sha, "released tag/sha pair is inconsistent");
}

const registry = parseSeverityRegistry(read(backlogPath));
assert.equal(severityValue(rows, "Open P0"), registry.P0, "Open P0 differs from active blocker registry");
assert.equal(severityValue(rows, "Open P1"), registry.P1, "Open P1 differs from active blocker registry");
assert.equal(severityValue(rows, "Open P2"), registry.P2, "Open P2 differs from active blocker registry");

assert.ok(
	packageJson.scripts?.["verify:release-state"]?.includes("scripts/verify-release-state.mjs"),
	"package script verify:release-state is missing",
);
assert.doesNotMatch(releaseState, /Repository main SHA|Last fully verified SHA|Final commercial-freeze candidate SHA/i);
assert.doesNotMatch(releaseState, /Current immutable released starter tag\s*\|\s*`?(?:main|latest|origin\/main)/i);

console.log("verify:release-state: PASS");
