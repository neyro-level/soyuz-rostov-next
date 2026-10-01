import type { CacheTarget } from "./revalidation-contract.ts";

export type PublicEntityType = "property" | "development" | "developer";

export type PublicEntityDocument = {
	publicUrlId?: number | null;
	slug?: string | null;
};

function addExactTag(
	tags: Set<string>,
	prefix: PublicEntityType,
	value: string | number | null | undefined,
): void {
	if (value == null) return;
	const normalized = String(value).trim().toLowerCase();
	if (/^[a-z0-9_-]+$/.test(normalized)) tags.add(`${prefix}:${normalized}`);
}

/** Covers both the old and new canonical identity while keeping fan-out bounded. */
export function buildPublicEntityInvalidationTargets(input: {
	entityType: PublicEntityType;
	doc: PublicEntityDocument;
	previousDoc?: PublicEntityDocument | null;
}): CacheTarget[] {
	const tags = new Set<string>();
	if (input.entityType === "property") {
		tags.add("properties");
		addExactTag(tags, "property", input.doc.publicUrlId);
		addExactTag(tags, "property", input.previousDoc?.publicUrlId);
	} else if (input.entityType === "development") {
		tags.add("developments");
		tags.add("properties");
		tags.add("developers");
		addExactTag(tags, "development", input.doc.slug);
		addExactTag(tags, "development", input.previousDoc?.slug);
	} else {
		tags.add("developers");
		tags.add("developments");
		addExactTag(tags, "developer", input.doc.slug);
		addExactTag(tags, "developer", input.previousDoc?.slug);
	}
	return [...tags].map((tag) => ({ type: "tag" as const, tag }));
}
