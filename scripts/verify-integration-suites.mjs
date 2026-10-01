import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { postBatchedHttpRevalidate } from "../src/core/cache/http-revalidate.ts";
import { executeInternalRevalidation } from "../src/core/cache/internal-route-executor.ts";
import {
	decideFeedRunCompletion,
	runImportFeed,
} from "../src/core/ingest/index.ts";
import {
	claimLeadDeliveryForSending,
	completeLeadDeliveryAttempt,
	isLiveFuturePayloadJob,
	retryBackoffMs,
} from "../src/core/leads/index.ts";
import {
	createSafeFeedOutboundFetch,
	safeOutboundFetch,
} from "../src/core/security/safe-outbound-client.ts";
import { parseTestApprovedOrigins } from "../src/core/security/test-destinations.ts";
import {
	createControllableClock,
	installRuntimeClock,
	resetRuntimeClock,
} from "../src/core/time/clock.ts";
import { projectConfig } from "../src/project/project.config.ts";
import { deriveTestDatabaseUri, loadLocalEnv } from "./integration/env.mjs";
import { startFixtureHttpServer } from "./integration/fixture-http-server.mjs";
import { createMemoryFeedRepository } from "./integration/memory-feed-repository.mjs";
import {
	prepareIntegrationDatabase,
	proveDevelopmentsMigration,
	proveDistrictMorphologyMigration,
	proveDistrictRouteCategoriesMigration,
	proveGeoHierarchyMigration,
	proveGeoTaxonomyV3Migration,
	proveLeadContextMigration,
	proveLeadDeliveryRelationalMigration,
	provePayloadAuthSecurityMigration,
	provePropertyGeoRefsMigration,
	provePropertyIdentityMigration,
	provePropertyNumericMigration,
	proveSiteSettingsMigration,
	psqlOnTest,
	runPayloadMigrations,
} from "./integration/test-database.mjs";

loadLocalEnv();

const clock = createControllableClock("2026-09-18T12:00:00.000Z");
installRuntimeClock(clock);
assert.equal(clock.nowIso(), "2026-09-18T12:00:00.000Z");
clock.addMs(60_000);
assert.equal(clock.nowIso(), "2026-09-18T12:01:00.000Z");
clock.setIso("2026-09-18T12:00:00.000Z");

const claimed = claimLeadDeliveryForSending(
	{
		id: "d1",
		lead: "l1",
		channelId: "custom_webhook",
		status: "pending",
		attempts: 0,
		nextAttemptAt: "2026-09-18T12:00:00.000Z",
	},
	clock.nowIso(),
);
assert.equal(claimed?.status, "sending");
const retried = completeLeadDeliveryAttempt({
	delivery: claimed,
	nowIso: clock.nowIso(),
	policy: projectConfig.leadDelivery,
	result: {
		kind: "retryable",
		safeCode: "timeout",
		redactedNote: "timeout",
		backoffMs: retryBackoffMs(1, projectConfig.leadDelivery),
	},
});
assert.equal(retried.status, "pending");
assert.equal(retried.nextAttemptAt, "2026-09-18T12:01:00.000Z");
assert.equal(
	claimLeadDeliveryForSending(retried, clock.nowIso()),
	undefined,
	"pending delivery with future nextAttemptAt must not be claimed",
);
const waitUntil = new Date(retried.nextAttemptAt);
assert.equal(
	isLiveFuturePayloadJob(
		{ waitUntil: waitUntil.toISOString(), completedAt: null },
		clock.now(),
	),
	true,
);
clock.setIso("2026-09-18T12:02:00.000Z");
assert.equal(
	isLiveFuturePayloadJob(
		{
			waitUntil: waitUntil.toISOString(),
			completedAt: "2026-09-18T12:01:30.000Z",
		},
		clock.now(),
	),
	false,
);
assert.equal(
	claimLeadDeliveryForSending(retried, clock.nowIso())?.status,
	"sending",
);

const interruptedDecision = decideFeedRunCompletion({
	nowIso: clock.nowIso(),
	sourceEnabled: true,
	parserCompleted: true,
	criticalStructuralError: false,
	identityValid: true,
	runInterrupted: true,
	isFirstFullRun: false,
	offeredCount: 1,
	previousOfferCount: 2,
	safetyThresholdPercent: 30,
	plannedDeactivations: 1,
	maxDeactivationsPerRun: 50,
	fetchStatus: "fetched",
	feedHash: "next",
	lastFeedHash: "prev",
});
assert.equal(interruptedDecision.canDeactivateMissing, false);
assert.equal(interruptedDecision.status, "interrupted");

