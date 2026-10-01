import assert from "node:assert/strict";
import {
	appendAttemptLog,
	claimLeadDeliveryForSending,
	completeLeadDeliveryAttempt,
	defineLeadDeliveryPolicy,
	leadChannelCapabilities,
	leadDeliveryMaxAttempts,
	recoverStaleSendingDelivery,
	resolveEnabledLeadChannels,
} from "../src/core/leads/index.ts";
import { projectConfig } from "../src/project/project.config.ts";

const policy = projectConfig.leadDelivery;
assert.equal(
	leadDeliveryMaxAttempts(policy),
	policy.retryScheduleMinutes.length,
);

const pending = {
	id: "delivery-1",
	lead: "lead-1",
	channelId: "max",
	status: "pending",
	attempts: 0,
	nextAttemptAt: "2026-09-16T12:00:00.000Z",
	jobId: "job-1",
};

const claimed = claimLeadDeliveryForSending(
	pending,
	"2026-09-16T12:00:00.000Z",
);
assert.equal(claimed.status, "sending");
assert.equal(claimed.attempts, 1);
assert.equal(claimed.heartbeatAt, "2026-09-16T12:00:00.000Z");

const retryable = completeLeadDeliveryAttempt({
	delivery: claimed,
	nowIso: "2026-09-16T12:01:00.000Z",
	policy,
	result: {
		kind: "retryable",
		safeCode: "provider_timeout",
		redactedNote: "Provider timeout.",
	},
});
assert.equal(retryable.status, "pending");
assert.equal(retryable.lastErrorKind, "retryable");
assert.equal(retryable.nextAttemptAt, "2026-09-16T12:02:00.000Z");
assert.equal(retryable.jobId, undefined);

const permanent = completeLeadDeliveryAttempt({
	delivery: { ...claimed, id: "delivery-2" },
	nowIso: "2026-09-16T12:02:00.000Z",
	policy,
	result: {
		kind: "permanent",
		safeCode: "invalid_destination",
		redactedNote: "Destination config is invalid.",
	},
});
assert.equal(permanent.status, "abandoned");
assert.equal(permanent.lastErrorKind, "permanent");
assert.equal(permanent.abandonedReason, "permanent");

const missingAdapter = completeLeadDeliveryAttempt({
	delivery: { ...claimed, id: "delivery-3", channelId: "unknown" },
	nowIso: "2026-09-16T12:03:00.000Z",
	policy,
	result: { kind: "missing_adapter", channelId: "unknown" },
});
assert.equal(missingAdapter.status, "abandoned");
assert.equal(missingAdapter.lastErrorKind, "permanent");
assert.equal(missingAdapter.abandonedReason, "permanent");

const delivered = completeLeadDeliveryAttempt({
	delivery: claimed,
	nowIso: "2026-09-16T12:04:00.000Z",
	policy,
	result: { kind: "delivered", safeCode: "ok" },
});
assert.equal(delivered.status, "delivered");
assert.equal(delivered.deliveredAt, "2026-09-16T12:04:00.000Z");

const staleRecovered = recoverStaleSendingDelivery(
	{
		...claimed,
		heartbeatAt: "2026-09-16T11:40:00.000Z",
	},
	"2026-09-16T12:00:00.000Z",
	policy,
);
assert.equal(staleRecovered.status, "pending");
assert.equal(staleRecovered.nextAttemptAt, "2026-09-16T12:00:00.000Z");

const boundedLog = appendAttemptLog(
	Array.from({ length: 25 }, (_item, index) => ({
		attemptedAt: `2026-09-16T12:${String(index).padStart(2, "0")}:00.000Z`,
		outcome: "retryable",
		safeCode: `code-${index}`,
	})),
	{
		attemptedAt: "2026-09-16T13:00:00.000Z",
		outcome: "delivered",
		safeCode: "ok",
	},
	policy,
);
assert.equal(boundedLog.length, 20);
assert.equal(boundedLog[19].safeCode, "ok");

const exhausted = completeLeadDeliveryAttempt({
	delivery: { ...claimed, attempts: 6 },
	nowIso: "2026-09-16T12:05:00.000Z",
	policy,
	result: {
		kind: "retryable",
		safeCode: "provider_timeout",
		redactedNote: "Provider timeout.",
	},
});
assert.equal(exhausted.status, "abandoned");
assert.equal(exhausted.abandonedReason, "exhausted");

const unknown = completeLeadDeliveryAttempt({
	delivery: claimed,
	nowIso: "2026-09-16T12:06:00.000Z",
	policy,
	result: {
		kind: "unknown",
		safeCode: "timeout_after_send",
		redactedNote: "Provider timed out after the request was sent.",
	},
});
assert.equal(unknown.status, "pending");
assert.equal(unknown.nextAttemptAt, "2026-09-16T13:06:00.000Z");

const changedPolicy = defineLeadDeliveryPolicy({
	...policy,
	retryScheduleMinutes: [0, 3, 8],
	unknownDeliveryBackoffMinutes: 9,
	staleSendingThresholdMinutes: 7,
	maxAttemptLogEntries: 2,
});
const changedRetry = completeLeadDeliveryAttempt({
	delivery: claimed,
	nowIso: "2026-09-16T14:00:00.000Z",
	policy: changedPolicy,
	result: {
		kind: "retryable",
		safeCode: "changed-policy",
		redactedNote: "Changed policy fixture.",
	},
});
assert.equal(changedRetry.nextAttemptAt, "2026-09-16T14:03:00.000Z");
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		retryScheduleMinutes: [],
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		retryScheduleMinutes: [1, 2],
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		retryScheduleMinutes: [0, 5, 4],
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		retryScheduleMinutes: [0, -1],
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		unknownDeliveryBackoffMinutes: 0,
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		staleSendingThresholdMinutes: 0,
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		maxAttemptLogEntries: 101,
	}),
);
assert.throws(() =>
	defineLeadDeliveryPolicy({
		...policy,
		routingMode: "selective",
	}),
);

const enabledChannels = resolveEnabledLeadChannels({
	LEAD_CHANNELS: "max,custom-webhook",
	LEAD_OUTBOUND_HOSTS: "api.example.org",
	MAX_BOT_TOKEN: "fixture",
	MAX_CHAT_ID: "fixture",
	CUSTOM_WEBHOOK_URL: "https://api.example.org/leads",
	CUSTOM_WEBHOOK_HMAC_SECRET: "fixture",
});
assert.deepEqual(
	enabledChannels.map((channel) => channel.id),
	["max", "custom-webhook"],
);
assert.equal(policy.routingMode, "all-enabled");
assert.equal(leadChannelCapabilities.max.nativeIdempotency, "unproven");
assert.equal(
	leadChannelCapabilities["custom-webhook"].idempotencyHeader,
	"required-and-verified",
);

console.log("verify-lead-delivery-state: ok");
