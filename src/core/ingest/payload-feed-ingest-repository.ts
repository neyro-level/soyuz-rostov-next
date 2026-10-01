import type { Payload } from "payload";
import { systemOverrideAccess } from "../data-access/system/overrides.ts";
import {
	resolvePropertyGeoBackfill,
	type BackfillCity,
	type BackfillDistrict,
	type BackfillRegion,
} from "../geo/property-backfill.ts";
import {
	countMissingActiveFeedProperties,
	deactivateMissingFeedProperties,
	touchFeedPropertiesLastSeenAt,
} from "../data-access/ingest/sql/index.ts";
import type {
	FeedIngestRepository,
	FeedPropertyRecord,
	FeedPropertyWriteData,
	FeedImportIssueDraft,
} from "./feed-ingest.ts";

const importAccess = {
	...systemOverrideAccess("system-job"),
	context: {
		...systemOverrideAccess("system-job").context,
		source: "import" as const,
	},
};

function redactIssueMessage(message: string): string {
	return message
		.replace(/<[^>]{0,400}>/g, "[redacted]")
		.replace(/https?:\/\/[^\s]+/gi, "[redacted-url]")
		.slice(0, 400);
}

function asRecord(value: unknown): FeedPropertyRecord {
	const row = value as FeedPropertyRecord;
	return {
		...row,
		id: String(row.id),
		slug: String(row.slug),
	};
}

function toPropertyData(data: FeedPropertyWriteData) {
	return {
		origin: "feed" as const,
		feedSource: Number(data.feedSource),
		externalId: data.externalId,
		importHash: data.importHash,
		firstSeenAt: data.firstSeenAt,
		lastSeenAt: data.lastSeenAt,
		lastImportRun: Number(data.lastImportRun),
		status: data.status,
		market: data.market,
		category: data.category,
		dealType: data.dealType,
		houseType: data.houseType,
		commercialType: data.commercialType,
		priceMinor: data.priceMinor,
		currency: data.currency,
		publicAddress: data.publicAddress,
		locality: data.locality,
		district: data.district,
		region: data.region,
		regionRef: data.regionRef == null ? data.regionRef : Number(data.regionRef),
		cityRef: data.cityRef == null ? data.cityRef : Number(data.cityRef),
		districtRef:
			data.districtRef == null ? data.districtRef : Number(data.districtRef),
		needsReview: data.needsReview,
		street: data.street,
		house: data.house,
		lat: data.lat,
		lng: data.lng,
		rooms: data.rooms,
		totalArea: data.totalArea,
		livingArea: data.livingArea,
		kitchenArea: data.kitchenArea,
		floor: data.floor,
		floors: data.floors,
		pricePerMeterMinor: data.pricePerMeterMinor,
		externalComplexId: data.externalComplexId,
		externalComplexName: data.externalComplexName,
		externalBuildingId: data.externalBuildingId,
		externalLayoutId: data.externalLayoutId,
		title: data.title,
		description: data.description,
		images: data.images.map((image) =>
			image.kind === "managed"
				? { ...image, media: Number(image.media) }
				: image,
		),
		slug: data.slug ?? "",
	};
}

