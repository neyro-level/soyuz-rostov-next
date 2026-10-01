export const importOwnedFields = [
	"title",
	"description",
	"priceMinor",
	"totalArea",
	"livingArea",
	"kitchenArea",
	"rooms",
	"floor",
	"floors",
	"publicAddress",
	"locality",
	"district",
	"region",
	"street",
	"house",
	"lat",
	"lng",
	"images",
	"category",
	"dealType",
	"currency",
	"externalComplexId",
	"externalComplexName",
	"externalBuildingId",
	"externalLayoutId",
] as const;

export type ImportOwnedField = (typeof importOwnedFields)[number];

export type ManualOverrideMarker = {
	field: string;
	setAt: string;
	setBy?: string | number | null;
};

export type OwnershipActor = {
	userId?: string | number | null;
	source?: string | null;
};

export function shouldRecordManualOwnership(actor: OwnershipActor): boolean {
	if (actor.userId == null || actor.userId === "") return false;
	return actor.source !== "import" && actor.source !== "system";
}

function stableEqual(left: unknown, right: unknown): boolean {
	return JSON.stringify(left) === JSON.stringify(right);
}

export function collectChangedImportOwnedFields(
	nextData: Record<string, unknown>,
	original?: Record<string, unknown> | null,
): ImportOwnedField[] {
	if (!original) return [];
	return importOwnedFields.filter((field) => {
		if (!(field in nextData) || nextData[field] === undefined) return false;
		return !stableEqual(nextData[field], original[field]);
	});
}

export function mergeManualOverrides(
	existing: ManualOverrideMarker[] | undefined,
	changedFields: readonly string[],
	input: { nowIso: string; userId?: string | number | null },
): ManualOverrideMarker[] {
	const next = [...(existing ?? [])];
	for (const field of changedFields) {
		if (field === "slug") continue;
		const index = next.findIndex((marker) => marker.field === field);
		const marker: ManualOverrideMarker = {
			field,
			setAt: input.nowIso,
			setBy: input.userId ?? null,
		};
		if (index >= 0) next[index] = marker;
		else next.push(marker);
	}
	return next;
}

export function returnFieldToFeed(
	existing: ManualOverrideMarker[] | undefined,
	field: string,
): ManualOverrideMarker[] {
	return (existing ?? []).filter((marker) => marker.field !== field);
}

export function applyPublishedSlugPolicy(input: {
	nextSlug?: string;
	originalSlug?: string | null;
	publishedAt?: string | null;
}): string | undefined {
	if (!input.publishedAt || !input.originalSlug) return input.nextSlug;
	return input.originalSlug;
}
