import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
	catalogSurfaceSlugs,
	type SiteProfile,
} from "../src/core/profile/index.ts";
import {
	createRouteResolver,
	type PageKey,
	type ResolverPageRecord,
} from "../src/core/routing/index.ts";
import { buildDiscoveryShards } from "../src/core/seo/discovery-feeds.ts";
import { createFixtureResolverDataPort } from "../src/fixture/resolver.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	projectGeoSwitcherOptions,
	projectMenuLinks,
} from "../src/project/navigation.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

function activeRecord(
	pageKey: PageKey,
	profile: SiteProfile,
): ResolverPageRecord {
	return {
		lifecycle: "active",
		geo: "geo" in pageKey ? pageKey.geo : profile.primaryGeo,
		market:
			pageKey.kind === "property"
				? "secondary"
				: pageKey.kind === "development"
					? "newbuild"
					: null,
		dataTier: pageKey.kind === "development" ? "B" : null,
	};
}

const expectedOwnerKeys = [
	"categoryStatus",
	"marketCapability",
	"geoCategoryStatus",
	"marketStatus",
	"developersSurface",
	"seoTiers",
	"gate",
	"staticRoutes",
	"modules",
] as const;
const matrix: Record<string, unknown>[] = [];
const stableEntityUrls = new Map<string, Set<string>>();

