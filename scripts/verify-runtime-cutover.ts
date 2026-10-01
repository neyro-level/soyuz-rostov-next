import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { performance } from "node:perf_hooks";
import {
	createRouteResolver,
	type PageKey,
} from "../src/core/routing/index.ts";
import { createFixtureResolverDataPort } from "../src/fixture/resolver.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";

const source = (path: string) => readFileSync(path, "utf8");
assert.match(source("next.config.ts"), /trailingSlash:\s*true/);
assert.match(source("next.config.ts"), /skipTrailingSlashRedirect:\s*true/);
assert.match(
	source("src/app/(site)/[...segments]/page.tsx"),
	/generateMetadata[\s\S]+resolveRuntimeRoute[\s\S]+CanonicalRuntimePage/,
);
assert.match(source("src/proxy.ts"), /_next\/static\|_next\/image/);
assert.match(
	source("src/proxy.ts"),
	/NextResponse\.redirect\(destination, 308\)/,
);
assert.match(source("src/proxy.ts"), /lookupCanonicalEntityLifecyclePreflight/);
assert.match(source("src/app/(site)/nedvizhimost/page.tsx"), /notFound\(\)/);
assert.match(source("src/app/(site)/obekty/[slug]/page.tsx"), /notFound\(\)/);
assert.match(source("src/proxy.ts"), /matchLegacyRoute/);

for (const path of [
	"src/app/not-found.tsx",
	"src/core/http/property-gone-response.ts",
	"src/fixture/provider.ts",
	"src/project/data-access/public/dto.ts",
	"packages/ui/src/views/home/StarterHomePageView.tsx",
	"packages/ui/src/views/property/StarterPropertyPageView.tsx",
]) {
	assert.doesNotMatch(
		source(path),
		/href\s*=\s*["']\/nedvizhimost|href:\s*["']\/nedvizhimost/,
	);
}

let checked = 0;
const timings: number[] = [];
for (const profile of Object.values(siteProfileFixtures)) {
	const grammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	const geo = profile.primaryGeo;
	const pages: PageKey[] = [
		{ kind: "home" },
		{ kind: "static", path: "/uslugi/" },
		{ kind: "geoHub", geo },
		{ kind: "categoryRoot", category: "kvartiry" },
		{ kind: "categoryGeo", geo, category: "kvartiry" },
		{
			kind: "categoryGeoDistrict",
			geo,
			category: "kvartiry",
			district: "severnyy",
		},
		{
			kind: "categoryGeoFacet",
			geo,
			category: "kvartiry",
			facet: "dvukhkomnatnye",
		},
		{ kind: "geoDevelopers", geo },
		{ kind: "developerRoot" },
		{ kind: "developer", slug: "sever-stroy" },
		{
			kind: "development",
			developmentKind: "residential_complex",
			slug: "mayak",
		},
		{ kind: "development", developmentKind: "cottage_village", slug: "bereg" },
		{
			kind: "property",
			category: "kvartiry",
			semantic: "test",
			publicUrlId: 101,
		},
	];
	const resolver = createRouteResolver({
		profile,
		grammar,
		port: createFixtureResolverDataPort({
			grammar,
			pages: pages.map((pageKey) => ({
				pageKey,
				inventory: 12,
				record: {
					lifecycle: "active",
					geo: "geo" in pageKey ? pageKey.geo : profile.primaryGeo,
					market:
						pageKey.kind === "property"
							? "secondary"
							: pageKey.kind === "development"
								? "newbuild"
								: null,
					dataTier: pageKey.kind === "development" ? "B" : null,
				},
			})),
			redirects: {
				"/old-catalog/": grammar.buildUrl({
					kind: "categoryRoot",
					category: "kvartiry",
				}),
			},
		}),
	});
	for (const pageKey of pages) {
		const path = grammar.buildUrl(pageKey);
		const started = performance.now();
		const result = await resolver.resolvePath(path);
		timings.push(performance.now() - started);
		assert.ok(result.kind === "page" || result.kind === "notFound");
		if (result.kind === "page") assert.equal(result.canonicalPath, path);
		checked += 1;
	}
	assert.equal((await resolver.resolvePath("/old-catalog/")).kind, "redirect");
	assert.equal((await resolver.resolvePath("/KVARTIRY/")).kind, "redirect");
	assert.equal(
		(await resolver.resolvePath("/unknown-route/")).kind,
		"notFound",
	);
}

timings.sort((left, right) => left - right);
const p95 = timings[Math.floor(timings.length * 0.95)] ?? 0;
assert.ok(p95 < 25, `Pure resolver p95 regression: ${p95.toFixed(2)}ms.`);
console.log(
	`Runtime cutover verified: ${checked} PageKey/profile cases; pure resolver p95 ${p95.toFixed(2)}ms.`,
);
