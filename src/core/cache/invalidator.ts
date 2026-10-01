import "server-only";
import {
	postBatchedHttpRevalidate,
	type HttpCacheInvalidationResult,
} from "./http-revalidate.ts";
import type { CacheTarget } from "./revalidation-contract.ts";
import {
	buildEntityInvalidationTargets,
	type EntityInvalidationContext,
} from "./entity-targets.ts";

export type PublicCacheInvalidationInput = {
	baseUrl?: string;
	secret?: string;
	targets: CacheTarget[];
	reason?: string;
	fetchImpl?: typeof fetch;
};

/** Canonical public-cache invalidation facade. Starter mode is HTTP only. */
export async function invalidatePublicCache(
	input: PublicCacheInvalidationInput,
): Promise<HttpCacheInvalidationResult> {
	return postBatchedHttpRevalidate(input);
}

/** Relationship-aware invalidation still crosses only the authenticated HTTP facade. */
export async function invalidateEntityRelationships(
	input: Omit<PublicCacheInvalidationInput, "targets"> &
		EntityInvalidationContext,
): Promise<HttpCacheInvalidationResult> {
	const {
		geo,
		surface,
		districtId,
		developmentId,
		developerId,
		propertyId,
		includeRegistry,
		...http
	} = input;
	return invalidatePublicCache({
		...http,
		targets: buildEntityInvalidationTargets({
			geo,
			surface,
			districtId,
			developmentId,
			developerId,
			propertyId,
			includeRegistry,
		}),
	});
}
