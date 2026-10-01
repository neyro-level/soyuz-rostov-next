export type SiteNavLinkViewDto = {
	label: string;
	href: string;
	external?: boolean;
	rel?: string;
	description?: string;
};

export type SiteHeaderMegaSectionViewDto = {
	title: string;
	href: string;
	description?: string;
	links: SiteNavLinkViewDto[];
};

export type SiteHeaderNavItemViewDto = SiteNavLinkViewDto & {
	matchPrefixes?: string[];
	showOverviewLink?: boolean;
	children?: SiteNavLinkViewDto[];
	megaSections?: SiteHeaderMegaSectionViewDto[];
};

export type PublicContactViewDto = {
	phone: string;
	phoneHref: string;
	secondaryPhone: string | null;
	email: string;
	emailHref: string;
	officeAddress: string;
	hours: string;
	callbackHref: string;
	callbackLabel: string;
	telegram?: string;
	max?: string;
	vk?: string;
};

export type SiteFooterColumnViewDto = {
	title: string;
	links: SiteNavLinkViewDto[];
};
export type SiteFooterMetaViewDto = {
	tagline: string;
	copyright: string;
	registry: string;
	disclaimer: string;
	disclaimerHref: string;
};
export type SiteSocialLinkViewDto = { label: string; href: string };
