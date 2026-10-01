import type { CatalogSurfaceSlug, DevelopmentKind } from "./common";

export type PropertySurfaceSlug =
	| "kvartiry"
	| "doma"
	| "uchastki"
	| "kommercheskaya-nedvizhimost"
	| "komnaty"
	| "garazhi";

export type PageKeyDTO =
	| { kind: "home" }
	| { kind: "geoHub"; geo: string }
	| { kind: "categoryRoot"; category: CatalogSurfaceSlug }
	| { kind: "categoryGeo"; geo: string; category: CatalogSurfaceSlug }
	| {
			kind: "categoryGeoDistrict";
			geo: string;
			category: CatalogSurfaceSlug;
			district: string;
	  }
	| {
			kind: "categoryGeoFacet";
			geo: string;
			category: CatalogSurfaceSlug;
			facet: string;
	  }
	| { kind: "geoDevelopers"; geo: string }
	| {
			kind: "property";
			category: PropertySurfaceSlug;
			semantic: string;
			publicUrlId: number;
	  }
	| { kind: "development"; developmentKind: DevelopmentKind; slug: string }
	| { kind: "developerRoot" }
	| { kind: "developer"; slug: string }
	| { kind: "static"; path: `/${string}/` };

export type PageLinkDTO = {
	pageKey: PageKeyDTO;
	href: string;
	label: string;
	count?: number;
};
