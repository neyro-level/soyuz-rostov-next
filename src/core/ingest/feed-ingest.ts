import { createHash } from "node:crypto";
import { calculatePropertyDerivedFields } from "./derived-fields.ts";
import type {
	FeedNormalizationIssue,
	NormalizedFeedOffer,
} from "./feed-normalization.ts";

export type FeedIngestMarket = "secondary" | "newbuild";
export type FeedPropertyCategory =
	| "apartment"
	| "house"
	| "land"
	| "commercial"
	| "room"
	| "garage";
export type FeedPropertyDealType = "sale" | "rent";

export type FeedIngestContext = {
	feedSourceId: string;
	feedSourceCode: string;
	importRunId: string;
	market: FeedIngestMarket;
	nowIso: string;
};

export type FeedPropertyImageDraft =
	| { kind: "external"; url: string; alt?: string; order: number }
	| { kind: "managed"; media: string; alt?: string; order: number };

export type FeedPropertyWriteData = {
	feedSource: string;
	externalId: string;
	origin: "feed";
	importHash: string;
	firstSeenAt?: string;
	lastSeenAt: string;
	lastImportRun: string;
	status: "active" | "archived";
	market: FeedIngestMarket;
	category: FeedPropertyCategory;
	dealType: FeedPropertyDealType;
	houseType?: string;
	commercialType?: string;
	priceMinor?: number;
	currency: "RUB";
	publicAddress?: string;
	locality?: string;
	district?: string;
	region?: string;
	regionRef?: string | null;
	cityRef?: string | null;
	districtRef?: string | null;
	needsReview?: boolean;
	street?: string;
	house?: string;
	lat?: number;
	lng?: number;
	rooms?: number;
	totalArea?: number;
	livingArea?: number;
	kitchenArea?: number;
	floor?: number;
	floors?: number;
	pricePerMeterMinor?: number | null;
	externalComplexId?: string;
	externalComplexName?: string;
	externalBuildingId?: string;
	externalLayoutId?: string;
	title: string;
	description?: string;
	images: FeedPropertyImageDraft[];
	slug?: string;
};

export type FeedPropertyRecord = FeedPropertyWriteData & {
	id: string;
	publicUrlId: number;
	manualOverrides?: { field: string }[];
	slug: string;
};

export type FeedImportIssueDraft = FeedNormalizationIssue & {
	feedSource: string;
	importRun: string;
};

export type FeedIngestRepository = {
	resolveGeoReferences?(input: {
		region?: string;
		locality?: string;
		district?: string;
	}): Promise<{
		regionRef?: string | null;
		cityRef?: string | null;
		districtRef?: string | null;
		issues: Array<{ field: string; messageRedacted: string }>;
	}>;
	findFeedProperty(input: {
		feedSourceId: string;
		externalId: string;
	}): Promise<FeedPropertyRecord | undefined>;
	createFeedProperty(data: FeedPropertyWriteData): Promise<FeedPropertyRecord>;
	updateFeedProperty(
		id: string,
		data: Partial<FeedPropertyWriteData>,
	): Promise<FeedPropertyRecord>;
	createImportIssue(issue: FeedImportIssueDraft): Promise<void>;
	touchLastSeenAt(input: {
		feedSourceId: string;
		importRunId: string;
		externalIds: string[];
		nowIso: string;
	}): Promise<void>;
	countMissingActive(input: {
		feedSourceId: string;
		seenBeforeIso: string;
	}): Promise<number>;
	deactivateMissing(input: {
		feedSourceId: string;
		importRunId: string;
		seenBeforeIso: string;
		nowIso: string;
	}): Promise<number>;
};

export type CacheInvalidationTarget =
	| { type: "tag"; tag: string }
	| { type: "path"; path: string; routeType?: "page" | "layout" };

export type FeedIngestResult = {
	offeredCount: number;
	createdCount: number;
	updatedCount: number;
	skippedCount: number;
	warningCount: number;
	errorCount: number;
	invalidatedTargets: CacheInvalidationTarget[];
};

export type FeedIngestInput = {
	context: FeedIngestContext;
	offers: NormalizedFeedOffer[];
	issues?: FeedNormalizationIssue[];
	repository: FeedIngestRepository;
	invalidateCache?: (targets: CacheInvalidationTarget[]) => Promise<void>;
	mirrorImages?: (offer: NormalizedFeedOffer) => Promise<{
		images: FeedPropertyImageDraft[];
		issues: Array<{ field: string; messageRedacted: string }>;
	}>;
};

