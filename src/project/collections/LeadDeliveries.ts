import type { CollectionConfig, PayloadRequest } from "payload";
import {
	hasRole,
	ownersOnly,
	systemGatewayOnly,
} from "../../core/access/roles.ts";
import { retryLeadDeliveryThroughSystemGateway } from "../../core/data-access/system/lead-delivery-retry.ts";
import { systemQueueJob } from "../../core/data-access/system/queue-job.ts";
import { projectConfig } from "../project.config.ts";

export const LeadDeliveries: CollectionConfig = {
	slug: "lead-deliveries",
	versions: false,
	admin: {
		group: "Operations",
		useAsTitle: "idempotencyKey",
		defaultColumns: [
			"lead",
			"channelId",
			"status",
			"attempts",
			"nextAttemptAt",
			"lastErrorKind",
		],
		description:
			"Owner operations: delivery state, manual retry/recovery and safe diagnostics. CRM channel rows may exist, but CRM adapter execution is deferred until owner enables it.",
	},
	access: {
		create: systemGatewayOnly,
		read: ownersOnly,
		update: systemGatewayOnly,
		delete: ownersOnly,
	},
	endpoints: [
		{
			path: "/:id/retry",
			method: "post",
			handler: async (req: PayloadRequest) => {
				if (!hasRole(req.user, ["owner"])) {
					return Response.json({ error: "forbidden" }, { status: 403 });
				}
				const id = String(req.routeParams?.id ?? "");
				if (!id) {
					return Response.json({ error: "invalid_payload" }, { status: 400 });
				}
				try {
					const result = await retryLeadDeliveryThroughSystemGateway({
						payload: req.payload,
						req,
						deliveryId: id,
						actorUserId: String(req.user?.id ?? "unknown"),
						nowIso: new Date().toISOString(),
						policy: projectConfig.leadDelivery,
						enqueue: async (leadDeliveryId) => {
							const queued = (await systemQueueJob({
								req,
								task: "deliverLead" as never,
								queue: "lead-deliveries",
								input: { leadDeliveryId } as never,
							})) as { id: number | string };
							return String(queued.id);
						},
					});
					return Response.json({ ok: true, jobId: result.jobId });
				} catch (error) {
					return Response.json(
						{
							error: "retry_rejected",
							code: error instanceof Error ? error.message : "retry_rejected",
						},
						{ status: 409 },
					);
				}
			},
		},
	],
	fields: [
		{
			name: "lead",
			type: "relationship",
			relationTo: "leads",
			required: true,
			index: true,
		},
		{
			name: "channelId",
			type: "text",
			required: true,
			index: true,
			admin: {
				description:
					"Immutable logical channel ID. Never reuse for another destination.",
			},
		},
		{
			name: "channelKind",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "Messenger", value: "messenger" },
				{ label: "CRM", value: "crm" },
			],
		},
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "pending",
			index: true,
			admin: {
				description:
					"Delivery state only. Agency workflow status is stored on the lead record.",
			},
			options: [
				{ label: "Pending", value: "pending" },
				{ label: "Sending", value: "sending" },
				{ label: "Delivered", value: "delivered" },
				{ label: "Failed", value: "failed" },
				{ label: "Abandoned", value: "abandoned" },
			],
		},
		{
			name: "attempts",
			type: "number",
			required: true,
			defaultValue: 0,
			min: 0,
		},
		{
			name: "nextAttemptAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Manual retry: set status to pending, clear active claim/job fields if needed, and set the next safe retry time.",
			},
		},
		{
			name: "jobId",
			type: "text",
			index: true,
			admin: {
				description:
					"Payload job identity. Clear only during explicit recovery of an orphaned due delivery.",
			},
		},
		{
			name: "claimedAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Active claim timestamp. Clear only when recovering a stale sending delivery.",
			},
		},
		{
			name: "heartbeatAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Worker heartbeat. Stale heartbeat is used by recovery diagnostics.",
			},
		},
		{
			name: "deliveredAt",
			type: "date",
			index: true,
		},
		{
			name: "idempotencyKey",
			type: "text",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "externalRef",
			type: "text",
		},
		{
			name: "lastErrorKind",
			type: "select",
			options: [
				{ label: "Retryable", value: "retryable" },
				{ label: "Permanent", value: "permanent" },
			],
		},
		{
			name: "lastErrorRedacted",
			type: "textarea",
			admin: {
				description:
					"Redacted diagnostic only. No raw payload, PII, response body, token, or secret.",
			},
		},
		{
			name: "abandonedReason",
			type: "select",
			options: [
				{ label: "Exhausted", value: "exhausted" },
				{ label: "Permanent", value: "permanent" },
				{ label: "Manual", value: "manual" },
			],
		},
		{
			name: "attemptLog",
			type: "array",
			admin: {
				description:
					"Compact safe diagnostics only; raw payload/response, PII and secrets are forbidden.",
			},
			fields: [
				{
					name: "attemptedAt",
					type: "date",
					required: true,
				},
				{
					name: "safeCode",
					type: "text",
				},
				{
					name: "outcome",
					type: "select",
					required: true,
					options: [
						{ label: "Delivered", value: "delivered" },
						{ label: "Retryable", value: "retryable" },
						{ label: "Permanent", value: "permanent" },
						{ label: "Skipped", value: "skipped" },
					],
				},
				{
					name: "redactedNote",
					type: "textarea",
				},
			],
		},
		{
			name: "diagnosticsPurgedAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Set when leadRetentionCleanup purges/anonymizes linked delivery diagnostics with the lead.",
			},
		},
	],
};
