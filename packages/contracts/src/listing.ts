import type { DeveloperCardDTO } from "./developer";
import type { DevelopmentCardDTO } from "./development";
import type { PropertyCardDTO } from "./property";
import type { PageKeyDTO, PageLinkDTO } from "./routing";
import type { BreadcrumbDTO, SeoMetaDTO } from "./seo";

export type ListingItemDTO =
	| { kind: "property"; item: PropertyCardDTO }
	| { kind: "development"; item: DevelopmentCardDTO }
	| { kind: "developer"; item: DeveloperCardDTO };

export type PaginationDTO = {
	page: number;
	pageSize: number;
	totalPages: number;
	previousPage?: number;
	nextPage?: number;
};

export type ListingPageDTO = {
	pageKey: PageKeyDTO;
	href: string;
	h1: string;
	intro: string;
	items: readonly ListingItemDTO[];
	total: number;
	pagination: PaginationDTO;
	subLinks: readonly PageLinkDTO[];
	nearby: readonly PageLinkDTO[];
	robots: Pick<SeoMetaDTO, "indexing" | "following">;
	canonical: string;
	breadcrumbs: BreadcrumbDTO;
	seo: SeoMetaDTO;
};
