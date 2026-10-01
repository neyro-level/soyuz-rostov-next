import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { publicPreparedEntityLifecycleReadAccess } from "../data-access/public/access-mode.ts";
import { validateDevelopmentWrite } from "../developments/collection-guards.ts";
import { recordEntityLifecycleTransition } from "../lifecycle/record-transition.ts";
import { invalidatePublicEntityChange } from "../cache/entity-change-invalidation.ts";

const sourceFields = [
	{ name: "source", type: "text" as const, required: true },
	{ name: "checkedAt", type: "date" as const, required: true },
];

export const Developments: CollectionConfig = {
	slug: "developments",
	admin: {
		group: "Developments",
		useAsTitle: "name",
		defaultColumns: ["name", "kind", "city", "developer", "status"],
	},
	access: {
		create: adminsAndOwners,
		read: publicPreparedEntityLifecycleReadAccess,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			async ({ data, originalDoc, req }) =>
				data ? validateDevelopmentWrite({ data, originalDoc, req }) : data,
		],
		afterChange: [
			async ({ doc, previousDoc, req }) => {
				await recordEntityLifecycleTransition({
					entityType: "development",
					doc,
					previousDoc,
					req,
				});
				await invalidatePublicEntityChange({
					entityType: "development",
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
			name: "kind",
			type: "select",
			required: true,
			index: true,
			options: ["residential_complex", "cottage_village"],
		},
		{
			name: "region",
			type: "relationship",
			relationTo: "regions",
			required: true,
			index: true,
		},
		{
			name: "city",
			type: "relationship",
			relationTo: "cities",
			required: true,
			index: true,
		},
		{
			name: "district",
			type: "relationship",
			relationTo: "districts",
			index: true,
		},
		{ name: "districtRaw", type: "text" },
		{
			name: "developer",
			type: "relationship",
			relationTo: "developers",
			required: true,
			index: true,
		},
		{ name: "address", type: "text" },
		{
			name: "coordinates",
			type: "group",
			fields: [
				{ name: "latitude", type: "number", min: -90, max: 90 },
				{ name: "longitude", type: "number", min: -180, max: 180 },
			],
		},
		{ name: "class", type: "text" },
		{ name: "completion", type: "text" },
		{ name: "deadline", type: "date" },
		{
			name: "salesStatus",
			type: "select",
			required: true,
			options: ["on_sale", "sales_finished", "completed"],
		},
		{
			name: "salesAvailability",
			type: "select",
			required: true,
			options: ["in_inventory", "confirmed", "none"],
		},
		{
			name: "completenessScore",
			type: "number",
			required: true,
			defaultValue: 0,
			min: 0,
			max: 100,
			admin: { readOnly: true },
		},
		{
			name: "dataTier",
			type: "select",
			required: true,
			defaultValue: "C",
			options: ["A", "B", "C"],
		},
		{
			name: "lastImportRun",
			type: "relationship",
			relationTo: "import-runs",
			index: true,
		},
		...sourceFields,
		{
			name: "priceByRooms",
			type: "array",
			fields: [
				{ name: "roomsLabel", type: "text", required: true },
				{ name: "priceFromMinor", type: "number", required: true, min: 0 },
				{ name: "priceToMinor", type: "number", min: 0 },
				{ name: "lotsAvailable", type: "number", min: 0 },
				{ name: "priceCheckedAt", type: "date", required: true },
				{ name: "source", type: "text", required: true },
			],
		},
		{ name: "lotsCount", type: "number", min: 0 },
		{
			name: "mediaItems",
			type: "array",
			fields: [
				{
					name: "kind",
					type: "select",
					required: true,
					defaultValue: "managed",
					options: ["managed", "external"],
				},
				{
					name: "media",
					type: "relationship",
					relationTo: "media",
				},
				{ name: "externalUrl", type: "text" },
				{
					name: "mediaType",
					type: "select",
					required: true,
					options: [
						"hero",
						"gallery",
						"layout",
						"construction_progress",
						"document",
						"video",
					],
				},
				{ name: "capturedAt", type: "date" },
				{ name: "rights", type: "text", required: true },
				...sourceFields,
			],
		},
		{
			name: "layouts",
			type: "array",
			fields: [
				{ name: "externalId", type: "text" },
				{ name: "rooms", type: "number", min: 0 },
				{ name: "area", type: "number", min: 0 },
				{ name: "title", type: "text", required: true },
			],
		},
		{
			name: "progress",
			type: "array",
			fields: [
				{ name: "date", type: "date", required: true },
				{ name: "percent", type: "number", min: 0, max: 100 },
				{ name: "note", type: "textarea" },
				...sourceFields,
			],
		},
		{
			name: "communications",
			type: "group",
			fields: [
				{ name: "gas", type: "checkbox" },
				{ name: "electricity", type: "checkbox" },
				{ name: "water", type: "checkbox" },
				{ name: "sewer", type: "checkbox" },
			],
		},
		{ name: "totalArea", type: "number", min: 0 },
		{ name: "plotsCount", type: "number", min: 0 },
		{ name: "villageClass", type: "text" },
		{
			name: "descriptions",
			type: "array",
			fields: [
				{
					name: "kind",
					type: "select",
					required: true,
					options: ["short", "full", "location", "infrastructure"],
				},
				{ name: "text", type: "textarea", required: true },
				...sourceFields,
			],
		},
		{
			name: "faq",
			type: "array",
			fields: [
				{ name: "question", type: "text", required: true },
				{ name: "answer", type: "textarea", required: true },
				...sourceFields,
			],
		},
		{
			name: "externalIdentities",
			type: "array",
			fields: [
				{ name: "source", type: "text", required: true },
				{ name: "externalId", type: "text", required: true },
			],
		},
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
