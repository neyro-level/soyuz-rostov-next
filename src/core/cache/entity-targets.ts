import type { CacheTarget } from "./revalidation-contract.ts";

export type EntityInvalidationContext = {
	geo?: string | null;
	surface?: string | null;
	districtId?: string | number | null;
	developmentId?: string | number | null;
	developerId?: string | number | null;
	propertyId?: string | number | null;
	includeRegistry?: boolean;
};

function safePart(value: string | number): string {
	const normalized = String(value).trim().toLowerCase();
	if (!/^[a-z0-9_-]+$/.test(normalized)) {
		throw new Error(`Unsafe cache tag component: ${normalized}`);
	}
	return normalized;
}

export function buildEntityInvalidationTargets(
	input: EntityInvalidationContext,
): CacheTarget[] {
	const tags = new Set<string>();
	if (input.geo) tags.add(`geo:${safePart(input.geo)}`);
	if (input.geo && input.surface) {
		tags.add(`geo-surface:${safePart(input.geo)}:${safePart(input.surface)}`);
	}
	if (input.districtId != null) tags.add(`district:${safePart(input.districtId)}`);
	if (input.developmentId != null) tags.add(`development:${safePart(input.developmentId)}`);
	if (input.developerId != null) tags.add(`developer:${safePart(input.developerId)}`);
	if (input.propertyId != null) tags.add(`property:${safePart(input.propertyId)}`);
	if (input.includeRegistry) tags.add("registry");
	return [...tags].map((tag) => ({ type: "tag" as const, tag }));
}
