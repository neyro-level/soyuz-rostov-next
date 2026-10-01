import type { SiteProfile } from "../core/profile/index.ts";
import {
	createUrlGrammar,
	type UrlGrammarInput,
} from "../core/routing/index.ts";

export type ProjectDistrictRouteRegistry = NonNullable<
	UrlGrammarInput["districtSlugsByGeoCategory"]
>;

export function createProjectUrlGrammar(
	profile: SiteProfile,
	districtSlugsByGeoCategory: ProjectDistrictRouteRegistry = {},
) {
	const geoSlugs = Object.keys(profile.geos);
	const facetSlugsByGeoCategory: Record<string, Record<string, string[]>> = {};
	for (const [slug, facet] of Object.entries(profile.seoFacets)) {
		if (!facetSlugsByGeoCategory[facet.geo]) {
			facetSlugsByGeoCategory[facet.geo] = {};
		}
		const byCategory = facetSlugsByGeoCategory[facet.geo];
		if (!byCategory[facet.category]) byCategory[facet.category] = [];
		byCategory[facet.category].push(slug);
	}

	return createUrlGrammar({
		geoSlugs,
		staticPaths: profile.staticRoutes
			.map((route) => route.path)
			.filter((path) => path !== "/"),
		moduleRootSlugs: [
			...profile.legacyRoutes.map((route) => route.from),
			...profile.legacyPatterns.map((pattern) => pattern.from),
			...Object.values(profile.modules).flatMap(
				(module) => module.reservedRoots,
			),
		],
		districtSlugsByGeoCategory,
		facetSlugsByGeoCategory,
	});
}

/**
 * Legacy redirects are configuration, not a runtime repair layer: each target
 * must already be a canonical URL recognised by the project grammar.
 */
export function validateProjectLegacyRouteTargets(profile: SiteProfile): void {
	const grammar = createProjectUrlGrammar(profile);
	for (const [index, route] of profile.legacyRoutes.entries()) {
		const pageKey = grammar.parseUrl(route.to);
		const canonicalTarget = pageKey ? grammar.buildUrl(pageKey) : null;
		if (canonicalTarget !== route.to) {
			throw new Error(
				`legacyRoutes[${index}].to must be a canonical project URL; received ${route.to}.`,
			);
		}
	}
}
