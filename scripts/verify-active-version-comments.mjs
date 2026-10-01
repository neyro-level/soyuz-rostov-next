import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const activeDocs = [
	"README.md",
	"PROJECT.md",
	"02_PRODUCT_STRUCTURE.md",
	"03_ARCHITECTURE.md",
	"04_BACKLOG.md",
	"05_RELEASE_CHECKLIST.md",
	"CLONE_ONBOARDING.md",
	"DESIGN.md",
	"OPERATIONS.md",
	"STARTER_RELEASE_STATE.md",
	"UPSTREAM_CANDIDATES.md",
].map((file) => join(root, "docs", file));
const ignoredScriptDirectories = new Set(["demo", "fixtures"]);
const staleCodeRules = [
	{
		pattern: new RegExp("\\bpreset\\s+v" + "2\\b", "i"),
		message: "uses obsolete preset version 2",
	},
];
const staleDocumentRules = [
	...staleCodeRules,
	{
		pattern: new RegExp("\\bstarter-v2\\." + "(?:1|2)\\.0\\b", "i"),
		message: "uses an obsolete concrete target release tag",
	},
	{
		pattern: new RegExp("\\bPLAN\\s+" + "11\\s+v4\\s+APPROVED\\b", "i"),
		message: "presents completed Plan 11 as the active status",
	},
];

function filesUnder(directory, extensions, ignoredDirectories = new Set()) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const path = join(directory, entry.name);
		if (entry.isDirectory()) {
			return ignoredDirectories.has(entry.name)
				? []
				: filesUnder(path, extensions, ignoredDirectories);
		}
		return extensions.has(entry.name.split(".").pop()) ? [path] : [];
	});
}

function assertNoStaleVersion(content, path, rules = staleCodeRules) {
	for (const rule of rules) {
		assert.doesNotMatch(content, rule.pattern, `${path} ${rule.message}`);
	}
}

assert.throws(
	() =>
		assertNoStaleVersion("/** Generated from preset v" + "2. */", "fixture"),
	/obsolete preset version 2/,
);
assert.doesNotThrow(() =>
	assertNoStaleVersion("Clone preset schemaVersion 2 is obsolete.", "fixture"),
);
assert.throws(
	() =>
		assertNoStaleVersion(
			"Target tag: starter-v2." + "2.0",
			"fixture",
			staleDocumentRules,
		),
	/obsolete concrete target release tag/,
);
assert.throws(
	() =>
		assertNoStaleVersion(
			"Status: PLAN " + "11 v4 APPROVED",
			"fixture",
			staleDocumentRules,
		),
	/completed Plan 11/,
);
assert.doesNotThrow(() =>
	assertNoStaleVersion("starter-owned.json schema v2", "fixture"),
);

const activeCodeFiles = [
	...filesUnder(join(root, "src"), new Set(["ts", "tsx"])),
	...filesUnder(
		join(root, "scripts"),
		new Set(["ts", "mjs"]),
		ignoredScriptDirectories,
	),
];
// A prepared client owns its project router and active product documents. Their
// release history is not part of the upstream starter-owned upgrade boundary.
// The starter repository has no .starter-version and remains fully guarded.
const activeDocumentFiles = existsSync(join(root, ".starter-version"))
	? []
	: [join(root, "AGENTS.md"), ...activeDocs];
for (const path of activeCodeFiles) {
	assertNoStaleVersion(readFileSync(path, "utf8"), path);
}
for (const path of activeDocumentFiles) {
	assertNoStaleVersion(readFileSync(path, "utf8"), path, staleDocumentRules);
}

console.log(
	`Active version-comment guard passed (${activeCodeFiles.length + activeDocumentFiles.length} files).`,
);
