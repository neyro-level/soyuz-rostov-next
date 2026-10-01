import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import {
	cpSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = process.cwd();
const fixture = mkdtempSync(join(tmpdir(), "ams-release-build-"));
const run = (command, args, options = {}) =>
	execFileSync(command, args, { cwd: fixture, encoding: "utf8", ...options });

try {
	for (const path of [
		".gitignore",
		"Dockerfile",
		"next.config.ts",
		"package.json",
		"pnpm-lock.yaml",
	]) {
		cpSync(join(root, path), join(fixture, path));
	}
	mkdirSync(join(fixture, "scripts"));
	cpSync(
		join(root, "scripts", "release-build.mjs"),
		join(fixture, "scripts", "release-build.mjs"),
	);
	cpSync(
		join(root, "scripts", "release-manifest.mjs"),
		join(fixture, "scripts", "release-manifest.mjs"),
	);
	run("git", ["init"]);
	run("git", ["config", "user.email", "release-fixture@ams.invalid"]);
	run("git", ["config", "user.name", "AMS Release Fixture"]);
	run("git", ["add", "."]);
	run("git", ["commit", "-m", "fixture"]);
	const sha = run("git", ["rev-parse", "HEAD"]).trim();
	const digest = `sha256:${"a".repeat(64)}`;
	const image = `fixture.invalid/ams-realty-baza-starter:${sha}`;

	run("node", [
		"scripts/release-build.mjs",
		`--expected-sha=${sha}`,
		`--image=${image}`,
		"--dry-run",
		`--artifact-digest=${digest}`,
	]);
	const manifest = JSON.parse(
		readFileSync(join(fixture, ".release", "release-manifest.json"), "utf8"),
	);
	assert.equal(manifest.source.commit, sha);
	assert.equal(manifest.source.clean, true);
	assert.equal(manifest.build.identity, "release-build-v1/dockerfile");
	assert.equal(manifest.build.mode, "dry-run-fixture");
	assert.equal(manifest.artifact.reference, image);
	assert.equal(manifest.artifact.digest, digest);

	const mismatch = spawnSync(
		"node",
		[
			"scripts/release-build.mjs",
			`--expected-sha=${"b".repeat(40)}`,
			"--dry-run",
			`--artifact-digest=${digest}`,
		],
		{ cwd: fixture, encoding: "utf8" },
	);
	assert.notEqual(mismatch.status, 0, "Unknown/mismatched SHA must fail.");
	const mutableReference = spawnSync(
		"node",
		[
			"scripts/release-build.mjs",
			`--expected-sha=${sha}`,
			"--image=fixture.invalid/ams-realty-baza-starter:latest",
			"--dry-run",
			`--artifact-digest=${digest}`,
		],
		{ cwd: fixture, encoding: "utf8" },
	);
	assert.notEqual(
		mutableReference.status,
		0,
		"Image reference without the exact SHA must fail.",
	);
	const invalidDigest = spawnSync(
		"node",
		[
			"scripts/release-build.mjs",
			`--expected-sha=${sha}`,
			`--image=${image}`,
			"--dry-run",
			"--artifact-digest=sha256:short",
		],
		{ cwd: fixture, encoding: "utf8" },
	);
	assert.notEqual(
		invalidDigest.status,
		0,
		"Incomplete artifact digest must fail.",
	);

	writeFileSync(join(fixture, "dirty.txt"), "dirty\n");
	const dirty = spawnSync(
		"node",
		[
			"scripts/release-build.mjs",
			`--expected-sha=${sha}`,
			"--dry-run",
			`--artifact-digest=${digest}`,
		],
		{ cwd: fixture, encoding: "utf8" },
	);
	assert.notEqual(dirty.status, 0, "Dirty worktree must fail.");
	console.log(
		"verify:release-build PASS (exact SHA, clean tree, identity, digest, mismatch guards)",
	);
} finally {
	rmSync(fixture, { recursive: true, force: true });
}
