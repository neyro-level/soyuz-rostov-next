import type { Payload } from "payload";
import {
	type BackfillCity,
	type BackfillDistrict,
	type BackfillRegion,
	resolvePropertyGeoBackfill,
} from "../../geo/property-backfill.ts";
import { systemOverrideAccess } from "./overrides.ts";

const access = systemOverrideAccess("migration-helper");

const relationId = (value: unknown): string | null => {
	if (typeof value === "string" || typeof value === "number")
		return String(value);
	if (value && typeof value === "object" && "id" in value) {
		const id = (value as { id?: unknown }).id;
		return typeof id === "string" || typeof id === "number" ? String(id) : null;
	}
	return null;
};

const asMorphology = (value: unknown) => {
	if (!value || typeof value !== "object") return null;
	const source = value as Record<string, unknown>;
	return {
		nominative:
			typeof source.nominative === "string" ? source.nominative : null,
		genitive: typeof source.genitive === "string" ? source.genitive : null,
		prepositional:
			typeof source.prepositional === "string" ? source.prepositional : null,
	};
};

export type PropertyGeoBackfillReport = {
	importRunId: string;
	feedSourceId: string;
	apply: boolean;
	processed: number;
	updated: number;
	unchanged: number;
	issues: number;
	createdIssues: number;
};

export async function runPropertyGeoBackfill(input: {
	payload: Payload;
	importRunId: string | number;
	apply: boolean;
	batchSize?: number;
}): Promise<PropertyGeoBackfillReport> {
	const batchSize = Math.min(Math.max(input.batchSize ?? 100, 1), 500);
	const run = await input.payload.findByID({
		collection: "import-runs",
		id: input.importRunId,
		depth: 0,
		...access,
	});
	const feedSourceId = relationId(run.feedSource);
	if (!feedSourceId)
		throw new Error("Geo backfill requires a source-scoped import run.");
	if (!new Set<string>(["queued", "running", "success"]).has(run.status)) {
		throw new Error(
			"Geo backfill import run is not reusable in its current status.",
		);
	}
	if (input.apply && run.jobId !== "property-geo-backfill-v1") {
		throw new Error(
			"Geo backfill apply requires a dedicated property-geo-backfill-v1 import run.",
		);
	}

	const [regionDocs, cityDocs, districtDocs, existingIssueDocs] =
		await Promise.all([
			input.payload.find({
				collection: "regions",
				pagination: false,
				depth: 0,
				...access,
			}),
			input.payload.find({
				collection: "cities",
				pagination: false,
				depth: 0,
				...access,
			}),
			input.payload.find({
				collection: "districts",
				pagination: false,
				depth: 0,
				...access,
			}),
			input.payload.find({
				collection: "import-issues",
				where: { importRun: { equals: input.importRunId } },
				pagination: false,
				depth: 0,
				...access,
			}),
		]);

	const regions: BackfillRegion[] = regionDocs.docs.map((doc) => ({
		id: String(doc.id),
		slug: doc.slug,
		title: doc.title,
		shortName: doc.shortName,
		morphology: asMorphology(doc.morphology),
		status: doc.status,
	}));
	const cities: BackfillCity[] = cityDocs.docs.map((doc) => ({
		id: String(doc.id),
		slug: doc.slug,
		title: doc.title,
		regionId: relationId(doc.region) ?? "",
		morphology: asMorphology(doc.morphology),
		morphologyApproved: doc.morphologyApproved,
		status: doc.status,
	}));
	const districts: BackfillDistrict[] = districtDocs.docs.map((doc) => ({
		id: String(doc.id),
		slug: doc.slug,
		title: doc.title,
		cityId: relationId(doc.city) ?? "",
		morphology: asMorphology(doc.morphology),
		morphologyApproved: doc.morphologyApproved,
		synonyms: (doc.synonyms ?? []).map((entry) => entry.value),
		status: doc.status,
	}));
	const issueKeys = new Set(
		existingIssueDocs.docs.map(
			(doc) =>
				`${relationId(doc.property) ?? ""}|${doc.code}|${doc.field ?? ""}`,
		),
	);

	const report: PropertyGeoBackfillReport = {
		importRunId: String(run.id),
		feedSourceId,
		apply: input.apply,
		processed: 0,
		updated: 0,
		unchanged: 0,
		issues: 0,
		createdIssues: 0,
	};

	let page = 1;
	let hasNextPage = true;
	while (hasNextPage) {
		const properties = await input.payload.find({
			collection: "properties",
			where: { feedSource: { equals: feedSourceId } },
			sort: "id",
			page,
			limit: batchSize,
			depth: 0,
			...access,
		});
		for (const property of properties.docs) {
			const decision = resolvePropertyGeoBackfill({
				property: {
					region: property.region,
					locality: property.locality,
					district: property.district,
				},
				regions,
				cities,
				districts,
			});
			const patch: Record<string, unknown> = {};
			for (const field of ["regionRef", "cityRef", "districtRef"] as const) {
				if (
					decision[field] !== undefined &&
					relationId(property[field]) !== decision[field]
				) {
					patch[field] =
						decision[field] == null ? null : Number(decision[field]);
				}
			}
			if (decision.issues.length > 0 && !property.needsReview)
				patch.needsReview = true;
			report.processed += 1;
			report.issues += decision.issues.length;
			if (Object.keys(patch).length > 0) {
				report.updated += 1;
				if (input.apply) {
					await input.payload.update({
						collection: "properties",
						id: property.id,
						data: patch,
						draft: false,
						...access,
					});
				}
			} else {
				report.unchanged += 1;
			}
			for (const foundIssue of decision.issues) {
				const key = `${property.id}|${foundIssue.code}|${foundIssue.field}`;
				if (issueKeys.has(key)) continue;
				report.createdIssues += 1;
				if (input.apply) {
					await input.payload.create({
						collection: "import-issues",
						data: {
							importRun: Number(run.id),
							feedSource: Number(feedSourceId),
							property: Number(property.id),
							externalId: property.externalId ?? undefined,
							severity: "warning",
							code: foundIssue.code,
							field: foundIssue.field,
							messageRedacted: foundIssue.messageRedacted,
						},
						...access,
					});
					issueKeys.add(key);
				}
			}
		}
		hasNextPage = properties.hasNextPage;
		page += 1;
	}

	if (input.apply && run.status !== "success") {
		const warningCount = await input.payload.count({
			collection: "import-issues",
			where: {
				and: [
					{ importRun: { equals: run.id } },
					{ severity: { equals: "warning" } },
				],
			},
			...access,
		});
		await input.payload.update({
			collection: "import-runs",
			id: run.id,
			data: {
				status: "success",
				finishedAt: new Date().toISOString(),
				updatedCount: report.updated,
				skippedCount: report.unchanged,
				warningCount: warningCount.totalDocs,
			},
			...access,
		});
	}

	return report;
}
