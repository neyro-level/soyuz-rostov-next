import type { GlobalConfig } from "payload";
import { adminsAndOwners, hasRole } from "../../core/access/roles.ts";
import { isPublicGatewayRead } from "../data-access/public/access-mode.ts";

export const SiteSettings: GlobalConfig = {
	slug: "site-settings",
	admin: {
		group: "Site",
		description:
			"Canonical brand, contacts, requisites and map coordinates for public surfaces.",
	},
	access: {
		read: ({ req }) =>
			isPublicGatewayRead(req) || hasRole(req.user, ["owner", "admin"]),
		update: adminsAndOwners,
	},
	fields: [
		{ name: "brandName", type: "text", required: true },
		{ name: "legalName", type: "text" },
		{ name: "logo", type: "upload", relationTo: "media" },
		{ name: "phone", type: "text", required: true },
		{ name: "email", type: "email" },
		{ name: "address", type: "text" },
		{ name: "workingHours", type: "textarea" },
		{ name: "telegram", type: "text" },
		{ name: "whatsapp", type: "text" },
		{
			name: "socialLinks",
			type: "array",
			maxRows: 12,
			fields: [
				{ name: "label", type: "text", required: true },
				{ name: "url", type: "text", required: true },
			],
		},
		{
			name: "requisites",
			type: "group",
			fields: [
				{ name: "inn", type: "text" },
				{ name: "kpp", type: "text" },
				{ name: "ogrn", type: "text" },
				{ name: "legalAddress", type: "text" },
			],
		},
		{
			name: "coordinates",
			type: "group",
			fields: [
				{ name: "latitude", type: "number", min: -90, max: 90 },
				{ name: "longitude", type: "number", min: -180, max: 180 },
			],
		},
	],
};
