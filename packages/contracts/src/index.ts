export const contractVersion = "2.4.0" as const;

export type { NapDTO } from "./nap";
export const contractState = "frozen" as const;

export type {
	CatalogSurfaceSlug,
	DevelopmentKind,
	PropertyCategory,
	PropertyDealType,
} from "./common";
export type { DeveloperCardDTO, DeveloperDetailsDTO } from "./developer";
export type {
	DevelopmentCardDTO,
	DevelopmentDetailsDTO,
} from "./development";
export type {
	AppliedPropertyFiltersDTO,
	PropertyFilterDTO,
	PropertyFilterOptionDTO,
	PropertySort,
	PropertyView,
} from "./filters";
export type { CityDTO, DistrictDTO, GeoHubDTO, RegionDTO } from "./geo";
export type {
	LeadFormContext,
	LeadFormKind,
	LeadPropertyContextDTO,
} from "./lead";
export type {
	ListingItemDTO,
	ListingPageDTO,
	PaginationDTO,
} from "./listing";
export type {
	HomePageDTO,
	MarketingPageDTO,
	MarketingSectionDTO,
} from "./marketing";
export type { MediaDTO } from "./media";
export type {
	PropertyCardDTO,
	PropertyCategoryDetailsDTO,
	PropertyCharacteristicDTO,
	PropertyDetailsDTO,
	PropertyListDTO,
	PropertyPriceDTO,
	PropertySummaryItemDTO,
} from "./property";
export type { PageKeyDTO, PageLinkDTO, PropertySurfaceSlug } from "./routing";
export type {
	BreadcrumbDTO,
	BreadcrumbItemDTO,
	PageSEOContract,
	SeoMetaDTO,
} from "./seo";
export type {
	SiteFooterDTO,
	SiteFooterGroupDTO,
	SiteHeaderDTO,
	SiteNavItemDTO,
} from "./shell";
