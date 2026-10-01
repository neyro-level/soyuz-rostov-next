import assert from "node:assert/strict";
import {
	defineSiteProfile,
	getGeoHubStatus,
	isConfiguredRouteAvailable,
	isGeoHubAvailable,
	seoTierMetrics,
	siteProfileSchema,
} from "../src/core/profile/index.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { projectSiteProfileConfig } from "../src/project/site-profile.config.ts";
import {
	createPresetSiteProfileConfig,
	createProjectSiteProfile,
	siteProfile,
} from "../src/project/site-profile.ts";

for (const [name, fixture] of Object.entries(siteProfileFixtures)) {
	assert.equal(
		siteProfileSchema.safeParse(fixture).success,
		true,
		`${name} fixture`,
	);
	assert.equal(fixture.primaryGeo, "primorsk");
}
assert.equal(Object.keys(siteProfileFixtures).length, 5);
assert.deepEqual(
	siteProfile,
	createProjectSiteProfile(projectSiteProfileConfig),
);
assert.ok(
	["MIXED", "NEWBUILD_FIRST", "SECONDARY_FIRST"].includes(siteProfile.preset),
);
assert.ok(["SINGLE_GEO", "MULTI_GEO"].includes(siteProfile.geoMode));
assert.deepEqual(Object.keys(siteProfileFixtures.singleGeoThreeCities.geos), [
	"primorsk",
	"zarechnyy",
	"beregovoy",
]);
assert.equal(
	siteProfileFixtures.singleGeoThreeCities.geos.zarechnyy?.hubStatus,
	"PREPARED_OFF",
);
assert.equal(getGeoHubStatus(siteProfile, "missing"), "PREPARED_OFF");

const ownedFields = [
	"categoryStatus",
	"marketCapability",
	"geoCategoryStatus",
	"marketStatus",
	"developersSurface",
	"searchConsole",
	"filterKeys",
	"seoFacets",
	"seoTiers",
	"gate",
	"staticRoutes",
	"legacyRoutes",
	"legacyPatterns",
	"modules",
] as const;
for (const field of ownedFields) {
	assert.ok(field in projectSiteProfileConfig, `project config owns ${field}`);
}

function expectInvalid(
	name: string,
	path: readonly (string | number)[],
	mutate: (profile: Record<string, unknown>) => void,
) {
	const candidate = structuredClone(siteProfileFixtures.multiGeo) as Record<
		string,
		unknown
	>;
	mutate(candidate);
	const result = siteProfileSchema.safeParse(candidate);
	assert.equal(result.success, false, name);
	if (result.success) return;
	assert.ok(
		result.error.issues.some(
			(issue) => JSON.stringify(issue.path) === JSON.stringify(path),
		),
		`${name}: expected issue path ${path.join(".")}, received ${result.error.issues
			.map((issue) => issue.path.join("."))
			.join(", ")}`,
	);
}

expectInvalid("unknown primary geo", ["primaryGeo"], (profile) => {
	profile.primaryGeo = "missing";
});
expectInvalid(
	"single geo cannot expose two routable hubs",
	["geos"],
	(profile) => {
		profile.geoMode = "SINGLE_GEO";
	},
);
expectInvalid(
	"active geo category requires active platform category",
	["geoCategoryStatus", "primorsk", "kvartiry"],
	(profile) => {
		const category = profile.categoryStatus as Record<string, string>;
		category.kvartiry = "OUT";
	},
);
expectInvalid(
	"active geo market requires active platform market",
	["marketStatus", "primorsk", "secondary"],
	(profile) => {
		const market = profile.marketCapability as Record<string, string>;
		market.secondary = "PREPARED_OFF";
	},
);
expectInvalid(
	"active geo developers require active root",
	["developersSurface", "byGeo", "primorsk"],
	(profile) => {
		const developers = profile.developersSurface as {
			root: string;
			byGeo: Record<string, string>;
		};
		developers.root = "OUT";
	},
);
expectInvalid(
	"unknown geo matrix key",
	["marketStatus", "unknown"],
	(profile) => {
		const matrix = profile.marketStatus as Record<string, unknown>;
		matrix.unknown = { newbuild: "OUT", secondary: "OUT" };
	},
);
expectInvalid(
	"agglomeration parent must exist",
	["geos", "zarechnyy", "agglomerationOf"],
	(profile) => {
		const geos = profile.geos as Record<string, { agglomerationOf?: string }>;
		geos.zarechnyy.agglomerationOf = "missing";
	},
);
expectInvalid(
	"self agglomeration",
	["geos", "zarechnyy", "agglomerationOf"],
	(profile) => {
		const geos = profile.geos as Record<string, { agglomerationOf?: string }>;
		geos.zarechnyy.agglomerationOf = "zarechnyy";
	},
);
expectInvalid(
	"SEO facet geo must exist",
	["seoFacets", "dvukhkomnatnye", "geo"],
	(profile) => {
		const facets = profile.seoFacets as Record<string, { geo: string }>;
		facets.dvukhkomnatnye.geo = "missing";
	},
);
expectInvalid(
	"SEO facet filter key must be enabled",
	["seoFacets", "dvukhkomnatnye", "filter", "key"],
	(profile) => {
		const facets = profile.seoFacets as Record<
			string,
			{ filter: { key: string } }
		>;
		facets.dvukhkomnatnye.filter.key = "developer";
	},
);
expectInvalid(
	"price fail threshold follows stale threshold",
	["gate", "priceFailDays"],
	(profile) => {
		const gate = profile.gate as {
			priceStaleDays: number;
			priceFailDays: number;
		};
		gate.priceFailDays = gate.priceStaleDays;
	},
);
expectInvalid(
	"SEO tiers descend strictly",
	["seoTiers", "bands"],
	(profile) => {
		const seo = profile.seoTiers as { bands: { P2: number; TEST: number } };
		seo.bands.TEST = seo.bands.P2;
	},
);
expectInvalid("unknown profile field", [], (profile) => {
	profile.projectBrand = "must stay outside reusable core";
});

