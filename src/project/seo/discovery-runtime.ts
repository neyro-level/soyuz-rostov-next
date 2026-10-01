import "server-only";

import { decidePage as decideResolvedPage } from "@/core/routing";
import {
	buildDiscoveryShards,
	type DiscoveryCandidate,
} from "@/core/seo/discovery-feeds";
import { getPublicSitemapEntries } from "@/project/data-access/public";
import { getProjectIndexingPolicy } from "@/project/indexing-policy";
import { getSiteUrl } from "@/project/seo/site";
import { siteProfile } from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";

const grammar = createProjectUrlGrammar(siteProfile);

export async function getRuntimeDiscoveryShards() {
	if (getProjectIndexingPolicy() !== "public") return [];
	const entries = await getPublicSitemapEntries();
	const candidates = (
		await Promise.all(
			entries.map(async (entry): Promise<DiscoveryCandidate | null> => {
				if (!entry.indexable || !entry.lastModified) return null;
				const path =
					entry.path === "/" ? "/" : `${entry.path.replace(/\/+$/, "")}/`;
				const pageKey = grammar.parseUrl(path);
				if (!pageKey) return null;
				const gate =
					entry.gate ??
					(pageKey.kind === "home" || pageKey.kind === "static"
						? decideResolvedPage(
								siteProfile,
								pageKey,
								{
									kind: "page",
									pageKey,
									canonicalPath: path,
									profileStatus: "ACTIVE",
									lifecycle: "active",
									market: null,
									dataTier: null,
									inventory: 0,
								},
								{
									kind: "static",
									url: path,
									canonical: path,
									profileStatus: "ACTIVE",
								},
							).gate
						: null);
				if (!gate) return null;
				return {
					group: entry.group,
					path,
					canonicalPath: path,
					lastModified: entry.lastModified,
					published: true,
					gate,
				};
			}),
		)
	).filter((candidate): candidate is DiscoveryCandidate => candidate !== null);
	return buildDiscoveryShards({
		publicOrigin: getSiteUrl(),
		candidates,
	});
}
