import type { CollectionConfig } from "payload";
import {
	ensureMediaDirectory,
	mediaFileExists,
	mediaOverwriteDisabled,
	uniqueMediaFilename,
} from "../storage/local-fs.ts";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";

const allowedMimeTypes = [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"application/pdf",
];

export const Media: CollectionConfig = {
	slug: "media",
	upload: {
		staticDir: ensureMediaDirectory(),
		mimeTypes: allowedMimeTypes,
	},
	admin: {
		useAsTitle: "alt",
		defaultColumns: ["alt", "mimeType", "updatedAt"],
	},
	access: {
		create: ownersOnly,
		read: adminsAndOwners,
		update: ownersOnly,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [
			({ data, originalDoc }) => {
				if (data?.filename && !originalDoc) {
					data.filename = uniqueMediaFilename(String(data.filename));
					if (mediaOverwriteDisabled && mediaFileExists(data.filename)) {
						throw new Error("Media overwrite is disabled.");
					}
				}
				return data;
			},
		],
	},
	fields: [
		{
			name: "alt",
			type: "text",
			required: true,
		},
		{ name: "ownership", type: "text", required: true, defaultValue: "manual" },
		{ name: "sourceUrl", type: "text" },
		{ name: "sourceHost", type: "text" },
		{ name: "sourceRights", type: "textarea" },
		{ name: "sourceSha256", type: "text", unique: true },
		{
			name: "sourceFeed",
			type: "relationship",
			relationTo: "feed-sources",
			index: true,
		},
		{ name: "mirroredAt", type: "date" },
	],
};