const manuallyOwnedFields = new Set<keyof FeedPropertyWriteData>(["slug"]);

export async function ingestNormalizedFeed({
	context,
	offers,
	issues = [],
	repository,
	invalidateCache,
	mirrorImages,
}: FeedIngestInput): Promise<FeedIngestResult> {
	const result: FeedIngestResult = {
		offeredCount: offers.length,
		createdCount: 0,
		updatedCount: 0,
		skippedCount: 0,
		warningCount: 0,
		errorCount: 0,
		invalidatedTargets: [],
	};
	const seenExternalIds: string[] = [];

	for (const issue of issues) {
		await repository.createImportIssue({
			...issue,
			feedSource: context.feedSourceId,
			importRun: context.importRunId,
		});
		if (issue.severity === "error") {
			result.errorCount += 1;
		} else {
			result.warningCount += 1;
		}
	}

	for (const offer of offers) {
		const existing = await repository.findFeedProperty({
			feedSourceId: context.feedSourceId,
			externalId: offer.externalId,
		});
		if (offer.marketHint && offer.marketHint !== context.market) {
			await repository.createImportIssue({
				severity: "error",
				code: "feed.offer_invalid",
				externalId: offer.externalId,
				field: "market",
				messageRedacted:
					"Feed offer market does not match the source and was not published.",
				feedSource: context.feedSourceId,
				importRun: context.importRunId,
			});
			result.errorCount += 1;
			result.skippedCount += 1;
			continue;
		}
		const geo = await repository.resolveGeoReferences?.({
			region: offer.region,
			locality: offer.locality,
			district: offer.district,
		});
		for (const geoIssue of geo?.issues ?? []) {
			await repository.createImportIssue({
				severity: "warning",
				code: "feed.offer_invalid",
				externalId: offer.externalId,
				field: geoIssue.field,
				messageRedacted: geoIssue.messageRedacted,
				feedSource: context.feedSourceId,
				importRun: context.importRunId,
			});
			result.warningCount += 1;
		}
		const nextData: FeedPropertyWriteData = {
			...buildFeedPropertyWriteData({ context, offer, existing }),
			regionRef: geo?.regionRef,
			cityRef: geo?.cityRef,
			districtRef: geo?.districtRef,
			needsReview: Boolean(geo?.issues.length),
		};
		nextData.importHash = createOfferHash({
			offer,
			regionRef: nextData.regionRef,
			cityRef: nextData.cityRef,
			districtRef: nextData.districtRef,
			needsReview: nextData.needsReview,
		});
		if (nextData.market !== context.market) {
			throw new Error(
				"Feed ingest cannot write a property outside source market.",
			);
		}
		if (existing) {
			if (existing.feedSource !== context.feedSourceId) {
				throw new Error(
					"Feed ingest cannot write a property outside source scope.",
				);
			}
			if (existing.market !== context.market) {
				await repository.createImportIssue({
					severity: "error",
					code: "feed.offer_invalid",
					externalId: offer.externalId,
					field: "market",
					messageRedacted:
						"Existing feed property market does not match the source.",
					feedSource: context.feedSourceId,
					importRun: context.importRunId,
				});
				result.errorCount += 1;
				result.skippedCount += 1;
				continue;
			}
			if (
				existing.importHash === nextData.importHash &&
				existing.status === "active"
			) {
				seenExternalIds.push(offer.externalId);
				result.skippedCount += 1;
				continue;
			}
		}
		if (mirrorImages) {
			const mirrored = await mirrorImages(offer);
			nextData.images = mirrored.images;
			for (const mediaIssue of mirrored.issues) {
				await repository.createImportIssue({
					severity: "warning",
					code: "feed.offer_invalid",
					externalId: offer.externalId,
					field: mediaIssue.field,
					messageRedacted: mediaIssue.messageRedacted,
					feedSource: context.feedSourceId,
					importRun: context.importRunId,
				});
				result.warningCount += 1;
			}
		}

		if (!existing) {
			seenExternalIds.push(offer.externalId);
			await repository.createFeedProperty(nextData);
			result.createdCount += 1;
			continue;
		}

		seenExternalIds.push(offer.externalId);

		if (existing.importHash === nextData.importHash) {
			if (existing.status !== "active") {
				await repository.updateFeedProperty(existing.id, { status: "active" });
				result.updatedCount += 1;
				continue;
			}
			result.skippedCount += 1;
			continue;
		}

		const patch = diffFeedProperty(existing, nextData);
		if (Object.keys(patch).length === 0) {
			result.skippedCount += 1;
			continue;
		}

		await repository.updateFeedProperty(existing.id, patch);
		result.updatedCount += 1;
	}

	await repository.touchLastSeenAt({
		feedSourceId: context.feedSourceId,
		importRunId: context.importRunId,
		externalIds: seenExternalIds,
		nowIso: context.nowIso,
	});

	if (result.createdCount > 0 || result.updatedCount > 0) {
		result.invalidatedTargets = [
			{ type: "tag", tag: "properties" },
			{ type: "path", path: "/kvartiry/", routeType: "page" },
		];
		await invalidateCache?.(result.invalidatedTargets);
	}

	return result;
}

