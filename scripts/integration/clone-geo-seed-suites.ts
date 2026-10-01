import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../../payload.config.ts";
import { createPayloadStarterFixtureSeedPort } from "../../src/core/data-access/system/starter-fixture-port.ts";
import { seedGeoDataset } from "../../src/project/fixture-data/starter-seed.ts";

const payload = await getPayload({ config });
try {
	const dataset = {
		snapshotAt: "2026-09-27T00:00:00.000Z",
		region: {
			slug: "clone-seed-region",
			title: "Clone Seed Region",
			morphology: {
				nominative: "Clone Seed Region",
				genitive: "Clone Seed Region",
				prepositional: "Clone Seed Region",
			},
			shortName: "Clone Seed",
			sortOrder: 900,
		},
		cities: [
			{
				slug: "clone-seed-city",
				title: "Clone Seed City",
				morphology: {
					nominative: "Clone Seed City",
					genitive: "Clone Seed City",
					prepositional: "Clone Seed City",
				},
				preposition: "vo" as const,
				cityType: "city",
				morphologyApproved: true,
				sortOrder: 900,
				districts: [
					{
						slug: "clone-seed-district",
						title: "Clone Seed District",
						morphology: {
							nominative: "Clone Seed District",
							genitive: "Clone Seed District",
							prepositional: "Clone Seed District",
						},
						districtType: "admin_district" as const,
						parent: null,
						synonyms: [{ value: "Clone District" }],
						preposition: "vo" as const,
						adjLocative: "Clone Seed District",
						adjGenitive: "Clone Seed District",
						morphologyApproved: true,
						sortOrder: 900,
					},
				],
			},
		],
	} as const;
	const port = createPayloadStarterFixtureSeedPort(payload);
	const first = await seedGeoDataset(port, dataset);
	const second = await seedGeoDataset(port, dataset);
	assert.equal(first.report.created + first.report.unchanged, 3);
	assert.equal(first.report.updated, 0);
	assert.deepEqual(
		{
			created: second.report.created,
			updated: second.report.updated,
			unchanged: second.report.unchanged,
		},
		{ created: 0, updated: 0, unchanged: 3 },
	);
	payload.logger.info(
		"clone geo seed integration: idempotent System Gateway PASS",
	);
} finally {
	await payload.destroy();
}
