export type PropertyCardViewDto = {
	id: string;
	slug: string;
	title: string;
	category: string;
	categoryKey: string;
	dealType?: "sale" | "rent";
	origin?: "XML" | "MANUAL" | null;
	status?: string;
	isPublished?: boolean;
	price: number | null;
	address: string;
	city: string | null;
	citySlug: string | null;
	rooms: number | null;
	isStudio?: boolean;
	area: number | null;
	areaLiving?: number | null;
	areaKitchen?: number | null;
	floor: number | null;
	floorsTotal: number | null;
	builtYear?: number | null;
	buildingType?: string | null;
	renovation?: string | null;
	houseType?: string | null;
	lotAreaSotka?: number | null;
	landCategory?: string | null;
	landUseType?: string | null;
	cadastralNumber?: string | null;
	ceilingHeight?: number | null;
	hasHeating?: boolean | null;
	commercialType?: string | null;
	commercialBuildingType?: string | null;
	entranceType?: string | null;
	district: string | null;
	districtSlug: string | null;
	agentId: string | null;
	agentName: string | null;
	agentPhotoUrl?: string | null;
	image: string | null;
	images: string[];
	layoutImageUrl?: string | null;
	videoUrl?: string | null;
	videoUrls?: string[];
	updatedAt: string;
	lastModified?: string | null;
	lastSeenAt?: string | null;
	unpublishedAt?: string | null;
	objectCode?: string | null;
	description?: string | null;
	h1?: string | null;
	seoTitle?: string | null;
	seoDescription?: string | null;
	isFeatured?: boolean;
	isPromoted?: boolean;
	isExclusive?: boolean;
};

export type PropertyCardDto = PropertyCardViewDto;
export type PropertyDetailIconViewDto =
	| "area"
	| "living-area"
	| "kitchen"
	| "floor"
	| "rooms";
export type PropertyDetailSummaryItemDto = {
	icon: PropertyDetailIconViewDto;
	label: string;
	value: string;
};
export type PropertyDetailRowDto = { label: string; value: string };
export type PropertyViewingDateDto = {
	value: string;
	label: string;
	dateLabel: string;
};
export type PropertyRelatedItemDto = {
	id: string;
	href: string;
	title: string;
	priceLabel: string;
	address: string;
	image: string | null;
	imageAlt: string;
	facts: string[];
};
export type PublicFormResultDto = {
	ok: boolean;
	message: string;
	fieldErrors?: Record<string, string | undefined>;
};
export type SessionCollectionItemDto = {
	id: string;
	slug: string;
	path: string;
	title: string;
	price: number | null;
	address: string;
	category: string;
	categoryKey: string;
	rooms: number | null;
	area: number | null;
	areaLiving?: number | null;
	areaKitchen?: number | null;
	floor: number | null;
	floorsTotal: number | null;
	builtYear?: number | null;
	buildingType?: string | null;
	renovation?: string | null;
	image: string | null;
	images?: string[];
	objectCode: string | null;
	isExclusive?: boolean;
};
export type SessionCollectionGroupDto = {
	key: string;
	label: string;
	count: number;
};
