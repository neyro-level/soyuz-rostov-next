export type GlobalIndexingPolicy = "public" | "noindex";

export type PageRobots = {
	indexing: "index" | "noindex";
	following: "follow" | "nofollow";
};

/**
 * Produces the only robots directive that public page metadata may publish.
 * A page-level decision can narrow the project policy, but can never widen it.
 */
export function composeFinalRobots(
	globalPolicy: GlobalIndexingPolicy,
	page: PageRobots,
): { index: boolean; follow: boolean } {
	if (globalPolicy === "noindex") {
		return { index: false, follow: false };
	}

	return {
		index: page.indexing === "index",
		follow: page.following === "follow",
	};
}
