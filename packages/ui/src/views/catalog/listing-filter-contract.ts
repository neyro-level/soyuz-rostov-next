export const listingFilterControlKeys = [
	"rooms",
	"district",
	"price",
	"area",
	"market",
	"developer",
	"completionYear",
] as const;

export type ListingFilterControlKey = (typeof listingFilterControlKeys)[number];

export type ListingFilterValues = {
	rooms?: readonly number[];
	district?: string;
	priceFromMinor?: number;
	priceToMinor?: number;
	areaFrom?: number;
	areaTo?: number;
	market?: "newbuild" | "secondary";
	developer?: string;
	completionYear?: number;
};
