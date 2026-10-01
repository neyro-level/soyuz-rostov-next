import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createSafeNavigationBuilder } from "../src/core/navigation/index.ts";
import type { PageKey, ResolverPageRecord } from "../src/core/routing/index.ts";
import { createRouteResolver } from "../src/core/routing/index.ts";
import type { ContentGateDecision } from "../src/core/seo/content-gate.ts";
import {
	fixtureDeveloper,
	fixtureDevelopment,
	fixtureGeoHub,
	fixtureGeoSwitcherOptions,
	fixtureListing,
} from "../src/fixture/geo-catalog.ts";
import { createFixtureResolverDataPort } from "../src/fixture/resolver.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	projectBreadcrumbs,
	projectGeoSwitcherOptions,
	projectMenuLinks,
	projectObjectBreadcrumbs,
} from "../src/project/navigation.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

function gate(
	canonical: string,
	input: Partial<ContentGateDecision> = {},
): ContentGateDecision {
	return {
		statusCode: 200,
		indexing: "index",
		following: "follow",
		canonical,
		includeInSitemap: true,
		reasons: [],
		...input,
	};
}

function activeRecord(
	pageKey: PageKey,
	primaryGeo: string,
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
	};
}

for (const [name, profile] of Object.entries(siteProfileFixtures)) {
	const grammar = createProjectUrlGrammar(profile);
	const navigation = createSafeNavigationBuilder({ profile, grammar });
	const home = { kind: "home" } as const;
	const geo = { kind: "geoHub", geo: profile.primaryGeo } as const;
	const listing = {
		kind: "categoryGeo",
		geo: profile.primaryGeo,
		category: profile.preset === "NEWBUILD_FIRST" ? "novostroyki" : "kvartiry",
	} as const;
	const candidates = [home, geo, listing].map((pageKey) => ({
		pageKey,
		label: pageKey.kind,
		gate: gate(grammar.buildUrl(pageKey)),
	}));
	const links = navigation.links(candidates);
	assert.equal(links.length, candidates.length, `${name}: active links`);
	const resolver = createRouteResolver({
		profile,
		grammar,
		port: createFixtureResolverDataPort({
			grammar,
			pages: links.map(({ pageKey }) => ({
				pageKey,
				inventory: 20,
				record: activeRecord(pageKey, profile.primaryGeo),
			})),
		}),
	});
	for (const link of links) {
		const result = await resolver.resolvePath(link.href);
		assert.equal(result.kind, "page", `${name}: ${link.href}`);
		if (result.kind === "page") {
			assert.equal(result.canonicalPath, link.href, `${name}: canonical`);
			assert.equal(result.profileStatus, "ACTIVE", `${name}: active`);
		}
	}
	const cityOptions = Object.keys(profile.geos).map((geo) => ({
		id: geo,
		slug: geo,
		name: geo,
		nameGenitive: geo,
		nameLocative: geo,
		preposition: "в" as const,
		type: "city" as const,
		region: { id: "region", slug: "region", name: "Region", shortName: "R" },
	}));
	const switcher = projectGeoSwitcherOptions(cityOptions, { profile, grammar });
	assert.equal(
		switcher.length,
		profile.geoMode === "SINGLE_GEO"
			? 0
			: Object.values(profile.geos).filter(
					(geo) => geo.published && geo.hubStatus === "ACTIVE",
				).length,
		`${name}: profile-driven switcher`,
	);
	const menu = projectMenuLinks([], { profile, grammar });
	assert.ok(menu.length > 0, `${name}: profile-driven menu`);
	assert.ok(
		menu.every((item) => !item.href.includes("?")),
		`${name}: clean menu`,
	);
}

const profile = siteProfileFixtures.multiGeo;
const grammar = createProjectUrlGrammar(
	profile,
	fixtureDistrictRouteRegistryFor(profile),
);
const navigation = createSafeNavigationBuilder({ profile, grammar });
const inactiveGeo = { kind: "geoHub", geo: "zarechnyy" } as const;
const inactiveHref = grammar.buildUrl(inactiveGeo);
const blockedCandidates = [
	{
		pageKey: inactiveGeo,
		label: "NOINDEX_AUTO geo",
		gate: gate(inactiveHref, {
			indexing: "noindex",
			includeInSitemap: false,
		}),
	},
	{
		pageKey: { kind: "home" } as const,
		label: "Redirect",
		gate: gate("/", { statusCode: 301, includeInSitemap: false }),
	},
	{
		pageKey: { kind: "home" } as const,
		label: "Canonical mismatch",
		gate: gate("/wrong/"),
	},
];
assert.deepEqual(navigation.links(blockedCandidates), []);
const blockedGeoCandidate = blockedCandidates[0];
assert.ok(blockedGeoCandidate);

const breadcrumbs = navigation.breadcrumbs({
	ancestors: [
		{ pageKey: { kind: "home" }, label: "Главная", gate: gate("/") },
		blockedGeoCandidate,
	],
	currentLabel: "Объект",
});
assert.deepEqual(breadcrumbs.items, [
	{ pageKey: { kind: "home" }, href: "/", label: "Главная", count: undefined },
	{ label: "NOINDEX_AUTO geo" },
	{ label: "Объект" },
]);