const revalidateSecret = "fixture-revalidate-secret-at-least-32-chars";
const invalidatedTargets = [];
const fixture = await startFixtureHttpServer({
	handleRevalidateRequest: ({ secret, body }) =>
		executeInternalRevalidation({
			expectedSecret: revalidateSecret,
			providedSecret: typeof secret === "string" ? secret : null,
			body,
			invalidate: async (targets) => invalidatedTargets.push(...targets),
		}),
});
process.env.AMS_ALLOW_TEST_DESTINATIONS = "true";
process.env.AMS_TEST_APPROVED_ORIGINS = fixture.origin;
assert.deepEqual(parseTestApprovedOrigins(process.env), [fixture.origin]);

const revalidation = await postBatchedHttpRevalidate({
	baseUrl: fixture.origin,
	secret: revalidateSecret,
	targets: [
		{ type: "tag", tag: "properties" },
		{ type: "path", path: "/kvartiry/", routeType: "page" },
	],
	reason: "required-integration-proof",
});
assert.deepEqual(revalidation, { ok: true, count: 2 });
assert.equal(
	fixture.getRevalidationRequestCount(),
	1,
	"one bounded batch must produce one authenticated HTTP self-call",
);
assert.deepEqual(
	invalidatedTargets,
	[
		{ type: "tag", tag: "properties" },
		{ type: "path", path: "/kvartiry/", routeType: "page" },
	],
	"the internal Route Handler executor must invoke the in-process invalidator boundary",
);

await assert.rejects(
	() =>
		safeOutboundFetch(`${fixture.origin}/feed.xml`, {
			allowedHosts: ["127.0.0.1"],
			approvedHttpHosts: ["127.0.0.1"],
		}),
	/private or link-local/,
);

const allowedFetch = createSafeFeedOutboundFetch({
	allowedHosts: ["127.0.0.1"],
	approvedHttpHosts: ["127.0.0.1"],
	approvedExactOrigins: [fixture.origin],
	timeoutMs: 2_000,
});
const xml = await allowedFetch({ url: new URL(`${fixture.origin}/feed.xml`) });
assert.equal(xml.status, 200);

const webhook = await fetch(`${fixture.origin}/webhook`, {
	method: "POST",
	headers: { "idempotency-key": "k1" },
	body: "{}",
});
const webhookDup = await fetch(`${fixture.origin}/webhook`, {
	method: "POST",
	headers: { "idempotency-key": "k1" },
	body: "{}",
});
assert.equal(await webhook.text(), "accepted");
assert.equal(await webhookDup.text(), "duplicate");

const memoryRepo = createMemoryFeedRepository();
const source = {
	id: "1",
	code: "itest",
	enabled: true,
	market: "secondary",
	feedUrlRef: "INTEGRATION_FEED_URL",
	safetyThresholdPercent: 30,
	maxDeactivationsPerRun: 50,
	lastOfferCount: 2,
	lastFeedHash: "old",
};
process.env.INTEGRATION_FEED_URL = `${fixture.origin}/truncated.xml`;
const claimedRun = true;
const truncated = await runImportFeed(
	{
		now: () => clock.now(),
		claimQueuedImportRun: async () => (claimedRun ? "run-1" : undefined),
		touchHeartbeat: async () => undefined,
		loadFeedSource: async () => source,
		resolveFeedUrl: () => process.env.INTEGRATION_FEED_URL,
		fetchFeed: async ({ url }) => {
			const result = await allowedFetch({ url: new URL(url) });
			return {
				status: "fetched",
				body: result.body,
				sha256: result.sha256,
				etag: null,
				lastModified: null,
			};
		},
		createRepository: () => memoryRepo,
		finishRun: async () => undefined,
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(),
	},
	{ feedSourceId: "1", importRunId: "run-1" },
);
assert.equal(truncated.claimed, true);
assert.notEqual(truncated.status, "success");
assert.equal(
	[...memoryRepo.properties.values()].filter((row) => row.status === "archived")
		.length,
	0,
);

const sourceUri = process.env.DATABASE_URI_TEST || process.env.DATABASE_URI;
if (
	process.env.AMS_REQUIRE_INTEGRATION_DB === "true" &&
	!process.env.DATABASE_URI_TEST
) {
	await fixture.close();
	resetRuntimeClock();
	throw new Error(
		"Required integration proof needs an explicit DATABASE_URI_TEST; DATABASE_URI fallback is forbidden.",
	);
}
if (!sourceUri) {
	await fixture.close();
	resetRuntimeClock();
	console.log(
		"verify:integration: payload/PostgreSQL suites SKIPPED (no DATABASE_URI_TEST or DATABASE_URI).",
	);
	console.log("verify:integration: ok");
	process.exit(0);
}

const preferredUri =
	process.env.DATABASE_URI_TEST || deriveTestDatabaseUri(sourceUri);