for (const metric of seoTierMetrics) {
	const candidate = structuredClone(siteProfileFixtures.singleGeo);
	candidate.seoTiers.metric = metric;
	assert.equal(siteProfileSchema.safeParse(candidate).success, true, metric);
}

const overriddenPreset = createPresetSiteProfileConfig({
	projectKind: "starter-demo",
	preset: "MIXED",
	geoMode: "SINGLE_GEO",
	primaryGeo: "primorsk",
	geos: { primorsk: { published: true, hubStatus: "ACTIVE" } },
	seoTiers: {
		metric: "broad39",
		snapshotDate: "2026-09-27",
		bands: { P1: 500, P2: 100, TEST: 50 },
		minInventory: { P1: 5, P2: 5, TEST: 10 },
		unmeasuredPolicy: "NONE",
	},
	legacyRoutes: [
		{ from: "/legacy-catalog", to: "/kvartiry/", statusCode: 301 },
	],
});
assert.equal(overriddenPreset.seoTiers.metric, "broad39");
assert.equal(overriddenPreset.legacyRoutes[0]?.from, "/legacy-catalog");
assert.deepEqual(overriddenPreset.legacyPatterns, [
	{ kind: "property", from: "/obekty/{slug}", statusCode: 301 },
]);
assert.deepEqual(overriddenPreset.seoFacets, {});
for (const requiredField of [
	"seoFacets",
	"seoTiers",
	"staticRoutes",
] as const) {
	const clientInput = {
		projectKind: "client" as const,
		preset: "MIXED" as const,
		geoMode: "SINGLE_GEO" as const,
		primaryGeo: "client-city",
		geos: { "client-city": { published: true, hubStatus: "ACTIVE" as const } },
		seoFacets: {},
		seoTiers: overriddenPreset.seoTiers,
		staticRoutes: overriddenPreset.staticRoutes,
	};
	delete (clientInput as Record<string, unknown>)[requiredField];
	assert.throws(
		() => createPresetSiteProfileConfig(clientInput),
		new RegExp(`Client preset requires explicit ${requiredField}`),
	);
}
assert.throws(
	() =>
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: "MIXED",
			geoMode: "SINGLE_GEO",
			primaryGeo: "primorsk",
			geos: { primorsk: { published: true, hubStatus: "ACTIVE" } },
			staticRoutes: [
				{
					path: "/obekty",
					changeFrequency: "weekly",
					priority: 0.5,
					indexable: true,
				},
			],
		}),
	/Legacy pattern root cannot collide/,
);
assert.throws(
	() =>
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: "MIXED",
			geoMode: "SINGLE_GEO",
			primaryGeo: "primorsk",
			geos: { primorsk: { published: true, hubStatus: "ACTIVE" } },
			legacyRoutes: [
				{ from: "/old-a", to: "/old-b/", statusCode: 301 },
				{ from: "/old-b", to: "/kvartiry/", statusCode: 301 },
			],
		}),
	/Legacy redirects must be direct and cannot form chains/,
);
assert.throws(
	() =>
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: "MIXED",
			geoMode: "SINGLE_GEO",
			primaryGeo: "primorsk",
			geos: { primorsk: { published: true, hubStatus: "ACTIVE" } },
			legacyRoutes: [
				{ from: "/old-a", to: "/kvartiry", statusCode: 301 },
			],
		}),
	/legacyRoutes\[0\]\.to must be a canonical project URL/,
);
assert.throws(
	() =>
		createPresetSiteProfileConfig({
			projectKind: "starter-demo",
			preset: "MIXED",
			geoMode: "SINGLE_GEO",
			primaryGeo: "primorsk",
			geos: { primorsk: { published: true, hubStatus: "ACTIVE" } },
			categoryStatus: { kvartiry: "ACTIVE" } as never,
		}),
	/categoryStatus/,
);

assert.equal(
	isConfiguredRouteAvailable({ status: "NOINDEX_AUTO", inventory: 0 }),
	false,
);
assert.equal(
	isConfiguredRouteAvailable({ status: "NOINDEX_AUTO", inventory: 1 }),
	true,
);
assert.equal(
	isConfiguredRouteAvailable({ status: "ACTIVE", inventory: 0 }),
	true,
);
assert.equal(
	isGeoHubAvailable({
		published: false,
		hubStatus: "ACTIVE",
		inventory: 100,
	}),
	false,
);
assert.equal(
	isGeoHubAvailable({
		published: true,
		hubStatus: "OUT",
		inventory: 100,
	}),
	false,
);

assert.deepEqual(
	defineSiteProfile(siteProfileFixtures.singleGeo),
	siteProfileFixtures.singleGeo,
);
console.log(
	"verify:site-profile passed (5 fixtures + explicit matrices + invalid paths)",
);