assert.deepEqual(
	projectBreadcrumbs(
		[
			{ pageKey: { kind: "home" }, label: "Главная" },
			{ pageKey: inactiveGeo, label: "Заречный" },
		],
		"Объект",
		{ profile, grammar },
	).items,
	[
		{
			pageKey: { kind: "home" },
			href: "/",
			label: "Главная",
			count: undefined,
		},
		{ label: "Заречный" },
		{ label: "Объект" },
	],
	"inactive geo breadcrumb remains text",
);

assert.deepEqual(
	projectBreadcrumbs(
		[
			{ pageKey: { kind: "home" }, label: "Главная" },
			{
				pageKey: { kind: "geoHub", geo: "imported-city" },
				label: "Импортированный город",
			},
		],
		"Объект",
		{ profile, grammar },
	).items,
	[
		{
			pageKey: { kind: "home" },
			href: "/",
			label: "Главная",
			count: undefined,
		},
		{ label: "Импортированный город" },
		{ label: "Объект" },
	],
	"unknown persisted geo breadcrumb fails closed as text",
);

const activeObjectBreadcrumbs = projectObjectBreadcrumbs(
	{
		category: "kvartiry",
		city: { label: "Приморск", slug: profile.primaryGeo },
		currentLabel: "Квартира у моря",
	},
	{ profile, grammar },
);
assert.deepEqual(activeObjectBreadcrumbs.items, [
	{
		pageKey: { kind: "home" },
		href: grammar.buildUrl({ kind: "home" }),
		label: "Главная",
		count: undefined,
	},
	{
		pageKey: { kind: "categoryRoot", category: "kvartiry" },
		href: grammar.buildUrl({ kind: "categoryRoot", category: "kvartiry" }),
		label: "Квартиры",
		count: undefined,
	},
	{
		pageKey: { kind: "geoHub", geo: profile.primaryGeo },
		href: grammar.buildUrl({ kind: "geoHub", geo: profile.primaryGeo }),
		label: "Приморск",
		count: undefined,
	},
	{ label: "Квартира у моря" },
]);

const inactiveDevelopmentBreadcrumbs = projectObjectBreadcrumbs(
	{
		category: "novostroyki",
		city: { label: "Заречный", slug: "zarechnyy" },
		currentLabel: "ЖК Проверочный",
	},
	{ profile, grammar },
);
assert.deepEqual(
	inactiveDevelopmentBreadcrumbs.items.at(-2),
	{ label: "Заречный" },
	"inactive development city remains text",
);

function breadcrumbLinks(
	items: typeof fixtureDeveloper.breadcrumbs.items,
): Array<{ pageKey: PageKey; href: string; label: string }> {
	return items.flatMap((item) =>
		item.href && item.pageKey
			? [
					{
						pageKey: item.pageKey as PageKey,
						href: item.href,
						label: item.label,
					},
				]
			: [],
	);
}

const fixtureLinks = [
	...fixtureGeoHub.categoryLinks,
	...fixtureGeoHub.districtLinks,
	fixtureGeoHub.developerLink,
	...fixtureGeoHub.nearby,
	...fixtureListing.subLinks,
	...fixtureListing.nearby,
	...fixtureGeoSwitcherOptions,
	...breadcrumbLinks(fixtureDeveloper.breadcrumbs.items),
	...breadcrumbLinks(fixtureDevelopment.breadcrumbs.items),
];
const fixtureResolver = createRouteResolver({
	profile,
	grammar,
	port: createFixtureResolverDataPort({
		grammar,
		pages: fixtureLinks.map(({ pageKey }) => ({
			pageKey,
			inventory: 20,
			record: activeRecord(pageKey as PageKey, profile.primaryGeo),
		})),
	}),
});
for (const link of fixtureLinks) {
	assert.ok(!link.href.includes("?"), `query link forbidden: ${link.href}`);
	const result = await fixtureResolver.resolvePath(link.href);
	assert.equal(result.kind, "page", `fixture crawl: ${link.href}`);
	if (result.kind === "page") {
		assert.equal(
			result.canonicalPath,
			link.href,
			`fixture canonical: ${link.href}`,
		);
	}
}
assert.equal(fixtureGeoHub.nearby.length, 0, "NOINDEX_AUTO nearby hidden");
assert.equal(fixtureListing.nearby.length, 0, "NOINDEX_AUTO interlink hidden");
assert.equal(fixtureGeoSwitcherOptions.length, 1, "NOINDEX_AUTO menu hidden");

const breadcrumbSource = readFileSync(
	"packages/ui/src/views/shared/BreadcrumbsView.tsx",
	"utf8",
);
assert.match(breadcrumbSource, /index === breadcrumbs\.items\.length - 1/);
const runtimePageSource = readFileSync(
	"src/app/(site)/[...segments]/page.tsx",
	"utf8",
);
assert.doesNotMatch(
	runtimePageSource,
	/breadcrumb\(\s*\[\s*\{/,
	"runtime page must consume canonical breadcrumb DTOs instead of literals",
);

console.log(
	`verify:navigation passed (5 profiles; ${fixtureLinks.length} fixture links; zero 404/redirect/query links)`,
);
