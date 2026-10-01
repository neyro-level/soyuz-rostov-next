import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { defineSiteProfile } from "../src/core/profile/index.ts";
import {
	createRouteResolver,
	type PageKey,
	type ResolverPageRecord,
} from "../src/core/routing/index.ts";
import { createFixtureResolverDataPort } from "../src/fixture/resolver.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	legacyRouteManifest,
	matchLegacyRoute,
} from "../src/project/routing/legacy-route-manifest.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

function activeRecord(
	pageKey: PageKey,
	primaryGeo: string,
	overrides: Partial<ResolverPageRecord> = {},
): ResolverPageRecord {
	return {
		lifecycle: "active",
		geo: "geo" in pageKey ? pageKey.geo : primaryGeo,
		market:
			pageKey.kind === "property"
				? "secondary"
				: pageKey.kind === "development"
					? "newbuild"
					: null,
		dataTier: pageKey.kind === "development" ? "B" : null,
		...overrides,
	};
}

for (const [name, profile] of Object.entries(siteProfileFixtures)) {
	const grammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	const primaryGeo = profile.primaryGeo;
	const pageKeys: PageKey[] = [
		{ kind: "home" },
		{ kind: "geoHub", geo: primaryGeo },
		{ kind: "categoryRoot", category: "kvartiry" },
		{ kind: "categoryGeo", geo: primaryGeo, category: "kvartiry" },
		{ kind: "developerRoot" },
	];
	const pages = pageKeys.map((pageKey) => ({
		pageKey,
		inventory: 12,
		record: activeRecord(pageKey, primaryGeo),
	}));
	const resolver = createRouteResolver({
		profile,
		grammar,
		port: createFixtureResolverDataPort({ grammar, pages }),
	});
	assert.equal((await resolver.resolvePath("/")).kind, "page", name);
	assert.equal(
		(await resolver.resolvePath(`/${primaryGeo}/`)).kind,
		"page",
		name,
	);
	assert.deepEqual(await resolver.resolvePath(`/${primaryGeo.toUpperCase()}`), {
		kind: "redirect",
		destinationPath: `/${primaryGeo}/`,
		statusCode: 308,
	});
	const root = await resolver.resolvePath("/kvartiry/");
	assert.equal(root.kind, "page", name);
	if (root.kind === "page" && profile.geoMode === "SINGLE_GEO") {
		assert.equal(root.profileStatus, "NOINDEX_AUTO");
	}
}

assert.deepEqual(legacyRouteManifest.routes, siteProfile.legacyRoutes);
assert.deepEqual(legacyRouteManifest.patterns, siteProfile.legacyPatterns);
for (const route of siteProfile.legacyRoutes) {
	assert.deepEqual(matchLegacyRoute(`${route.from}/`), {
		kind: "route",
		destination: route.to,
		statusCode: route.statusCode,
	});
}
assert.deepEqual(matchLegacyRoute("/obekty/dom-42"), {
	kind: "property",
	slug: "dom-42",
	statusCode: 301,
});
assert.deepEqual(matchLegacyRoute("/obekty/dom-42/"), {
	kind: "property",
	slug: "dom-42",
	statusCode: 301,
});
assert.deepEqual(
	matchLegacyRoute("/kvartiry-rostova/svetlaya-kvartira-v-centre/"),
	{
		kind: "legacyApartment",
		slug: "svetlaya-kvartira-v-centre",
		statusCode: 301,
	},
);
assert.deepEqual(matchLegacyRoute("/not-a-configured-legacy-route/"), {
	kind: "none",
});
assert.deepEqual(matchLegacyRoute("/kvartiry/"), { kind: "none" });

