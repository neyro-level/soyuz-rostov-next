import { globSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { findUnapprovedCyrillic } from "./cyrillic-ownership-rules.mjs";

const root = process.cwd();
const documentedExceptions = new Map([
	["src/core/geo/property-backfill.ts", "Russian letter normalization"],
	["src/core/seo/registry.ts", "grammatical preposition contract"],
	["src/core/data-access/system/sql/index.ts", "bounded synthetic SQL fixture"],
	["src/core/routing/url-grammar.ts", "Russian transliteration alphabet"],
	["src/core/ingest/feed-taxonomy.ts", "inbound feed taxonomy protocol"],
	[
		"src/core/ingest/feed-normalization.ts",
		"inbound measurement unit protocol",
	],
	["src/core/ingest/feed-ingest.ts", "Russian text normalization expression"],
	[
		"src/core/ingest/development-excel.ts",
		"external workbook sheet-name protocol",
	],
]);

const paths = globSync(["src/app/**/*.{ts,tsx}", "src/core/**/*.{ts,tsx}"], {
	cwd: root,
}).map((path) => path.replaceAll("\\", "/"));
const files = paths.map((path) => ({
	path,
	source: readFileSync(resolve(root, path), "utf8"),
}));
const findings = findUnapprovedCyrillic(
	files,
	new Set(documentedExceptions.keys()),
);
if (findings.length) {
	throw new Error(
		`Unapproved Cyrillic outside src/project:\n${findings.map((path) => `- ${path}`).join("\n")}`,
	);
}
for (const path of documentedExceptions.keys()) {
	if (!paths.includes(path))
		throw new Error(`Stale Cyrillic exception: ${path}`);
}
console.log(
	`Cyrillic ownership: PASS (${documentedExceptions.size} documented technical exceptions).`,
);
