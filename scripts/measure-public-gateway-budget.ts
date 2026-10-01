import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { performance } from "node:perf_hooks";
import { getPayload, type Where } from "payload";
import config from "../payload.config.ts";
import { trustedInspectionAccess } from "../src/core/data-access/system/overrides.ts";
import { createPublicGatewayBudgetFixtureRows } from "../src/core/data-access/system/sql/index.ts";
import { getListing } from "../src/project/data-access/public/geo-catalog.ts";
import {
	aggregatePublicCatalogFacetRows,
	readPublicCatalogFacetRows,
} from "../src/project/data-access/public/payload-reads.ts";

const warmupRequests = 5;
const measuredRequests = 35;
const fixtureSize = 2000;
const fixturePrefix = "plan10-budget-";
const readBudgetMs = 300;
const aggregateBudgetMs = 200;
const fixtureConditions: Where[] = [
	{ status: { equals: "active" } },
	{ publishedAt: { exists: true } },
	{ contentPurgedAt: { exists: false } },
];
const fixtureWhere: Where = { and: fixtureConditions };

function assertIsolatedLocalDatabase(): void {
	const databaseUri = process.env.DATABASE_URI;
	assert.ok(
		databaseUri,
		"DATABASE_URI is required for the performance fixture.",
	);
	const parsed = new URL(databaseUri);
	assert.ok(
		parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost",
		"Performance fixture setup is restricted to loopback PostgreSQL.",
	);
	assert.ok(
		parsed.pathname.slice(1).endsWith("_test"),
		"Performance fixture setup requires an isolated *_test database.",
	);
}

async function ensureDeterministicFixture(
	payload: Awaited<ReturnType<typeof getPayload>>,
) {
	assertIsolatedLocalDatabase();
	const [publicRows, fixtureRows] = await Promise.all([
		payload.count({
			collection: "properties",
			where: fixtureWhere,
			...trustedInspectionAccess,
		}),
		payload.count({
			collection: "properties",
			where: { and: [...fixtureConditions, { slug: { like: fixturePrefix } }] },
			...trustedInspectionAccess,
		}),
	]);
	const baseRows = publicRows.totalDocs - fixtureRows.totalDocs;
	assert.ok(
		baseRows >= 0 && baseRows <= fixtureSize,
		"Invalid public fixture baseline.",
	);
	const desiredFixtureRows = fixtureSize - baseRows;
	assert.ok(
		fixtureRows.totalDocs <= desiredFixtureRows,
		"Existing performance fixture is larger than the deterministic target.",
	);
	const created = desiredFixtureRows - fixtureRows.totalDocs;
	const publishedAt = "2026-09-27T00:00:00.000Z";
	const synchronized = await createPublicGatewayBudgetFixtureRows(payload, {
		start: 1,
		count: desiredFixtureRows,
		prefix: fixturePrefix,
		publishedAt,
	});
	assert.equal(
		synchronized,
		desiredFixtureRows,
		"Fixture synchronization did not return the expected rows.",
	);
	return {
		baseRows,
		fixtureRows: desiredFixtureRows,
		created,
		synchronized,
	};
}

function p95(values: readonly number[]): number {
	const sorted = [...values].sort((left, right) => left - right);
	return sorted[Math.ceil(sorted.length * 0.95) - 1] ?? 0;
}

async function measure(operation: () => Promise<unknown> | unknown): Promise<{
	rawMs: number[];
	failures: number;
}> {
	let failures = 0;
	for (let index = 0; index < warmupRequests; index += 1) await operation();
	const timings: number[] = [];
	for (let index = 0; index < measuredRequests; index += 1) {
		const started = performance.now();
		try {
			await operation();
		} catch (error) {
			failures += 1;
			throw error;
		}
		timings.push(Number((performance.now() - started).toFixed(3)));
	}
	return { rawMs: timings, failures };
}

const payload = await getPayload({ config });
try {
	const setup = await ensureDeterministicFixture(payload);
	const fixtureRows = await payload.count({
		collection: "properties",
		where: fixtureWhere,
		...trustedInspectionAccess,
	});
	assert.equal(
		fixtureRows.totalDocs,
		fixtureSize,
		`Expected the deterministic ${fixtureSize}-object fixture, received ${fixtureRows.totalDocs}.`,
	);

	const readOperation = async () => {
		const result = await getListing(
			payload,
			{
				geo: "primorsk",
				surface: "kvartiry",
				page: 1,
				query: { limit: 24 },
			},
			"Starter benchmark",
		);
		assert.ok(
			result && result.items.length > 0,
			"Read benchmark returned no public rows.",
		);
	};
	const aggregateRows = await readPublicCatalogFacetRows(payload, fixtureWhere);
	assert.equal(
		aggregateRows.length,
		fixtureSize,
		"Aggregate fixture read is incomplete.",
	);
	const aggregateOperation = () => {
		const result = aggregatePublicCatalogFacetRows(aggregateRows);
		assert.equal(
			result.total,
			fixtureSize,
			"Aggregate benchmark lost fixture rows.",
		);
	};

	const read = await measure(readOperation);
	const aggregate = await measure(aggregateOperation);
	const readP95Ms = Number(p95(read.rawMs).toFixed(3));
	const aggregateP95Ms = Number(p95(aggregate.rawMs).toFixed(3));
	const evidence = {
		measuredAt: new Date().toISOString(),
		environment: {
			os: "Windows 11 native",
			node: process.version,
			postgresql: "18.6 native Windows service",
			fixture: `${fixtureRows.totalDocs} active published property rows in an isolated local database`,
		},
		protocol: {
			fixtureSize,
			setup: {
				prefix: fixturePrefix,
				baseRows: setup.baseRows,
				fixtureRows: setup.fixtureRows,
				createdThisRun: setup.created,
				synchronizedRows: setup.synchronized,
			},
			warmupRequestsPerOperation: warmupRequests,
			measuredRequestsPerOperation: measuredRequests,
			sequence:
				"read warm-up and measurements, then in-memory aggregate warm-up and measurements",
			read: "Public Gateway catalog page: geo=primorsk, surface=kvartiry, page=1, limit=24 over the 2000-object fixture",
			aggregate:
				"Pure application aggregation of the same immutable 2000-row read result",
		},
		results: {
			read: {
				budgetMs: readBudgetMs,
				p95Ms: readP95Ms,
				failures: read.failures,
				rawMs: read.rawMs,
			},
			aggregate: {
				budgetMs: aggregateBudgetMs,
				p95Ms: aggregateP95Ms,
				failures: aggregate.failures,
				rawMs: aggregate.rawMs,
			},
		},
	};

	assert.equal(read.failures, 0, "Read benchmark recorded failures.");
	assert.equal(aggregate.failures, 0, "Aggregate benchmark recorded failures.");
	assert.ok(
		readP95Ms <= readBudgetMs,
		`Read p95 ${readP95Ms}ms exceeded ${readBudgetMs}ms.`,
	);
	assert.ok(
		aggregateP95Ms <= aggregateBudgetMs,
		`Aggregate p95 ${aggregateP95Ms}ms exceeded ${aggregateBudgetMs}ms.`,
	);
	const output = resolve("docs/evidence/plan10/B2_PUBLIC_GATEWAY_BUDGET.json");
	await mkdir(dirname(output), { recursive: true });
	await writeFile(output, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
	console.log(
		`Public Gateway budget PASS: read p95 ${readP95Ms}ms; aggregate p95 ${aggregateP95Ms}ms.`,
	);
} finally {
	await payload.destroy();
}