const profile = siteProfileFixtures.multiGeo;
const grammar = createProjectUrlGrammar(
	profile,
	fixtureDistrictRouteRegistryFor(profile),
);
const canonicalProperty = {
	kind: "property",
	category: "kvartiry",
	semantic: "ulitsa-mira-10",
	publicUrlId: 42,
} as const;
const wrongCategoryProperty = {
	...canonicalProperty,
	category: "doma",
} as const;
const replacementProperty = {
	...canonicalProperty,
	semantic: "ulitsa-mira-12",
	publicUrlId: 43,
} as const;
const goneProperty = {
	...canonicalProperty,
	semantic: "gone",
	publicUrlId: 44,
} as const;
const movedProperty = {
	...canonicalProperty,
	semantic: "moved",
	publicUrlId: 45,
} as const;
const archivedProperty = {
	...canonicalProperty,
	semantic: "archive",
	publicUrlId: 46,
} as const;
const lowInventory = {
	kind: "categoryGeo",
	geo: "zarechnyy",
	category: "kvartiry",
} as const;
const port = createFixtureResolverDataPort({
	grammar,
	pages: [
		{
			pageKey: canonicalProperty,
			inventory: 1,
			record: activeRecord(canonicalProperty, profile.primaryGeo),
		},
		{
			pageKey: wrongCategoryProperty,
			inventory: 1,
			record: activeRecord(wrongCategoryProperty, profile.primaryGeo, {
				canonicalPageKey: canonicalProperty,
			}),
		},
		{
			pageKey: replacementProperty,
			inventory: 1,
			record: activeRecord(replacementProperty, profile.primaryGeo),
		},
		{
			pageKey: goneProperty,
			inventory: 0,
			record: activeRecord(goneProperty, profile.primaryGeo, {
				lifecycle: "purged",
			}),
		},
		{
			pageKey: movedProperty,
			inventory: 0,
			record: activeRecord(movedProperty, profile.primaryGeo, {
				lifecycle: "purged",
				replacementPageKey: replacementProperty,
			}),
		},
		{
			pageKey: archivedProperty,
			inventory: 1,
			record: activeRecord(archivedProperty, profile.primaryGeo, {
				lifecycle: "archived",
			}),
		},
		{
			pageKey: lowInventory,
			inventory: 0,
			record: activeRecord(lowInventory, profile.primaryGeo),
		},
	],
	redirects: {
		"/old-property/": grammar.buildUrl(canonicalProperty),
		"/chain-a/": "/chain-b/",
		"/chain-b/": grammar.buildUrl(canonicalProperty),
		"/loop/": "/loop/",
	},
});
const resolver = createRouteResolver({ profile, grammar, port });

assert.deepEqual(await resolver.resolvePath("/old-property/"), {
	kind: "redirect",
	destinationPath: grammar.buildUrl(canonicalProperty),
	statusCode: 301,
});
for (const path of ["/chain-a/", "/loop/"]) {
	assert.deepEqual(await resolver.resolvePath(path), {
		kind: "notFound",
		statusCode: 404,
	});
}
assert.deepEqual(
	await resolver.resolvePath(grammar.buildUrl(wrongCategoryProperty)),
	{
		kind: "redirect",
		destinationPath: grammar.buildUrl(canonicalProperty),
		statusCode: 301,
	},
);
assert.deepEqual(await resolver.resolvePath(grammar.buildUrl(goneProperty)), {
	kind: "gone",
	statusCode: 410,
});
assert.deepEqual(await resolver.resolvePath(grammar.buildUrl(movedProperty)), {
	kind: "redirect",
	destinationPath: grammar.buildUrl(replacementProperty),
	statusCode: 301,
});
const archived = await resolver.resolvePath(grammar.buildUrl(archivedProperty));
assert.equal(archived.kind, "page");
if (archived.kind === "page") {
	assert.equal(archived.lifecycle, "archived");
	assert.equal(archived.profileStatus, "ACTIVE");
}
for (const path of [
	"/kvartiry/primorsk/",
	"/novostroyki/primorsk/",
	"/primorsk/kvartiry/severnyy/dvukhkomnatnye/",
	"/primorsk/kvartiry/severnyy/extra/",
	"/missing/",
]) {
	assert.deepEqual(await resolver.resolvePath(path), {
		kind: "notFound",
		statusCode: 404,
	});
}
assert.deepEqual(await resolver.resolvePath(grammar.buildUrl(lowInventory)), {
	kind: "notFound",
	statusCode: 404,
});

