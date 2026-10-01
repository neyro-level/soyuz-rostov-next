import type { CollectionConfig, FieldAccess } from "payload";
import {
	hasRole,
	ownersOnly,
	systemGatewayOnly,
} from "../../core/access/roles.ts";

const ownerPiiFieldAccess: FieldAccess = ({ req }) =>
	hasRole(req.user, ["owner"]);
const systemPiiCreateAccess: FieldAccess = () => false;

const piiFieldAccess: {
	read: FieldAccess;
	create: FieldAccess;
	update: FieldAccess;
} = {
	read: ownerPiiFieldAccess,
	create: systemPiiCreateAccess,
	update: ownerPiiFieldAccess,
};

export const Leads: CollectionConfig = {
	slug: "leads",
	// Public intake is POST /api/public/leads via Public Gateway + System Gateway.
	// Generic collection create stays closed; only a named System Gateway may persist.
	versions: false,
	admin: {
		group: "Operations",
		useAsTitle: "name",
		defaultColumns: ["name", "phoneE164", "status", "formKind", "createdAt"],
		description:
			"Owner operations: agency workflow status and PII retention. External delivery state lives in Lead Deliveries.",
	},
	access: {
		create: systemGatewayOnly,
		read: ownersOnly,
		update: ownersOnly,
		delete: ownersOnly,
	},
	fields: [
		{
			name: "name",
			type: "text",
			required: true,
			access: piiFieldAccess,
		},
		{
			name: "phoneRaw",
			type: "text",
			access: piiFieldAccess,
			admin: {
				description:
					"Optional operator/audit value. Canonical integration and dedup identity is phoneE164.",
			},
		},
		{
			name: "phoneE164",
			type: "text",
			required: true,
			index: true,
			access: piiFieldAccess,
			admin: {
				description:
					"Strictly normalized E.164 phone. Invalid phone must not create a lead.",
			},
		},
		{
			name: "email",
			type: "email",
			access: piiFieldAccess,
		},
		{
			name: "message",
			type: "textarea",
			access: piiFieldAccess,
		},
		{
			name: "formKind",
			type: "select",
			required: true,
			index: true,
			options: [
				{ label: "Property request", value: "property_request" },
				{ label: "Callback", value: "callback" },
				{ label: "Consultation", value: "consultation" },
				{ label: "Generic", value: "generic" },
				{ label: "Legal", value: "legal" },
				{ label: "Development price", value: "development_price" },
				{ label: "Quiz", value: "quiz" },
			],
		},
		{
			name: "sourcePage",
			type: "text",
			required: true,
			index: true,
		},
		{
			name: "referrer",
			type: "text",
		},
		{
			name: "property",
			type: "relationship",
			relationTo: "properties",
			index: true,
		},
		{
			name: "context",
			type: "group",
			admin: {
				description:
					"Normalized attribution only. It never grants access or overrides canonical entity data.",
			},
			fields: [
				{ name: "geo", type: "text", index: true },
				{
					name: "surface",
					type: "select",
					options: [
						{ label: "Apartments", value: "apartments" },
						{ label: "New buildings", value: "new-buildings" },
						{ label: "Houses", value: "houses" },
						{ label: "Plots", value: "plots" },
						{ label: "Commercial", value: "commercial" },
						{ label: "Garages", value: "garages" },
					],
				},
				{ name: "district", type: "text", index: true },
				{ name: "propertyUrlId", type: "text", index: true },
				{ name: "development", type: "text", index: true },
				{ name: "developer", type: "text", index: true },
			],
		},
		{
			name: "utm",
			type: "group",
			fields: [
				{ name: "source", type: "text" },
				{ name: "medium", type: "text" },
				{ name: "campaign", type: "text" },
				{ name: "content", type: "text" },
				{ name: "term", type: "text" },
			],
		},
		{
			name: "consent",
			type: "group",
			admin: {
				description:
					"Immutable intake evidence for personal data processing consent.",
			},
			fields: [
				{
					name: "accepted",
					type: "checkbox",
					required: true,
					defaultValue: false,
				},
				{
					name: "version",
					type: "text",
					required: true,
					index: true,
				},
				{
					name: "consentedAt",
					type: "date",
					required: true,
				},
			],
		},
		{
			name: "status",
			type: "select",
			required: true,
			defaultValue: "new",
			index: true,
			admin: {
				description:
					"Agency workflow status only. External delivery state lives in lead-deliveries.",
			},
			options: [
				{ label: "New", value: "new" },
				{ label: "In progress", value: "in_progress" },
				{ label: "Processed", value: "processed" },
				{ label: "Rejected", value: "rejected" },
			],
		},
		{
			name: "idempotencyKey",
			type: "text",
			required: true,
			unique: true,
			index: true,
		},
		{
			name: "retentionMode",
			type: "select",
			required: true,
			defaultValue: "delete",
			options: [
				{ label: "Delete", value: "delete" },
				{ label: "Anonymize", value: "anonymize" },
			],
		},
		{
			name: "retentionUntil",
			type: "date",
			index: true,
			admin: {
				description:
					"Optional per-row retention boundary. Project default leadRetentionDays remains canonical unless set.",
			},
		},
		{
			name: "piiPurgedAt",
			type: "date",
			index: true,
			admin: {
				description:
					"Set when leadRetentionCleanup deleted/anonymized PII for this lead.",
			},
		},
		{
			name: "fraudFingerprint",
			type: "text",
			access: piiFieldAccess,
			admin: {
				description:
					"Optional irreversible keyed/HMAC marker. Raw IP/User-Agent are intentionally not stored.",
			},
		},
	],
};
