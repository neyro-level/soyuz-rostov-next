import type { DeveloperCardDTO } from "@ams/realtbase-contracts";
import type { SiteProfile } from "@/core/profile";

export function publishedDeveloperGeoSlugs(profile: SiteProfile): string[] {
	return Object.entries(profile.geos)
		.filter(([, definition]) => definition.published)
		.map(([slug]) => slug);
}

export function mergeDeveloperCards(
	groups: readonly (readonly DeveloperCardDTO[])[],
): DeveloperCardDTO[] {
	const merged = new Map<string, DeveloperCardDTO>();
	for (const group of groups) {
		for (const developer of group) {
			const current = merged.get(developer.id);
			merged.set(
				developer.id,
				current
					? {
							...current,
							developmentsCount:
								current.developmentsCount + developer.developmentsCount,
							geoNames: [
								...new Set([...current.geoNames, ...developer.geoNames]),
							],
						}
					: developer,
			);
		}
	}
	return [...merged.values()].sort((left, right) =>
		left.name.localeCompare(right.name, "ru"),
	);
}

export function collectPassingDeveloperIds(
	rows: readonly {
		developerId: string | null;
		indexing: "index" | "noindex";
	}[],
): Set<string> {
	return new Set(
		rows.flatMap((row) =>
			row.developerId && row.indexing === "index" ? [row.developerId] : [],
		),
	);
}