await prepareIntegrationDatabase(preferredUri);
provePayloadAuthSecurityMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
provePropertyNumericMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveLeadDeliveryRelationalMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveSiteSettingsMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveGeoHierarchyMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
provePropertyGeoRefsMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
provePropertyIdentityMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveDevelopmentsMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveLeadContextMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveDistrictRouteCategoriesMigration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveGeoTaxonomyV3Migration(preferredUri);
await prepareIntegrationDatabase(preferredUri);
proveDistrictMorphologyMigration(preferredUri);
const prepared = await prepareIntegrationDatabase(preferredUri);
const testUri = prepared.uri;
if (!process.env.PAYLOAD_SECRET && !prepared.fromZero) {
	await fixture.close();
	resetRuntimeClock();
	throw new Error(
		"verify:integration requires PAYLOAD_SECRET when reusing the local database.",
	);
}
const testSecret =
	process.env.PAYLOAD_SECRET || randomBytes(24).toString("hex");
const childEnv = {
	...process.env,
	DATABASE_URI: testUri,
	PAYLOAD_SECRET: testSecret,
	NEXT_PUBLIC_SERVER_URL: "https://example.test",
	PAYLOAD_DB_PUSH: "false",
	JOBS_AUTORUN: "false",
	AMS_ALLOW_TEST_DESTINATIONS: "true",
	AMS_TEST_APPROVED_ORIGINS: fixture.origin,
	OUTBOUND_ALLOWED_HOSTS: "127.0.0.1",
	LEAD_OUTBOUND_HOSTS: "127.0.0.1",
	INTEGRATION_FEED_URL: `${fixture.origin}/feed.xml`,
	MAX_API_URL: `${fixture.origin}/webhook-retry`,
	MAX_BOT_TOKEN: "fixture-max-token",
	MAX_CHAT_ID: "fixture-max-chat",
};

if (prepared.fromZero) {
	runPayloadMigrations(childEnv);
}

for (const [key, value] of Object.entries(childEnv)) {
	process.env[key] = value;
}

execFileSync(
	"pnpm",
	["exec", "payload", "run", "scripts/integration/payload-suites.ts"],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
		env: {
			...childEnv,
			NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"]
				.filter(Boolean)
				.join(" "),
		},
	},
);

const pageIndexNowProof = psqlOnTest(
	testUri,
	`SELECT count(*) || '|' || count(DISTINCT j.concurrency_key) || '|' || count(*) FILTER (WHERE j.input->'urls'->>0 = 'https://example.test/' || p.slug || '/') FROM payload_jobs j JOIN pages p ON j.input->>'eventId' LIKE 'page:' || p.id || ':%' WHERE j.task_slug = 'submitIndexNow' AND p.slug LIKE 'integration-public-page-%'`,
);
assert.equal(
	pageIndexNowProof,
	"2|2|2",
	"publish and indexability transitions must enqueue exactly two distinct same-origin IndexNow jobs while a title-only update stays silent",
);
const draftPageIndexNowJobs = psqlOnTest(
	testUri,
	`SELECT count(*) FROM payload_jobs j JOIN pages p ON j.input->>'eventId' LIKE 'page:' || p.id || ':%' WHERE j.task_slug = 'submitIndexNow' AND p.slug LIKE 'integration-draft-page-%'`,
);
assert.equal(
	draftPageIndexNowJobs,
	"0",
	"draft page creation must not enqueue IndexNow",
);
const indexNowSecretLeakCount = psqlOnTest(
	testUri,
	`SELECT count(*) FROM payload_jobs WHERE task_slug = 'submitIndexNow' AND input::text LIKE '%Fixture-Key-2026%'`,
);
assert.equal(
	indexNowSecretLeakCount,
	"0",
	"IndexNow job payloads must not persist the secret key",
);

execFileSync(
	"pnpm",
	["exec", "payload", "run", "scripts/integration/geo-suites.ts"],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
		env: {
			...childEnv,
			NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"]
				.filter(Boolean)
				.join(" "),
		},
	},
);

execFileSync(
	"pnpm",
	["exec", "payload", "run", "scripts/integration/clone-geo-seed-suites.ts"],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
		env: {
			...childEnv,
			NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"]
				.filter(Boolean)
				.join(" "),
		},
	},
);

execFileSync(
	"pnpm",
	["exec", "payload", "run", "scripts/integration/property-geo-suites.ts"],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
		env: {
			...childEnv,
			NODE_OPTIONS: [process.env.NODE_OPTIONS, "--conditions=react-server"]
				.filter(Boolean)
				.join(" "),
		},
	},
);

const unique = psqlOnTest(
	testUri,
	`SELECT string_agg(indexname, ',' ORDER BY indexname) FROM pg_indexes WHERE schemaname = 'public' AND indexname IN ('properties_feed_identity_unique_idx','lead_deliveries_lead_channel_unique_idx')`,
);
assert.equal(
	unique,
	"lead_deliveries_lead_channel_unique_idx,properties_feed_identity_unique_idx",
);
const nextDueExists = psqlOnTest(
	testUri,
	`SELECT count(*) FROM information_schema.columns WHERE table_name = 'feed_sources' AND column_name = 'next_due_at'`,
);
assert.equal(nextDueExists, "1");

await fixture.close();
resetRuntimeClock();
console.log("verify:integration: ok");
