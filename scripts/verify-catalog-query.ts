import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { listingFilterControlKeys } from "../packages/ui/src/views/catalog/listing-filter-contract.ts";
import { catalogFilterKeys } from "../src/core/profile/site-profile.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	catalogCanonicalPath,
	catalogFilterKeysForQuery,
	catalogQueryFilterKeys,
	pageHref,
	parseCatalogSearchParams,
	parsePageSearchParams,
} from "../src/project/routing/catalog-search-params.ts";
import { separateTrackingQueryParams } from "../src/core/seo/tracking-query-params.ts";

assert.deepEqual(
	[...catalogQueryFilterKeys].sort(),
	[...catalogFilterKeys].sort(),
	"profile and parser filter contracts match",
);
assert.deepEqual(
	[...listingFilterControlKeys].sort(),
	[...catalogFilterKeys].sort(),
	"every profile filter has a UI control",
);
for (const profile of Object.values(siteProfileFixtures)) {
	for (const keys of Object.values(profile.filterKeys)) {
		for (const key of keys) {
			assert.ok(catalogQueryFilterKeys.includes(key), `parser supports ${key}`);
			assert.ok(listingFilterControlKeys.includes(key), `UI represents ${key}`);
		}
	}
}

const cleanPath = "/primorsk/kvartiry/";
const clean = parseCatalogSearchParams("");
assert.ok(clean);
assert.equal(clean.page, 1);
assert.equal(clean.hasFilters, false);
assert.equal(catalogCanonicalPath(cleanPath, clean), cleanPath);

const pageTwo = parseCatalogSearchParams("page=2");
assert.ok(pageTwo);
assert.equal(catalogCanonicalPath(cleanPath, pageTwo), `${cleanPath}?page=2`);
assert.equal(pageHref(cleanPath, pageTwo, 1), cleanPath);
assert.equal(pageHref(cleanPath, pageTwo, 3), `${cleanPath}?page=3`);

const filtered = parseCatalogSearchParams(
	"rooms=2,1&priceFrom=5000000&priceTo=9000000&district=severnyy&areaFrom=40&areaTo=90&market=secondary&developer=stroitel&completionYear=2028&page=2&sort=priceAsc",
);
assert.ok(filtered);
assert.deepEqual(filtered.rooms, [1, 2]);
assert.equal(filtered.priceFromMinor, 500_000_000);
assert.equal(filtered.priceToMinor, 900_000_000);
assert.equal(filtered.areaFrom, 40);
assert.equal(filtered.areaTo, 90);
assert.equal(filtered.market, "secondary");
assert.equal(filtered.developer, "stroitel");
assert.equal(filtered.completionYear, 2028);
assert.deepEqual(catalogFilterKeysForQuery(filtered), [
	"rooms",
	"district",
	"price",
	"area",
	"market",
	"developer",
	"completionYear",
]);
assert.equal(filtered.hasFilters, true);
assert.equal(catalogCanonicalPath(cleanPath, filtered), cleanPath);
assert.equal(
	pageHref(cleanPath, filtered, 3),
	`${cleanPath}?page=3&sort=priceAsc&priceFrom=5000000&priceTo=9000000&rooms=1%2C2&district=severnyy&areaFrom=40&areaTo=90&market=secondary&developer=stroitel&completionYear=2028`,
);

for (const invalid of [
	"page=0",
	"page=2&page=3",
	"unknown=value",
	"priceFrom=900&priceTo=100",
	"rooms=-1",
	"district=INVALID",
	"areaFrom=90&areaTo=40",
	"market=rent",
	"developer=INVALID",
	"completionYear=1800",
]) {
	assert.equal(parseCatalogSearchParams(invalid), null, invalid);
}
assert.deepEqual(parsePageSearchParams("page=2"), {
	page: 2,
	queryString: "page=2",
});
assert.equal(parsePageSearchParams("sort=newest"), null);

assert.deepEqual(
	separateTrackingQueryParams("yclid=123&utm_source=yandex&page=2"),
	{
		functionalQueryString: "page=2",
		trackingQueryString: "yclid=123&utm_source=yandex",
	},
);
assert.deepEqual(
	parseCatalogSearchParams("yclid=123&utm_source=yandex"),
	clean,
	"tracking-only catalog requests use the clean content query",
);
assert.deepEqual(
	parseCatalogSearchParams("page=2&gclid=abc"),
	pageTwo,
	"tracking values never change normalized pagination",
);
assert.deepEqual(parsePageSearchParams("page=2&ysclid=abc"), {
	page: 2,
	queryString: "page=2",
});
assert.equal(
	parseCatalogSearchParams("unknown=value&utm_source=yandex"),
	null,
	"unknown functional keys remain fail-closed",
);

const catchAllPage = readFileSync(
	"src/app/(site)/[...segments]/page.tsx",
	"utf8",
);
const listingView = readFileSync(
	"packages/ui/src/views/catalog/ListingView.tsx",
	"utf8",
);
assert.match(catchAllPage, /searchParams:\s*Promise/);
assert.match(
	catchAllPage,
	/resolveRuntimeRoute\(routePath, queryString\(query\)\)/,
);
assert.match(
	listingView,
	/<a href=\{pageHref\(listing\.pagination\.previousPage\)\}>/,
);
assert.match(listingView, /<ListingFilterForm \{\.\.\.filterControls\} \/>/);
const runtimeRoute = readFileSync(
	"src/project/routing/runtime-route.ts",
	"utf8",
);
assert.match(runtimeRoute, /catalogFilterKeysForQuery\(catalogQuery\)/);
assert.match(runtimeRoute, /separateTrackingQueryParams\(queryString\)/);
assert.match(
	listingView,
	/<a href=\{pageHref\(listing\.pagination\.nextPage\)\}>/,
);

console.log("catalog query parser, canonical matrix and SSR hrefs verified");
