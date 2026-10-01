import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) => readFileSync(file, "utf8");
const page = read("src/app/(site)/[...segments]/page.tsx");
const metadata = read("src/core/seo/page-metadata.ts");
const runtime = read("src/project/routing/runtime-route.ts");
const sitemap = read("src/app/sitemap.ts");
const navigation = read("src/project/navigation.ts");
const query = read("src/project/routing/catalog-search-params.ts");
const lifecycle = read("src/core/lifecycle/entity-lifecycle.ts");
const structuredData = read("src/project/seo/structured-data.tsx");

const matrix = [
	["status", runtime, /decision\.kind/],
	["canonical", metadata, /alternates:[\s\S]*canonical/],
	["robots", metadata, /robots:\s*composeFinalRobots/],
	["title", metadata, /title:\s*seo\.title/],
	["description", metadata, /description:\s*seo\.description/],
	["H1", page, /<GeoHubView|<ListingView|title=\{result\.data\.h1\}/],
	["OG", metadata, /openGraph:[\s\S]*url:/],
	["structured data", structuredData, /application\/ld\+json/],
	["sitemap inclusion", sitemap, /getRuntimeDiscoveryShards/],
	["internal links", navigation, /href/],
	["query variants", runtime, /parseCatalogSearchParams/],
	["pagination", query, /pageHref/],
	["legacy redirects", runtime, /findPublicRedirectByFromPath/],
	["404", page, /notFound\(\)/],
	["410", lifecycle, /gone/],
];

for (const [name, source, pattern] of matrix) {
	assert.match(source, pattern, `SEO crawl matrix owner missing: ${name}`);
}

assert.match(runtime, /separateTrackingQueryParams/);
assert.match(
	query,
	/params\.keys\(\)\]\.some\(\(key\) => !allowed\.has\(key\)\)\) return null/,
);
assert.match(sitemap, /throw error/);
assert.doesNotMatch(sitemap, /catch[\s\S]{0,120}return\s+\[\]/);

console.log(
	`SEO crawl matrix PASS: ${matrix.length} required surfaces and fail-closed query/sitemap negatives.`,
);
