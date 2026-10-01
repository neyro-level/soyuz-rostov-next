import "server-only";

import { unstable_cache } from "next/cache";
import type { Payload } from "payload";
import type {
	CatalogSurfaceSlug,
	SiteProfile,
} from "../../core/profile/index.ts";
import type { District } from "../payload-types.ts";
import { siteProfile } from "../site-profile.ts";
import type { ProjectDistrictRouteRegistry } from "../url-grammar.ts";
import { getOptionalPublicGatewayPayload } from "../data-access/public/payload.ts";
import { publicGatewayPolicy } from "../data-access/public/policy.ts";

const districtRegistrySelect = {
	slug: true,
	categories: true,
} as const;

function districtCategories(district: Pick<District, "categories">) {
	return (district.categories ?? []) as CatalogSurfaceSlug[];
}

export async function readPublishedDistrictRouteRegistry(
	payload: Payload,
	profile: SiteProfile = siteProfile,
): Promise<ProjectDistrictRouteRegistry> {
	const registry: Record<
		string,
		Partial<Record<CatalogSurfaceSlug, string[]>>
	> = {};

	for (const geo of Object.keys(profile.geos)) {
		const cityResult = await payload.find({
			collection: "cities",
			where: { slug: { equals: geo } },
			depth: 0,
			limit: 1,
			page: 1,
			select: { slug: true },
			overrideAccess: publicGatewayPolicy.overrideAccess,
			context: publicGatewayPolicy.context,
		});
		const city = cityResult.docs[0];
		if (!city) continue;

		const byCategory: Partial<Record<CatalogSurfaceSlug, string[]>> = {};
		let page = 1;
		let totalPages = 1;
		do {
			const result = await payload.find({
				collection: "districts",
				where: { city: { equals: Number(city.id) } },
				depth: 0,
				limit: publicGatewayPolicy.maxLimit,
				page,
				sort: "sortOrder",
				select: districtRegistrySelect,
				overrideAccess: publicGatewayPolicy.overrideAccess,
				context: publicGatewayPolicy.context,
			});
			for (const district of result.docs as Pick<
				District,
				"slug" | "categories"
			>[]) {
				for (const category of districtCategories(district)) {
					if (!profile.filterKeys[category]?.includes("district")) continue;
					if (!byCategory[category]) byCategory[category] = [];
					byCategory[category].push(district.slug);
				}
			}
			totalPages = result.totalPages;
			page += 1;
			if (page > 21 && page <= totalPages) {
				throw new Error(
					`District registry exceeds the bounded limit for ${geo}.`,
				);
			}
		} while (page <= totalPages);

		registry[geo] = byCategory;
	}

	return registry;
}

const readCachedDistrictRouteRegistry = unstable_cache(
	async () => {
		const payload = await getOptionalPublicGatewayPayload();
		return payload
			? readPublishedDistrictRouteRegistry(payload, siteProfile)
			: ({} satisfies ProjectDistrictRouteRegistry);
	},
	["project-district-route-registry-v1"],
	{ tags: ["registry"], revalidate: 3600 },
);

export async function getCachedDistrictRouteRegistry() {
	return readCachedDistrictRouteRegistry();
}