export function createPayloadFeedIngestRepository(
	payload: Payload,
	feedSourceId: string,
): FeedIngestRepository {
	let geoCatalogPromise:
		| Promise<{
				regions: BackfillRegion[];
				cities: BackfillCity[];
				districts: BackfillDistrict[];
		  }>
		| undefined;
	const loadGeoCatalog = () => {
		geoCatalogPromise ??= Promise.all([
			payload.find({
				collection: "regions",
				pagination: false,
				depth: 0,
				...importAccess,
			}),
			payload.find({
				collection: "cities",
				pagination: false,
				depth: 0,
				...importAccess,
			}),
			payload.find({
				collection: "districts",
				pagination: false,
				depth: 0,
				...importAccess,
			}),
		]).then(([regions, cities, districts]) => ({
			regions: regions.docs.map((doc) => ({
				id: String(doc.id),
				slug: doc.slug,
				title: doc.title,
				shortName: doc.shortName,
				morphology: doc.morphology,
				status: doc.status,
			})),
			cities: cities.docs.map((doc) => ({
				id: String(doc.id),
				slug: doc.slug,
				title: doc.title,
				regionId: String(doc.region),
				morphology: doc.morphology,
				morphologyApproved: doc.morphologyApproved,
				status: doc.status,
			})),
			districts: districts.docs.map((doc) => ({
				id: String(doc.id),
				slug: doc.slug,
				title: doc.title,
				cityId: String(doc.city),
				morphology: doc.morphology,
				morphologyApproved: doc.morphologyApproved,
				status: doc.status,
				synonyms: doc.synonyms?.map((item) => item.value),
			})),
		}));
		return geoCatalogPromise;
	};
	return {
		async resolveGeoReferences(property) {
			const catalog = await loadGeoCatalog();
			return resolvePropertyGeoBackfill({ property, ...catalog });
		},
		async findFeedProperty({ feedSourceId: sourceId, externalId }) {
			if (sourceId !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			const found = await payload.find({
				collection: "properties",
				where: {
					and: [
						{ feedSource: { equals: Number(sourceId) } },
						{ externalId: { equals: externalId } },
						{ origin: { equals: "feed" } },
					],
				},
				limit: 1,
				depth: 0,
				...importAccess,
			});
			const doc = found.docs[0];
			return doc ? asRecord(doc) : undefined;
		},
		async createFeedProperty(data: FeedPropertyWriteData) {
			if (data.feedSource !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			const created = await payload.create({
				collection: "properties",
				draft: false,
				data: toPropertyData(data),
				...importAccess,
			});
			return asRecord(created);
		},
		async updateFeedProperty(id, data) {
			const found = await payload.find({
				collection: "properties",
				where: {
					and: [
						{ id: { equals: Number(id) } },
						{ feedSource: { equals: Number(feedSourceId) } },
						{ origin: { equals: "feed" } },
					],
				},
				limit: 1,
				depth: 0,
				...importAccess,
			});
			if (!found.docs[0]) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			if (data.market && data.market !== found.docs[0].market) {
				throw new Error(
					"Feed ingest cannot write a property outside source market.",
				);
			}
			const patch: Record<string, unknown> = { ...data };
			delete patch.feedSource;
			delete patch.lastImportRun;
			delete patch.origin;
			if (data.lastImportRun) {
				patch.lastImportRun = Number(data.lastImportRun);
			}
			const updated = await payload.update({
				collection: "properties",
				id,
				draft: false,
				data: patch,
				...importAccess,
			});
			return asRecord(updated);
		},
		async createImportIssue(issue: FeedImportIssueDraft) {
			if (issue.feedSource !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			await payload.create({
				collection: "import-issues",
				data: {
					feedSource: Number(issue.feedSource),
					importRun: Number(issue.importRun),
					severity: issue.severity,
					code: issue.code,
					externalId: issue.externalId,
					field: issue.field,
					messageRedacted: redactIssueMessage(issue.messageRedacted),
				},
				...importAccess,
			});
		},
		async touchLastSeenAt({
			feedSourceId: sourceId,
			importRunId,
			externalIds,
			nowIso,
		}) {
			if (sourceId !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			await touchFeedPropertiesLastSeenAt(payload, {
				feedSourceId: sourceId,
				importRunId,
				externalIds,
				now: new Date(nowIso),
			});
		},
		async countMissingActive({ feedSourceId: sourceId, seenBeforeIso }) {
			if (sourceId !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			return countMissingActiveFeedProperties(payload, {
				feedSourceId: sourceId,
				seenBefore: new Date(seenBeforeIso),
			});
		},
		async deactivateMissing({
			feedSourceId: sourceId,
			importRunId,
			seenBeforeIso,
			nowIso,
		}) {
			if (sourceId !== feedSourceId) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			return deactivateMissingFeedProperties(payload, {
				feedSourceId: sourceId,
				importRunId,
				seenBefore: new Date(seenBeforeIso),
				now: new Date(nowIso),
			});
		},
	};
}
