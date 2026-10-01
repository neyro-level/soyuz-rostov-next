export type LeadFormKind =
	| "general"
	| "callback"
	| "property"
	| "development"
	| "mortgage"
	| "sell"
	| "rent";

export type LeadPropertyContextDTO = {
	id: string;
	slug: string;
	title: string;
};

export type LeadFormContext = {
	formKind: LeadFormKind;
	sourcePage: string;
	property?: LeadPropertyContextDTO;
	consentVersion: string;
	consentHref: string;
	consentRequired: boolean;
};