for (const [name, profile] of Object.entries(siteProfileFixtures)) {
	assert.equal(
		Object.keys(siteProfileFixtures).length,
		5,
		"Acceptance matrix must own exactly five profiles.",
	);
	for (const key of expectedOwnerKeys)
		assert.ok(profile[key], `${name}: missing ${key} owner.`);
	assert.deepEqual(
		Object.keys(profile.categoryStatus).sort(),
		[...catalogSurfaceSlugs].sort(),
	);
	assert.deepEqual(Object.keys(profile.marketCapability).sort(), [
		"newbuild",
		"secondary",
	]);
	for (const geo of Object.keys(profile.geos)) {
		assert.ok(
			profile.geoCategoryStatus[geo],
			`${name}: missing geoCategoryStatus.${geo}`,
		);
		assert.ok(
			profile.marketStatus[geo],
			`${name}: missing marketStatus.${geo}`,
		);
	}

	const grammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	const entityKeys: PageKey[] = [
		{
			kind: "property",
			category: "kvartiry",
			semantic: "stable-object",
			publicUrlId: 42,
		},
		{
			kind: "development",
			developmentKind: "residential_complex",
			slug: "stable-development",
		},
		{ kind: "developer", slug: "stable-developer" },
	];
	for (const pageKey of entityKeys) {
		const identity = pageKey.kind;
		const urls = stableEntityUrls.get(identity) ?? new Set<string>();
		urls.add(grammar.buildUrl(pageKey));
		stableEntityUrls.set(identity, urls);
	}

	const pageKeys: PageKey[] = [
		{ kind: "home" },
		...profile.staticRoutes
			.filter((route) => route.path !== "/")
			.map((route) => ({
				kind: "static" as const,
				path: `${route.path.replace(/\/$/, "")}/` as `/${string}/`,
			})),
		...Object.entries(profile.categoryStatus).map(([category]) => ({
			kind: "categoryRoot" as const,
			category: category as (typeof catalogSurfaceSlugs)[number],
		})),
		{ kind: "geoHub", geo: profile.primaryGeo },
		...Object.entries(profile.geoCategoryStatus[profile.primaryGeo] ?? {})
			.filter(([, status]) => status === "ACTIVE")
			.map(([category]) => ({
				kind: "categoryGeo" as const,
				geo: profile.primaryGeo,
				category: category as (typeof catalogSurfaceSlugs)[number],
			})),
		{ kind: "developerRoot" },
		{ kind: "geoDevelopers", geo: profile.primaryGeo },
		...entityKeys,
	];
	const pages = pageKeys.map((pageKey) => ({
		pageKey,
		inventory: 20,
		record: activeRecord(pageKey, profile),
	}));
	const resolver = createRouteResolver({
		profile,
		grammar,
		port: createFixtureResolverDataPort({ grammar, pages }),
	});

	for (const pageKey of pageKeys) {
		const url = grammar.buildUrl(pageKey);
		assert.deepEqual(
			grammar.parseUrl(url),
			pageKey,
			`${name}: build/parse ${url}`,
		);
	}
	for (const category of ["novostroyki", "kvartiry"] as const) {
		assert.deepEqual(
			await resolver.resolvePath(`/${category}/${profile.primaryGeo}/`),
			{ kind: "notFound", statusCode: 404 },
			`${name}: category-first must fail closed`,
		);
	}

	const cities = Object.keys(profile.geos).map((geo) => ({
		id: geo,
		slug: geo,
		name: geo,
		nameGenitive: geo,
		nameLocative: geo,
		preposition: "в" as const,
		type: "city" as const,
		region: { id: "region", slug: "region", name: "Region", shortName: "R" },
	}));
	const switcher = projectGeoSwitcherOptions(cities, { profile, grammar });
	assert.equal(
		profile.geoMode === "MULTI_GEO",
		switcher.length > 0,
		`${name}: switcher visibility`,
	);
	const links = [...projectMenuLinks([], { profile, grammar }), ...switcher];
	for (const link of links) {
		const decision = await resolver.resolvePath(link.href);
		assert.equal(
			decision.kind,
			"page",
			`${name}: link must not target 404 ${link.href}`,
		);
	}

	const sitemapCandidates = [];
	for (const pageKey of pageKeys) {
		const path = grammar.buildUrl(pageKey);
		const decision = await resolver.resolvePath(path);
		if (decision.kind !== "page" || decision.profileStatus !== "ACTIVE")
			continue;
		sitemapCandidates.push({
			group:
				pageKey.kind === "static" || pageKey.kind === "home"
					? ("static" as const)
					: ("catalog" as const),
			path,
			canonicalPath: path,
			lastModified: "2026-09-26T00:00:00.000Z",
			published: true,
			gate: {
				statusCode: 200 as const,
				indexing: "index" as const,
				following: "follow" as const,
				canonical: path,
				includeInSitemap: true,
				reasons: ["s12_acceptance"],
			},
		});
	}
	const shards = buildDiscoveryShards({
		publicOrigin: "https://example.test",
		candidates: sitemapCandidates,
	});
	for (const entry of shards.flatMap((shard) => shard.entries)) {
		const path = new URL(entry.url).pathname;
		assert.equal(
			(await resolver.resolvePath(path)).kind,
			"page",
			`${name}: sitemap URL ${path}`,
		);
	}

	if (profile.geoMode === "SINGLE_GEO") {
		for (const geo of Object.keys(profile.geos).filter(
			(geo) => geo !== profile.primaryGeo,
		)) {
			assert.deepEqual(await resolver.resolvePath(`/${geo}/`), {
				kind: "notFound",
				statusCode: 404,
			});
		}
	}
	matrix.push({
		profile: name,
		geoMode: profile.geoMode,
		menuLinks: links.length,
		switcherLinks: switcher.length,
		sitemapUrls: shards.flatMap((shard) => shard.entries).length,
		categoryFirst: 404,
		ownerKeys: expectedOwnerKeys,
	});
}

for (const [entity, urls] of stableEntityUrls) {
	assert.equal(
		urls.size,
		1,
		`${entity} URL must be stable across all profiles.`,
	);
}
const runtimeSource = await readFile(
	"src/project/routing/runtime-route.ts",
	"utf8",
);
assert.match(runtimeSource, /return countInventory\(payload,/);
assert.doesNotMatch(runtimeSource, /return\s+100\s*;/);

const evidence = {
	profiles: matrix,
	stableEntityUrls: Object.fromEntries(
		[...stableEntityUrls].map(([entity, urls]) => [entity, [...urls][0]]),
	),
	d10: "runtime resolver delegates inventory to the Public Gateway countInventory data port",
	result: "PASS",
};
if (process.argv.includes("--write-evidence")) {
	const output = resolve("docs/evidence/plan9/S12_ACCEPTANCE_MATRIX.json");
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
}
console.log(
	`S12 acceptance matrix PASS: ${matrix.length} profiles; stable entity URLs; sitemap links resolve.`,
);
