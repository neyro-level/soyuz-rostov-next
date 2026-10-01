import type { MediaDTO } from "./media";
import type { PageKeyDTO } from "./routing";
import type { BreadcrumbDTO, SeoMetaDTO } from "./seo";

export type DeveloperCardDTO = {
	id: string;
	slug: string;
	pageKey: PageKeyDTO;
	href: string;
	name: string;
	logo?: MediaDTO;
	developmentsCount: number;
	geoNames: readonly string[];
};

export type DeveloperDetailsDTO = DeveloperCardDTO & {
	legalName?: string;
	description?: string;
	website?: string;
	breadcrumbs: BreadcrumbDTO;
	seo: SeoMetaDTO;
};
