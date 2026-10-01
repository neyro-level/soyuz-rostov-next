import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	createRouteResolver,
	type PageKey,
} from "../src/core/routing/index.ts";
import { separateTrackingQueryParams } from "../src/core/seo/tracking-query-params.ts";
import { createFixtureResolverDataPort } from "../src/fixture/resolver.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { parseCatalogSearchParams } from "../src/project/routing/catalog-search-params.ts";
import { publicGatewayRouteCacheIdentity } from "../src/project/routing/public-gateway-cache.ts";
import {
	createProjectSiteProfile,
	siteProfile,
} from "../src/project/site-profile.ts";
import { createPresetSiteProfileConfig } from "../src/project/site-profile-presets.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

const generatedProfile = (
	preset: "NEWBUILD_FIRST" | "SECONDARY_FIRST" | "MIXED",
	geoMode: "SINGLE_GEO" | "MULTI_GEO",
) =>
	createProjectSiteProfile(
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset,
			geoMode,
			primaryGeo: "testograd",
			geos: {
				testograd: { published: true, hubStatus: "ACTIVE" },
				...(geoMode === "MULTI_GEO"
					? { vtorograd: { published: true, hubStatus: "ACTIVE" as const } }
					: {}),
			},
		}),
	);

const profiles = [
	{ name: "souz", profile: siteProfile },
	{
		name: "newbuild-first",
		profile: generatedProfile("NEWBUILD_FIRST", "SINGLE_GEO"),
	},
	{
		name: "secondary-first",
		profile: generatedProfile("SECONDARY_FIRST", "SINGLE_GEO"),
	},
	{ name: "multi-geo", profile: generatedProfile("MIXED", "MULTI_GEO") },
	{
		name: "districts-legacy",
		profile: generatedProfile("MIXED", "SINGLE_GEO"),
	},
] as const;

const queryCases = [
	{ name: "clean", query: "", functional: "" },
	{ name: "utm", query: "utm_source=yandex", functional: "" },
	{ name: "yclid", query: "yclid=123", functional: "" },
	{ name: "gclid", query: "gclid=paid-click", functional: "" },
	{
		name: "mixed",
		query: "_openstat=campaign&utm_source=yandex&utm_medium=cpc",
		functional: "",
	},
	{
		name: "filter-plus-tracking",
		query: "rooms=2&utm_source=yandex&yclid=123",
		functional: "rooms=2",
	},
] as const;

for (const { name, profile } of profiles) {
	const pageKey = {
		kind: "categoryGeo",
		geo: profile.primaryGeo,
		category: "kvartiry",
	} as const satisfies PageKey;
	const cleanPath = `/${profile.primaryGeo}/kvartiry/`;
	const grammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	const resolver = createRouteResolver({
		profile,
		grammar,
		port: createFixtureResolverDataPort({
			grammar,
			pages: [
				{
					pageKey,
					inventory: 12,
					record: {
						lifecycle: "active",
						geo: profile.primaryGeo,
						market: null,
						dataTier: null,
					},
				},
			],
		}),
	});
	const cleanRoute = await resolver.resolvePath(cleanPath);
	assert.equal(cleanRoute.kind, "page", name);
	if (cleanRoute.kind !== "page")
		throw new Error(`${name}: fixture listing route is absent.`);
	assert.equal(cleanRoute.canonicalPath, cleanPath, name);
	const cleanQuery = parseCatalogSearchParams("");
	assert.ok(cleanQuery);
	const cleanCacheIdentity = publicGatewayRouteCacheIdentity(
		profile,
		pageKey,
		"",
	);
	assert.ok(cleanCacheIdentity);

	for (const testCase of queryCases) {
		const partition = separateTrackingQueryParams(testCase.query);
		assert.equal(
			partition.functionalQueryString,
			testCase.functional,
			`${name}/${testCase.name}`,
		);
		const parsed = parseCatalogSearchParams(testCase.query);
		assert.ok(parsed, `${name}/${testCase.name}`);
		if (!testCase.functional)
			assert.deepEqual(parsed, cleanQuery, `${name}/${testCase.name}`);
		const identity = publicGatewayRouteCacheIdentity(
			profile,
			pageKey,
			testCase.query,
		);
		if (!testCase.functional)
			assert.deepEqual(
				identity,
				cleanCacheIdentity,
				`${name}/${testCase.name}`,
			);
	}
}

assert.equal(
	parseCatalogSearchParams("unknown=value&utm_source=yandex"),
	null,
	"unknown functional keys stay fail-closed",
);
assert.equal(
	parseCatalogSearchParams("from=campaign"),
	null,
	"from requires an explicit project tracking opt-in",
);

const runtime = readFileSync("src/project/routing/runtime-route.ts", "utf8");
assert.match(
	runtime,
	/separateTrackingQueryParams\(queryString\)\.functionalQueryString[\s\S]{0,900}publicGatewayRouteCacheIdentity/,
);

console.log(
	`tracking traffic PASS: ${profiles.length} profiles x ${queryCases.length} clean/tracking/filter cases preserve canonical and cache decisions.`,
);
