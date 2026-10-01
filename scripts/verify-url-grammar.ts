import assert from "node:assert/strict";
import { catalogSurfaceSlugs } from "../src/core/profile/index.ts";
import {
	createUrlGrammar,
	type PageKey,
	propertySurfaceSlugs,
	transliterateToSlug,
} from "../src/core/routing/index.ts";
import {
	fixtureDistrictRouteRegistry,
	fixtureDistrictRouteRegistryFor,
} from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { projectStaticRoutes } from "../src/project/static-routes.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

function keysFor(geo: string): PageKey[] {
	const keys: PageKey[] = [
		{ kind: "home" },
		{ kind: "geoHub", geo },
		{ kind: "categoryRoot", category: "kvartiry" },
		{ kind: "categoryGeo", geo, category: "kvartiry" },
		{ kind: "geoDevelopers", geo },
		{
			kind: "property",
			category: "kvartiry",
			semantic: "ulitsa-mira-10",
			publicUrlId: 42,
		},
		{
			kind: "development",
			developmentKind: "residential_complex",
			slug: "primorskiy",
		},
		{
			kind: "development",
			developmentKind: "cottage_village",
			slug: "sosnovyy-bor",
		},
		{ kind: "developerRoot" },
		{ kind: "developer", slug: "stroy-invest" },
		{ kind: "static", path: "/uslugi/" },
	];
	if (geo === "primorsk" || geo === "zarechnyy") {
		keys.push(
			{
				kind: "categoryGeoDistrict",
				geo,
				category: "kvartiry",
				district: geo === "primorsk" ? "severnyy" : "tsentralnyy",
			},
			{
				kind: "categoryGeoFacet",
				geo,
				category: "kvartiry",
				facet: geo === "primorsk" ? "dvukhkomnatnye" : "odnokomnatnye",
			},
		);
	}
	return keys;
}

for (const [profileName, profile] of Object.entries(siteProfileFixtures)) {
	const grammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	for (const geo of Object.keys(profile.geos)) {
		for (const key of keysFor(geo)) {
			const url = grammar.buildUrl(key);
			assert.deepEqual(
				grammar.parseUrl(url),
				key,
				`${profileName}: ${key.kind}`,
			);
			assert.equal(url, url.toLowerCase());
			assert.ok(url === "/" || url.endsWith("/"));
		}
		for (const category of catalogSurfaceSlugs) {
			for (const key of [
				{ kind: "categoryRoot", category },
				{ kind: "categoryGeo", geo, category },
			] as const) {
				assert.deepEqual(grammar.parseUrl(grammar.buildUrl(key)), key);
			}
		}
	}
	for (const category of propertySurfaceSlugs) {
		for (const semantic of ["dom", "ulitsa-mira-10", "loft-2026"]) {
			for (const publicUrlId of [1, 42, Number.MAX_SAFE_INTEGER]) {
				const key = {
					kind: "property",
					category,
					semantic,
					publicUrlId,
				} as const;
				assert.deepEqual(grammar.parseUrl(grammar.buildUrl(key)), key);
			}
		}
	}
	for (const route of projectStaticRoutes) {
		if (route.path === "/") continue;
		const key = { kind: "static", path: `${route.path}/` } as const;
		assert.deepEqual(grammar.parseUrl(grammar.buildUrl(key)), key);
	}
}

const grammar = createProjectUrlGrammar(
	siteProfileFixtures.multiGeo,
	fixtureDistrictRouteRegistry,
);
const uppercase = grammar.parseUrl("/PRIMORSK/KVARTIRY");
assert.deepEqual(uppercase, {
	kind: "categoryGeo",
	geo: "primorsk",
	category: "kvartiry",
});
assert.equal(
	uppercase ? grammar.buildUrl(uppercase) : null,
	"/primorsk/kvartiry/",
);
assert.deepEqual(grammar.parseUrl("/kvartiry/ulitsa-mira-10-42/?from=test"), {
	kind: "property",
	category: "kvartiry",
	semantic: "ulitsa-mira-10",
	publicUrlId: 42,
});

assert.equal(
	transliterateToSlug("Й Ё Ж Х Ц Ч Ш Щ Ы Ь Ъ"),
	"y-e-zh-kh-ts-ch-sh-shch-y",
);
assert.equal(transliterateToSlug("ЖК «Северный Берег»"), "zhk-severnyy-bereg");

for (const invalidPath of [
	"relative/path",
	"/primorsk/kvartiry/severnyy/extra/",
	"/primorsk//kvartiry/",
	"/novostroyki/kp-wrong-prefix/",
	"/novostroyki/zhk-zhk-duplicate/",
	"/kottedzhnye-poselki/zhk-wrong-prefix/",
	"/kvartiry/no-public-id/",
	"/kvartiry/api-42/",
	"/kvartiry/object-0/",
	"/zastroyshchiki/api/",
	"/unknown/",
	"/%D0%B6%D0%BA/",
]) {
	assert.equal(grammar.parseUrl(invalidPath), null, invalidPath);
}

assert.throws(() =>
	createUrlGrammar({ geoSlugs: ["api"], staticPaths: ["/uslugi/"] }),
);
assert.throws(() =>
	createUrlGrammar({ geoSlugs: ["sitemap-extra"], staticPaths: ["/uslugi/"] }),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["journal"],
		staticPaths: ["/uslugi/"],
		moduleRootSlugs: ["journal"],
	}),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["primorsk"],
		staticPaths: ["/uslugi/"],
		districtSlugsByGeoCategory: {
			primorsk: { kvartiry: ["severnyy", "severnyy"] },
		},
	}),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["primorsk"],
		staticPaths: ["/uslugi/"],
		districtSlugsByGeoCategory: { primorsk: { kvartiry: ["api"] } },
	}),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["primorsk"],
		staticPaths: ["/uslugi/"],
		facetSlugsByGeoCategory: { primorsk: { kvartiry: ["api"] } },
	}),
);
assert.throws(() =>
	createUrlGrammar({ geoSlugs: ["primorsk"], staticPaths: ["/kvartiry/"] }),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["primorsk"],
		staticPaths: ["/kvartiry/special/"],
	}),
);
assert.throws(() =>
	createUrlGrammar({
		geoSlugs: ["primorsk"],
		staticPaths: ["/uslugi/"],
		districtSlugsByGeoCategory: {
			primorsk: { kvartiry: ["severnyy"] },
		},
		facetSlugsByGeoCategory: { primorsk: { kvartiry: ["severnyy"] } },
	}),
);
assert.throws(() => grammar.buildUrl({ kind: "developer", slug: "api" }));
assert.throws(() =>
	grammar.buildUrl({ kind: "developer", slug: "sitemap-extra" }),
);
assert.throws(() => grammar.buildUrl({ kind: "geoHub", geo: "unknown" }));
assert.throws(() =>
	grammar.buildUrl({
		kind: "categoryGeoDistrict",
		geo: "primorsk",
		category: "kvartiry",
		district: "unknown",
	}),
);
assert.throws(() =>
	grammar.buildUrl({
		kind: "development",
		developmentKind: "residential_complex",
		slug: "zhk-duplicate",
	}),
);
assert.throws(() =>
	grammar.buildUrl({
		kind: "property",
		category: "kvartiry",
		semantic: "dom",
		publicUrlId: 0,
	}),
);

console.log(
	"verify:url-grammar passed (all PageKey/profile round-trips + collision matrix)",
);
