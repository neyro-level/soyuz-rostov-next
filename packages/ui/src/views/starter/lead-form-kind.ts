import type { LeadFormKind } from "@ams/realtbase-contracts";

export type IntakeFormKind =
	| "property_request"
	| "callback"
	| "consultation"
	| "generic"
	| "development_price";

export function toIntakeFormKind(kind: LeadFormKind): IntakeFormKind {
	if (kind === "property") return "property_request";
	if (kind === "development") return "development_price";
	if (kind === "callback") return "callback";
	if (kind === "general" || kind === "mortgage") return "consultation";
	return "generic";
}
