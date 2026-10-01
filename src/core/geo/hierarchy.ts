export const geoPublicationStatuses = [
	"draft",
	"published",
	"archived",
] as const;

export type GeoPublicationStatus = (typeof geoPublicationStatuses)[number];

export type GeoMorphology = {
	nominative: string;
	genitive: string;
	prepositional: string;
};

export type AgglomerationNode = {
	id: string;
	regionId: string;
	agglomerationOfId: string | null;
};

const canonicalSlugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function assertCanonicalGeoSlug(slug: unknown, label: string): string {
	if (typeof slug !== "string" || !canonicalSlugPattern.test(slug)) {
		throw new Error(`${label} must be a canonical lowercase ASCII slug.`);
	}
	return slug;
}

export function assertGeoMorphology(value: unknown): GeoMorphology {
	if (!value || typeof value !== "object") {
		throw new Error("Geo morphology is required.");
	}
	const source = value as Partial<Record<keyof GeoMorphology, unknown>>;
	const morphology = {
		nominative:
			typeof source.nominative === "string" ? source.nominative.trim() : "",
		genitive: typeof source.genitive === "string" ? source.genitive.trim() : "",
		prepositional:
			typeof source.prepositional === "string"
				? source.prepositional.trim()
				: "",
	};
	if (Object.values(morphology).some((form) => form.length === 0)) {
		throw new Error(
			"Geo morphology requires nominative, genitive and prepositional forms.",
		);
	}
	return morphology;
}

export function assertSlugOutsideNamespace(
	slug: string,
	reservedSlugs: ReadonlySet<string>,
	label: string,
): void {
	if (reservedSlugs.has(slug)) {
		throw new Error(`${label} slug collides with reserved namespace: ${slug}.`);
	}
}

export function assertPublishedGeoSlugImmutable(input: {
	nextSlug: string;
	originalSlug?: string | null;
	originalStatus?: GeoPublicationStatus | null;
	originalPublishedAt?: string | null;
}): void {
	const wasPublished =
		input.originalStatus === "published" || Boolean(input.originalPublishedAt);
	if (
		wasPublished &&
		input.originalSlug &&
		input.nextSlug !== input.originalSlug
	) {
		throw new Error(
			"Published geo slug is immutable until redirect lifecycle is enabled.",
		);
	}
}

export function normalizeGeoPublication(input: {
	status: GeoPublicationStatus;
	publishedAt?: string | null;
	nowIso: string;
}): { status: GeoPublicationStatus; publishedAt: string | null } {
	return {
		status: input.status,
		publishedAt:
			input.status === "published"
				? (input.publishedAt ?? input.nowIso)
				: (input.publishedAt ?? null),
	};
}

export function assertAgglomerationGraph(
	nodes: readonly AgglomerationNode[],
): void {
	const byId = new Map(nodes.map((node) => [node.id, node]));
	for (const node of nodes) {
		if (!node.agglomerationOfId) continue;
		if (node.agglomerationOfId === node.id) {
			throw new Error("City cannot be its own agglomeration parent.");
		}
		const parent = byId.get(node.agglomerationOfId);
		if (!parent) {
			throw new Error("Agglomeration parent must exist in the city hierarchy.");
		}
		if (parent.regionId !== node.regionId) {
			throw new Error("Agglomeration parent must belong to the same region.");
		}
		const visited = new Set<string>([node.id]);
		let cursor: AgglomerationNode | undefined = parent;
		while (cursor) {
			if (visited.has(cursor.id)) {
				throw new Error("City agglomeration hierarchy contains a cycle.");
			}
			visited.add(cursor.id);
			cursor = cursor.agglomerationOfId
				? byId.get(cursor.agglomerationOfId)
				: undefined;
		}
	}
}
