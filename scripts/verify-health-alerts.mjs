import assert from "node:assert/strict";
import {
	assertNoPiiInDiagnostics,
	evaluateProductionRetentionReadiness,
	planLeadRetentionRun,
	planRetentionActions,
} from "../src/core/leads/index.ts";
import { buildOperationalAlerts } from "../src/core/operations/alerts.ts";

const alerts = buildOperationalAlerts({
	feeds: {
		overdueEnabled: 2,
		suspiciousRuns: 1,
		failedRuns: 1,
		staleRunningRuns: 1,
	},
	jobs: {
		autorunEnabled: false,
		staticTaskCount: 4,
		programmaticTaskCount: 2,
	},
	delivery: {
		duePending: 3,
		staleSending: 1,
		abandoned: 1,
	},
	storage: {
		localMediaReady: false,
	},
});

assert.ok(alerts.some((alert) => alert.code === "feeds_suspicious_runs"));
assert.ok(alerts.some((alert) => alert.code === "delivery_stale_sending"));
assert.ok(
	alerts.some((alert) => alert.code === "storage_media_dir_unavailable"),
);

const cacheAlerts = buildOperationalAlerts({
	feeds: {
		overdueEnabled: 0,
		suspiciousRuns: 0,
		failedRuns: 0,
		staleRunningRuns: 0,
	},
	jobs: {
		autorunEnabled: true,
		staticTaskCount: 4,
		programmaticTaskCount: 2,
	},
	delivery: {
		duePending: 0,
		staleSending: 0,
		abandoned: 0,
	},
	storage: {
		localMediaReady: true,
	},
	cache: {
		invalidationStaleBeyondSla: true,
	},
});
assert.ok(
	cacheAlerts.some((alert) => alert.code === "cache_invalidation_failure"),
);

const serialized = JSON.stringify(alerts).toLowerCase();
for (const forbidden of [
	"token",
	"secret",
	"password",
	"phone",
	"email",
	"payload",
	"database_uri",
	"feedurl",
]) {
	assert.equal(
		serialized.includes(forbidden),
		false,
		`health alerts leaked forbidden diagnostic term: ${forbidden}`,
	);
}

assert.deepEqual(
	buildOperationalAlerts({
		feeds: {
			overdueEnabled: 0,
			suspiciousRuns: 0,
			failedRuns: 0,
			staleRunningRuns: 0,
		},
		jobs: {
			autorunEnabled: true,
			staticTaskCount: 4,
			programmaticTaskCount: 2,
		},
		delivery: {
			duePending: 0,
			staleSending: 0,
			abandoned: 0,
		},
		storage: {
			localMediaReady: true,
		},
	}),
	[],
);

assert.equal(planLeadRetentionRun(null).destructive, false);
assert.equal(planLeadRetentionRun(90).destructive, true);
assert.ok(
	buildOperationalAlerts({
		feeds: {
			overdueEnabled: 0,
			suspiciousRuns: 0,
			failedRuns: 0,
			staleRunningRuns: 0,
		},
		jobs: {
			autorunEnabled: true,
			staticTaskCount: 4,
			programmaticTaskCount: 2,
		},
		delivery: {
			duePending: 0,
			staleSending: 0,
			abandoned: 0,
		},
		storage: {
			localMediaReady: true,
		},
		retention: { leadPolicyConfigured: false },
	}).some((alert) => alert.code === "retention_policy_missing"),
);

const healthyBase = {
	feeds: {
		overdueEnabled: 0,
		suspiciousRuns: 0,
		failedRuns: 0,
		staleRunningRuns: 0,
	},
	jobs: {
		autorunEnabled: true,
		staticTaskCount: 4,
		programmaticTaskCount: 2,
	},
	delivery: {
		duePending: 0,
		staleSending: 0,
		abandoned: 0,
	},
	storage: {
		localMediaReady: true,
	},
};

assert.ok(
	buildOperationalAlerts({
		...healthyBase,
		backup: { dbFailed: true, mediaFailed: true },
	}).some((alert) => alert.code === "backup_db_failure"),
);
assert.ok(
	buildOperationalAlerts({
		...healthyBase,
		backup: { dbFailed: true, mediaFailed: true },
	}).some((alert) => alert.code === "backup_media_failure"),
);

