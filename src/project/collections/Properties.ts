import type { CollectionConfig, FieldAccess, PayloadRequest } from "payload";
import {
	adminsAndOwners,
	hasRole,
	ownersOnly,
} from "../../core/access/roles.ts";
import { applyDerivedFieldsOnWrite } from "../../core/ingest/derived-fields.ts";
import {
	applyPublishedSlugPolicy,
	collectChangedImportOwnedFields,
	mergeManualOverrides,
	returnFieldToFeed,
	shouldRecordManualOwnership,
} from "../../core/ingest/manual-ownership.ts";
import { normalizePropertyNumericWrite } from "../../core/ingest/numeric-invariants.ts";
import { publicPropertyReadAccess } from "../data-access/public/access-mode.ts";
import { allocatePropertyPublicUrlId } from "../../core/data-access/system/property-public-url-id.ts";
import { assertCategoryFieldOwnership } from "../../core/property/taxonomy.ts";
import { recordEntityLifecycleTransition } from "../lifecycle/record-transition.ts";
import { invalidatePublicEntityChange } from "../cache/entity-change-invalidation.ts";

const fieldAdminsAndOwners: FieldAccess = ({ req }) =>
	hasRole(req.user, ["owner", "admin"]);
const fieldOwnersOnly: FieldAccess = ({ req }) => hasRole(req.user, ["owner"]);

const privateFieldAccess = {
	read: fieldAdminsAndOwners,
	create: fieldAdminsAndOwners,
	update: fieldAdminsAndOwners,
};

