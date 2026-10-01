import type { Payload, TaskHandlerResult } from "payload";
import { systemOverrideAccess } from "../data-access/system/overrides.ts";
import { claimLeadDeliveryRow } from "../data-access/system/sql/index.ts";
import {
	parseOutboundHostList,
	safeOutboundFetch,
} from "../security/safe-outbound-client.ts";
import { parseTestApprovedOrigins } from "../security/test-destinations.ts";
import { sendCustomWebhookLead } from "./adapters/custom-webhook.ts";
import { sendMaxLead } from "./adapters/max.ts";
import {
	completeLeadDeliveryAttempt,
	type LeadDeliveryResult,
	type LeadDeliveryStateRecord,
} from "./delivery-state.ts";
import type { LeadDeliveryPolicy } from "./delivery-policy.ts";
import type { LeadDeliveryRecord, LeadRecord } from "./outbox.ts";

const access = systemOverrideAccess("system-job");

export type DeliverLeadEnv = {
	LEAD_OUTBOUND_HOSTS?: string;
	MAX_API_URL?: string;
	MAX_BOT_TOKEN?: string;
	MAX_CHAT_ID?: string;
	CUSTOM_WEBHOOK_URL?: string;
	CUSTOM_WEBHOOK_HMAC_SECRET?: string;
	AMS_ALLOW_TEST_DESTINATIONS?: string;
	AMS_TEST_APPROVED_ORIGINS?: string;
	NODE_ENV?: string;
};

export type DeliverLeadTaskResult = {
	output: {
		httpAttempted: boolean;
		outcome: string;
	};
};

export type QueueLeadDeliveryRetry = (input: {
	leadDeliveryId: string;
	waitUntil: Date;
}) => Promise<string>;

function asLeadRecord(doc: Record<string, unknown>): LeadRecord {
	const consent = (doc.consent ?? {}) as {
		version?: string;
		consentedAt?: string;
	};
	return {
		id: String(doc.id),
		status: "new",
		name: String(doc.name ?? ""),
		phoneRaw: String(doc.phoneRaw ?? ""),
		phoneE164: String(doc.phoneE164 ?? ""),
		email: typeof doc.email === "string" ? doc.email : undefined,
		message: typeof doc.message === "string" ? doc.message : undefined,
		formKind: doc.formKind as LeadRecord["formKind"],
		sourcePage: String(doc.sourcePage ?? "/"),
		consent: {
			accepted: true,
			version: String(consent.version ?? ""),
			consentedAt: String(consent.consentedAt ?? ""),
		},
		idempotencyKey: String(doc.idempotencyKey ?? ""),
	};
}

async function persistDelivery(
	payload: Payload,
	delivery: LeadDeliveryStateRecord,
): Promise<void> {
	await payload.update({
		collection: "lead-deliveries",
		id: Number(delivery.id),
		data: {
			status: delivery.status,
			attempts: delivery.attempts,
			nextAttemptAt: delivery.nextAttemptAt,
			jobId: delivery.jobId ?? null,
			claimedAt: delivery.claimedAt ?? null,
			heartbeatAt: delivery.heartbeatAt ?? null,
			deliveredAt: delivery.deliveredAt ?? null,
			lastErrorKind: delivery.lastErrorKind ?? null,
			lastErrorRedacted: delivery.lastErrorRedacted ?? null,
			abandonedReason: delivery.abandonedReason ?? null,
			attemptLog: delivery.attemptLog,
		},
		depth: 0,
		...access,
	});
}