const { evaluateBackupFailures } = await import(
	"../src/core/operations/backup-health.ts"
);
assert.deepEqual(
	evaluateBackupFailures({
		statusKnown: true,
		nowIso: "2026-09-18T12:00:00.000Z",
		db: {
			lastSuccessAt: "2026-09-18T11:00:00.000Z",
			integrityOk: true,
			offsiteCopyPresent: true,
		},
		media: {
			lastSuccessAt: "2026-09-18T11:00:00.000Z",
			integrityOk: true,
			offsiteCopyPresent: true,
		},
	}),
	{ dbBackupFailed: false, mediaBackupFailed: false },
);
assert.equal(
	evaluateBackupFailures({
		statusKnown: true,
		nowIso: "2026-09-18T12:00:00.000Z",
		media: {
			lastSuccessAt: "2026-09-18T11:00:00.000Z",
			integrityOk: false,
			offsiteCopyPresent: true,
		},
	}).mediaBackupFailed,
	true,
);

const {
	isCacheInvalidationStaleBeyondSla,
	recordCacheInvalidationOutcome,
	resetCacheInvalidationSlaState,
} = await import("../src/core/cache/invalidation-sla.ts");
resetCacheInvalidationSlaState();
recordCacheInvalidationOutcome(false, "2026-09-18T11:00:00.000Z");
assert.equal(
	isCacheInvalidationStaleBeyondSla(30, "2026-09-18T11:40:00.000Z"),
	true,
);

const {
	importStaleThresholdMs,
	queuedImportOrphanThresholdMs,
	pendingDeliveryOrphanThresholdMs,
	isAlertChannelIndependent,
} = await import("../src/core/operations/index.ts");
const {
	evaluateRuntimeEnv,
	assertRuntimeEnvOrThrow,
	parseProjectEnv,
} = await import("../src/project/env.ts");

assert.equal(
	evaluateRuntimeEnv({ NEXT_PHASE: "phase-production-build" }, "build").ok,
	true,
);
assert.deepEqual(evaluateRuntimeEnv({}, "migrate").missing, [
	"DATABASE_URI",
	"PAYLOAD_SECRET",
]);
assert.ok(
	evaluateRuntimeEnv(
		{ NODE_ENV: "production", AMS_PROFILE: "REALTY_BASE" },
		"runtime",
	).missing.includes("MEDIA_DIR"),
);

