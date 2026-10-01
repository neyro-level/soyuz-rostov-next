import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { geoReadAccess } from "../geo/access.ts";
import {
	validateCityHierarchy,
	validateRootGeoWrite,
} from "../geo/collection-guards.ts";
import {
	createGeoIdentityFields,
	createGeoPublicationFields,
} from "./geo-fields.ts";

export const Cities: CollectionConfig = {
	slug: "cities",
	admin: {
		group: "Geo catalog",
		useAsTitle: "title",
		defaultColumns: ["slug", "title", "region", "agglomerationOf", "status"],
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
				await validateRootGeoWrite({
					data,
					originalDoc,
					req,
					collection: "cities",
					label: "City",
				});
				await validateCityHierarchy({ data, originalDoc, req });
				return data;
			},
		],
	},
	fields: [
		...createGeoIdentityFields({ uniqueSlug: true }),
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
			name: "cityType",
			type: "select",
			required: true,
			options: [
				{ label: "Город", value: "city" },
				{ label: "Посёлок городского типа", value: "urban_settlement" },
				{ label: "Посёлок", value: "settlement" },
				{ label: "Село", value: "village" },
			],
		},
		{
			name: "region",
			type: "relationship",
			relationTo: "regions",
			required: true,
			index: true,
		},
		{
			name: "agglomerationOf",
			type: "relationship",
			relationTo: "cities",
			index: true,
			admin: {
				description:
					"Optional primary city for nearby aggregation. Must remain in the same region and acyclic.",
			},
		},
		{
			name: "coordinates",
			type: "group",
			fields: [
				{ name: "latitude", type: "number", min: -90, max: 90 },
				{ name: "longitude", type: "number", min: -180, max: 180 },
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