export const Properties: CollectionConfig = {
	slug: "properties",
	versions: false,
	admin: {
		useAsTitle: "title",
		defaultColumns: ["slug", "origin", "market", "status", "updatedAt"],
	},
	access: {
		create: adminsAndOwners,
		read: publicPropertyReadAccess,
		update: adminsAndOwners,
		delete: ownersOnly,
	},
	endpoints: [
		{
			path: "/:id/return-to-feed",
			method: "post",
			handler: async (req: PayloadRequest) => {
				if (!hasRole(req.user, ["owner", "admin"])) {
					return Response.json({ error: "forbidden" }, { status: 403 });
				}
				const id = String(req.routeParams?.id ?? "");
				const body = (await req.json?.()) as { field?: string } | null;
				if (!id || !body?.field) {
					return Response.json({ error: "invalid_payload" }, { status: 400 });
				}
				const doc = await req.payload.findByID({
					collection: "properties",
					id,
					depth: 0,
					req,
					overrideAccess: false,
				});
				const next = returnFieldToFeed(
					doc.manualOverrides as
						| { field: string; setAt: string; setBy?: string | number | null }[]
						| undefined,
					body.field,
				);
				await req.payload.update({
					collection: "properties",
					id,
					data: {
						manualOverrides: next.map((marker) => ({
							field: marker.field,
							setAt: marker.setAt,
							setBy:
								typeof marker.setBy === "number"
									? marker.setBy
									: marker.setBy == null || marker.setBy === ""
										? null
										: Number(marker.setBy),
						})),
					},
					req,
					overrideAccess: false,
					context: {
						source: "system",
					},
				});
				return Response.json({ field: body.field, returned: true });
			},
		},
	],
	hooks: {
		beforeValidate: [
			({ data, originalDoc }) => {
				if (!data) return data;
				assertCategoryFieldOwnership({ ...originalDoc, ...data });
				return data;
			},
		],
		beforeChange: [
			({ data, originalDoc, req }) => {
				if (originalDoc?.publicUrlId != null && data.publicUrlId !== undefined && data.publicUrlId !== originalDoc.publicUrlId) {
					throw new Error("publicUrlId is immutable.");
				}
				normalizePropertyNumericWrite(data);
				const priceMinor =
					data.priceMinor === undefined
						? originalDoc?.priceMinor
						: data.priceMinor;
				const totalArea =
					data.totalArea === undefined
						? originalDoc?.totalArea
						: data.totalArea;
				const contextSource =
					(req?.context as { source?: string } | undefined)?.source ??
					(req?.context as { systemGatewayOperation?: string } | undefined)
						?.systemGatewayOperation;
				const ingestOwned =
					contextSource === "system-job" ||
					contextSource === "import" ||
					contextSource === "system";
				const derived = applyDerivedFieldsOnWrite({
					origin: (data.origin ?? originalDoc?.origin) as string | undefined,
					ingestOwned,
					priceMinor,
					totalArea,
				});
				if (derived) {
					data.pricePerMeterMinor = derived.pricePerMeterMinor;
				}
				const actorSource =
					contextSource === "system-job" || contextSource === "import"
						? contextSource === "system-job"
							? "system"
							: "import"
						: contextSource;
				if (
					shouldRecordManualOwnership({
						userId: req?.user?.id,
						source: actorSource,
					})
				) {
					const changed = collectChangedImportOwnedFields(
						data as Record<string, unknown>,
						originalDoc as Record<string, unknown> | undefined,
					);
					if (changed.length > 0) {
						data.manualOverrides = mergeManualOverrides(
							originalDoc?.manualOverrides as
								| {
										field: string;
										setAt: string;
										setBy?: string | number | null;
								  }[]
								| undefined,
							changed,
							{
								nowIso: new Date().toISOString(),
								userId: req?.user?.id,
							},
						);
					}
				}

				const lockedSlug = applyPublishedSlugPolicy({
					nextSlug: data.slug,
					originalSlug: originalDoc?.slug,
					publishedAt: originalDoc?.publishedAt ?? data.publishedAt,
				});
				if (lockedSlug) data.slug = lockedSlug;
				return data;
			},
		],
		afterChange: [
			async ({ doc, previousDoc, req }) => {
				await recordEntityLifecycleTransition({
					entityType: "property",
					doc,
					previousDoc,
					req,
				});
				await invalidatePublicEntityChange({
					entityType: "property",
					doc,
					previousDoc,
					req,
				});
			},
		],
	},
	fields: [
		{
			name: "feedSource",
			type: "relationship",
			relationTo: "feed-sources",
			index: true,
			admin: {
				description: "Required for origin=feed; empty for manual properties.",
			},
		},
		{
			name: "externalId",
			type: "text",
			index: true,
			admin: {
				description:
					"Required for origin=feed; paired with feedSource by SQL guard.",
			},
		},
		{
			name: "origin",
			type: "select",
			required: true,
			defaultValue: "manual",
			index: true,
			options: [
				{ label: "Feed", value: "feed" },
				{ label: "Manual", value: "manual" },
			],
		},
		{
			name: "importHash",
			type: "text",
		},
		{
			name: "firstSeenAt",
			type: "date",
		},
		{
			name: "lastSeenAt",
			type: "date",
		},
		{
			name: "lastImportRun",
			type: "relationship",
			relationTo: "import-runs",
		},
		{
			name: "externalComplexId",
			type: "text",
			index: true,
		},
		{
			name: "development",
			type: "relationship",
			relationTo: "developments",
			index: true,
			admin: { description: "Optional canonical development relation." },
		},
		{
			name: "externalComplexName",
			type: "text",
		},
		{
			name: "externalBuildingId",
			type: "text",
			index: true,
		},
		{
			name: "externalLayoutId",
			type: "text",
			index: true,
		},
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "active",
			index: true,
			options: [
				{ label: "Active", value: "active" },
				{ label: "Archived", value: "archived" },
			],
		},
		{
			name: "deactivatedAt",
			type: "date",
		},
		{
			name: "deactivatedByRun",
			type: "relationship",
			relationTo: "import-runs",
		},
		{
			name: "needsReview",
			type: "checkbox",
			defaultValue: false,
			index: true,
		},
		{
			name: "publishedAt",
			type: "date",
		},
		{
			name: "contentPurgedAt",
			type: "date",
			index: true,
			admin: {
				description: "Set after lifecycle retention purges object content.",
			},
		},
		{
			name: "slug",
			type: "text",
			required: true,
			unique: true,
			index: true,
			access: {
				update: fieldOwnersOnly,
			},
			admin: {
				description:
					"Public immutable page identity. Feed imports must not rotate it after first publish.",
			},
		},
		{
			name: "publicUrlId",
			type: "number",
			unique: true,
			index: true,
			defaultValue: ({ req }) => allocatePropertyPublicUrlId(req),
			access: { update: () => false },
			admin: {
				readOnly: true,
				description: "Stable public identity allocated atomically; never reused or changed.",
			},
		},
		{
			name: "market",
			type: "select",
			required: true,
			defaultValue: "secondary",
			index: true,
			options: [
				{ label: "Secondary", value: "secondary" },
				{ label: "Newbuild", value: "newbuild" },
			],
		},
		{
			name: "category",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "Apartment", value: "apartment" },
				{ label: "House", value: "house" },
				{ label: "Land", value: "land" },
				{ label: "Commercial", value: "commercial" },
				{ label: "Room", value: "room" },
				{ label: "Garage", value: "garage" },
			],
		},
		{
			name: "houseType",
			type: "text",
		},
		{
			name: "plotAreaSotka",
			type: "number",
			min: 0,
			admin: { step: 0.01, description: "Canonical land area in sotka (100 m²)." },
		},
		{ name: "landCategory", type: "text" },
		{ name: "permittedUse", type: "text" },
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
		{ name: "commercialType", type: "text" },
		{
			name: "documentCheckSummary",
			type: "textarea",
			access: privateFieldAccess,
		},
		{
			name: "dealType",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "Sale", value: "sale" },
				{ label: "Rent", value: "rent" },
			],
		},
		{
			name: "priceMinor",
			type: "number",
			min: 0,
			index: true,
			admin: { step: 1 },
		},
		{
			name: "currency",
			type: "select",
			defaultValue: "RUB",
			options: [{ label: "RUB", value: "RUB" }],
		},
		{
			name: "pricePerMeterMinor",
			type: "number",
			min: 0,
			admin: { step: 1 },
		},
		{
			name: "rooms",
			type: "number",
			min: 0,
			index: true,
		},
		{
			name: "totalArea",
			type: "number",
			min: 0,
			admin: { step: 0.01 },
		},
		{
			name: "livingArea",
			type: "number",
			min: 0,
			admin: { step: 0.01 },
		},
		{
			name: "kitchenArea",
			type: "number",
			min: 0,
			admin: { step: 0.01 },
		},
		{
			name: "floor",
			type: "number",
		},
		{
			name: "floors",
			type: "number",
		},
		{
			name: "region",
			type: "text",
		},
		{
			name: "regionRef",
			type: "relationship",
			relationTo: "regions",
			index: true,
			admin: {
				description:
					"Canonical geo reference. Legacy region text remains the raw source during expand.",
			},
		},
		{
			name: "locality",
			type: "text",
		},
		{
			name: "cityRef",
			type: "relationship",
			relationTo: "cities",
			index: true,
			admin: {
				description:
					"Canonical city reference. Legacy locality text remains the raw source during expand.",
			},
		},
		{
			name: "district",
			type: "text",
			index: true,
		},
		{
			name: "districtRef",
			type: "relationship",
			relationTo: "districts",
			index: true,
			admin: {
				description:
					"Canonical city-scoped district reference. Legacy district text remains the raw source during expand.",
			},
		},
		{
			name: "street",
			type: "text",
		},
		{
			name: "house",
			type: "text",
		},
		{
			name: "publicAddress",
			type: "text",
		},
		{
			name: "lat",
			type: "number",
		},
		{
			name: "lng",
			type: "number",
		},
		{
			name: "title",
			type: "text",
			required: true,
		},
		{
			name: "description",
			type: "textarea",
		},
		{
			name: "images",
			type: "array",
			fields: [
				{
					name: "kind",
					type: "select",
					required: true,
					defaultValue: "external",
					options: [
						{ label: "External feed URL", value: "external" },
						{ label: "Managed media", value: "managed" },
					],
				},
				{
					name: "url",
					type: "text",
				},
				{
					name: "media",
					type: "relationship",
					relationTo: "media",
				},
				{
					name: "alt",
					type: "text",
				},
				{
					name: "order",
					type: "number",
					min: 0,
				},
			],
		},
		{
			name: "manualOverrides",
			type: "array",
			fields: [
				{
					name: "field",
					type: "text",
					required: true,
				},
				{
					name: "setAt",
					type: "date",
					required: true,
				},
				{
					name: "setBy",
					type: "relationship",
					relationTo: "users",
				},
			],
			admin: {
				description:
					"Import-managed fields explicitly owned by manual edits. Slug is not a normal manual override.",
			},
		},
		{
			name: "unitNumber",
			type: "text",
			access: privateFieldAccess,
		},
		{
			name: "cadastralNumber",
			type: "text",
			access: privateFieldAccess,
		},
		{
			name: "internalComment",
			type: "textarea",
			access: privateFieldAccess,
		},
		{
			name: "ownerContact",
			type: "textarea",
			access: privateFieldAccess,
		},
	],
};
