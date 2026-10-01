import type { MediaDTO } from "./media";
import type { PageLinkDTO } from "./routing";
import type { BreadcrumbDTO, SeoMetaDTO } from "./seo";

export type RegionDTO = {
	id: string;
	slug: string;
	name: string;
	shortName?: string;
};

export type CityDTO = {
	id: string;
	slug: string;
	name: string;
	nameGenitive: string;
	nameLocative: string;
	preposition: "в" | "во" | "на";
	type: "city" | "town" | "settlement";
	region: RegionDTO;
	agglomerationOf?: string;
	coordinates?: { latitude: number; longitude: number };
};

export type DistrictDTO = {
	id: string;
	slug: string;
	name: string;
	type: "admin_district" | "microdistrict";
	citySlug: string;
	parentSlug?: string;
	nameLocative?: string;
	preposition?: "в" | "во" | "на";
};

export type GeoHubDTO = {
	city: CityDTO;
	title: string;
	intro: string;
	image?: MediaDTO;
	breadcrumbs: BreadcrumbDTO;
	seo: SeoMetaDTO;
	categoryLinks: readonly PageLinkDTO[];
	districtLinks: readonly PageLinkDTO[];
	developerLink?: PageLinkDTO;
	nearby: readonly PageLinkDTO[];
};
