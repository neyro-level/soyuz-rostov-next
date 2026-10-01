import assert from "node:assert/strict";
import {
	buildCustomWebhookLeadPayload,
	sendCustomWebhookLead,
	verifyAndRegisterCustomWebhookRequest,
	verifyCustomWebhookRequest,
} from "../src/core/leads/index.ts";

const nowIso = "2026-09-16T12:00:00.000Z";
const hmacSecret = "test-only-custom-webhook-secret";

const lead = {
	id: "lead-1",
	status: "new",
	name: "Иван Петров",
	phoneRaw: "8 (916) 123-45-67",
	phoneE164: "+79161234567",
	email: "ivan@example.test",
	message: "Хочу консультацию",
	formKind: "consultation",
	sourcePage: "/kontakty",
	consent: {
		accepted: true,
		version: "privacy-2026-09",
		consentedAt: "2026-09-16T11:59:00.000Z",
	},
	idempotencyKey: "lead-key",
};

const delivery = {
	id: "delivery-1",
	lead: "lead-1",
	channelId: "custom-webhook",
	channelKind: "crm",
	status: "pending",
	attempts: 0,
	nextAttemptAt: nowIso,
	idempotencyKey: "lead:lead-1:channel:custom-webhook",
};

const payload = buildCustomWebhookLeadPayload(lead, delivery);
assert.equal(payload.channelId, "custom-webhook");
assert.equal(payload.idempotencyKey, delivery.idempotencyKey);

let capturedRequest;
const delivered = await sendCustomWebhookLead({
	lead,
	delivery,
	endpointUrl: "https://crm.example.test/leads",
	hmacSecret,
	nowIso,
	transport: async (request) => {
		capturedRequest = request;
		return { ok: true, status: 202, providerMessageId: "webhook-1" };
	},
});

assert.equal(delivered.delivery.kind, "delivered");
assert.equal(capturedRequest.method, "POST");
assert.equal(
	capturedRequest.headers["x-ams-idempotency-key"],
	delivery.idempotencyKey,
);
assert.ok(capturedRequest.headers["x-ams-signature"].startsWith("sha256="));
assertSafe(delivered.safeLog);

const verified = verifyCustomWebhookRequest({
	body: capturedRequest.body,
	headers: capturedRequest.headers,
	hmacSecret,
	nowIso,
});
assert.equal(verified.verified, true);

const tampered = verifyCustomWebhookRequest({
	body: capturedRequest.body.replace("Иван", "Петр"),
	headers: capturedRequest.headers,
	hmacSecret,
	nowIso,
});
assert.equal(tampered.verified, false);
assert.equal(tampered.reason, "invalid_signature");

const replay = verifyCustomWebhookRequest({
	body: capturedRequest.body,
	headers: capturedRequest.headers,
	hmacSecret,
	nowIso: "2026-09-16T12:10:01.000Z",
	replayWindowMs: 5 * 60 * 1000,
});
assert.equal(replay.verified, false);
assert.equal(replay.reason, "replay_window_exceeded");

const registry = new Set();
const idempotencyRegistry = {
	has: (id) => registry.has(id),
	add: (id) => registry.add(id),
};
const accepted = await verifyAndRegisterCustomWebhookRequest({
	body: capturedRequest.body,
	headers: capturedRequest.headers,
	hmacSecret,
	nowIso,
	idempotencyRegistry,
});
assert.equal(accepted.accepted, true);

const duplicate = await verifyAndRegisterCustomWebhookRequest({
	body: capturedRequest.body,
	headers: capturedRequest.headers,
	hmacSecret,
	nowIso,
	idempotencyRegistry,
});
assert.equal(duplicate.accepted, false);
assert.equal(duplicate.reason, "duplicate_delivery");

let insecureTransportCalled = false;
const insecure = await sendCustomWebhookLead({
	lead,
	delivery,
	endpointUrl: "http://crm.example.test/leads",
	hmacSecret,
	nowIso,
	transport: async () => {
		insecureTransportCalled = true;
		return { ok: true, status: 202 };
	},
});
assert.equal(insecure.delivery.kind, "permanent");
assert.equal(insecureTransportCalled, false);
assertSafe(insecure.safeLog);

const retryable = await sendCustomWebhookLead({
	lead,
	delivery,
	endpointUrl: "https://crm.example.test/leads",
	hmacSecret,
	nowIso,
	transport: async () => ({
		ok: false,
		status: 503,
		errorCode: "custom_crm_unavailable",
	}),
});
assert.equal(retryable.delivery.kind, "retryable");
assertSafe(retryable.safeLog);

const permanent = await sendCustomWebhookLead({
	lead,
	delivery,
	endpointUrl: "https://crm.example.test/leads",
	hmacSecret,
	nowIso,
	transport: async () => ({ ok: false, status: 400, errorCode: "bad_payload" }),
});
assert.equal(permanent.delivery.kind, "permanent");
assertSafe(permanent.safeLog);

console.log("verify-custom-webhook-adapter: ok");

function assertSafe(value) {
	const serialized = JSON.stringify(value);
	for (const forbidden of [
		"Иван",
		"Петров",
		"916",
		"123-45-67",
		"ivan@example.test",
		hmacSecret,
	]) {
		assert.equal(
			serialized.includes(forbidden),
			false,
			`safe log leaked ${forbidden}`,
		);
	}
	assert.equal(value.rawPiiIncluded, false);
	assert.equal(value.secretIncluded, false);
}