export function buildFeedPropertyWriteData({
	context,
	offer,
	existing,
}: {
	context: FeedIngestContext;
	offer: NormalizedFeedOffer;
	existing?: FeedPropertyRecord;
}): FeedPropertyWriteData {
	return {
		feedSource: context.feedSourceId,
		externalId: offer.externalId,
		origin: "feed",
		importHash: createOfferHash(offer),
		firstSeenAt: existing?.firstSeenAt ?? context.nowIso,
		lastSeenAt: context.nowIso,
		lastImportRun: context.importRunId,
		status: "active",
		market: context.market,
		category: offer.category,
		dealType: offer.dealType,
		houseType: offer.category === "house" ? offer.subtype : undefined,
		commercialType: offer.category === "commercial" ? offer.subtype : undefined,
		priceMinor: offer.priceMinor,
		currency: offer.currency,
		publicAddress: offer.publicAddress,
		locality: offer.locality,
		district: offer.district,
		region: offer.region,
		street: offer.street,
		house: offer.house,
		lat: offer.latitude,
		lng: offer.longitude,
		rooms: offer.rooms,
		totalArea: offer.totalArea,
		livingArea: offer.livingArea,
		kitchenArea: offer.kitchenArea,
		floor: offer.floor,
		floors: offer.floors,
		externalComplexId: offer.externalComplexId,
		externalComplexName: offer.externalComplexName,
		externalBuildingId: offer.externalBuildingId,
		externalLayoutId: offer.externalLayoutId,
		...calculatePropertyDerivedFields({
			priceMinor: offer.priceMinor,
			totalArea: offer.totalArea,
		}),
		title: offer.title,
		description: offer.description,
		images: offer.images.map((image, index) => ({
			kind: "external",
			url: image.url,
			alt: offer.title,
			order: index,
		})),
		slug:
			existing?.slug ??
			buildStableFeedSlug(context.feedSourceCode, offer.externalId),
	};
}

export function diffFeedProperty(
	existing: FeedPropertyRecord,
	nextData: FeedPropertyWriteData,
): Partial<FeedPropertyWriteData> {
	const manualFields = new Set(
		existing.manualOverrides?.map(
			(override) => override.field as keyof FeedPropertyWriteData,
		),
	);
	const patch: Partial<FeedPropertyWriteData> = {};
	const technicalFields = new Set<keyof FeedPropertyWriteData>([
		"lastSeenAt",
		"lastImportRun",
	]);

	for (const [key, value] of Object.entries(nextData) as [
		keyof FeedPropertyWriteData,
		FeedPropertyWriteData[keyof FeedPropertyWriteData],
	][]) {
		if (
			manuallyOwnedFields.has(key) ||
			manualFields.has(key) ||
			technicalFields.has(key)
		) {
			continue;
		}

		if (!stableEqual(existing[key], value)) {
			patch[key] = value as never;
		}
	}

	return patch;
}

export function buildStableFeedSlug(
	feedSourceCode: string,
	externalId: string,
): string {
	const source = slugify(feedSourceCode);
	const external = slugify(externalId);
	return `feed-${source}-${external}`.slice(0, 96);
}

function createOfferHash(value: unknown): string {
	return createHash("sha256").update(stableStringify(value)).digest("hex");
}

function stableEqual(left: unknown, right: unknown): boolean {
	return stableStringify(left) === stableStringify(right);
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item) => stableStringify(item)).join(",")}]`;
	}
	if (value && typeof value === "object") {
		return `{${Object.entries(value)
			.sort(([left], [right]) => left.localeCompare(right))
			.map(([key, item]) => `${JSON.stringify(key)}:${stableStringify(item)}`)
			.join(",")}}`;
	}
	return JSON.stringify(value);
}

function slugify(value: string): string {
	return value
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "")
		.replace(/[^a-z0-9а-яё]+/giu, "-")
		.replace(/^-+|-+$/g, "")
		.slice(0, 42);
}
