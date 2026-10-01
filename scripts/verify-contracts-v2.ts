import assert from "node:assert/strict";
import type { PageKeyDTO, PageLinkDTO } from "@ams/realtbase-contracts";
import { geoCatalogContractFixtures } from "../src/fixture/geo-catalog.ts";
import { fixtureProperties } from "../src/fixture/provider.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

const grammar = createProjectUrlGrammar(
	siteProfileFixtures.multiGeo,
	fixtureDistrictRouteRegistryFor(siteProfileFixtures.multiGeo),
);
const expectedHref = (pageKey: PageKeyDTO) => grammar.buildUrl(pageKey);
const assertLink = (value: PageLinkDTO) => {
	assert.equal(value.href, expectedHref(value.pageKey));
};

for (const property of fixtureProperties) {
	assert.equal(property.href, expectedHref(property.pageKey));
	assert.equal(property.category, property.categoryDetails.category);
	assert.ok(Number.isSafeInteger(property.publicUrlId));
}

const { geoHub, developer, development, listing } = geoCatalogContractFixtures;
for (const link of [
	...geoHub.categoryLinks,
	...geoHub.districtLinks,
	...geoHub.nearby,
	...(geoHub.developerLink ? [geoHub.developerLink] : []),
	...listing.subLinks,
	...listing.nearby,
]) {
	assertLink(link);
}

assert.equal(developer.href, expectedHref(developer.pageKey));
assert.equal(development.href, expectedHref(development.pageKey));
assert.equal(listing.href, expectedHref(listing.pageKey));
assert.equal(listing.canonical, listing.href);
assert.equal(listing.seo.canonicalPath, listing.href);
assert.equal(listing.items.length, listing.total);
assert.equal(development.developer?.href, developer.href);
assert.equal(geoHub.city.slug, "primorsk");
assert.equal(geoCatalogContractFixtures.district.citySlug, geoHub.city.slug);

console.log(
	"verify:contracts-v2 passed (geo/development/developer/listing fixtures + canonical PageKey hrefs)",
);
