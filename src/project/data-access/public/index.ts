import "server-only";
import { z } from "zod";

export const publicGatewayRequestSchema = z.object({
	limit: z.number().int().min(1).max(48).default(24),
	depth: z.literal(0).default(0),
});

export type PublicGatewayRequest = z.input<typeof publicGatewayRequestSchema>;
export type PublicGatewayQuery = z.output<typeof publicGatewayRequestSchema>;

export function parsePublicGatewayQuery(
	input: PublicGatewayRequest,
): PublicGatewayQuery {
	return publicGatewayRequestSchema.parse(input);
}

export {
	propertyLifecycleReadAccess,
	publicGatewayReadAccess,
} from "./access-mode";
export type {
	CatalogQuery,
	CatalogQueryInput,
	PublicCatalogFacetsResult,
	PublicCatalogResult,
} from "./catalog";
export {
	catalogQuerySchema,
	findPublicCatalogFacets,
	findPublicCatalogProperties,
	findPublicPropertyBySlug,
	findPublicPropertyLifecycleBySlug,
	findPublicSitemapProperties,
	publicPropertyDetailsWhere,
	publicPropertyPublicationWhere,
	publicPropertyRetainedArchivedWhere,
} from "./catalog";
export { publicGatewayPolicy } from "./policy";
export {
	countInventory,
	getDeveloper,
	getDevelopment,
	getGeoBySlug,
	getGeoHub,
	getListing,
	getNearby,
	getPropertyByPublicUrlId,
	listAllDevelopments,
	listDeveloperDevelopments,
	listDevelopments,
	listGeoDevelopers,
} from "./geo-catalog";
export type { PublicListingInput } from "./geo-catalog";
export { findPublicNap, toNapDTO } from "./nap";
export {
	getPublicHomePage,
	getPublicMarketingPage,
	getPublicShell,
	getPublicSitemapEntries,
	getPublicSitemapShard,
	getPublicSitemapShardCount,
} from "./provider";
