import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const adapter = readFileSync("src/core/seo/page-metadata.ts", "utf8");
assert.match(adapter, /export function toMetadata/);
assert.match(adapter, /export function toPublicSiteMetadata/);
assert.match(adapter, /alternates:\s*\{ canonical: seo\.canonicalPath \}/);
assert.match(adapter, /composeFinalRobots/);
assert.match(adapter, /openGraph:/);
assert.match(adapter, /webmasterVerification/);

const publicMetadataEntrypoints = [
	"src/app/layout.tsx",
	"src/app/(site)/page.tsx",
	"src/app/(site)/marketing-route.tsx",
	"src/app/(site)/[...segments]/page.tsx",
];
for (const path of publicMetadataEntrypoints) {
	const source = readFileSync(path, "utf8");
	assert.match(
		source,
		/toMetadata|toPublicSiteMetadata/,
		`${path} must use the canonical public metadata adapter`,
	);
	assert.doesNotMatch(
		source,
		/\b(openGraph|alternates|robots|verification)\s*:/,
		`${path} must not materialize business SEO metadata directly`,
	);
}

console.log("public page metadata ownership guard passed");
