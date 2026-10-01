import assert from "node:assert/strict";
import {
	createDevelopmentWorkbook,
	type DevelopmentExcelRepository,
	generateDevelopmentExcelTemplate,
	importDevelopmentExcel,
	readDevelopmentWorkbook,
} from "../src/core/ingest/development-excel.ts";
import { validateImportRunSourceIdentity } from "../src/project/collections/ImportRuns.ts";
import { generateStarterDevelopmentExcelSample } from "../src/project/fixture-data/development-excel-sample.ts";
import { starterFixtureDataset } from "../src/project/fixture-data/starter-dataset.ts";

const template = await generateDevelopmentExcelTemplate();
const opened = await readDevelopmentWorkbook(template);
assert.deepEqual(Object.keys(opened), [
	"Застройщики",
	"ЖК",
	"Цены",
	"Медиа",
	"Тексты",
]);

const fixture = await generateStarterDevelopmentExcelSample();

const developers = new Map<string, Record<string, unknown>>();
const developments = new Map<string, Record<string, unknown>>();
let nextId = 1;
let runId = 0;
const comparable = (value: Record<string, unknown>) => {
	const copy = structuredClone(value);
	delete copy.id;
	delete copy.lastImportRun;
	delete copy.developer;
	delete copy.developerSlug;
	return JSON.stringify(copy);
};
const repository: DevelopmentExcelRepository = {
	async inspectDeveloper(input) {
		const existing = developers.get(input.slug);
		return existing
			? {
					id: String(existing.id),
					state:
						comparable(existing) === comparable(input)
							? "unchanged"
							: "changed",
				}
			: { state: "new" };
	},
	async inspectDevelopment({ sourceKey, externalId, data }) {
		const key = `${sourceKey}:${externalId}`;
		const existing = developments.get(key);
		return existing
			? {
					id: String(existing.id),
					state:
						comparable(existing) === comparable(data) ? "unchanged" : "changed",
				}
			: { state: "new" };
	},
	async resolveGeo() {
		return { region: "1", city: "2" };
	},
	async mediaExists() {
		return true;
	},
	async createImportRun() {
		runId += 1;
		return runId;
	},
	async upsertDeveloper(id, input) {
		const entityId = id ?? String(nextId++);
		developers.set(input.slug, { ...input, id: entityId });
		return entityId;
	},
	async upsertDevelopment(id, input) {
		const entityId = id ?? String(nextId++);
		const identity = input.externalIdentities[0];
		developments.set(
			`${identity.source.replace("excel-developments:", "")}:${identity.externalId}`,
			{ ...input, id: entityId },
		);
		return entityId;
	},
	async recordIssue() {},
	async finishImportRun() {},
};
const invalidations: string[][] = [];

const dryRun = await importDevelopmentExcel({
	buffer: fixture,
	fileName: "fixture.xlsx",
	sourceKey: "fixture",
	mode: "dry-run",
	now: new Date("2026-09-24T19:00:00.000Z"),
	repository,
});
assert.equal(dryRun.created, 5);
assert.equal(dryRun.errors, 0);

const applied = await importDevelopmentExcel({
	buffer: fixture,
	fileName: "fixture.xlsx",
	sourceKey: "fixture",
	mode: "apply",
	now: new Date("2026-09-24T19:01:00.000Z"),
	repository,
	invalidateCache: async (targets) => {
		invalidations.push(targets.map((target) => target.tag));
	},
});
assert.equal(applied.created, 5);
assert.equal(developers.size, 2);
assert.equal(developments.size, 3);
assert.deepEqual(invalidations, [["developments", "developers", "properties"]]);

const repeated = await importDevelopmentExcel({
	buffer: fixture,
	fileName: "fixture.xlsx",
	sourceKey: "fixture",
	mode: "dry-run",
	now: new Date("2026-09-24T19:02:00.000Z"),
	repository,
});
assert.equal(repeated.created, 0);
assert.equal(repeated.changed, 0);
assert.equal(repeated.unchanged, 5);

const workbook = await createDevelopmentWorkbook();
await workbook.xlsx.load(fixture as never);
const enumCell = workbook.getWorksheet("ЖК")?.getCell("E2");
assert.equal(enumCell?.dataValidation.type, "list");
assert.deepEqual(
	Array.from(workbook.getWorksheet("ЖК")?.getRow(1).values as unknown[]).slice(
		1,
	),
	[
		"externalId",
		"developerSlug",
		"name",
		"slug",
		"kind",
		"regionSlug",
		"citySlug",
		"districtSlug",
		"districtRaw",
		"address",
		"latitude",
		"longitude",
		"class",
		"completion",
		"deadline",
		"salesStatus",
		"salesAvailability",
		"dataTier",
		"status",
		"checkedAt",
	],
);
assert.deepEqual(
	Array.from(
		workbook.getWorksheet("Цены")?.getRow(1).values as unknown[],
	).slice(1),
	[
		"developmentExternalId",
		"roomsLabel",
		"priceFromMinor",
		"priceToMinor",
		"lotsAvailable",
		"priceCheckedAt",
	],
);
assert.deepEqual(
	Array.from(
		workbook.getWorksheet("Медиа")?.getRow(1).values as unknown[],
	).slice(1),
	[
		"developmentExternalId",
		"mediaId",
		"mediaType",
		"rights",
		"capturedAt",
		"checkedAt",
	],
);

workbook
	.getWorksheet("Медиа")
	?.addRow([
		"dev-a",
		"1",
		"construction_progress",
		"licensed",
		"",
		"2026-09-24T19:00:00.000Z",
	]);
const invalidMedia = await importDevelopmentExcel({
	buffer: Buffer.from(await workbook.xlsx.writeBuffer()),
	fileName: "invalid-media.xlsx",
	sourceKey: "invalid-media",
	mode: "dry-run",
	now: new Date("2026-09-24T19:04:00.000Z"),
	repository,
});
assert.ok(
	invalidMedia.issues.some(
		(issue) => issue.code === "invalid_media" && issue.sheet === "Медиа",
	),
);
assert.throws(
	() =>
		validateImportRunSourceIdentity({
			sourceKind: "yrl-feed",
			excelSourceKey: "invalid",
		}),
	/requires feedSource/,
);
assert.throws(
	() =>
		validateImportRunSourceIdentity({
			sourceKind: "excel-developments",
			feedSource: 1,
			excelSourceKey: "fixture",
		}),
	/forbids feedSource/,
);
assert.equal(
	validateImportRunSourceIdentity({ feedSource: 1 }).sourceKind,
	"yrl-feed",
);

const collisionRepository: DevelopmentExcelRepository = {
	...repository,
	async inspectDevelopment() {
		return { state: "new", collision: true };
	},
};
const collision = await importDevelopmentExcel({
	buffer: fixture,
	fileName: "fixture.xlsx",
	sourceKey: "collision",
	mode: "dry-run",
	now: new Date("2026-09-24T19:03:00.000Z"),
	repository: collisionRepository,
});
assert.equal(collision.collisions, starterFixtureDataset.developments.length);
assert.equal(collision.errors, starterFixtureDataset.developments.length);

await assert.rejects(
	() => readDevelopmentWorkbook(Buffer.alloc(10 * 1024 * 1024 + 1)),
	/exceeds/,
);
console.log("verify:development-excel: ok");
