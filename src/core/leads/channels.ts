import type { LeadChannelConfig } from "./outbox.ts";

export type LeadChannelEnv = {
	LEAD_CHANNELS?: string;
	LEAD_OUTBOUND_HOSTS?: string;
	MAX_BOT_TOKEN?: string;
	MAX_CHAT_ID?: string;
	CUSTOM_WEBHOOK_URL?: string;
	CUSTOM_WEBHOOK_HMAC_SECRET?: string;
};

export type LeadChannelCapabilities = {
	nativeIdempotency: "proven" | "unproven";
	externalDeliveryLookup: boolean;
	idempotencyHeader: "sent" | "required-and-verified";
	hmacSigning: boolean;
	unknownDeliveryCertainty: "possible";
};

const knownChannels = {
	max: {
		kind: "messenger" as const,
		credentialRefs: ["MAX_BOT_TOKEN", "MAX_CHAT_ID"] as const,
		capabilities: {
			nativeIdempotency: "unproven",
			externalDeliveryLookup: false,
			idempotencyHeader: "sent",
			hmacSigning: false,
			unknownDeliveryCertainty: "possible",
		} satisfies LeadChannelCapabilities,
	},
	"custom-webhook": {
		kind: "messenger" as const,
		credentialRefs: [
			"CUSTOM_WEBHOOK_URL",
			"CUSTOM_WEBHOOK_HMAC_SECRET",
		] as const,
		capabilities: {
			nativeIdempotency: "proven",
			externalDeliveryLookup: false,
			idempotencyHeader: "required-and-verified",
			hmacSigning: true,
			unknownDeliveryCertainty: "possible",
		} satisfies LeadChannelCapabilities,
	},
};

export const leadChannelCapabilities = Object.freeze(
	Object.fromEntries(
		Object.entries(knownChannels).map(([id, channel]) => [
			id,
			channel.capabilities,
		]),
	) as Readonly<Record<keyof typeof knownChannels, LeadChannelCapabilities>>,
);

export function parseLeadChannelIds(raw?: string): string[] {
	if (!raw?.trim()) {
		return [];
	}

	const trimmed = raw.trim();
	if (trimmed.startsWith("[")) {
		try {
			const parsed = JSON.parse(trimmed) as unknown;
			if (Array.isArray(parsed)) {
				return parsed.map((item) => String(item).trim()).filter(Boolean);
			}
		} catch {
			return [];
		}
	}

	return trimmed
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
}

export function resolveEnabledLeadChannels(
	env: LeadChannelEnv,
): LeadChannelConfig[] {
	const listed = parseLeadChannelIds(env.LEAD_CHANNELS);
	const hosts = (env.LEAD_OUTBOUND_HOSTS ?? "")
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	const enabled: LeadChannelConfig[] = [];

	for (const id of listed) {
		const known = knownChannels[id as keyof typeof knownChannels];
		if (!known) {
			continue;
		}

		const credentialsPresent = known.credentialRefs.every((ref) =>
			Boolean(env[ref as keyof LeadChannelEnv]?.trim()),
		);
		if (!credentialsPresent || hosts.length === 0) {
			continue;
		}

		enabled.push({
			id,
			kind: known.kind,
			enabled: true,
		});
	}

	return enabled;
}
