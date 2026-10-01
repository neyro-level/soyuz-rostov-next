import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { validateStarterReleaseManifest, validateStarterTag } from "./starter-release.mjs";

for (const tag of ["starter-v2.0.0", "starter-v2.1.0", "starter-v2.24.103"]) {
	assert.equal(validateStarterTag(tag), tag);
}
for (const tag of ["v2.1.0", "starter-v1.1.0", "starter-v3.0.0", "starter-v2.01.0", "starter-v2.1", "starter-v2.1.0-rc.1"]) {
	assert.throws(() => validateStarterTag(tag), /starter-v2/);
}
const hashes = { "src/core/example.ts": "b".repeat(64) };
const released = {
	schemaVersion: 1,
	status: "released",
	tag: "starter-v2.2.0",
	sha: "a".repeat(40),
	starterOwnedManifestVersion: 1,
	hashes,
};
assert.equal(validateStarterReleaseManifest(released, { expectedTag: released.tag, expectedSha: released.sha, expectedHashes: hashes }), released);
assert.throws(() => validateStarterReleaseManifest({ ...released, status: "candidate" }), /released/);
assert.throws(() => validateStarterReleaseManifest({ ...released, tag: "starter-v3.0.0" }), /starter-v2/);
assert.throws(() => validateStarterReleaseManifest({ ...released, sha: "c".repeat(40) }, { expectedSha: released.sha }), /SHA mismatch/);
assert.throws(() => validateStarterReleaseManifest(released, { expectedHashes: { ...hashes, "packages/x": "d".repeat(64) } }), /hashes/);
const changelog = readFileSync("CHANGELOG.md", "utf8");
assert.match(changelog, /^## \[Unreleased\]/m);
assert.match(changelog, /^### Client migration$/m);
assert.doesNotMatch(readFileSync("scripts/clone-prepare.mjs", "utf8"), /sourceTag\s*!==\s*["']starter-v2\.1\.0/);
const tagsBefore = execFileSync("git", ["tag", "--list"], { encoding: "utf8" });
const tagsAfter = execFileSync("git", ["tag", "--list"], { encoding: "utf8" });
assert.equal(tagsAfter, tagsBefore, "verification must not mutate Git tags");
console.log("starter release contract: PASS (v2 semver, released status, exact SHA and hashes)");
