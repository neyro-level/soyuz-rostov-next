import type { CollectionConfig } from "payload";
import { adminsAndOwners, ownersOnly } from "../../core/access/roles.ts";

export function validateImportRunSourceIdentity(
	data: Record<string, unknown>,
	originalDoc?: Record<string, unknown>,
): Record<string, unknown> {
	const sourceKind = data.sourceKind ?? originalDoc?.sourceKind ?? "yrl-feed";
	const feedSource = data.feedSource ?? originalDoc?.feedSource;
	const excelSourceKey = data.excelSourceKey ?? originalDoc?.excelSourceKey;
	if (sourceKind === "yrl-feed" && (feedSource == null || excelSourceKey != null)) {
		throw new Error("YRL import run requires feedSource and forbids excelSourceKey.");
	}
	if (sourceKind === "excel-developments" && (feedSource != null || typeof excelSourceKey !== "string" || !excelSourceKey)) {
		throw new Error("Excel development import run requires excelSourceKey and forbids feedSource.");
	}
	data.sourceKind = sourceKind;
	return data;
}

export const ImportRuns: CollectionConfig = {
	slug: "import-runs",
	admin: {
		group: "Operations",
		useAsTitle: "id",
		defaultColumns: [
			"sourceKind",
			"feedSource",
			"excelSourceKey",
			"status",
			"queuedAt",
			"heartbeatAt",
			"warningCount",
			"errorCount",
		],
		description:
			"Owner operations: import history, suspicious/interrupted status, heartbeat, safe counters and redacted diagnostics.",
	},
	access: {
		create: () => false,
		read: adminsAndOwners,
		update: () => false,
		delete: ownersOnly,
	},
	hooks: {
		beforeValidate: [({ data, originalDoc }) => data ? validateImportRunSourceIdentity(data, originalDoc) : data],
	},
	fields: [
		{
			name: "sourceKind",
			type: "select",
			defaultValue: "yrl-feed",
			index: true,
			options: ["yrl-feed", "excel-developments"],
		},
		{
			name: "feedSource",
			type: "relationship",
			relationTo: "feed-sources",
			index: true,
		},
		{
			name: "excelSourceKey",
			type: "text",
			index: true,
			admin: { description: "Stable non-secret identity of an Excel source." },
		},
		{ name: "sourceFileName", type: "text" },
		{ name: "evidence", type: "json" },
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "queued",
			index: true,
			options: [
				{ label: "Queued", value: "queued" },
				{ label: "Running", value: "running" },
				{ label: "Success", value: "success" },
				{ label: "Unchanged", value: "unchanged" },
				{ label: "Suspicious", value: "suspicious" },
				{ label: "Interrupted", value: "interrupted" },
				{ label: "Failed", value: "failed" },
			],
		},
		{
			name: "queuedAt",
			type: "date",
			required: true,
			index: true,
		},
		{
			name: "startedAt",
			type: "date",
		},
		{
			name: "finishedAt",
			type: "date",
		},
		{
			name: "heartbeatAt",
			type: "date",
			index: true,
		},
		{
			name: "jobId",
			type: "text",
		},
		{
			name: "offeredCount",
			type: "number",
			min: 0,
		},
		{
			name: "createdCount",
			type: "number",
			min: 0,
		},
		{
			name: "updatedCount",
			type: "number",
			min: 0,
		},
		{
			name: "archivedCount",
			type: "number",
			min: 0,
		},
		{
			name: "skippedCount",
			type: "number",
			min: 0,
		},
		{
			name: "warningCount",
			type: "number",
			min: 0,
		},
		{
			name: "errorCount",
			type: "number",
			min: 0,
		},
		{
			name: "feedHash",
			type: "text",
		},
		{
			name: "lastErrorRedacted",
			type: "textarea",
			admin: {
				description:
					"Redacted operational diagnostic only. Do not store feed payload, raw response, PII, credentials or tokens.",
			},
		},
	],
};
