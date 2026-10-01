import type { PageKey } from "../../core/routing/index.ts";
import type { SiteProfile } from "../../core/profile/index.ts";
import {
	catalogFilterKeysForQuery,
	catalogSortValues,
	MAX_CATALOG_PAGE,
	parseCatalogSearchParams,
	parsePageSearchParams,
} from "./catalog-search-params.ts";

const MAX_PUBLIC_GATEWAY_TAGS = 8;

export const MAX_PERSISTENT_CACHE_KEYS_PER_ROUTE =
	MAX_CATALOG_PAGE * catalogSortValues.length;

export type PublicGatewayCacheIdentity = {
	keyParts: readonly ["page", string, "sort", (typeof catalogSortValues)[number]];
	maxKeysPerRoute: number;
};

function safeTagPart(value: string | number): string {
	const normalized = String(value).trim().toLowerCase();
	if (!/^[a-z0-9_-]+$/.test(normalized)) {
		throw new Error(`Unsafe public cache tag component: ${normalized}`);
	}
	return normalized;
}

/** Bounded cache identity derived only from canonical route-owner input. */
export function publicGatewayCacheTags(pageKey: PageKey | null): string[] {
	const tags = new Set<string>(["site", "registry"]);
	if (!pageKey) return [...tags];

	switch (pageKey.kind) {
		case "home":
		case "static":
			break;
		case "geoHub":
			tags.add("properties");
			tags.add("developments");
			tags.add("developers");
			tags.add(`geo:${safeTagPart(pageKey.geo)}`);
			break;
		case "categoryRoot":
			tags.add("properties");
			tags.add("developments");
			tags.add("developers");
			break;
		case "categoryGeo":
		case "categoryGeoFacet":
		case "categoryGeoDistrict":
			tags.add("properties");
			tags.add("developments");
			tags.add("developers");
			tags.add(`geo:${safeTagPart(pageKey.geo)}`);
			tags.add(
				`geo-surface:${safeTagPart(pageKey.geo)}:${safeTagPart(pageKey.category)}`,
			);
			if (pageKey.kind === "categoryGeoDistrict") {
				tags.add(`district:${safeTagPart(pageKey.district)}`);
			}
			break;
		case "geoDevelopers":
			tags.add("developers");
			tags.add("developments");
			tags.add(`geo:${safeTagPart(pageKey.geo)}`);
			break;
		case "developerRoot":
			tags.add("developers");
			tags.add("developments");
			break;
		case "property":
			tags.add("properties");
			tags.add(`property:${safeTagPart(pageKey.publicUrlId)}`);
			break;
		case "development":
			tags.add("developments");
			tags.add("properties");
			tags.add(`development:${safeTagPart(pageKey.slug)}`);
			break;
		case "developer":
			tags.add("developers");
			tags.add("developments");
			tags.add(`developer:${safeTagPart(pageKey.slug)}`);
			break;
	}

	if (tags.size > MAX_PUBLIC_GATEWAY_TAGS) {
		throw new Error("Public Gateway cache identity exceeded its bounded tag budget.");
	}
	return [...tags];
}

/**
 * Builds a finite persistent-cache identity. Filter values are intentionally
 * excluded: even enabled filters can carry a large value domain, so filtered
 * requests stay correct by bypassing the persistent cache.
 */
export function publicGatewayRouteCacheIdentity(
	profile: SiteProfile,
	pageKey: PageKey | null,
	queryString: string,
): PublicGatewayCacheIdentity | null {
	if (!pageKey) return null;

	if (
		pageKey.kind === "categoryRoot" ||
		pageKey.kind === "categoryGeo" ||
		pageKey.kind === "categoryGeoDistrict" ||
		pageKey.kind === "categoryGeoFacet"
	) {
		const query = parseCatalogSearchParams(queryString);
		if (!query) return null;
		const enabledFilters = profile.filterKeys[pageKey.category];
		const requestedFilters = catalogFilterKeysForQuery(query);
		if (requestedFilters.some((filter) => !enabledFilters.includes(filter))) {
			return null;
		}
		if (requestedFilters.length > 0) return null;

		return {
			keyParts: ["page", String(query.page), "sort", query.sort],
			maxKeysPerRoute: MAX_PERSISTENT_CACHE_KEYS_PER_ROUTE,
		};
	}

	if (pageKey.kind === "developer") {
		const query = parsePageSearchParams(queryString);
		if (!query) return null;
		return {
			keyParts: ["page", String(query.page), "sort", "recommended"],
			maxKeysPerRoute: MAX_CATALOG_PAGE,
		};
	}

	if (queryString) return null;
	return {
		keyParts: ["page", "1", "sort", "recommended"],
		maxKeysPerRoute: 1,
	};
}
