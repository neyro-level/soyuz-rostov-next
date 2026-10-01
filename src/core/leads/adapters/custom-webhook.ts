import { createHmac, timingSafeEqual } from "node:crypto";
import type { LeadDeliveryResult } from "../delivery-state.ts";
import type { LeadDeliveryRecord, LeadRecord } from "../outbox.ts";

export type CustomWebhookLeadPayload = {
	event: "lead.created";
	channelId: "custom-webhook";
	leadId: string;
	deliveryId: string;
	idempotencyKey: string;
	formKind: LeadRecord["formKind"];
	sourcePage: string;
	context?: LeadRecord["context"];
	contact: {
		name: string;
		phoneE164: string;
		email?: string;
	};
	message?: string;
	consentVersion: string;
	consentedAt: string;
};

export type CustomWebhookTransportRequest = {
	url: string;
	method: "POST";
	headers: CustomWebhookHeaders;
	body: string;
};

export type CustomWebhookTransportResponse = {
	ok: boolean;
	status: number;
	providerMessageId?: string;
	errorCode?: string;
};

export type CustomWebhookTransport = (
	request: CustomWebhookTransportRequest,
) => Promise<CustomWebhookTransportResponse>;

export type CustomWebhookHeaders = {
	"x-ams-timestamp": string;
	"x-ams-signature": string;
	"x-ams-idempotency-key": string;
	"content-type": "application/json";
};

export type SendCustomWebhookLeadResult = {
	delivery: LeadDeliveryResult;
	safeLog: {
		channelId: "custom-webhook";
		outcome: "delivered" | "retryable" | "permanent";
		safeCode: string;
		rawPiiIncluded: false;
		secretIncluded: false;
	};
	request?: CustomWebhookTransportRequest;
};

export type CustomWebhookVerificationResult =
	| {
			verified: true;
			idempotencyKey: string;
			timestamp: string;
	  }
	| {
			verified: false;
			reason:
				| "missing_header"
				| "invalid_timestamp"
				| "replay_window_exceeded"
				| "invalid_signature";
	  };

export type CustomWebhookAcceptanceFailureReason =
	| "missing_header"
	| "invalid_timestamp"
	| "replay_window_exceeded"
	| "invalid_signature"
	| "duplicate_delivery";

export type CustomWebhookAcceptanceResult =
	| {
			accepted: true;
			idempotencyKey: string;
	  }
	| {
			accepted: false;
			reason: CustomWebhookAcceptanceFailureReason;
	  };

export type CustomWebhookIdempotencyRegistry = {
	has(idempotencyKey: string): boolean | Promise<boolean>;
	add(idempotencyKey: string): void | Promise<void>;
};

const defaultReplayWindowMs = 5 * 60 * 1000;

export async function sendCustomWebhookLead({
	lead,
	delivery,
	endpointUrl,
	hmacSecret,
	transport,
	nowIso,
}: {
	lead: LeadRecord;
	delivery: LeadDeliveryRecord;
	endpointUrl: string;
	hmacSecret: string;
	transport: CustomWebhookTransport;
	nowIso: string;
}): Promise<SendCustomWebhookLeadResult> {
	if (!isHttpsUrl(endpointUrl)) {
		return {
			delivery: {
				kind: "permanent",
				safeCode: "custom_webhook_https_required",
				redactedNote: "Custom webhook endpoint must use HTTPS.",
			},
			safeLog: safeLog("permanent", "custom_webhook_https_required"),
		};
	}

	const payload = buildCustomWebhookLeadPayload(lead, delivery);
	const body = serializeCustomWebhookPayload(payload);
	const headers = buildCustomWebhookHeaders({
		body,
		idempotencyKey: delivery.idempotencyKey,
		hmacSecret,
		timestamp: nowIso,
	});
	const request: CustomWebhookTransportRequest = {
		url: endpointUrl,
		method: "POST",
		headers,
		body,
	};

	const response = await transport(request);
	const outcome = classifyCustomWebhookResponse(response);

	if (outcome === "delivered") {
		return {
			delivery: {
				kind: "delivered",
				safeCode: "custom_webhook_delivered",
				redactedNote: "Custom webhook delivery accepted.",
			},
			safeLog: safeLog("delivered", "custom_webhook_delivered"),
			request,
		};
	}

	const safeCode =
		response.errorCode ?? `custom_webhook_http_${response.status}`;
	if (outcome === "retryable") {
		return {
			delivery: {
				kind: "retryable",
				safeCode,
				redactedNote: "Custom webhook delivery failed with retryable response.",
			},
			safeLog: safeLog("retryable", safeCode),
			request,
		};
	}

	return {
		delivery: {
			kind: "permanent",
			safeCode,
			redactedNote: "Custom webhook delivery failed with permanent response.",
		},
		safeLog: safeLog("permanent", safeCode),
		request,
	};
}

