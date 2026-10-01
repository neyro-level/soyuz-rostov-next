import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { createPayloadDevelopmentExcelRepository } from "../src/core/data-access/system/development-excel-repository.ts";
import { systemOverrideAccess } from "../src/core/data-access/system/overrides.ts";
import { createPayloadStarterFixtureSeedPort } from "../src/core/data-access/system/starter-fixture-port.ts";
import { importDevelopmentExcel } from "../src/core/ingest/development-excel.ts";
import { generateStarterDevelopmentExcelSample } from "../src/project/fixture-data/development-excel-sample.ts";
import { seedStarterFixture } from "../src/project/fixture-data/starter-seed.ts";

const databaseUri = process.env.DATABASE_URI;
if (!databaseUri || !new URL(databaseUri).pathname.endsWith("_test")) {
	throw new Error(
		"verify:development-excel:integration requires an isolated local _test database.",
	);
}
const payload = await getPayload({ config });
const access = systemOverrideAccess("system-job");
await seedStarterFixture(createPayloadStarterFixtureSeedPort(payload), {
	through: "geo",
});
const buffer = await generateStarterDevelopmentExcelSample();
const repository = createPayloadDevelopmentExcelRepository(payload);
const common = {
	buffer,
	fileName: "starter-fixture.xlsx",
	sourceKey: "p8-22",
	repository,
};

const dryRun = await importDevelopmentExcel({
	...common,
	mode: "dry-run",
	now: new Date("2026-09-24T20:01:00.000Z"),
});
assert.equal(dryRun.errors, 0);
const applied = await importDevelopmentExcel({
	...common,
	mode: "apply",
	now: new Date("2026-09-24T20:02:00.000Z"),
});
assert.equal(applied.errors, 0);
const repeated = await importDevelopmentExcel({
	...common,
	mode: "dry-run",
	now: new Date("2026-09-24T20:03:00.000Z"),
});
assert.equal(repeated.created, 0);
assert.equal(repeated.changed, 0);
assert.equal(repeated.unchanged, 5);

const runs = await payload.find({
	collection: "import-runs",
	where: { excelSourceKey: { equals: "p8-22" } },
	sort: "-createdAt",
	limit: 1,
	depth: 0,
	...access,
});
assert.equal(runs.docs[0]?.sourceKind, "excel-developments");
assert.equal(runs.docs[0]?.feedSource, null);
assert.equal(runs.docs[0]?.feedHash, applied.workbookSha256);
console.log("verify:development-excel:integration: ok");
process.exit(0);
