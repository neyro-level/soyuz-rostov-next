import type { LeadDeliveryResult } from "../delivery-state.ts";
import type { LeadRecord } from "../outbox.ts";

export type MaxLeadPayload = {
	channelId: "max";
	leadId: string;
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
};

export type MaxTransportResponse = {
	ok: boolean;
	status: number;
	providerMessageId?: string;
	errorCode?: string;
};

export type MaxTransport = (
	payload: MaxLeadPayload,
) => Promise<MaxTransportResponse>;

export type SendMaxLeadResult = {
	delivery: LeadDeliveryResult;
	safeLog: {
		channelId: "max";
		outcome: "delivered" | "retryable" | "permanent";
		safeCode: string;
		rawPiiIncluded: false;
		secretIncluded: false;
	};
};

export async function sendMaxLead({
	lead,
	transport,
}: {
	lead: LeadRecord;
	transport: MaxTransport;
}): Promise<SendMaxLeadResult> {
	const response = await transport(buildMaxLeadPayload(lead));
	const outcome = classifyMaxResponse(response);

	if (outcome === "delivered") {
		return {
			delivery: {
				kind: "delivered",
				safeCode: "max_delivered",
				redactedNote: "MAX delivery accepted.",
			},
			safeLog: safeLog("delivered", "max_delivered"),
		};
	}

	if (outcome === "retryable") {
		const safeCode = response.errorCode ?? `max_http_${response.status}`;
		return {
			delivery: {
				kind: "retryable",
				safeCode,
				redactedNote: "MAX delivery failed with retryable response.",
			},
			safeLog: safeLog("retryable", safeCode),
		};
	}

	const safeCode = response.errorCode ?? `max_http_${response.status}`;
	return {
		delivery: {
			kind: "permanent",
			safeCode,
			redactedNote: "MAX delivery failed with permanent response.",
		},
		safeLog: safeLog("permanent", safeCode),
	};
}

export function buildMaxLeadPayload(lead: LeadRecord): MaxLeadPayload {
	return {
		channelId: "max",
		leadId: lead.id,
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
	};
}

export function classifyMaxResponse(
	response: MaxTransportResponse,
): "delivered" | "retryable" | "permanent" {
	if (response.ok && response.status >= 200 && response.status < 300) {
		return "delivered";
	}
	if (
		response.status === 408 ||
		response.status === 409 ||
		response.status === 429
	) {
		return "retryable";
	}
	if (response.status >= 500) {
		return "retryable";
	}
	return "permanent";
}

function safeLog(
	outcome: "delivered" | "retryable" | "permanent",
	safeCode: string,
): SendMaxLeadResult["safeLog"] {
	return {
		channelId: "max",
		outcome,
		safeCode,
		rawPiiIncluded: false,
		secretIncluded: false,
	};
}
