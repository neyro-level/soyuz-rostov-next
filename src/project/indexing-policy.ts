import type { MetadataRoute } from "next";
import {
	composeFinalRobots,
	type GlobalIndexingPolicy,
} from "../core/seo/final-robots.ts";
import { clientReadinessConfig } from "./client-readiness.config.ts";
import { type ProjectKind, siteConfig } from "./site.config.ts";

export type IndexingPolicy = GlobalIndexingPolicy;

export function resolveIndexingPolicy(input: {
	projectKind: ProjectKind;
	productionIndexing: IndexingPolicy | null;
}): IndexingPolicy {
	if (input.projectKind === "starter-demo") return "noindex";
	return input.productionIndexing ?? "noindex";
}

export function getProjectIndexingPolicy(): IndexingPolicy {
	return resolveIndexingPolicy({
		projectKind: siteConfig.projectKind,
		productionIndexing: clientReadinessConfig.productionIndexing,
	});
}

export function metadataRobotsForPolicy(policy: IndexingPolicy) {
	return composeFinalRobots(policy, {
		indexing: "index",
		following: "follow",
	});
}

export function buildRobots(
	policy: IndexingPolicy,
	host: string,
): MetadataRoute.Robots {
	if (policy === "noindex") {
		return {
			rules: [{ userAgent: "*", disallow: "/" }],
		};
	}

	return {
		rules: [
			{
				userAgent: "*",
				allow: "/",
				disallow: ["/admin", "/api"],
			},
		],
		sitemap: `${host}/sitemap.xml`,
		host,
	};
}
