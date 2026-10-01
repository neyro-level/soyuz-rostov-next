import type { CollectionConfig, PayloadRequest } from "payload";
import { queueManualFeedImport, approveSuspiciousDeactivation } from "../ingest/owner-feed-operations.ts";
import { projectConfig } from "../project.config.ts";
import { normalizeEnabledFeedNextDueAt } from "../../core/ingest/feed-schedule.ts";
import { getRuntimeClock } from "../../core/time/clock.ts";
import { adminsAndOwners, hasRole, ownersOnly } from "../../core/access/roles.ts";

export const FeedSources: CollectionConfig = {
	slug: "feed-sources",
	admin: {
		group: "Operations",
		useAsTitle: "title",
		defaultColumns: ["code", "title", "market", "enabled", "nextDueAt"],
		description:
			"Owner operations: feed health, schedule, deactivation safety and suspicious-run approval. Store only secret references, never credential URLs.",
	},
	hooks: {
		beforeChange: [
			({ data, originalDoc }) => {
				const enabled =
					typeof data.enabled === "boolean"
						? data.enabled
						: Boolean(originalDoc?.enabled);
				const nextDueAt =
					data.nextDueAt !== undefined
						? (data.nextDueAt as string | null)
						: ((originalDoc?.nextDueAt as string | null | undefined) ?? null);
				data.nextDueAt = normalizeEnabledFeedNextDueAt({
					enabled,
					nextDueAt,
					nowIso: getRuntimeClock().nowIso(),
				});
				return data;
			},
		],
		beforeDelete: [
			async ({ id, req }) => {
				const [properties, importRuns, importIssues] = await Promise.all([
					req.payload.count({
						collection: "properties",
						where: { feedSource: { equals: id } },
						req,
						overrideAccess: false,
					}),
					req.payload.count({
						collection: "import-runs",
						where: { feedSource: { equals: id } },
						req,
						overrideAccess: false,
					}),
					req.payload.count({
						collection: "import-issues",
						where: { feedSource: { equals: id } },
						req,
						overrideAccess: false,
					}),
				]);

				const linkedRows =
					properties.totalDocs + importRuns.totalDocs + importIssues.totalDocs;

				if (linkedRows > 0) {
					throw new Error(
						`Feed source ${id} cannot be deleted while linked properties/import history exist.`,
					);
				}
			},
		],
	},
	access: {
		create: adminsAndOwners,
		read: adminsAndOwners,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	endpoints: [
		{
			path: "/:id/manual-import",
			method: "post",
			handler: async (req: PayloadRequest) => {
				if (!hasRole(req.user, ["owner", "admin"])) {
					return Response.json({ error: "forbidden" }, { status: 403 });
				}
				const id = String(req.routeParams?.id ?? "");
				const result = await queueManualFeedImport(req, { feedSourceId: id });
				return Response.json(result);
			},
		},
		{
			path: "/:id/approve-deactivation",
			method: "post",
			handler: async (req: PayloadRequest) => {
				if (!hasRole(req.user, ["owner", "admin"])) {
					return Response.json({ error: "forbidden" }, { status: 403 });
				}
				const id = String(req.routeParams?.id ?? "");
				const body = (await req.json?.()) as { importRunId?: string } | null;
				if (!body?.importRunId || !req.user?.id) {
					return Response.json({ error: "invalid_payload" }, { status: 400 });
				}
				const result = await approveSuspiciousDeactivation(req, {
					feedSourceId: id,
					importRunId: String(body.importRunId),
					approvedByUserId: String(req.user.id),
					approvalTtlMinutes: projectConfig.approvalTtlMinutes,
				});
				return Response.json(result);
			},
		},
	],
	fields: [
		{
			name: "code",
			type: "text",
			required: true,
			unique: true,
			admin: {
				description:
					"Stable source identity used by import jobs and diagnostics.",
			},
		},
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "parser",
			type: "select",
			required: true,
			defaultValue: "yrl",
			options: [{ label: "YRL/XML", value: "yrl" }],
		},
		{
			name: "market",
			type: "select",
			required: true,
			defaultValue: "secondary",
			index: true,
			options: [
				{ label: "Secondary", value: "secondary" },
				{ label: "Newbuild", value: "newbuild" },
			],
			admin: {
				description:
					"Authoritative market for imported properties from this feed source.",
			},
		},
		{
			name: "feedUrlRef",
			type: "text",
			required: true,
			admin: {
				description:
					"Reference to deployment secret/config value. Do not store credential URLs here.",
			},
		},
		{
			name: "enabled",
			type: "checkbox",
			defaultValue: false,
			index: true,
		},
		{
			name: "refreshIntervalMinutes",
			type: "number",
			required: true,
			defaultValue: 1440,
			min: 5,
		},
		{
			name: "nextDueAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Required when the source is enabled. Create/enable without a value sets now; dispatcher does not skip null rows.",
			},
		},
		{
			name: "lastAttemptAt",
			type: "date",
			admin: {
				description: "Last dispatch attempt time for feed health diagnostics.",
			},
		},
		{
			name: "lastSuccessfulRunAt",
			type: "date",
			admin: {
				description: "Last successful import completion time.",
			},
		},
		{
			name: "lastFullRunAt",
			type: "date",
			admin: {
				description: "Last import run that was not skipped as unchanged.",
			},
		},
		{
			name: "safetyThresholdPercent",
			type: "number",
			required: true,
			defaultValue: 30,
			min: 0,
			max: 100,
			admin: {
				description:
					"Suspicious-run guard: deactivation above this percent requires explicit owner/admin approval.",
			},
		},
		{
			name: "maxDeactivationsPerRun",
			type: "number",
			required: true,
			defaultValue: 50,
			min: 0,
			admin: {
				description:
					"Hard safety cap for automatic deactivation during one import run.",
			},
		},
		{
			name: "lastOfferCount",
			type: "number",
			min: 0,
		},
		{
			name: "lastEtag",
			type: "text",
		},
		{
			name: "lastModified",
			type: "text",
		},
		{
			name: "lastFeedHash",
			type: "text",
		},
		{
			name: "deactivationApproval",
			type: "group",
			admin: {
				description:
					"Audit-safe approval window for a suspicious import run. Only store run/user/time metadata.",
			},
			fields: [
				{
					name: "runId",
					type: "relationship",
					relationTo: "import-runs",
				},
				{
					name: "approvedBy",
					type: "relationship",
					relationTo: "users",
				},
				{
					name: "approvedAt",
					type: "date",
				},
				{
					name: "expiresAt",
					type: "date",
				},
				{
					name: "consumedAt",
					type: "date",
				},
			],
		},
	],
};
