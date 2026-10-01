import type { ContentGateDecision } from "../../core/seo/content-gate.ts";
import type { DiscoveryGroup } from "../../core/seo/discovery-feeds.ts";
import { detectRuntimeEnvMode, runtimeEnv } from "../env.ts";
import { requireApprovedProductionPublicOrigin } from "../public-origin.ts";
import { projectStaticRoutes } from "../static-routes.ts";

export type PublicUrlEntry = {
	group: DiscoveryGroup;
	path: string;
	lastModified?: string | Date | null;
	changeFrequency?:
		| "always"
		| "hourly"
		| "daily"
		| "weekly"
		| "monthly"
		| "yearly"
		| "never";
	priority?: number;
	indexable: boolean;
	gate?: Pick<
		ContentGateDecision,
		"statusCode" | "indexing" | "following" | "canonical" | "includeInSitemap"
	>;
};

export const staticPublicUrlEntries: readonly PublicUrlEntry[] =
	projectStaticRoutes.map((entry) => ({ ...entry, group: "static" }));

export function getSiteUrl(): string {
	const configured = runtimeEnv.NEXT_PUBLIC_SERVER_URL?.trim();
	if (!configured) {
		if (detectRuntimeEnvMode() === "runtime") {
			throw new Error(
				"NEXT_PUBLIC_SERVER_URL is required for production runtime metadata.",
			);
		}
		return "http://localhost:3000";
	}
	if (detectRuntimeEnvMode() === "runtime") {
		return requireApprovedProductionPublicOrigin(configured);
	}
	try {
		const url = new URL(configured);
		return url.origin;
	} catch {
		throw new Error("NEXT_PUBLIC_SERVER_URL must be a valid absolute URL.");
	}
}

export function absoluteUrl(path: string): string {
	return new URL(path, getSiteUrl()).toString();
}
