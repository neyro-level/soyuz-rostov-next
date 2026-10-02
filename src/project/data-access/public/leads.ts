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
import type { City, Developer, Development, District, Region } from "@/project/payload-types";
import { publicGatewayReadAccess } from "./access-mode.ts";
import { getPublicGatewayPayload } from "./payload.ts";
import { toPropertyCardDTO } from "./dto.ts";
import { findPublicNap } from "./nap.ts";
import { getDevelopment } from "./geo-catalog.ts";

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
	if (intake.lead.formKind === "development_price") {
		const developmentSlug = intake.lead.context?.development;
		if (!developmentSlug) {
			return developmentContextRejected(intake.lead.sourcePage);
		}
		const nap = await findPublicNap(payload);
		const publicDevelopment = await getDevelopment(
			payload,
			developmentSlug,
			nap.brandName,
		);
		const canonicalSourcePage = publicDevelopment
			? normalizeCanonicalSourcePage(publicDevelopment.href)
			: undefined;
		if (!publicDevelopment || intake.lead.sourcePage !== canonicalSourcePage) {
			return developmentContextRejected(intake.lead.sourcePage);
		}
		const found = await payload.find({
			collection: "developments",
			where: {
				and: [
					{ slug: { equals: publicDevelopment.slug } },
					{ status: { equals: "published" } },
					{ publishedAt: { exists: true } },
				],
			},
			limit: 1,
			depth: 1,
			...publicGatewayReadAccess(),
		});
		const development = found.docs[0] as Development | undefined;
		intake.lead.sourcePage = canonicalSourcePage;
		intake.lead.context = {
			...intake.lead.context,
			development: publicDevelopment.slug,
			developer: development
				? relationSlug<Developer>(development.developer)
				: publicDevelopment.developer?.pageKey.kind === "developer"
					? publicDevelopment.developer.pageKey.slug
					: undefined,
			city: development ? relationSlug<City>(development.city) : undefined,
			region: development ? relationSlug<Region>(development.region) : undefined,
			district: development ? relationSlug<District>(development.district) : undefined,
			dataTier: development?.dataTier,
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

function developmentContextRejected(sourcePage: string): LeadIntakeRejected {
	return {
		accepted: false,
		status: 400,
		code: "lead.invalid_payload",
		safeDiagnostics: {
			code: "lead.development_context_invalid",
			formKind: "development_price",
			sourcePage,
			reason: "Development price request context is not a published canonical development.",
			rawPiiIncluded: false,
		},
	};
}

function relationSlug<T extends { slug?: string | null }>(
	relation: number | T | null | undefined,
): string | undefined {
	return typeof relation === "object" && relation?.slug ? relation.slug : undefined;
}
