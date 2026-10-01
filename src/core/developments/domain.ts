export type DevelopmentKind = "residential_complex" | "cottage_village";
export type DevelopmentSalesStatus = "on_sale" | "sales_finished" | "completed";
export type DevelopmentSalesAvailability =
	| "in_inventory"
	| "confirmed"
	| "none";
export type DevelopmentMediaType =
	| "hero"
	| "gallery"
	| "layout"
	| "construction_progress"
	| "document"
	| "video";

export type DevelopmentTierCPublicPassport = {
	id: string | number;
	slug: string;
	kind: DevelopmentKind;
	name: string;
	city: { id: string | number; slug: string; title: string };
	salesStatus: DevelopmentSalesStatus;
	salesAvailability: DevelopmentSalesAvailability;
};

export const DEVELOPMENT_PRICE_FRESH_DAYS = 45;

type DevelopmentRecord = Record<string, unknown>;

const residentialOnlyFields = ["layouts", "progress"] as const;
const cottageOnlyFields = [
	"communications",
	"totalArea",
	"plotsCount",
	"villageClass",
] as const;

const developmentKinds: readonly DevelopmentKind[] = [
	"residential_complex",
	"cottage_village",
];
const developmentSalesStatuses: readonly DevelopmentSalesStatus[] = [
	"on_sale",
	"sales_finished",
	"completed",
];
const developmentSalesAvailabilities: readonly DevelopmentSalesAvailability[] = [
	"in_inventory",
	"confirmed",
	"none",
];

function meaningful(value: unknown): boolean {
	if (value === undefined || value === null || value === "" || value === false)
		return false;
	if (Array.isArray(value)) return value.some(meaningful);
	if (typeof value === "object") return Object.values(value).some(meaningful);
	return true;
}

function nonEmptyString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0;
}

export function isDevelopmentTierCPublicPassport(
	value: unknown,
): value is DevelopmentTierCPublicPassport {
	if (!value || typeof value !== "object") return false;
	const record = value as DevelopmentRecord;
	const city = record.city;
	if (!city || typeof city !== "object") return false;
	const cityRecord = city as DevelopmentRecord;
	return (
		(record.id !== null && record.id !== undefined && String(record.id).trim()) !==
			"" &&
		nonEmptyString(record.slug) &&
		/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug) &&
		developmentKinds.includes(record.kind as DevelopmentKind) &&
		nonEmptyString(record.name) &&
		(cityRecord.id !== null &&
			cityRecord.id !== undefined &&
			String(cityRecord.id).trim()) !== "" &&
		nonEmptyString(cityRecord.slug) &&
		nonEmptyString(cityRecord.title) &&
		developmentSalesStatuses.includes(
			record.salesStatus as DevelopmentSalesStatus,
		) &&
		developmentSalesAvailabilities.includes(
			record.salesAvailability as DevelopmentSalesAvailability,
		)
	);
}

export function isFreshDevelopmentPrice(
	priceCheckedAt: string,
	referenceDate: Date = new Date(),
): boolean {
	const checkedAt = Date.parse(priceCheckedAt);
	const now = referenceDate.getTime();
	return (
		Number.isFinite(checkedAt) &&
		checkedAt <= now &&
		now - checkedAt <= DEVELOPMENT_PRICE_FRESH_DAYS * 86_400_000
	);
}

export function computeDevelopmentCompletenessScore(
	data: DevelopmentRecord,
): number {
	const coordinates = data.coordinates as DevelopmentRecord | undefined;
	const signals = [
		meaningful(data.name) && meaningful(data.slug) && meaningful(data.kind),
		meaningful(data.region) && meaningful(data.city),
		meaningful(data.district) || meaningful(data.districtRaw),
		meaningful(data.developer),
		meaningful(data.address) ||
			(Boolean(coordinates) &&
				meaningful(coordinates?.latitude) &&
				meaningful(coordinates?.longitude)),
		meaningful(data.salesStatus) && meaningful(data.salesAvailability),
		meaningful(data.priceByRooms),
		meaningful(data.mediaItems),
		meaningful(data.descriptions),
		meaningful(data.completion) || meaningful(data.deadline),
	];
	return Math.round((signals.filter(Boolean).length / signals.length) * 100);
}

export function assertDevelopmentMediaItems(value: unknown): void {
	if (value == null) return;
	if (!Array.isArray(value))
		throw new Error("Development mediaItems must be an array.");
	for (const item of value) {
		if (!item || typeof item !== "object")
			throw new Error("Development media item is invalid.");
		const record = item as DevelopmentRecord;
		if (record.kind !== "managed" && record.kind !== "external") {
			throw new Error(
				"Development media item kind must be managed or external.",
			);
		}
		if (record.kind === "managed" && !meaningful(record.media)) {
			throw new Error("Managed development media requires media.");
		}
		if (record.kind === "external" && !meaningful(record.externalUrl)) {
			throw new Error("External development media requires externalUrl.");
		}
		if (
			record.mediaType === "construction_progress" &&
			!meaningful(record.capturedAt)
		) {
			throw new Error("construction_progress media requires capturedAt.");
		}
		if (
			meaningful(record.capturedAt) &&
			Number.isNaN(Date.parse(String(record.capturedAt)))
		) {
			throw new Error("Development media capturedAt must be ISO 8601.");
		}
	}
}

export function assertDevelopmentKindFields(data: DevelopmentRecord): void {
	const kind = data.kind as DevelopmentKind | undefined;
	if (
		!(["residential_complex", "cottage_village"] as const).includes(
			kind as DevelopmentKind,
		)
	) {
		throw new Error("Development kind is required.");
	}
	const forbidden =
		kind === "residential_complex" ? cottageOnlyFields : residentialOnlyFields;
	for (const field of forbidden) {
		if (meaningful(data[field])) {
			throw new Error(`${field} is not valid for development kind=${kind}.`);
		}
	}
}

export function assertDevelopmentSlug(slug: unknown): string {
	if (typeof slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error("Development slug must be canonical lowercase ASCII.");
	}
	if (slug.startsWith("zhk-") || slug.startsWith("kp-")) {
		throw new Error(
			"Development slug stores semantic identity without the URL prefix.",
		);
	}
	return slug;
}

export function developmentUrlSlug(
	kind: DevelopmentKind,
	semanticSlug: string,
): string {
	assertDevelopmentSlug(semanticSlug);
	return `${kind === "residential_complex" ? "zhk" : "kp"}-${semanticSlug}`;
}

export function buildDevelopmentSemanticSlug(input: {
	base: string;
	citySlug: string;
	hasRealCollision: boolean;
}): string {
	const base = assertDevelopmentSlug(input.base);
	if (!input.hasRealCollision) return base;
	return `${base}-${assertDevelopmentSlug(input.citySlug)}`;
}

export function assertPublishedDevelopmentSlugImmutable(input: {
	nextSlug: string;
	originalSlug?: string | null;
	originalPublishedAt?: string | null;
}): void {
	if (
		input.originalPublishedAt &&
		input.originalSlug &&
		input.nextSlug !== input.originalSlug
	) {
		throw new Error("Published development slug is immutable.");
	}
}
