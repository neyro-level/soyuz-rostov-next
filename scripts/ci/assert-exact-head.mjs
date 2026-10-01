import { execFileSync } from "node:child_process";

const expected = process.env.EXPECTED_COMMIT_SHA;
const sourcecraft = process.env.SOURCECRAFT_COMMIT_SHA;
const checkout = execFileSync("git", ["rev-parse", "HEAD"], {
	encoding: "utf8",
}).trim();
const fullSha = /^[0-9a-f]{40}$/;

if (!expected || !fullSha.test(expected))
	throw new Error("EXPECTED_COMMIT_SHA must be a full SHA");
if (!sourcecraft || !fullSha.test(sourcecraft))
	throw new Error("SOURCECRAFT_COMMIT_SHA must be a full SHA");
if (expected !== sourcecraft || expected !== checkout) {
	throw new Error(
		`exact-head mismatch: expected=${expected} sourcecraft=${sourcecraft} checkout=${checkout}`,
	);
}
console.log(`exact-head: PASS ${expected}`);
