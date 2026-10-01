import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const source = (path: string) => readFileSync(path, "utf8");
const removedRuntime = [
	"src/app/http/property-lifecycle/[slug]/route.ts",
	"src/project/seo/catalog.ts",
	"packages/ui/src/views/catalog/StarterCatalogPageView.tsx",
	"packages/ui/src/views/property/GonePropertyPageView.tsx",
	"packages/ui/src/views/shared/HtmlSitemapListingView.tsx",
	"packages/ui/src/views/shared/HtmlSitemapView.tsx",
] as const;

for (const path of removedRuntime) {
	assert.equal(
		existsSync(path),
		false,
		`${path} must stay removed after cutover`,
	);
}

const catalogCompatibility = source("src/app/(site)/nedvizhimost/page.tsx");
assert.match(catalogCompatibility, /notFound\(\)/);
assert.doesNotMatch(catalogCompatibility, /permanentRedirect/);
assert.doesNotMatch(catalogCompatibility, /CatalogPageView|getPublicCatalog/);

const propertyCompatibility = source("src/app/(site)/obekty/[slug]/page.tsx");
assert.match(propertyCompatibility, /notFound\(\)/);
assert.doesNotMatch(propertyCompatibility, /permanentRedirect/);
assert.doesNotMatch(
	propertyCompatibility,
	/GonePropertyPageView|getPublicProperty|generateMetadata/,
);

const publicExports = source("src/project/data-access/public/index.ts");
assert.doesNotMatch(
	publicExports,
	/getPublicCatalog|getPublicProperty|getLegacyPropertyRoute/,
);

const proxy = source("src/proxy.ts");
assert.match(proxy, /lookupCanonicalEntityLifecyclePreflight/);
assert.match(proxy, /lookupCurrentPropertyLifecyclePreflight/);
assert.match(proxy, /matchLegacyRoute/);
assert.doesNotMatch(proxy, /fetch\(/);

const propertyCollection = source("src/project/collections/Properties.ts");
for (const rawField of ["region", "locality", "district"]) {
	assert.ok(
		propertyCollection.includes(`name: "${rawField}"`),
		`retained raw property field is missing: ${rawField}`,
	);
}

const leads = source("src/project/data-access/public/leads.ts");
assert.match(leads, /toPropertyCardDTO\(property\)\.href/);
assert.doesNotMatch(leads, /`\/obekty\//);

const architectureGuard = source("scripts/quality/architecture-guard.mjs");
for (const path of removedRuntime) {
	assert.ok(
		architectureGuard.includes(path),
		`${path} removal must be protected by the architecture guard`,
	);
}

console.log(
	`Post-cutover cleanup verified: ${removedRuntime.length} dead runtime owners removed; legacy redirects and raw geo data retained.`,
);
