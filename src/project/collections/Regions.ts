import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";
import { geoReadAccess } from "../geo/access.ts";
import { validateRootGeoWrite } from "../geo/collection-guards.ts";
import {
	createGeoIdentityFields,
	createGeoPublicationFields,
} from "./geo-fields.ts";

export const Regions: CollectionConfig = {
	slug: "regions",
	admin: {
		group: "Geo catalog",
		useAsTitle: "title",
		defaultColumns: ["slug", "title", "status", "updatedAt"],
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
				return validateRootGeoWrite({
					data,
					originalDoc,
					req,
					collection: "regions",
					label: "Region",
				});
			},
		],
	},
	fields: [
		...createGeoIdentityFields({ uniqueSlug: true }),
		{ name: "shortName", type: "text", required: true },
		{ name: "sortOrder", type: "number", required: true, defaultValue: 0 },
		...createGeoPublicationFields(),
	],
};
