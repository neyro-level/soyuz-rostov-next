import { z } from "zod";
import {
	type ImageHostIssueCode,
	validateExternalImageUrl,
} from "./image-hosts.ts";
import { normalizeAreaM2 } from "./numeric-invariants.ts";
import {
	mapFeedCategory,
	mapFeedDealType,
	mapFeedMarket,
	mapFeedSubtype,
} from "./feed-taxonomy.ts";

export const normalizedFeedImageSchema = z.object({
	url: z.string().url(),
	host: z.string().min(1),
});

export const normalizedFeedOfferSchema = z.object({
	externalId: z.string().min(1),
	title: z.string().min(1),
	description: z.string().optional(),
	category: z.enum([
		"apartment",
		"house",
		"land",
		"commercial",
		"room",
		"garage",
	]),
	dealType: z.enum(["sale", "rent"]),
	marketHint: z.enum(["secondary", "newbuild"]).optional(),
	subtype: z.string().optional(),
	priceMinor: z.number().int().nonnegative().optional(),
	currency: z.literal("RUB"),
	rooms: z.number().finite().optional(),
	totalArea: z.number().finite().optional(),
	livingArea: z.number().finite().optional(),
	kitchenArea: z.number().finite().optional(),
	floor: z.number().finite().optional(),
	floors: z.number().finite().optional(),
	region: z.string().optional(),
	publicAddress: z.string().optional(),
	locality: z.string().optional(),
	district: z.string().optional(),
	street: z.string().optional(),
	house: z.string().optional(),
	latitude: z.number().finite().optional(),
	longitude: z.number().finite().optional(),
	externalComplexId: z.string().optional(),
	externalComplexName: z.string().optional(),
	externalBuildingId: z.string().optional(),
	externalLayoutId: z.string().optional(),
	images: z.array(normalizedFeedImageSchema),
});

export type NormalizedFeedOffer = z.output<typeof normalizedFeedOfferSchema>;

export type FeedNormalizationIssue = {
	severity: "warning" | "error";
	code: ImageHostIssueCode | "feed.offer_invalid";
	externalId?: string;
	field?: string;
	messageRedacted: string;
};

export type RawYrlOffer = {
	externalId: string;
	title?: string;
	description?: string;
	category?: string;
	type?: string;
	propertyType?: string;
	price?: string;
	currency?: string;
	address?: string;
	region?: string;
	locality?: string;
	district?: string;
	street?: string;
	house?: string;
	latitude?: string;
	longitude?: string;
	rooms?: string;
	floor?: string;
	floors?: string;
	totalArea?: string;
	totalAreaUnit?: string;
	livingArea?: string;
	livingAreaUnit?: string;
	kitchenArea?: string;
	kitchenAreaUnit?: string;
	externalComplexId?: string;
	externalComplexName?: string;
	externalBuildingId?: string;
	externalLayoutId?: string;
	marketFromXml?: string;
	pictures: string[];
};

export type NormalizeFeedOfferResult =
	| {
			ok: true;
			offer: NormalizedFeedOffer;
			issues: FeedNormalizationIssue[];
	  }
	| {
			ok: false;
			issues: FeedNormalizationIssue[];
	  };

