import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { deriveSeoTier } from "../src/core/seo/registry.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import {
	loadProjectDistrictRegistry,
	parseRegistryCsv,
} from "./seo-registry.ts";
import {
	applyDemandSnapshot,
	importDemandFile,
	parseDemandCsv,
} from "./seo-registry-import-demand.ts";

const registry = readFileSync("docs/seo/SEO_REGISTRY_SEED.csv", "utf8");
const districts = loadProjectDistrictRegistry(siteProfile);
const firstRows = parseRegistryCsv(registry, siteProfile).slice(0, 2);
const validDemand = `url,phrase,value,snapshotDate\n${firstRows[0]?.url},недвижимость ростов,600,2026-09-25\n${firstRows[1]?.url},квартиры ростов,125,2026-09-25\n`;

assert.equal(parseDemandCsv(validDemand).length, 2);
const applied = applyDemandSnapshot(
	registry,
	validDemand,
	siteProfile,
	districts,
);
const appliedRows = parseRegistryCsv(applied, siteProfile);
assert.deepEqual(
	appliedRows.slice(0, 2).map((row) => ({
		url: row.url,
		value: row.value,
		source: row.source,
		snapshotDate: row.snapshotDate,
		tier: row.tier,
		synthetic: row.synthetic,
	})),
	[
		{
			url: firstRows[0]?.url,
			value: 600,
			source: siteProfile.seoTiers.metric,
			snapshotDate: "2026-09-25",
			tier: deriveSeoTier(600, siteProfile.seoTiers),
			synthetic: false,
		},
		{
			url: firstRows[1]?.url,
			value: 125,
			source: siteProfile.seoTiers.metric,
			snapshotDate: "2026-09-25",
			tier: deriveSeoTier(125, siteProfile.seoTiers),
			synthetic: false,
		},
	],
);
assert.equal(
	applyDemandSnapshot(applied, validDemand, siteProfile, districts),
	applied,
);

assert.throws(
	() =>
		applyDemandSnapshot(
			registry,
			"url,phrase,value,snapshotDate\n/unknown/,test,10,2026-09-25\n",
			siteProfile,
			districts,
		),
	/unknown registry URL/,
);
assert.throws(
	() =>
		applyDemandSnapshot(
			registry,
			`url,phrase,value,snapshotDate\n${firstRows[0]?.url},one,10,2026-09-25\n${firstRows[0]?.url},two,20,2026-09-25\n`,
			siteProfile,
			districts,
		),
	/Duplicate demand URL/,
);
assert.throws(
	() =>
		applyDemandSnapshot(
			registry,
			`url,phrase,value,snapshotDate\n${firstRows[0]?.url},one,10,2026-09-25\n${firstRows[1]?.url},two,20,2026-09-26\n`,
			siteProfile,
			districts,
		),
	/exactly one snapshotDate/,
);

const fixture = mkdtempSync(join(tmpdir(), "ams-demand-import-"));
try {
	const registryPath = join(fixture, "registry.csv");
	const demandPath = join(fixture, "demand.csv");
	writeFileSync(registryPath, registry, "utf8");
	writeFileSync(
		demandPath,
		`url,phrase,value,snapshotDate\n${firstRows[0]?.url},valid,10,2026-09-25\n/unknown/,invalid,20,2026-09-25\n`,
		"utf8",
	);
	assert.throws(
		() => importDemandFile(registryPath, demandPath, siteProfile, districts),
		/unknown registry URL/,
	);
	assert.equal(readFileSync(registryPath, "utf8"), registry);
	writeFileSync(demandPath, validDemand, "utf8");
	assert.deepEqual(
		importDemandFile(registryPath, demandPath, siteProfile, districts),
		{ changed: true, rows: 2 },
	);
	const after = readFileSync(registryPath, "utf8");
	assert.deepEqual(
		importDemandFile(registryPath, demandPath, siteProfile, districts),
		{ changed: false, rows: 2 },
	);
	assert.equal(readFileSync(registryPath, "utf8"), after);
} finally {
	rmSync(fixture, { recursive: true, force: true });
}

console.log(
	"SEO registry demand import passed: validation, atomicity and idempotence",
);
