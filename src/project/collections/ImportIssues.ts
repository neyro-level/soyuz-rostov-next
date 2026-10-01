import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";

export const ImportIssues: CollectionConfig = {
	slug: "import-issues",
	admin: {
		group: "Operations",
		useAsTitle: "code",
		defaultColumns: ["severity", "code", "sourceSheet", "sourceRow", "importRun", "createdAt"],
		description:
			"Owner operations: import warnings/errors with redacted messages and source links.",
	},
	access: {
		create: () => false,
		read: adminsAndOwners,
		update: () => false,
		delete: ownersOnly,
	},
	fields: [
		{
			name: "importRun",
			type: "relationship",
			relationTo: "import-runs",
			required: true,
			index: true,
		},
		{
			name: "feedSource",
			type: "relationship",
			relationTo: "feed-sources",
			index: true,
		},
		{
			name: "property",
			type: "relationship",
			relationTo: "properties",
			index: true,
		},
		{ name: "developer", type: "relationship", relationTo: "developers", index: true },
		{ name: "development", type: "relationship", relationTo: "developments", index: true },
		{ name: "sourceSheet", type: "text" },
		{ name: "sourceRow", type: "number", min: 1 },
		{
			name: "externalId",
			type: "text",
		},
		{
			name: "severity",
			type: "select",
			required: true,
			defaultValue: "warning",
			index: true,
			options: [
				{ label: "Info", value: "info" },
				{ label: "Warning", value: "warning" },
				{ label: "Error", value: "error" },
			],
		},
		{
			name: "code",
			type: "text",
			required: true,
			index: true,
		},
		{
			name: "messageRedacted",
			type: "textarea",
			required: true,
			admin: {
				description:
					"Safe issue text only. No raw XML fragment, PII, credentials, tokens or private feed URL.",
			},
		},
		{
			name: "field",
			type: "text",
		},
	],
};