export function normalizeYrlOffer(
	rawOffer: RawYrlOffer,
	allowedImageHosts: ReadonlySet<string>,
): NormalizeFeedOfferResult {
	const issues: FeedNormalizationIssue[] = [];
	const images = [];
	const currency = normalizeCurrency(rawOffer.currency);
	const category = mapFeedCategory(rawOffer.category, rawOffer.propertyType);
	const dealType = mapFeedDealType(rawOffer.type);
	const marketHint = mapFeedMarket(rawOffer.marketFromXml);
	const subtype = mapFeedSubtype(rawOffer.propertyType);

	for (const picture of rawOffer.pictures) {
		const validation = validateExternalImageUrl(picture, allowedImageHosts);
		if (validation.ok) {
			images.push({ url: validation.url, host: validation.host });
			continue;
		}

		issues.push({
			severity: "warning",
			code: validation.code,
			externalId: rawOffer.externalId,
			field: "images",
			messageRedacted:
				"Feed image skipped because its URL or host is not allowed.",
		});
	}

	if (!currency.ok) {
		return {
			ok: false,
			issues: [
				...issues,
				{
					severity: "error",
					code: "feed.offer_invalid",
					externalId: rawOffer.externalId,
					field: "currency",
					messageRedacted: "Feed offer used an unsupported currency.",
				},
			],
		};
	}
	const unknownTaxonomy = [
		!category ? "category" : undefined,
		!dealType ? "dealType" : undefined,
		rawOffer.marketFromXml && !marketHint ? "market" : undefined,
		rawOffer.propertyType && !subtype && !mapFeedCategory(rawOffer.propertyType)
			? "subtype"
			: undefined,
	].filter((value): value is string => Boolean(value));
	if (unknownTaxonomy.length > 0) {
		return {
			ok: false,
			issues: [
				...issues,
				...unknownTaxonomy.map((field) => ({
					severity: "error" as const,
					code: "feed.offer_invalid" as const,
					externalId: rawOffer.externalId,
					field,
					messageRedacted:
						"Feed offer used an unmapped taxonomy value and was not published.",
				})),
			],
		};
	}

	const parsed = normalizedFeedOfferSchema.safeParse({
		externalId: rawOffer.externalId,
		title:
			rawOffer.title ??
			rawOffer.address ??
			rawOffer.locality ??
			rawOffer.externalId,
		description: rawOffer.description,
		category,
		dealType,
		marketHint,
		subtype,
		priceMinor: parseMoneyToMinor(rawOffer.price),
		currency: currency.value,
		rooms: parseOptionalNumber(rawOffer.rooms),
		totalArea: parseAreaToSquareMeters(
			rawOffer.totalArea,
			rawOffer.totalAreaUnit,
		),
		livingArea: parseAreaToSquareMeters(
			rawOffer.livingArea,
			rawOffer.livingAreaUnit,
		),
		kitchenArea: parseAreaToSquareMeters(
			rawOffer.kitchenArea,
			rawOffer.kitchenAreaUnit,
		),
		floor: parseOptionalNumber(rawOffer.floor),
		floors: parseOptionalNumber(rawOffer.floors),
		region: rawOffer.region,
		publicAddress: rawOffer.address,
		locality: rawOffer.locality,
		district: rawOffer.district,
		street: rawOffer.street,
		house: rawOffer.house,
		latitude: parseCoordinate(rawOffer.latitude),
		longitude: parseCoordinate(rawOffer.longitude),
		externalComplexId: rawOffer.externalComplexId,
		externalComplexName: rawOffer.externalComplexName,
		externalBuildingId: rawOffer.externalBuildingId,
		externalLayoutId: rawOffer.externalLayoutId,
		images,
	});

	if (!parsed.success) {
		return {
			ok: false,
			issues: [
				...issues,
				{
					severity: "error",
					code: "feed.offer_invalid",
					externalId: rawOffer.externalId,
					messageRedacted: "Feed offer failed normalization.",
				},
			],
		};
	}

	return { ok: true, offer: parsed.data, issues };
}

function normalizeCurrency(
	value: string | undefined,
): { ok: true; value: "RUB" } | { ok: false } {
	if (value === undefined) {
		return { ok: true, value: "RUB" };
	}
	const currency = value.trim().toUpperCase();
	if (currency === "RUB" || currency === "RUR") {
		return { ok: true, value: "RUB" };
	}
	return { ok: false };
}

function parseMoneyToMinor(value: string | undefined): number | undefined {
	if (!value) {
		return undefined;
	}
	const normalized = value.trim().replace(/\s+/g, "").replace(",", ".");
	const amount = Number(normalized);
	if (!Number.isFinite(amount) || amount < 0) {
		return undefined;
	}
	const minor = Math.round(amount * 100);
	if (!Number.isSafeInteger(minor)) {
		return undefined;
	}
	return minor;
}

function parseOptionalNumber(value: string | undefined): number | undefined {
	if (!value) {
		return undefined;
	}
	const parsed = Number(value.trim().replace(",", "."));
	return Number.isFinite(parsed) ? parsed : undefined;
}

function parseAreaToSquareMeters(
	value: string | undefined,
	unit: string | undefined,
): number | undefined {
	const amount = parseOptionalNumber(value);
	if (amount == null || amount < 0) {
		return undefined;
	}
	const normalizedUnit = (unit ?? "sqm").trim().toLowerCase();
	let squareMeters: number;
	if (
		normalizedUnit === "sqm" ||
		normalizedUnit === "кв.м" ||
		normalizedUnit === "sq.m" ||
		normalizedUnit === "m2" ||
		normalizedUnit === "м2"
	) {
		squareMeters = amount;
	} else if (
		normalizedUnit === "sqft" ||
		normalizedUnit === "sq.ft" ||
		normalizedUnit === "ft2"
	) {
		squareMeters = amount * 0.09290304;
	} else if (
		normalizedUnit === "ha" ||
		normalizedUnit === "hectare" ||
		normalizedUnit === "га"
	) {
		squareMeters = amount * 10_000;
	} else {
		squareMeters = amount;
	}
	return normalizeAreaM2(squareMeters, "round", "feedAreaM2") ?? undefined;
}

function parseCoordinate(value: string | undefined): number | undefined {
	if (!value) {
		return undefined;
	}
	const coordinate = Number(value.trim().replace(",", "."));
	return Number.isFinite(coordinate) ? coordinate : undefined;
}
