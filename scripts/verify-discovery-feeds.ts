import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { evaluateContentGate } from "../src/core/seo/content-gate.ts";
import {
	buildDiscoveryShards,
	type DiscoveryCandidate,
	discoveryGroups,
	latestLastModified,
	renderDiscoveryRobots,
	renderSitemapIndexXml,
	renderSitemapXml,
} from "../src/core/seo/discovery-feeds.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";

const origin = "https://example.test";
const now = new Date("2026-09-25T12:00:00.000Z");
const intro = "а".repeat(700);

function listingCandidate(
	name: keyof typeof siteProfileFixtures,
): DiscoveryCandidate {
	const profile = siteProfileFixtures[name];
	const path = `/kvartiry/${name}/`;
	const gate = evaluateContentGate(
		profile,
		{
			kind: "listing",
			profileStatus: profile.categoryStatus.kvartiry,
			url: path,
			canonical: path,
			inventory: 20,
			intro,
			ssrLinkCount: 2,
			registry: {
				pageKey: { kind: "categoryRoot", category: "kvartiry" },
				url: path,
				canonical: path,
				entityRef: null,
				targetPhrases: [`квартиры ${name}`],
				metric: "searchDemand",
				value: 100,
				source: "wordstat",
				snapshotDate: "2026-09-24",
				status: "approved",
				synthetic: false,
				release: "starter-v2.1.0",
				contentGateRule: "listing",
				tier: "P1",
				minimumObjects: 5,
				defaultRobots: "index,follow",
				templateKey: "categoryRoot",
				morphologyApproved: true,
				title: "Квартиры",
				h1: "Квартиры",
				description: "Проверенное описание",
			},
		},
		now,
	);
	return {
		group: "catalog",
		path,
		canonicalPath: path,
		lastModified: "2026-09-24T10:00:00.000Z",
		published: true,
		gate,
	};
}

const profileSnapshots = Object.fromEntries(
	(
		Object.keys(siteProfileFixtures) as (keyof typeof siteProfileFixtures)[]
	).map((name) => {
		const shards = buildDiscoveryShards({
			publicOrigin: origin,
			candidates: [listingCandidate(name)],
		});
		return [
			name,
			shards.flatMap((shard) => shard.entries.map((entry) => entry.url)),
		];
	}),
);

assert.deepEqual(profileSnapshots, {
	singleGeo: ["https://example.test/kvartiry/singleGeo/"],
	multiGeo: ["https://example.test/kvartiry/multiGeo/"],
	newbuildFirst: [],
	secondaryFirst: ["https://example.test/kvartiry/secondaryFirst/"],
	singleGeoThreeCities: ["https://example.test/kvartiry/singleGeoThreeCities/"],
});

const passingGate = {
	statusCode: 200 as const,
	indexing: "index" as const,
	following: "follow" as const,
	canonical: "/placeholder/",
	includeInSitemap: true,
};
const candidates = discoveryGroups.flatMap((group, index) => {
	const path = `/${group}/${index}/`;
	return [
		{
			group,
			path,
			canonicalPath: path,
			lastModified: `2026-09-${String(index + 1).padStart(2, "0")}T10:00:00.000Z`,
			published: true,
			gate: { ...passingGate, canonical: path },
		},
		{
			group,
			path: `${path}draft/`,
			canonicalPath: `${path}draft/`,
			lastModified: "2026-09-20T10:00:00.000Z",
			published: false,
			gate: { ...passingGate, canonical: `${path}draft/` },
		},
	];
});
const shards = buildDiscoveryShards({
	publicOrigin: origin,
	candidates,
	shardSize: 2,
});
assert.deepEqual(
	shards.map((shard) => shard.group),
	[...discoveryGroups],
);
assert.ok(shards.every((shard) => shard.entries.length <= 2));
assert.equal(
	shards.flatMap((shard) => shard.entries).length,
	discoveryGroups.length,
);

assert.equal(
	latestLastModified([
		"2026-09-20T10:00:00.000Z",
		"2026-09-24T12:00:00.000Z",
		"2026-09-22T08:00:00.000Z",
	]),
	"2026-09-24T12:00:00.000Z",
);
assert.throws(() => latestLastModified([]), /at least one source timestamp/);

const firstXml = renderSitemapXml(shards[0].entries);
assert.equal(
	firstXml,
	'<?xml version="1.0" encoding="UTF-8"?>\n' +
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
		"  <url><loc>https://example.test/static/0/</loc><lastmod>2026-09-01T10:00:00.000Z</lastmod></url>\n" +
		"</urlset>",
);
const indexXml = renderSitemapIndexXml({ publicOrigin: origin, shards });
assert.match(indexXml, /https:\/\/example\.test\/sitemaps\/static-1\.xml/);
assert.match(indexXml, /2026-09-08T10:00:00\.000Z/);

assert.equal(
	renderDiscoveryRobots({ publicOrigin: origin, indexingEnabled: false }),
	"User-agent: *\nDisallow: /\n",
);
const publicRobots = renderDiscoveryRobots({
	publicOrigin: origin,
	indexingEnabled: true,
});
assert.match(publicRobots, /Disallow: \/admin\//);
assert.match(publicRobots, /Sitemap: https:\/\/example\.test\/sitemap\.xml/);

const runtimeDiscovery = readFileSync(
	"src/project/seo/discovery-runtime.ts",
	"utf8",
);
assert.match(runtimeDiscovery, /getPublicSitemapEntries/);
assert.doesNotMatch(runtimeDiscovery, /resolveRuntimeRoute\(path\)/);
assert.match(runtimeDiscovery, /entry\.gate/);
assert.match(runtimeDiscovery, /!entry\.lastModified/);
assert.match(runtimeDiscovery, /group: entry\.group/);
assert.equal(/function groupFor/.test(runtimeDiscovery), false);
assert.equal(
	/inventedLastModified|Date\.now\(\)|new Date\(\)\.toISOString/.test(
		runtimeDiscovery,
	),
	false,
	"runtime discovery must not invent lastmod",
);
const sitemapProvider = readFileSync(
	"src/project/data-access/public/provider.ts",
	"utf8",
);
assert.match(sitemapProvider, /resolveRouteDecision/);
assert.match(sitemapProvider, /decideResolvedPage/);
assert.match(sitemapProvider, /gate,/);

const sitemapRoute = readFileSync("src/app/sitemap.ts", "utf8");
assert.match(sitemapRoute, /console\.error\("Sitemap discovery failed"/);
assert.match(sitemapRoute, /throw error/);
assert.doesNotMatch(sitemapRoute, /catch\s*\{\s*return/);
assert.match(sitemapRoute, /shards\.length \? shards\.map/);

console.log(
	"Discovery feeds verified: five profiles, groups, shards, lastmod, XML and robots.",
);
