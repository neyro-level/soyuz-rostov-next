import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
	hashStarterOwnedFiles,
	readStarterOwnedManifest,
	starterOwnedFiles,
	validateStarterVersion,
} from "./starter-ownership.mjs";

const root = process.cwd();
const manifest = readStarterOwnedManifest(root);
const files = starterOwnedFiles(root, manifest);
const first = hashStarterOwnedFiles(root, manifest);
const second = hashStarterOwnedFiles(root, manifest);
assert.deepEqual(first, second, "starter-owned hashes must be reproducible");
assert.ok(files.some((path) => path.startsWith("src/core/")));
assert.ok(files.some((path) => path.startsWith("packages/")));
assert.ok(files.some((path) => path.startsWith("migrations/")));
assert.ok(files.some((path) => path.startsWith("scripts/quality/")));
for (const path of [
	"src/project/cache/",
	"src/project/collections/",
	"src/project/data-access/",
	"src/project/jobs/",
	"src/project/routing/",
	"src/project/seo/",
	"src/app/(payload)/",
	"src/app/api/internal/",
]) {
	assert.ok(files.some((file) => file.startsWith(path)), `platform owns ${path}`);
}
assert.ok(files.includes("src/app/api/public/leads/route.ts"));
assert.ok(files.includes("src/app/robots.txt/route.ts"));
assert.ok(files.includes("src/app/sitemap.ts"));
for (const path of files) {
	assert.ok(
		!path.startsWith("src/project/developments/") &&
			!path.startsWith("src/project/fixture-data/") &&
			!path.startsWith("src/project/geo/"),
		`client composition must remain outside platform ownership: ${path}`,
	);
	assert.ok(!path.startsWith("docs/seo/"));
}

const fixture = mkdtempSync(join(tmpdir(), "starter-owned-negative-"));
try {
	const base = JSON.parse(readFileSync(join(root, "starter-owned.json"), "utf8"));
	for (const [name, mutate, pattern] of [
		["overlap", (value) => value.ownership.client.push({ path: "src/core/routing", type: "tree" }), /ownership overlap/],
		["unknown", (value) => value.ownership.platform.push({ path: "missing/platform", type: "tree" }), /unknown path/],
		["traversal", (value) => value.ownership.platform.push({ path: "../outside", type: "tree" }), /normalized repository-relative/],
		["missing-owner", (value) => {
			value.ownership.client = value.ownership.client.filter((rule) => rule.path !== "src/app");
		}, /Unclassified tracked runtime source/],
	]) {
		const value = structuredClone(base);
		mutate(value);
		const path = join(root, `.starter-owned-${name}-${process.pid}.json`);
		writeFileSync(path, JSON.stringify(value));
		try { assert.throws(() => readStarterOwnedManifest(root, path.split(/[\\/]/).at(-1)), pattern); }
		finally { rmSync(path, { force: true }); }
	}
	const unclassifiedDirectory = join(root, "src", `__starter-owned-unclassified-${process.pid}`);
	mkdirSync(unclassifiedDirectory);
	const unclassifiedFile = join(unclassifiedDirectory, "source.ts");
	writeFileSync(unclassifiedFile, "export const owner = 'missing';\n");
	try { assert.throws(() => readStarterOwnedManifest(root), /Unclassified tracked runtime source/); }
	finally { rmSync(unclassifiedDirectory, { recursive: true, force: true }); }
	const external = join(fixture, "external");
	mkdirSync(external);
	const link = join(root, `.starter-owned-link-${process.pid}`);
	symlinkSync(external, link, "junction");
	const symlinkManifest = structuredClone(base);
	symlinkManifest.ownership.platform.push({ path: link.split(/[\\/]/).at(-1), type: "tree" });
	const symlinkManifestPath = join(root, `.starter-owned-symlink-${process.pid}.json`);
	writeFileSync(symlinkManifestPath, JSON.stringify(symlinkManifest));
	try { assert.throws(() => readStarterOwnedManifest(root, symlinkManifestPath.split(/[\\/]/).at(-1)), /symlink/); }
	finally { rmSync(link, { force: true }); rmSync(symlinkManifestPath, { force: true }); }
} finally {
	rmSync(fixture, { recursive: true, force: true });
}

validateStarterVersion({ schemaVersion: 1, tag: "starter-v2.1.0", sha: "a".repeat(40), manifestVersion: 2, hashes: first });
assert.throws(() => validateStarterVersion({ schemaVersion: 1, tag: "x", sha: "a".repeat(40), manifestVersion: 1, hashes: { "../x": "b".repeat(64) } }), /normalized/);
console.log(`starter ownership: PASS (${files.length} files, reproducible hashes, negative path fixtures)`);
