import "server-only";

import type { Payload, PayloadRequest } from "payload";
import { createPayloadLeadOutboxRepository } from "@/core/data-access/leads/payload-outbox-repository";
import { resolveEnabledLeadChannels } from "@/core/leads/channels";
import { hitInProcessLeadRateLimit } from "@/core/leads/in-process-rate-limit";
import {
	accelerateLeadDeliveryJobs,
	commitLeadOutbox,
	normalizeCanonicalSourcePage,
	prepareLeadIntake,
	type LeadIntakeRejected,
} from "@/core/leads/index";
import { runtimeEnv } from "@/project/env";
import { clientReadinessConfig } from "@/project/client-readiness.config";
import { legalConsentConfig } from "@/project/legal.config";
import { projectConfig } from "@/project/project.config";
import { siteConfig } from "@/project/site.config";
import { systemOverrideAccess } from "@/core/data-access/system/overrides";
import { publicGatewayReadAccess } from "./access-mode.ts";
import { getPublicGatewayPayload } from "./payload.ts";
import { toPropertyCardDTO } from "./dto.ts";

export type PublicLeadSubmitResult =
	| { accepted: true; reused: boolean }
	| LeadIntakeRejected
	| { accepted: false; status: 503; code: "lead.unavailable" };

async function enqueueLeadDelivery(
	payload: Payload,
	leadDeliveryId: string,
): Promise<string | undefined> {
	const queued = (await payload.jobs.queue({
		task: "deliverLead" as never,
		queue: "lead-deliveries",
		input: { leadDeliveryId } as never,
		req: {
			payload,
			user: null,
			context: systemOverrideAccess("system-job").context,
		} as unknown as PayloadRequest,
		...systemOverrideAccess("system-job"),
	})) as { id?: number | string };

	return queued.id === undefined ? undefined : String(queued.id);
}

export async function submitPublicLead({
	body,
	rateLimitKey,
}: {
	body: unknown;
	rateLimitKey: string;
}): Promise<PublicLeadSubmitResult> {
	const limited = hitInProcessLeadRateLimit({
		key: rateLimitKey,
		limit: runtimeEnv.LEAD_RATE_LIMIT_PER_MINUTE,
	});
	if (limited) {
		return limited;
	}

	const channels = resolveEnabledLeadChannels({
		LEAD_CHANNELS: runtimeEnv.LEAD_CHANNELS,
		LEAD_OUTBOUND_HOSTS: runtimeEnv.LEAD_OUTBOUND_HOSTS,
		MAX_BOT_TOKEN: runtimeEnv.MAX_BOT_TOKEN,
		MAX_CHAT_ID: runtimeEnv.MAX_CHAT_ID,
		CUSTOM_WEBHOOK_URL: runtimeEnv.CUSTOM_WEBHOOK_URL,
		CUSTOM_WEBHOOK_HMAC_SECRET: runtimeEnv.CUSTOM_WEBHOOK_HMAC_SECRET,
	});
	if (
		(channels.length > 0 && !projectConfig.leadRetentionDays) ||
		((siteConfig.projectKind as "starter-demo" | "client") === "client" &&
			(!projectConfig.leadRetentionDays ||
				(clientReadinessConfig.legalContent as "approved" | "placeholder") !==
					"approved"))
	) {
		return { accepted: false, status: 503, code: "lead.unavailable" };
	}

	const nowIso = new Date().toISOString();
	const intake = prepareLeadIntake(body, {
		fraudHmacKey: runtimeEnv.PAYLOAD_SECRET,
		nowIso,
		currentConsentVersion: legalConsentConfig.currentConsentVersion,
		leadRetentionDays: projectConfig.leadRetentionDays,
	});
	if (!intake.accepted) {
		return intake;
	}

	if (!runtimeEnv.DATABASE_URI || !runtimeEnv.PAYLOAD_SECRET) {
		return {
			accepted: false,
			status: 503,
			code: "lead.unavailable",
		};
	}

	const payload = await getPublicGatewayPayload();
	if (intake.lead.formKind === "property_request") {
		const propertyId = intake.lead.property;
		if (!propertyId || !/^\d+$/.test(propertyId)) {
			return propertyContextRejected(intake.lead.sourcePage);
		}
		const found = await payload.find({
			collection: "properties",
			where: { id: { equals: Number(propertyId) } },
			limit: 1,
			depth: 0,
			...publicGatewayReadAccess(),
		});
		const property = found.docs[0];
		const canonicalSourcePage = property
			? normalizeCanonicalSourcePage(toPropertyCardDTO(property).href)
			: undefined;
		if (!property || intake.lead.sourcePage !== canonicalSourcePage) {
			return propertyContextRejected(intake.lead.sourcePage);
		}
		intake.lead.property = String(property.id);
		intake.lead.sourcePage = canonicalSourcePage;
		intake.lead.context = {
			...intake.lead.context,
			propertyUrlId: String(property.publicUrlId),
		};
	}
	const repository = createPayloadLeadOutboxRepository(payload);
	const committed = await commitLeadOutbox({
		intake,
		channels,
		repository,
		nowIso,
	});

	if (!committed.reusedExistingLead) {
		await accelerateLeadDeliveryJobs({
			repository,
			nowIso,
			enqueue: (leadDeliveryId) => enqueueLeadDelivery(payload, leadDeliveryId),
		});
	}

	return {
		accepted: true,
		reused: committed.reusedExistingLead,
	};
}

function propertyContextRejected(sourcePage: string): LeadIntakeRejected {
	return {
		accepted: false,
		status: 400,
		code: "lead.invalid_payload",
		safeDiagnostics: {
			code: "lead.property_context_invalid",
			formKind: "property_request",
			sourcePage,
			reason: "Property form context is not a published canonical property.",
			rawPiiIncluded: false,
		},
	};
}
