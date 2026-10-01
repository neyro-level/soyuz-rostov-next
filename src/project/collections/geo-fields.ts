import type { Field } from "payload";

export function createGeoPublicationFields(): Field[] {
	return [
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
			index: true,
			admin: {
				description:
					"Set on first publication and retained as the immutable slug boundary.",
			},
		},
	];
}

export function createGeoIdentityFields(input?: {
	uniqueSlug?: boolean;
}): Field[] {
	return [
		{
			name: "slug",
			type: "text",
			required: true,
			index: true,
			unique: input?.uniqueSlug,
			admin: {
				description:
					"Canonical lowercase ASCII identity. Published values cannot be renamed before redirect lifecycle is enabled.",
			},
		},
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "morphology",
			type: "group",
			fields: [
				{
					name: "nominative",
					type: "text",
					required: true,
				},
				{
					name: "genitive",
					type: "text",
					required: true,
				},
				{
					name: "prepositional",
					type: "text",
					required: true,
				},
			],
		},
	];
}
