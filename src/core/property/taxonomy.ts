export const propertyCategorySurface = {
	apartment: "kvartiry",
	house: "doma",
	land: "uchastki",
	commercial: "kommercheskaya-nedvizhimost",
	room: "komnaty",
	garage: "garazhi",
} as const;

export type PropertyCategory = keyof typeof propertyCategorySurface;
export type LandAreaUnit = "m2" | "sotka" | "hectare";

export type LandAreaNormalization =
	| { status: "ok"; plotAreaSotka: number }
	| { status: "review"; reason: "missing_unit" | "ambiguous_unit" | "invalid_value" };

export function normalizeLandArea(
	value: number,
	unit?: LandAreaUnit | null,
): LandAreaNormalization {
	if (!Number.isFinite(value) || value <= 0) {
		return { status: "review", reason: "invalid_value" };
	}
	if (!unit) return { status: "review", reason: "missing_unit" };
	if (!(["m2", "sotka", "hectare"] as const).includes(unit)) {
		return { status: "review", reason: "ambiguous_unit" };
	}
	const sotka = unit === "m2" ? value / 100 : unit === "hectare" ? value * 100 : value;
	return { status: "ok", plotAreaSotka: Math.round(sotka * 100) / 100 };
}

const categoryOwnedFields: Partial<Record<PropertyCategory, readonly string[]>> = {
	house: ["houseType"],
	land: ["plotAreaSotka", "landCategory", "permittedUse", "communications"],
	commercial: ["commercialType"],
};

export function assertCategoryFieldOwnership(data: Record<string, unknown>): void {
	const category = data.category as PropertyCategory | undefined;
	if (!category || !(category in propertyCategorySurface)) {
		throw new Error("Property category is not supported.");
	}
	for (const [owner, fields] of Object.entries(categoryOwnedFields)) {
		if (owner === category) continue;
		for (const field of fields ?? []) {
			if (hasMeaningfulValue(data[field])) {
				throw new Error(`${field} is only valid for category=${owner}.`);
			}
		}
	}
}

function hasMeaningfulValue(value: unknown): boolean {
	if (value === undefined || value === null || value === "" || value === false) return false;
	if (Array.isArray(value)) return value.some(hasMeaningfulValue);
	if (typeof value === "object") return Object.values(value).some(hasMeaningfulValue);
	return true;
}

export function buildPropertySemanticSlug(input: {
	category: PropertyCategory;
	rooms?: number | null;
	locality?: string | null;
	street?: string | null;
}): string {
	const parts = [
		input.category === "apartment" && input.rooms ? `${input.rooms}-komnatnaya` : input.category,
		input.locality,
		input.street,
	].filter((part): part is string => typeof part === "string" && part.trim().length > 0);
	return parts
		.join("-")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[^a-z0-9\u0400-\u04ff-]+/g, "-")
		.replace(/^-+|-+$/g, "")
		.replace(/-+/g, "-");
}
