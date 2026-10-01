import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { invalidatePublicCache } from "../../core/cache/invalidator.ts";
import { catalogSurfaceSlugs } from "../../core/profile/index.ts";
import { runtimeEnv } from "../env.ts";
import { geoReadAccess } from "../geo/access.ts";
import { validateDistrictWrite } from "../geo/collection-guards.ts";
import {
	createGeoIdentityFields,
	createGeoPublicationFields,
} from "./geo-fields.ts";

export const Districts: CollectionConfig = {
	slug: "districts",
	admin: {
		group: "Geo catalog",
		useAsTitle: "title",
		defaultColumns: ["slug", "title", "city", "status", "updatedAt"],
	},
	access: {
		create: adminsAndOwners,
		read: geoReadAccess,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			async ({ data, originalDoc, req }) => {
				if (!data) return data;
				return validateDistrictWrite({ data, originalDoc, req });
			},
		],
		afterChange: [
			async () => {
				await invalidatePublicCache({
					baseUrl: runtimeEnv.INTERNAL_REVALIDATE_BASE_URL,
					secret: runtimeEnv.REVALIDATE_SECRET,
					targets: [{ type: "tag", tag: "registry" }],
					reason: "district-registry-change",
				});
			},
		],
		afterDelete: [
			async () => {
				await invalidatePublicCache({
					baseUrl: runtimeEnv.INTERNAL_REVALIDATE_BASE_URL,
					secret: runtimeEnv.REVALIDATE_SECRET,
					targets: [{ type: "tag", tag: "registry" }],
					reason: "district-registry-delete",
				});
			},
		],
	},
	fields: [
		...createGeoIdentityFields(),
		{
			name: "districtType",
			type: "select",
			required: true,
			options: [
				{ label: "Административный район", value: "admin_district" },
				{ label: "Микрорайон", value: "microdistrict" },
			],
		},
		{
			name: "adjLocative",
			type: "text",
			admin: {
				description:
					"Required explicit adjective locative for admin districts.",
				condition: (_data, siblingData) =>
					siblingData?.districtType === "admin_district",
			},
		},
		{
			name: "adjGenitive",
			type: "text",
			admin: {
				description:
					"Required explicit adjective genitive for admin districts.",
				condition: (_data, siblingData) =>
					siblingData?.districtType === "admin_district",
			},
		},
		{
			name: "locative",
			type: "text",
			admin: {
				description: "Required explicit locative for microdistricts.",
				condition: (_data, siblingData) =>
					siblingData?.districtType === "microdistrict",
			},
		},
		{
			name: "city",
			type: "relationship",
			relationTo: "cities",
			required: true,
			index: true,
		},
		{
			name: "categories",
			type: "select",
			hasMany: true,
			required: true,
			defaultValue: [...catalogSurfaceSlugs],
			options: catalogSurfaceSlugs.map((value) => ({ label: value, value })),
			admin: {
				description:
					"Public category routes where this published district may resolve.",
			},
		},
		{
			name: "parent",
			type: "relationship",
			relationTo: "districts",
			index: true,
			admin: { description: "Optional parent district in the same city." },
		},
		{
			name: "synonyms",
			type: "array",
			maxRows: 20,
			fields: [{ name: "value", type: "text", required: true }],
		},
		{
			name: "preposition",
			type: "select",
			required: true,
			options: [
				{ label: "в", value: "v" },
				{ label: "во", value: "vo" },
				{ label: "на", value: "na" },
			],
		},
		{
			name: "morphologyApproved",
			type: "checkbox",
			required: true,
			defaultValue: false,
		},
		{ name: "sortOrder", type: "number", required: true, defaultValue: 0 },
		...createGeoPublicationFields(),
	],
};