export function buildCustomWebhookLeadPayload(
	lead: LeadRecord,
	delivery: LeadDeliveryRecord,
): CustomWebhookLeadPayload {
	return {
		event: "lead.created",
		channelId: "custom-webhook",
		leadId: lead.id,
		deliveryId: delivery.id,
		idempotencyKey: delivery.idempotencyKey,
		formKind: lead.formKind,
		sourcePage: lead.sourcePage,
		...(lead.context ? { context: lead.context } : {}),
		contact: {
			name: lead.name,
			phoneE164: lead.phoneE164,
			email: lead.email,
		},
		message: lead.message,
		consentVersion: lead.consent.version,
		consentedAt: lead.consent.consentedAt,
	};
}

export function buildCustomWebhookHeaders({
	body,
	idempotencyKey,
	hmacSecret,
	timestamp,
}: {
	body: string;
	idempotencyKey: string;
	hmacSecret: string;
	timestamp: string;
}): CustomWebhookHeaders {
	return {
		"x-ams-timestamp": timestamp,
		"x-ams-signature": signCustomWebhookBody({
			body,
			idempotencyKey,
			hmacSecret,
			timestamp,
		}),
		"x-ams-idempotency-key": idempotencyKey,
		"content-type": "application/json",
	};
}

export function signCustomWebhookBody({
	body,
	idempotencyKey,
	hmacSecret,
	timestamp,
}: {
	body: string;
	idempotencyKey: string;
	hmacSecret: string;
	timestamp: string;
}): string {
	const digest = createHmac("sha256", hmacSecret)
		.update(`${timestamp}.${idempotencyKey}.${body}`)
		.digest("hex");
	return `sha256=${digest}`;
}

export function verifyCustomWebhookRequest({
	body,
	headers,
	hmacSecret,
	nowIso,
	replayWindowMs = defaultReplayWindowMs,
}: {
	body: string;
	headers: Partial<CustomWebhookHeaders>;
	hmacSecret: string;
	nowIso: string;
	replayWindowMs?: number;
}): CustomWebhookVerificationResult {
	const timestamp = headers["x-ams-timestamp"];
	const signature = headers["x-ams-signature"];
	const idempotencyKey = headers["x-ams-idempotency-key"];

	if (!timestamp || !signature || !idempotencyKey) {
		return { verified: false, reason: "missing_header" };
	}

	const timestampMs = new Date(timestamp).getTime();
	if (!Number.isFinite(timestampMs)) {
		return { verified: false, reason: "invalid_timestamp" };
	}

	const nowMs = new Date(nowIso).getTime();
	if (!Number.isFinite(nowMs)) {
		return { verified: false, reason: "invalid_timestamp" };
	}

	if (Math.abs(nowMs - timestampMs) > replayWindowMs) {
		return { verified: false, reason: "replay_window_exceeded" };
	}

	const expected = signCustomWebhookBody({
		body,
		idempotencyKey,
		hmacSecret,
		timestamp,
	});

	if (!safeEqual(signature, expected)) {
		return { verified: false, reason: "invalid_signature" };
	}

	return { verified: true, idempotencyKey, timestamp };
}

export async function verifyAndRegisterCustomWebhookRequest({
	body,
	headers,
	hmacSecret,
	nowIso,
	idempotencyRegistry,
	replayWindowMs,
}: {
	body: string;
	headers: Partial<CustomWebhookHeaders>;
	hmacSecret: string;
	nowIso: string;
	idempotencyRegistry: CustomWebhookIdempotencyRegistry;
	replayWindowMs?: number;
}): Promise<CustomWebhookAcceptanceResult> {
	const verification = verifyCustomWebhookRequest({
		body,
		headers,
		hmacSecret,
		nowIso,
		replayWindowMs,
	});

	if (!verification.verified) {
		return { accepted: false, reason: verification.reason };
	}

	if (await idempotencyRegistry.has(verification.idempotencyKey)) {
		return { accepted: false, reason: "duplicate_delivery" };
	}

	await idempotencyRegistry.add(verification.idempotencyKey);
	return {
		accepted: true,
		idempotencyKey: verification.idempotencyKey,
	};
}

export function serializeCustomWebhookPayload(
	payload: CustomWebhookLeadPayload,
): string {
	return JSON.stringify(payload);
}

export function classifyCustomWebhookResponse(
	response: CustomWebhookTransportResponse,
): "delivered" | "retryable" | "permanent" {
	if (response.ok && response.status >= 200 && response.status < 300) {
		return "delivered";
	}
	if (
		response.status === 408 ||
		response.status === 409 ||
		response.status === 425 ||
		response.status === 429
	) {
		return "retryable";
	}
	if (response.status >= 500) {
		return "retryable";
	}
	return "permanent";
}

function isHttpsUrl(value: string): boolean {
	try {
		return new URL(value).protocol === "https:";
	} catch {
		return false;
	}
}

function safeEqual(left: string, right: string): boolean {
	const leftBuffer = Buffer.from(left);
	const rightBuffer = Buffer.from(right);
	if (leftBuffer.length !== rightBuffer.length) {
		return false;
	}
	return timingSafeEqual(leftBuffer, rightBuffer);
}

function safeLog(
	outcome: "delivered" | "retryable" | "permanent",
	safeCode: string,
): SendCustomWebhookLeadResult["safeLog"] {
	return {
		channelId: "custom-webhook",
		outcome,
		safeCode,
		rawPiiIncluded: false,
		secretIncluded: false,
	};
}
