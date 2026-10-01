import type {
	SiteHeaderNavItemViewDto,
	SiteNavLinkViewDto,
} from "../../view-models/site-shell";

export type SiteHeaderNavItemDto = SiteHeaderNavItemViewDto;
export type SiteNavLinkDto = SiteNavLinkViewDto;

export type SiteCityOptionViewDto = {
	slug: string;
	label: string;
	href: string;
	domainLabel: string;
	current?: boolean;
	external?: boolean;
};

export type SiteMobileMenuActionDto =
	| SiteNavLinkDto
	| {
			kind: "action";
			label: string;
			actionId: string;
			title?: string;
			subtitle?: string;
			source?: string;
			formType?: string;
			submitLabel?: string;
			showSubtitle?: boolean;
	  };
