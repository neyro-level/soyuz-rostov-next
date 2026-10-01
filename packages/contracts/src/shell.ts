import type { MediaDTO } from "./media";

export type SiteNavItemDTO = {
	label: string;
	href: string;
	external?: boolean;
	children?: readonly SiteNavItemDTO[];
};

export type SiteHeaderDTO = {
	brandName: string;
	homeHref: string;
	logo: MediaDTO;
	navigation: readonly SiteNavItemDTO[];
	phone?: { label: string; href: string };
	primaryAction?: { label: string; href: string };
};

export type SiteFooterGroupDTO = {
	title: string;
	links: readonly SiteNavItemDTO[];
};

export type SiteFooterDTO = {
	brandName: string;
	logo: MediaDTO;
	groups: readonly SiteFooterGroupDTO[];
	contacts: readonly SiteNavItemDTO[];
	legalLinks: readonly SiteNavItemDTO[];
	copyright: string;
};
