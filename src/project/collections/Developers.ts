import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { validateDeveloperWrite } from "../developments/collection-guards.ts";
import { publicPreparedEntityLifecycleReadAccess } from "../data-access/public/access-mode.ts";
import { recordEntityLifecycleTransition } from "../lifecycle/record-transition.ts";
import { invalidatePublicEntityChange } from "../cache/entity-change-invalidation.ts";

export const Developers: CollectionConfig = {
	slug: "developers",
	admin: {
		group: "Developments",
		useAsTitle: "name",
		defaultColumns: ["name", "slug", "status", "checkedAt", "updatedAt"],
	},
	access: {
		create: adminsAndOwners,
		read: publicPreparedEntityLifecycleReadAccess,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			({ data, originalDoc }) =>
				data ? validateDeveloperWrite(data, originalDoc) : data,
		],
		afterChange: [
			async ({ doc, previousDoc, req }) => {
				await recordEntityLifecycleTransition({
					entityType: "developer",
					doc,
					previousDoc,
					req,
				});
				await invalidatePublicEntityChange({
					entityType: "developer",
					doc,
					previousDoc,
					req,
				});
			},
		],
	},
	fields: [
		{ name: "name", type: "text", required: true },
		{ name: "slug", type: "text", required: true, unique: true, index: true },
		{
			name: "aliases",
			type: "array",
			fields: [{ name: "value", type: "text", required: true }],
		},
		{ name: "legalName", type: "text" },
		{ name: "logo", type: "relationship", relationTo: "media" },
		{ name: "siteUrl", type: "text" },
		{ name: "description", type: "textarea" },
		{ name: "lastImportRun", type: "relationship", relationTo: "import-runs", index: true },
		{ name: "source", type: "text", required: true },
		{ name: "checkedAt", type: "date", required: true, index: true },
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "draft",
			index: true,
			options: ["draft", "published", "archived"],
		},
		{ name: "publishedAt", type: "date", index: true },
		{ name: "contentPurgedAt", type: "date", index: true },
	],
};
