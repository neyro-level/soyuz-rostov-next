import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const source = readFileSync("scripts/verify-final-client-clone.mjs", "utf8");
const runtimeOwner = readFileSync(
	"scripts/verify-clone-runtime-matrix.mjs",
	"utf8",
);

for (const profile of [
	'name: "souz"',
	'name: "newbuild-first"',
	'name: "secondary-first"',
	'name: "multi-geo"',
	'name: "districts-legacy"',
]) {
	assert.ok(source.includes(profile), `clone matrix missing ${profile}`);
}

for (const step of [
	"install",
	"--frozen-lockfile",
	"build prepared client",
	"start disposable PostgreSQL",
	"run migrations",
	"seed geo",
	"run HTTP smoke",
	"verify:site-profile",
	"dockerContainerExists",
]) {
	assert.ok(source.includes(step), `clone matrix missing step ${step}`);
}

assert.match(runtimeOwner, /AMS_CLONE_RUNTIME\s*=\s*"1"/);
assert.match(source, /\["worktree",\s*"remove",\s*"--force"/);
assert.match(
	source,
	/NEXT_PUBLIC_SERVER_URL:\s*`https:\/\/\$\{bootstrap\.domain\}`/,
);
assert.match(source, /INTERNAL_REVALIDATE_BASE_URL:\s*origin/);

console.log(
	"verify:clone-matrix-contract PASS (5 profiles, locked install, build, PG18 migration/seed, HTTPS canonical, HTTP smoke and cleanup)",
);