async function invokeAdapter({
	channelId,
	lead,
	delivery,
	env,
	nowIso,
}: {
	channelId: string;
	lead: LeadRecord;
	delivery: LeadDeliveryRecord;
	env: DeliverLeadEnv;
	nowIso: string;
}): Promise<{ result: LeadDeliveryResult; httpAttempted: boolean }> {
	const allowedHosts = parseOutboundHostList(env.LEAD_OUTBOUND_HOSTS);
	const approvedExactOrigins = parseTestApprovedOrigins(
		env as NodeJS.ProcessEnv,
	);
	const approvedHttpHosts = approvedExactOrigins.map(
		(origin) => new URL(origin).hostname,
	);
	if (allowedHosts.length === 0) {
		return {
			httpAttempted: false,
			result: { kind: "missing_adapter", channelId },
		};
	}

	if (channelId === "max") {
		const url = env.MAX_API_URL?.trim();
		if (!url || !env.MAX_BOT_TOKEN || !env.MAX_CHAT_ID) {
			return {
				httpAttempted: false,
				result: { kind: "missing_adapter", channelId },
			};
		}
		const sent = await sendMaxLead({
			lead,
			transport: async (payload) => {
				const response = await safeOutboundFetch(url, {
					allowedHosts,
					approvedExactOrigins,
					approvedHttpHosts,
					method: "POST",
					headers: {
						authorization: `Bearer ${env.MAX_BOT_TOKEN}`,
						"content-type": "application/json",
						"idempotency-key": delivery.idempotencyKey,
					},
					body: JSON.stringify({
						...payload,
						chatId: env.MAX_CHAT_ID,
						idempotencyKey: delivery.idempotencyKey,
					}),
					timeoutMs: 10_000,
				});
				return {
					ok: response.ok,
					status: response.status,
				};
			},
		});
		return { httpAttempted: true, result: sent.delivery };
	}

	if (channelId === "custom-webhook") {
		const endpointUrl = env.CUSTOM_WEBHOOK_URL?.trim();
		const hmacSecret = env.CUSTOM_WEBHOOK_HMAC_SECRET?.trim();
		if (!endpointUrl || !hmacSecret) {
			return {
				httpAttempted: false,
				result: { kind: "missing_adapter", channelId },
			};
		}
		const sent = await sendCustomWebhookLead({
			lead,
			delivery,
			endpointUrl,
			hmacSecret,
			nowIso,
			transport: async (request) => {
				const response = await safeOutboundFetch(request.url, {
					allowedHosts,
					approvedExactOrigins,
					approvedHttpHosts,
					method: request.method,
					headers: request.headers,
					body: request.body,
					timeoutMs: 10_000,
				});
				return {
					ok: response.ok,
					status: response.status,
				};
			},
		});
		return { httpAttempted: true, result: sent.delivery };
	}

	return {
		httpAttempted: false,
		result: { kind: "missing_adapter", channelId },
	};
}

export async function runDeliverLeadTask({
	payload,
	leadDeliveryId,
	nowIso,
	env,
	queueRetry,
	policy,
}: {
	payload: Payload;
	leadDeliveryId: string;
	nowIso: string;
	env: DeliverLeadEnv;
	queueRetry: QueueLeadDeliveryRetry;
	policy: LeadDeliveryPolicy;
}): Promise<TaskHandlerResult<"deliverLead"> & DeliverLeadTaskResult> {
	const claimed = await claimLeadDeliveryRow(payload, {
		deliveryId: leadDeliveryId,
		nowIso,
	});
	if (!claimed) {
		return {
			output: { httpAttempted: false, outcome: "not_claimable" },
		};
	}

	const leadDoc = await payload.findByID({
		collection: "leads",
		id: Number(claimed.leadId),
		depth: 0,
		...access,
	});
	const lead = asLeadRecord(leadDoc as unknown as Record<string, unknown>);
	const deliveryRecord: LeadDeliveryRecord = {
		id: claimed.id,
		lead: claimed.leadId,
		channelId: claimed.channelId,
		channelKind: claimed.channelKind,
		status: "pending",
		attempts: 0,
		nextAttemptAt: nowIso,
		idempotencyKey: claimed.idempotencyKey,
		jobId: claimed.jobId,
	};
	const sendingState: LeadDeliveryStateRecord = {
		id: claimed.id,
		lead: claimed.leadId,
		channelId: claimed.channelId,
		status: "sending",
		attempts: claimed.attempts,
		jobId: claimed.jobId,
		claimedAt: nowIso,
		heartbeatAt: nowIso,
	};

	let adapterResult: { result: LeadDeliveryResult; httpAttempted: boolean };
	try {
		adapterResult = await invokeAdapter({
			channelId: claimed.channelId,
			lead,
			delivery: deliveryRecord,
			env,
			nowIso,
		});
	} catch {
		adapterResult = {
			httpAttempted: true,
			result: {
				kind: "unknown",
				safeCode: "outbound_timeout_or_error",
				redactedNote: "Outbound delivery ended without a classified response.",
			},
		};
	}

	const completed = completeLeadDeliveryAttempt({
		delivery: sendingState,
		result: adapterResult.result,
		nowIso,
		policy,
	});
	await persistDelivery(payload, completed);

	if (completed.status === "pending" && completed.nextAttemptAt) {
		const retryJobId = await queueRetry({
			leadDeliveryId: completed.id,
			waitUntil: new Date(completed.nextAttemptAt),
		});
		await payload.update({
			collection: "lead-deliveries",
			id: Number(completed.id),
			data: { jobId: retryJobId },
			depth: 0,
			...access,
		});
	}

	return {
		output: {
			httpAttempted: adapterResult.httpAttempted,
			outcome: completed.status,
		},
	};
}
