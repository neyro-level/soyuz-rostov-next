import { z } from "zod";
import { separateTrackingQueryParams } from "../../core/seo/tracking-query-params.ts";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const MAX_CATALOG_PAGE = 10_000;
export const catalogSortValues = [
	"recommended",
	"newest",
	"priceAsc",
	"priceDesc",
] as const;

const positiveIntegerSchema = z.coerce
	.number()
	.int()
	.min(1)
	.max(MAX_CATALOG_PAGE);
const priceSchema = z.coerce.number().int().min(1).max(10_000_000_000);
const areaSchema = z.coerce.number().positive().max(1_000_000);
const roomSchema = z.coerce.number().int().min(0).max(100);
const completionYearSchema = z.coerce.number().int().min(1900).max(2200);

export const catalogQueryFilterKeys = [
	"rooms",
	"district",
	"price",
	"area",
	"market",
	"developer",
	"completionYear",
] as const;
export type CatalogQueryFilterKey = (typeof catalogQueryFilterKeys)[number];

const catalogSearchSchema = z
	.object({
		page: positiveIntegerSchema.default(1),
		sort: z.enum(catalogSortValues).default("recommended"),
		priceFrom: priceSchema.optional(),
		priceTo: priceSchema.optional(),
		rooms: z.array(roomSchema).max(8).optional(),
		district: slugSchema.optional(),
		areaFrom: areaSchema.optional(),
		areaTo: areaSchema.optional(),
		market: z.enum(["newbuild", "secondary"]).optional(),
		developer: slugSchema.optional(),
		completionYear: completionYearSchema.optional(),
	})
	.strict()
	.superRefine((value, context) => {
		if (value.priceFrom && value.priceTo && value.priceFrom > value.priceTo) {
			context.addIssue({
				code: "custom",
				path: ["priceFrom"],
				message: "priceFrom must not exceed priceTo.",
			});
		}
		if (value.areaFrom && value.areaTo && value.areaFrom > value.areaTo) {
			context.addIssue({
				code: "custom",
				path: ["areaFrom"],
				message: "areaFrom must not exceed areaTo.",
			});
		}
	});

export type CatalogSearchParams = {
	page: number;
	sort: (typeof catalogSortValues)[number];
	priceFromMinor?: number;
	priceToMinor?: number;
	rooms?: readonly number[];
	district?: string;
	areaFrom?: number;
	areaTo?: number;
	market?: "newbuild" | "secondary";
	developer?: string;
	completionYear?: number;
	hasFilters: boolean;
	queryString: string;
};

