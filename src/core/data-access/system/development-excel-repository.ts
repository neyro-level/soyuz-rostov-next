import type { Payload, Where } from "payload";
import type {
	DevelopmentExcelIssue,
	DevelopmentExcelReport,
	DevelopmentExcelRepository,
} from "../../ingest/development-excel.ts";
import { systemOverrideAccess } from "./overrides.ts";

type JsonRecord = Record<string, unknown>;

function normalized(value: unknown): unknown {
	if (Array.isArray(value)) {
		const items = value.map(normalized).filter((item) => item !== undefined);
		return items.length ? items : undefined;
	}
	if (!value || typeof value !== "object") return value ?? undefined;
	const record = Object.fromEntries(
		Object.entries(value as JsonRecord)
			.filter(([key]) => !["id", "createdAt", "updatedAt", "lastImportRun"].includes(key))
			.map(([key, child]) => [key, normalized(child)])
			.filter(([, child]) => child !== undefined),
	);
	return Object.keys(record).length ? record : undefined;
}

function sameRelevant(existing: JsonRecord, expected: JsonRecord): boolean {
	const subset = Object.fromEntries(Object.keys(expected).map((key) => [key, existing[key]]));
	return JSON.stringify(normalized(subset)) === JSON.stringify(normalized(expected));
}

async function findOne(
	payload: Payload,
	collection: Parameters<Payload["find"]>[0]["collection"],
	where: JsonRecord,
	access: ReturnType<typeof systemOverrideAccess>,
): Promise<JsonRecord | undefined> {
	const result = await payload.find({ collection, where: where as Where, limit: 1, depth: 0, ...access });
	return result.docs[0] as unknown as JsonRecord | undefined;
}

async function findMany(
	payload: Payload,
	collection: Parameters<Payload["find"]>[0]["collection"],
	where: JsonRecord,
	access: ReturnType<typeof systemOverrideAccess>,
): Promise<JsonRecord[]> {
	const result = await payload.find({ collection, where: where as Where, limit: 100, depth: 0, ...access });
	return result.docs as unknown as JsonRecord[];
}

export function createPayloadDevelopmentExcelRepository(payload: Payload): DevelopmentExcelRepository {
	const systemAccess = systemOverrideAccess("system-job");
	const access = {
		...systemAccess,
		context: { ...systemAccess.context, source: "import" as const },
	};
	return {
		async inspectDeveloper(input) {
			const existing = await findOne(payload, "developers", { slug: { equals: input.slug } }, access);
			if (!existing) return { state: "new" };
			return { id: Number(existing.id), state: sameRelevant(existing, input) ? "unchanged" : "changed" };
		},
		async inspectDevelopment({ sourceKey, externalId, data }) {
			const source = `excel-developments:${sourceKey}`;
			const candidates = await findMany(payload, "developments", { "externalIdentities.externalId": { equals: externalId } }, access);
			const existing = candidates.find((candidate) =>
				Array.isArray(candidate.externalIdentities) && candidate.externalIdentities.some((identity) => {
					const record = identity as JsonRecord;
					return record.source === source && record.externalId === externalId;
				}),
			);
			const slugOwner = await findOne(payload, "developments", { slug: { equals: data.slug } }, access);
			if (!existing) {
				return { state: "new", collision: Boolean(slugOwner) };
			}
			const publishedSlugMutation = Boolean(existing.publishedAt && existing.slug !== data.slug);
			const collision = Boolean(slugOwner && String(slugOwner.id) !== String(existing.id));
			const developer = await findOne(payload, "developers", { slug: { equals: data.developerSlug } }, access);
			const expected: JsonRecord & { developerSlug?: unknown } = { ...data, developer: developer?.id };
			delete expected.developerSlug;
			return {
				id: Number(existing.id),
				state: sameRelevant(existing, expected) ? "unchanged" : "changed",
				collision,
				publishedSlugMutation,
			};
		},
		async resolveGeo({ regionSlug, citySlug, districtSlug }) {
			const region = await findOne(payload, "regions", { slug: { equals: regionSlug } }, access);
			if (!region) return undefined;
			const city = await findOne(payload, "cities", {
				and: [{ slug: { equals: citySlug } }, { region: { equals: region.id } }],
			}, access);
			if (!city) return undefined;
			let district: JsonRecord | undefined;
			if (districtSlug) {
				district = await findOne(payload, "districts", {
					and: [{ slug: { equals: districtSlug } }, { city: { equals: city.id } }],
				}, access);
				if (!district) return undefined;
			}
			return { region: Number(region.id), city: Number(city.id), district: district ? Number(district.id) : undefined };
		},
		async mediaExists(id) {
			try {
				await payload.findByID({ collection: "media", id, depth: 0, ...access });
				return true;
			} catch {
				return false;
			}
		},
		async createImportRun({ sourceKey, fileName, workbookSha256, now }) {
			const run = await payload.create({
				collection: "import-runs",
				...access,
				data: {
					sourceKind: "excel-developments",
					excelSourceKey: sourceKey,
					sourceFileName: fileName.slice(0, 240),
					status: "running",
					queuedAt: now,
					startedAt: now,
					heartbeatAt: now,
					feedHash: workbookSha256,
				},
			});
			return Number(run.id);
		},
		async upsertDeveloper(id, input) {
			const result = id
				? await payload.update({ collection: "developers", id, data: input as never, depth: 0, ...access })
				: await payload.create({ collection: "developers", data: input as never, depth: 0, ...access });
			return Number((result as unknown as JsonRecord).id);
		},
		async upsertDevelopment(id, input) {
			const result = id
				? await payload.update({ collection: "developments", id, data: input as never, depth: 0, ...access })
				: await payload.create({ collection: "developments", data: input as never, depth: 0, ...access });
			return Number((result as unknown as JsonRecord).id);
		},
		async recordIssue(importRunId: number, issue: DevelopmentExcelIssue) {
			await payload.create({
				collection: "import-issues",
				...access,
				data: {
					importRun: importRunId,
					severity: issue.severity,
					code: issue.code,
					messageRedacted: issue.message.slice(0, 500),
					field: issue.field,
					sourceSheet: issue.sheet,
					sourceRow: issue.row,
				},
			});
		},
		async finishImportRun({ id, status, report, now }: { id: number; status: "success" | "unchanged" | "failed"; report: DevelopmentExcelReport; now: string }) {
			await payload.update({
				collection: "import-runs",
				id,
				...access,
				data: {
					status,
					finishedAt: now,
					heartbeatAt: now,
					offeredCount: report.created + report.changed + report.unchanged,
					createdCount: report.created,
					updatedCount: report.changed,
					skippedCount: report.unchanged,
					warningCount: report.warnings,
					errorCount: report.errors,
					feedHash: report.workbookSha256,
					evidence: {
						mode: report.mode,
						created: report.created,
						changed: report.changed,
						unchanged: report.unchanged,
						collisions: report.collisions,
					},
					lastErrorRedacted: report.errors ? "Development Excel validation failed. Review import issues." : undefined,
				},
			});
		},
	};
}
