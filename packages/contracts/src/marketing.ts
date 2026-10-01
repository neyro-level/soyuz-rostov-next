import type { LeadFormContext } from "./lead";
import type { BreadcrumbDTO, PageSEOContract } from "./seo";

export type MarketingSectionDTO = {
	title: string;
	text: string;
	items?: readonly string[];
};

export type MarketingPageDTO = {
	slug: string;
	eyebrow: string;
	title: string;
	lead: string;
	seo: PageSEOContract;
	breadcrumbs: BreadcrumbDTO;
	sections: readonly MarketingSectionDTO[];
	leadContext?: LeadFormContext;
};

export type HomePageDTO = MarketingPageDTO & {
	featuredPropertyId: string;
	serviceLinks: readonly { label: string; href: string; description: string }[];
};