const productionLike = {
	NODE_ENV: "production",
	AMS_PROFILE: "REALTY_BASE",
	TZ: "Europe/Moscow",
	DATABASE_URI: "postgresql://127.0.0.1:5432/ams_realtbase",
	PAYLOAD_SECRET: "fixture-runtime-payload-secret-at-least-32-chars",
	NEXT_PUBLIC_SERVER_URL: "https://start-baza.ams24.ru",
	MEDIA_DIR: "/var/lib/ams-realty-baza/media",
	REVALIDATE_SECRET: "fixture-runtime-revalidate-secret-32chars",
	INTERNAL_REVALIDATE_BASE_URL: "http://127.0.0.1:3000",
};
assert.equal(evaluateRuntimeEnv(productionLike, "runtime").ok, true);
assert.doesNotThrow(() => parseProjectEnv(productionLike, "runtime"));
for (const invalidOrigin of [
	"http://start-baza.ams24.ru",
	"https://foreign.example.test",
	"https://user:password@start-baza.ams24.ru",
	"https://start-baza.ams24.ru/path",
	"https://start-baza.ams24.ru/?query=1",
	"https://start-baza.ams24.ru/#fragment",
]) {
	assert.ok(
		evaluateRuntimeEnv(
			{ ...productionLike, NEXT_PUBLIC_SERVER_URL: invalidOrigin },
			"runtime",
		).missing.includes("NEXT_PUBLIC_SERVER_URL"),
		`production public origin must reject ${invalidOrigin}`,
	);
}
assert.equal(
	evaluateRuntimeEnv(
		{
			...productionLike,
			INTERNAL_REVALIDATE_BASE_URL: "http://localhost:3000",
		},
		"runtime",
	).ok,
	true,
);
assert.ok(
	evaluateRuntimeEnv(
		{
			...productionLike,
			INTERNAL_REVALIDATE_BASE_URL: "http://cache.example.test",
		},
		"runtime",
	).missing.includes("INTERNAL_REVALIDATE_BASE_URL"),
);
for (const key of [
	"REVALIDATE_RATE_LIMIT_PER_MINUTE",
	"LEAD_RATE_LIMIT_PER_MINUTE",
]) {
	assert.ok(
		evaluateRuntimeEnv(
			{ ...productionLike, [key]: "0" },
			"runtime",
		).missing.includes(key),
	);
}
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, PAYLOAD_DB_PUSH: "true" },
		"runtime",
	).missing.includes("PAYLOAD_DB_PUSH"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, REVALIDATE_SECRET: "" },
		"runtime",
	).missing.includes("REVALIDATE_SECRET"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, INTERNAL_REVALIDATE_BASE_URL: "" },
		"runtime",
	).missing.includes("INTERNAL_REVALIDATE_BASE_URL"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, INTERNAL_REVALIDATE_BASE_URL: "not-a-url" },
		"runtime",
	).missing.includes("INTERNAL_REVALIDATE_BASE_URL"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, LEAD_CHANNELS: "max" },
		"runtime",
	).missing.includes("MAX_BOT_TOKEN"),
);
assert.ok(
	evaluateRuntimeEnv(
		{
			...productionLike,
			LEAD_CHANNELS: "max",
			MAX_BOT_TOKEN: "fixture-token",
			MAX_CHAT_ID: "fixture-chat",
		},
		"runtime",
	).missing.includes("LEAD_OUTBOUND_HOSTS"),
);
assert.ok(
	evaluateRuntimeEnv(
		{
			...productionLike,
			LEAD_CHANNELS: "max",
			LEAD_OUTBOUND_HOSTS: "botapi.max.ru",
			MAX_BOT_TOKEN: "fixture-token",
			MAX_CHAT_ID: "fixture-chat",
			MAX_API_URL: "https://botapi.max.ru",
		},
		"runtime",
	).missing.includes("LEAD_RETENTION_POLICY"),
	"live lead channels must fail closed without the versioned retention policy",
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, NEXT_PUBLIC_SERVER_URL: "" },
		"runtime",
	).missing.includes("NEXT_PUBLIC_SERVER_URL"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, NEXT_PUBLIC_SERVER_URL: "not-a-url" },
		"runtime",
	).missing.includes("NEXT_PUBLIC_SERVER_URL"),
);
assert.ok(
	evaluateRuntimeEnv(
		{ ...productionLike, LEAD_CHANNELS: "telegram" },
		"runtime",
	).missing.includes("LEAD_CHANNELS"),
);
assert.throws(
	() =>
		assertRuntimeEnvOrThrow({
			...productionLike,
			LEAD_CHANNELS: "max",
		}),
	/MAX_BOT_TOKEN/,
);
assert.ok(
	!evaluateRuntimeEnv(
		{ NEXT_PHASE: "phase-production-build" },
		"build",
	).missing.includes("DATABASE_URI"),
);
assert.ok(
	evaluateRuntimeEnv(
		{
			...productionLike,
			LEAD_CHANNELS: "custom-webhook",
			CUSTOM_WEBHOOK_URL: "https://hooks.example.test/leads",
		},
		"runtime",
	).missing.includes("CUSTOM_WEBHOOK_HMAC_SECRET"),
);
assert.ok(
	evaluateRuntimeEnv(
		{
			...productionLike,
			LEAD_CHANNELS: "custom-webhook",
			LEAD_OUTBOUND_HOSTS: "hooks.example.test",
			CUSTOM_WEBHOOK_URL: "http://hooks.example.test/leads",
			CUSTOM_WEBHOOK_HMAC_SECRET: "fixture-hmac",
		},
		"runtime",
	).missing.includes("CUSTOM_WEBHOOK_URL"),
);
assert.equal(evaluateRuntimeEnv({ NODE_ENV: "test" }, "test").ok, true);
assert.equal(
	evaluateRuntimeEnv(
		{
			NEXT_PHASE: "phase-production-build",
			PAYLOAD_SECRET: undefined,
		},
		"build",
	).ok,
	true,
);
assert.equal(
	evaluateRuntimeEnv(
		{
			DATABASE_URI: "postgresql://127.0.0.1:5432/ams_realtbase",
			PAYLOAD_SECRET: "fixture-runtime-payload-secret-at-least-32-chars",
		},
		"migrate",
	).ok,
	true,
	"HTTP self-call settings must not be required for migrations",
);
assert.ok(
	!evaluateRuntimeEnv(productionLike, "runtime").missing.some((key) =>
		key.startsWith("S3"),
	),
);
assert.equal(importStaleThresholdMs(5 * 60_000), 15 * 60_000);
assert.equal(importStaleThresholdMs(10 * 60_000), 30 * 60_000);
assert.equal(queuedImportOrphanThresholdMs(5), 15 * 60_000);
assert.equal(pendingDeliveryOrphanThresholdMs(15), 30 * 60_000);
assert.equal(
	isAlertChannelIndependent({
		alertWebhookUrl: "https://alerts.example.test/hook",
		leadChannelUrls: ["https://hooks.example.test/leads"],
	}),
	true,
);
assert.equal(
	isAlertChannelIndependent({
		alertWebhookUrl: "https://hooks.example.test/alerts",
		leadChannelUrls: ["https://hooks.example.test/leads"],
	}),
	false,
);