const inactiveInput = structuredClone(siteProfileFixtures.multiGeo);
inactiveInput.geos.zarechnyy.hubStatus = "OUT";
const inactiveProfile = defineSiteProfile(inactiveInput);
const inactiveGrammar = createProjectUrlGrammar(
	inactiveProfile,
	fixtureDistrictRouteRegistryFor(inactiveProfile),
);
const inactiveGeoKey = { kind: "geoHub", geo: "zarechnyy" } as const;
const inactiveResolver = createRouteResolver({
	profile: inactiveProfile,
	grammar: inactiveGrammar,
	port: createFixtureResolverDataPort({
		grammar: inactiveGrammar,
		pages: [
			{
				pageKey: inactiveGeoKey,
				inventory: 12,
				record: activeRecord(inactiveGeoKey, inactiveProfile.primaryGeo),
			},
		],
	}),
});
assert.deepEqual(
	await inactiveResolver.resolvePath(inactiveGrammar.buildUrl(inactiveGeoKey)),
	{ kind: "notFound", statusCode: 404 },
);

const singleProfile = siteProfileFixtures.singleGeoThreeCities;
const singleGrammar = createProjectUrlGrammar(singleProfile);
const forbiddenSecondaryGeo = {
	kind: "categoryGeo",
	geo: "zarechnyy",
	category: "kvartiry",
} as const;
const singleResolver = createRouteResolver({
	profile: singleProfile,
	grammar: singleGrammar,
	port: createFixtureResolverDataPort({
		grammar: singleGrammar,
		pages: [
			{
				pageKey: forbiddenSecondaryGeo,
				inventory: 12,
				record: activeRecord(forbiddenSecondaryGeo, singleProfile.primaryGeo),
			},
		],
	}),
});
assert.deepEqual(
	await singleResolver.resolvePath(
		singleGrammar.buildUrl(forbiddenSecondaryGeo),
	),
	{ kind: "notFound", statusCode: 404 },
);

const secondaryProfile = siteProfileFixtures.secondaryFirst;
const secondaryGrammar = createProjectUrlGrammar(
	secondaryProfile,
	fixtureDistrictRouteRegistryFor(secondaryProfile),
);
const preparedOffKey = {
	kind: "categoryGeo",
	geo: "primorsk",
	category: "novostroyki",
} as const;
const secondaryResolver = createRouteResolver({
	profile: secondaryProfile,
	grammar: secondaryGrammar,
	port: createFixtureResolverDataPort({
		grammar: secondaryGrammar,
		pages: [
			{
				pageKey: preparedOffKey,
				inventory: 12,
				record: activeRecord(preparedOffKey, secondaryProfile.primaryGeo),
			},
		],
	}),
});
assert.deepEqual(
	await secondaryResolver.resolvePath(
		secondaryGrammar.buildUrl(preparedOffKey),
	),
	{ kind: "notFound", statusCode: 404 },
);

const resolverSource = readFileSync("src/core/routing/resolver.ts", "utf8");
for (const forbidden of [
	'from "next',
	'from "payload',
	"@/project",
	"../project",
]) {
	assert.ok(
		!resolverSource.includes(forbidden),
		`resolver imports ${forbidden}`,
	);
}

const proxySource = readFileSync("src/proxy.ts", "utf8");
for (const forbidden of [
	"district-registry",
	'collection: "districts"',
	"getCachedDistrictRouteRegistry",
]) {
	assert.ok(!proxySource.includes(forbidden), `proxy contains ${forbidden}`);
}

console.log(
	"verify:resolver passed (five profiles + page/redirect/404/410 + no-chain matrix)",
);
