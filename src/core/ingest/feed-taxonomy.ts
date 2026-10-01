export type FeedCategory =
	| "apartment"
	| "house"
	| "land"
	| "commercial"
	| "room"
	| "garage";
export type FeedDealType = "sale" | "rent";
export type FeedMarket = "secondary" | "newbuild";

const categoryAliases = new Map<string, FeedCategory>([
	["apartment", "apartment"],
	["квартира", "apartment"],
	["flat", "apartment"],
	["room", "room"],
	["комната", "room"],
	["house", "house"],
	["дом", "house"],
	["коттедж", "house"],
	["townhouse", "house"],
	["таунхаус", "house"],
	["land", "land"],
	["участок", "land"],
	["земельный участок", "land"],
	["commercial", "commercial"],
	["коммерческая недвижимость", "commercial"],
	["office", "commercial"],
	["офис", "commercial"],
	["retail", "commercial"],
	["торговое помещение", "commercial"],
	["warehouse", "commercial"],
	["склад", "commercial"],
	["garage", "garage"],
	["гараж", "garage"],
	["машиноместо", "garage"],
]);

const dealAliases = new Map<string, FeedDealType>([
	["sale", "sale"],
	["продажа", "sale"],
	["sell", "sale"],
	["rent", "rent"],
	["аренда", "rent"],
	["сдам", "rent"],
	["снять", "rent"],
]);

const marketAliases = new Map<string, FeedMarket>([
	["secondary", "secondary"],
	["вторичка", "secondary"],
	["вторичный", "secondary"],
	["вторичный рынок", "secondary"],
	["newbuild", "newbuild"],
	["new-building", "newbuild"],
	["новостройка", "newbuild"],
	["новостройки", "newbuild"],
	["первичный", "newbuild"],
	["первичный рынок", "newbuild"],
]);

const subtypeAliases = new Map<string, string>([
	["residential", "residential"],
	["жилая", "residential"],
	["жилая недвижимость", "residential"],
	["studio", "studio"],
	["студия", "studio"],
	["cottage", "cottage"],
	["коттедж", "cottage"],
	["townhouse", "townhouse"],
	["таунхаус", "townhouse"],
	["office", "office"],
	["офис", "office"],
	["retail", "retail"],
	["торговое помещение", "retail"],
	["warehouse", "warehouse"],
	["склад", "warehouse"],
	["parking-space", "parking-space"],
	["машиноместо", "parking-space"],
	["garage", "garage"],
	["гараж", "garage"],
]);

function key(value?: string): string | undefined {
	const normalized = value
		?.trim()
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е");
	return normalized || undefined;
}

export function mapFeedCategory(
	category?: string,
	subtype?: string,
): FeedCategory | undefined {
	return (
		categoryAliases.get(key(category) ?? "") ??
		categoryAliases.get(key(subtype) ?? "")
	);
}

export function mapFeedDealType(value?: string): FeedDealType | undefined {
	return dealAliases.get(key(value) ?? "");
}

export function mapFeedMarket(value?: string): FeedMarket | undefined {
	if (!key(value)) return undefined;
	return marketAliases.get(key(value) ?? "");
}

export function mapFeedSubtype(value?: string): string | undefined {
	if (!key(value)) return undefined;
	return subtypeAliases.get(key(value) ?? "");
}