assert.equal(
	evaluateProductionRetentionReadiness({
		runtimeMode: "runtime",
		publicLeadIntakeEnabled: true,
		enabledLeadChannelCount: 0,
		leadRetentionDays: null,
		archiveRetentionDays: null,
	}).ok,
	false,
	"policy absent must fail production readiness",
);
assert.equal(
	evaluateProductionRetentionReadiness({
		runtimeMode: "build",
		publicLeadIntakeEnabled: true,
		enabledLeadChannelCount: 1,
		leadRetentionDays: null,
		archiveRetentionDays: null,
	}).ok,
	true,
	"build remains permissive without retention days",
);
assert.equal(
	evaluateProductionRetentionReadiness({
		runtimeMode: "runtime",
		publicLeadIntakeEnabled: true,
		enabledLeadChannelCount: 1,
		leadRetentionDays: 90,
		archiveRetentionDays: 365,
	}).ok,
	true,
);

const expiredLead = {
	id: "lead-expired",
	retentionUntil: "2026-01-01T00:00:00.000Z",
	retentionMode: "anonymize",
	piiPurgedAt: null,
	phoneE164: "+79990001122",
	email: "owner@example.test",
	message: "secret-message",
	name: "Ivan",
};
const freshLead = {
	id: "lead-fresh",
	retentionUntil: "2027-01-01T00:00:00.000Z",
	retentionMode: "anonymize",
	piiPurgedAt: null,
	phoneE164: "+79990003344",
};
const retentionPlan = planRetentionActions({
	nowIso: "2026-09-18T12:00:00.000Z",
	decision: planLeadRetentionRun(90),
	leads: [expiredLead, freshLead],
	deliveries: [
		{
			id: "delivery-expired",
			leadId: expiredLead.id,
			attemptLog: [{ phone: expiredLead.phoneE164 }],
			lastErrorRedacted: expiredLead.message,
		},
		{
			id: "delivery-fresh",
			leadId: freshLead.id,
			attemptLog: [{ keep: true }],
			lastErrorRedacted: null,
		},
	],
});
assert.deepEqual(retentionPlan.processedLeadIds, [expiredLead.id]);
assert.deepEqual(retentionPlan.untouchedLeadIds, [freshLead.id]);
assert.deepEqual(retentionPlan.processedDeliveryIds, ["delivery-expired"]);
assert.ok(retentionPlan.purgedDiagnostics);
assertNoPiiInDiagnostics({
	...retentionPlan.purgedDiagnostics,
	sourceLead: expiredLead,
});
assert.deepEqual(
	planRetentionActions({
		nowIso: "2026-09-18T12:00:00.000Z",
		decision: planLeadRetentionRun(null),
		leads: [expiredLead],
		deliveries: [
			{
				id: "delivery-expired",
				leadId: expiredLead.id,
				attemptLog: [],
				lastErrorRedacted: null,
			},
		],
	}).processedLeadIds,
	[],
);
assert.ok(
	buildOperationalAlerts({
		...healthyBase,
		retention: {
			leadPolicyConfigured: false,
			productionReadinessFailed: true,
		},
	}).some(
		(alert) =>
			alert.code === "production_retention_unready" &&
			alert.severity === "critical",
	),
);

console.log("verify-health-alerts: ok");
