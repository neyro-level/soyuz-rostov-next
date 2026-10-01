import type { SiteProfile } from "../profile/index.ts";
import {
	type CatalogSurfaceSlug,
	catalogSurfaceMarketMatrix,
} from "../profile/index.ts";
import type { PageKey, UrlGrammar } from "../routing/index.ts";
import type { ContentGateDecision } from "../seo/content-gate.ts";

export type NavigationCandidate = {
	pageKey: PageKey;
	label: string;
	gate: ContentGateDecision;
	count?: number;
};

export type SafePageLink = {
	pageKey: PageKey;
	href: string;
	label: string;
	count?: number;
};

export type SafeBreadcrumbItem = {
	label: string;
	pageKey?: PageKey;
	href?: string;
};

export type SafeNavigationBuilder = {
	links(candidates: readonly NavigationCandidate[]): readonly SafePageLink[];
	breadcrumbs(input: {
		ancestors: readonly NavigationCandidate[];
		currentLabel: string;
	}): { items: readonly SafeBreadcrumbItem[] };
};

function isActive(value: string | undefined): boolean {
	return value === "ACTIVE";
}

function activeGeo(profile: SiteProfile, geo: string): boolean {
	const definition = profile.geos[geo];
	return Boolean(definition?.published && isActive(definition.hubStatus));
}

function activeCategory(
	profile: SiteProfile,
	geo: string,
	category: CatalogSurfaceSlug,
): boolean {
	if (!activeGeo(profile, geo)) return false;
	if (!isActive(profile.categoryStatus[category])) return false;
	if (!isActive(profile.geoCategoryStatus[geo]?.[category])) return false;
	return catalogSurfaceMarketMatrix[category].some(
		(market) =>
			isActive(profile.marketCapability[market]) &&
			isActive(profile.marketStatus[geo]?.[market]),
	);
}

function profileAllows(profile: SiteProfile, pageKey: PageKey): boolean {
	switch (pageKey.kind) {
		case "home":
		case "static":
		case "property":
		case "development":
		case "developer":
			return true;
		case "geoHub":
			return activeGeo(profile, pageKey.geo);
		case "categoryRoot":
			return isActive(profile.categoryStatus[pageKey.category]);
		case "categoryGeo":
		case "categoryGeoDistrict":
		case "categoryGeoFacet":
			return activeCategory(profile, pageKey.geo, pageKey.category);
		case "geoDevelopers":
			return (
				activeGeo(profile, pageKey.geo) &&
				isActive(profile.developersSurface.byGeo[pageKey.geo])
			);
		case "developerRoot":
			return isActive(profile.developersSurface.root);
	}
}

export function createSafeNavigationBuilder(input: {
	profile: SiteProfile;
	grammar: UrlGrammar;
}): SafeNavigationBuilder {
	function toLink(candidate: NavigationCandidate): SafePageLink | null {
		if (!profileAllows(input.profile, candidate.pageKey)) return null;
		const href = input.grammar.buildUrl(candidate.pageKey);
		if (
			candidate.gate.statusCode !== 200 ||
			candidate.gate.indexing !== "index" ||
			candidate.gate.following !== "follow" ||
			!candidate.gate.includeInSitemap ||
			candidate.gate.canonical !== href
		) {
			return null;
		}
		return {
			pageKey: candidate.pageKey,
			href,
			label: candidate.label,
			count: candidate.count,
		};
	}

	function links(
		candidates: readonly NavigationCandidate[],
	): readonly SafePageLink[] {
		const seen = new Set<string>();
		return candidates.flatMap((candidate) => {
			const link = toLink(candidate);
			if (!link || seen.has(link.href)) return [];
			seen.add(link.href);
			return [link];
		});
	}

	return {
		links,
		breadcrumbs({ ancestors, currentLabel }) {
			return {
				items: [
					...ancestors.map((candidate): SafeBreadcrumbItem => {
						const link = toLink(candidate);
						return link ?? { label: candidate.label };
					}),
					{ label: currentLabel },
				],
			};
		},
	};
}
