import type { CollectionConfig } from "payload";
import { publicRedirectReadAccess } from "../data-access/public/access-mode.ts";
import { sanitizeExplicitRedirectPath } from "../../core/seo/redirect-path.ts";
import { ownersOnly } from "../../core/access/roles.ts";
import { assertDirectRedirect } from "../../core/lifecycle/redirect-graph.ts";
import { appendLifecycleEvent } from "../../core/data-access/system/lifecycle-store.ts";
import { findRedirectGraphNeighbors } from "../../core/data-access/system/redirect-graph.ts";

export const Redirects: CollectionConfig = {
	slug: "redirects",
	admin: {
		useAsTitle: "from",
		defaultColumns: ["from", "to", "statusCode", "updatedAt"],
	},
	access: {
		create: ownersOnly,
		read: publicRedirectReadAccess,
		update: ownersOnly,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			async ({ data, originalDoc, req }) => {
				if (!data) return data;
				const to = sanitizeExplicitRedirectPath(
					typeof data.to === "string" ? data.to : originalDoc?.to,
				);
				if (!to) {
					throw new Error(
						"Redirect destination must be an explicit public path and must not target the homepage.",
					);
				}
				data.to = to;
				const from = sanitizeExplicitRedirectPath(
					typeof data.from === "string" ? data.from : originalDoc?.from,
				);
				if (!from)
					throw new Error("Redirect source must be an explicit public path.");
				data.from = from;
				const related = await findRedirectGraphNeighbors({
					payload: req.payload,
					req,
					from,
					to,
				});
				assertDirectRedirect(
					{ from, to },
					related
						.filter((row) => String(row.id) !== String(originalDoc?.id ?? ""))
						.map((row) => ({ from: row.from, to: row.to })),
				);
				return data;
			},
		],
		afterChange: [
			async ({ doc, previousDoc, operation, req }) => {
				if (!doc.entityType || !doc.entityId) return;
				if (
					operation === "update" &&
					previousDoc?.from === doc.from &&
					previousDoc?.to === doc.to
				)
					return;
				await appendLifecycleEvent(req.payload, {
					entityType: doc.entityType,
					entityId: doc.entityId,
					action: "canonical_move",
					fromPath: doc.from,
					toPath: doc.to,
					reason: doc.reason,
				});
			},
		],
	},
	fields: [
		{
			name: "from",
			type: "text",
			required: true,
			unique: true,
			index: true,
			admin: {
				description:
					"Old public path. Must be created explicitly by owner action or approved migration.",
			},
		},
		{
			name: "to",
			type: "text",
			required: true,
		},
		{
			name: "statusCode",
			type: "select",
			required: true,
			defaultValue: "301",
			options: [
				{ label: "301 Permanent", value: "301" },
				{ label: "302 Temporary", value: "302" },
			],
		},
		{
			name: "reason",
			type: "textarea",
		},
		{
			name: "createdBy",
			type: "relationship",
			relationTo: "users",
		},
		{
			name: "entityType",
			type: "select",
			options: ["property", "development", "developer"],
		},
		{ name: "entityId", type: "text", index: true },
	],
};
