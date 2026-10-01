import type { CollectionConfig } from "payload";
import { hasRole } from "../../core/access/roles.ts";
import { queueLifecycleIndexNowEvent } from "../lifecycle/indexnow-transition.ts";

function isLifecycleWriter(context: unknown): boolean {
	return (
		(context as { systemGatewayOperation?: string } | undefined)
			?.systemGatewayOperation === "record-lifecycle-event"
	);
}

export const LifecycleEvents: CollectionConfig = {
	slug: "lifecycle-events",
	admin: {
		group: "Operations",
		useAsTitle: "entityId",
		defaultColumns: ["entityType", "entityId", "action", "occurredAt"],
	},
	access: {
		create: ({ req }) => isLifecycleWriter(req.context),
		read: ({ req }) => hasRole(req.user, ["owner", "admin"]),
		update: () => false,
		delete: () => false,
	},
	hooks: {
		afterChange: [
			async ({ doc, req }) => {
				await queueLifecycleIndexNowEvent({ event: doc, req });
				return doc;
			},
		],
	},
	fields: [
		{
			name: "entityType",
			type: "select",
			required: true,
			index: true,
			options: ["property", "development", "developer"],
		},
		{ name: "entityId", type: "text", required: true, index: true },
		{
			name: "action",
			type: "select",
			required: true,
			index: true,
			options: ["published", "archived", "purged", "canonical_move"],
		},
		{ name: "canonicalPath", type: "text" },
		{ name: "fromPath", type: "text" },
		{ name: "toPath", type: "text" },
		{ name: "reason", type: "textarea" },
		{ name: "occurredAt", type: "date", required: true, index: true },
	],
};
