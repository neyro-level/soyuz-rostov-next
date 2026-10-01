export type LegalConsentConfig = {
	currentConsentVersion: string;
	consentHref: `/${string}`;
	consentRequired: true;
};

export const legalConsentConfig = {
	currentConsentVersion: "pd-2026-01",
	consentHref: "/soglasie-na-obrabotku-personalnyh-dannyh/",
	consentRequired: true,
} as const satisfies LegalConsentConfig;

export function leadConsentContext() {
	return {
		consentVersion: legalConsentConfig.currentConsentVersion,
		consentHref: legalConsentConfig.consentHref,
		consentRequired: legalConsentConfig.consentRequired,
	} as const;
}
