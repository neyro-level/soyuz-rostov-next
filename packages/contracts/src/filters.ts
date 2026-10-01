import type { PropertyCategory, PropertyDealType } from "./common";

export type PropertySort = "recommended" | "newest" | "priceAsc" | "priceDesc";
export type PropertyView = "grid" | "list" | "map";

export type PropertyFilterOptionDTO = {
	value: string;
	label: string;
	parentValue?: string;
};

export type AppliedPropertyFiltersDTO = {
	query?: string;
	category?: PropertyCategory;
	dealType?: PropertyDealType;
	city?: string;
	district?: string;
	rooms?: readonly number[];
	isStudio?: boolean;
	isExclusive?: boolean;
	priceFromMinor?: number;
	priceToMinor?: number;
	areaFrom?: number;
	areaTo?: number;
	kitchenAreaFrom?: number;
	floorFrom?: number;
	floorTo?: number;
	lotAreaFrom?: number;
	lotAreaTo?: number;
	buildingType?: string;
	renovation?: string;
	landUseType?: string;
	hasElectricity?: boolean;
	hasGas?: boolean;
	hasWater?: boolean;
	hasSewerage?: boolean;
	commercialType?: string;
	commercialBuildingType?: string;
	entranceType?: string;
	sort: PropertySort;
	view: PropertyView;
};

export type PropertyFilterDTO = {
	categories: readonly PropertyFilterOptionDTO[];
	dealTypes: readonly PropertyFilterOptionDTO[];
	cities: readonly PropertyFilterOptionDTO[];
	districts: readonly PropertyFilterOptionDTO[];
	rooms: readonly number[];
	priceMinor: { min: number | null; max: number | null };
	buildingTypes: readonly PropertyFilterOptionDTO[];
	renovations: readonly PropertyFilterOptionDTO[];
	landUseTypes: readonly PropertyFilterOptionDTO[];
	commercialTypes: readonly PropertyFilterOptionDTO[];
	commercialBuildingTypes: readonly PropertyFilterOptionDTO[];
	entranceTypes: readonly PropertyFilterOptionDTO[];
	applied: AppliedPropertyFiltersDTO;
	total: number;
	resultLabel: string;
};