export function parseCatalogSearchParams(
	queryString: string,
): CatalogSearchParams | null {
	const params = new URLSearchParams(
		separateTrackingQueryParams(queryString).functionalQueryString,
	);
	const allowed = new Set([
		"page",
		"sort",
		"priceFrom",
		"priceTo",
		"rooms",
		"district",
		"areaFrom",
		"areaTo",
		"market",
		"developer",
		"completionYear",
	]);
	if ([...params.keys()].some((key) => !allowed.has(key))) return null;
	for (const key of [
		"page",
		"sort",
		"priceFrom",
		"priceTo",
		"district",
		"areaFrom",
		"areaTo",
		"market",
		"developer",
		"completionYear",
	]) {
		if (params.getAll(key).length > 1) return null;
	}

	const roomValues = params
		.getAll("rooms")
		.flatMap((value) => value.split(","))
		.filter(Boolean);
	const candidate = Object.fromEntries(
		[
			"page",
			"sort",
			"priceFrom",
			"priceTo",
			"district",
			"areaFrom",
			"areaTo",
			"market",
			"developer",
			"completionYear",
		].flatMap((key) => {
			const value = params.get(key);
			return value === null || value === "" ? [] : [[key, value]];
		}),
	);
	const parsed = catalogSearchSchema.safeParse({
		...candidate,
		...(roomValues.length ? { rooms: roomValues } : {}),
	});
	if (!parsed.success) return null;

	const normalized = new URLSearchParams();
	if (parsed.data.page > 1) normalized.set("page", String(parsed.data.page));
	if (params.has("sort")) normalized.set("sort", parsed.data.sort);
	if (parsed.data.priceFrom)
		normalized.set("priceFrom", String(parsed.data.priceFrom));
	if (parsed.data.priceTo)
		normalized.set("priceTo", String(parsed.data.priceTo));
	if (parsed.data.rooms?.length) {
		normalized.set(
			"rooms",
			[...new Set(parsed.data.rooms)].sort((a, b) => a - b).join(","),
		);
	}
	if (parsed.data.district) normalized.set("district", parsed.data.district);
	if (parsed.data.areaFrom)
		normalized.set("areaFrom", String(parsed.data.areaFrom));
	if (parsed.data.areaTo) normalized.set("areaTo", String(parsed.data.areaTo));
	if (parsed.data.market) normalized.set("market", parsed.data.market);
	if (parsed.data.developer) normalized.set("developer", parsed.data.developer);
	if (parsed.data.completionYear)
		normalized.set("completionYear", String(parsed.data.completionYear));

	return {
		page: parsed.data.page,
		sort: parsed.data.sort,
		...(parsed.data.priceFrom
			? { priceFromMinor: parsed.data.priceFrom * 100 }
			: {}),
		...(parsed.data.priceTo ? { priceToMinor: parsed.data.priceTo * 100 } : {}),
		...(parsed.data.rooms?.length
			? { rooms: [...new Set(parsed.data.rooms)].sort((a, b) => a - b) }
			: {}),
		...(parsed.data.district ? { district: parsed.data.district } : {}),
		...(parsed.data.areaFrom ? { areaFrom: parsed.data.areaFrom } : {}),
		...(parsed.data.areaTo ? { areaTo: parsed.data.areaTo } : {}),
		...(parsed.data.market ? { market: parsed.data.market } : {}),
		...(parsed.data.developer ? { developer: parsed.data.developer } : {}),
		...(parsed.data.completionYear
			? { completionYear: parsed.data.completionYear }
			: {}),
		hasFilters: [...params.keys()].some((key) => key !== "page"),
		queryString: normalized.toString(),
	};
}

export function catalogFilterKeysForQuery(
	query: CatalogSearchParams,
): readonly CatalogQueryFilterKey[] {
	return [
		...(query.rooms ? (["rooms"] as const) : []),
		...(query.district ? (["district"] as const) : []),
		...(query.priceFromMinor || query.priceToMinor ? (["price"] as const) : []),
		...(query.areaFrom || query.areaTo ? (["area"] as const) : []),
		...(query.market ? (["market"] as const) : []),
		...(query.developer ? (["developer"] as const) : []),
		...(query.completionYear ? (["completionYear"] as const) : []),
	];
}

export function pageHref(
	pathname: string,
	query: CatalogSearchParams,
	page: number,
): string {
	const params = new URLSearchParams(query.queryString);
	if (page <= 1) params.delete("page");
	else params.set("page", String(page));
	const suffix = params.toString();
	return suffix ? `${pathname}?${suffix}` : pathname;
}

export function catalogCanonicalPath(
	pathname: string,
	query: CatalogSearchParams,
): string {
	if (!query.queryString || query.hasFilters) return pathname;
	return `${pathname}?page=${query.page}`;
}

export function parsePageSearchParams(
	queryString: string,
): { page: number; queryString: string } | null {
	const params = new URLSearchParams(
		separateTrackingQueryParams(queryString).functionalQueryString,
	);
	if ([...params.keys()].some((key) => key !== "page")) return null;
	if (params.getAll("page").length > 1) return null;
	const raw = params.get("page");
	if (raw === null || raw === "") return { page: 1, queryString: "" };
	const parsed = positiveIntegerSchema.safeParse(raw);
	if (!parsed.success) return null;
	return {
		page: parsed.data,
		queryString: parsed.data > 1 ? `page=${parsed.data}` : "",
	};
}
