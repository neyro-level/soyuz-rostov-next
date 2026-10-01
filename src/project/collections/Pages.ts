import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { isPlatformReservedRoot } from "../../core/routing/index.ts";
import { publicPageReadAccess } from "../data-access/public/access-mode.ts";
import { reservedGeoRootSlugs } from "../geo/collection-guards.ts";
import { queuePageIndexNowTransition } from "../seo/page-indexnow-transition.ts";

export const Pages: CollectionConfig = {
	slug: "pages",
	admin: {
		useAsTitle: "title",
		defaultColumns: ["slug", "status", "updatedAt"],
	},
	access: {
		create: adminsAndOwners,
		read: publicPageReadAccess,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			({ data }) => {
				if (!data || typeof data.slug !== "string") return data;
				const slug = data.slug.trim().replace(/^\/+/, "");
				const root = slug.split("/", 1)[0] ?? "";
				const reserved =
					reservedGeoRootSlugs.has(root) || isPlatformReservedRoot(root);
				if (reserved) {
					throw new Error(
						`CMS page slug cannot occupy reserved namespace /${root}.`,
					);
				}
				data.slug = slug;
				return data;
			},
		],
		afterChange: [
			async ({ doc, previousDoc, req }) => {
				await queuePageIndexNowTransition({ doc, previousDoc, req });
				return doc;
			},
		],
	},
	fields: [
		{
			name: "slug",
			type: "text",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "draft",
			index: true,
			options: [
				{ label: "Draft", value: "draft" },
				{ label: "Published", value: "published" },
				{ label: "Archived", value: "archived" },
			],
		},
		{
			name: "publishedAt",
			type: "date",
		},
		{
			name: "seo",
			type: "group",
			fields: [
				{
					name: "title",
					type: "text",
				},
				{
					name: "description",
					type: "textarea",
				},
				{
					name: "noindex",
					type: "checkbox",
					defaultValue: false,
				},
			],
		},
	],
};
