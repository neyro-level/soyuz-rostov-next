import { clientReadinessConfig } from "./client-readiness.config.ts";
import { siteConfig } from "./site.config.ts";

export const starterDemoPublicDomain = "start-baza.ams24.ru";

export function approvedPublicHostname(): string | null {
	return (siteConfig.projectKind as "starter-demo" | "client") === "starter-demo"
		? starterDemoPublicDomain
		: clientReadinessConfig.domain;
}

export function isApprovedProductionPublicOrigin(value: string): boolean {
	const approvedHostname = approvedPublicHostname();
	if (!approvedHostname) return false;

	try {
		const url = new URL(value);
		return (
			url.protocol === "https:" &&
			url.hostname === approvedHostname &&
			!url.username &&
			!url.password &&
			url.pathname === "/" &&
			!url.search &&
			!url.hash
		);
	} catch {
		return false;
	}
}

export function requireApprovedProductionPublicOrigin(value: string): string {
	if (!isApprovedProductionPublicOrigin(value)) {
		throw new Error(
			"NEXT_PUBLIC_SERVER_URL must be an approved HTTPS public origin without credentials, path, query, or hash.",
		);
	}
	return new URL(value).origin;
}
