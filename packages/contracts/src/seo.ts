import type { MediaDTO } from "./media";
import type { PageKeyDTO } from "./routing";

export type BreadcrumbItemDTO = {
	label: string;
	pageKey?: PageKeyDTO;
	href?: string;
};

export type BreadcrumbDTO = {
	items: readonly BreadcrumbItemDTO[];
};

export type SeoMetaDTO = {
	title: string;
	description: string;
	canonicalPath: string;
	indexing: "index" | "noindex";
	following: "follow" | "nofollow";
	openGraph?: {
		title?: string;
		description?: string;
		image?: MediaDTO;
	};
};

export type PageSEOContract = SeoMetaDTO;
