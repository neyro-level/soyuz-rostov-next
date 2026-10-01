import "server-only";

import type { Payload, Where } from "payload";
import type {
	LifecycleEntityType,
	LifecyclePublicationStatus,
} from "../../../core/lifecycle/entity-lifecycle.ts";
import { sanitizeExplicitRedirectPath } from "../../../core/seo/redirect-path.ts";
import { entityLifecycleReadAccess } from "./access-mode.ts";
import {
	findPublicRedirectByFromPath,
	publicRedirectDestinationIsChain,
} from "./payload-reads.ts";

type EntityLifecycleDescriptor = {
	collection: "properties" | "developments" | "developers";
	status: LifecyclePublicationStatus;
	publishedAt?: string | null;
	contentPurgedAt?: string | null;
};

const collections: Record<
	LifecycleEntityType,
	EntityLifecycleDescriptor["collection"]
> = {
	property: "properties",
	development: "developments",
	developer: "developers",
};

export type PublicEntityLifecycleLookup =
	| { found: false }
	| ({ found: true; explicitRedirectPath?: string | null } & Omit<
			EntityLifecycleDescriptor,
			"collection"
	  >);

export async function findPublicEntityLifecycle(input: {
	payload: Payload;
	entityType: LifecycleEntityType;
	slug?: string;
	publicUrlId?: number;
	canonicalPath: string;
}): Promise<PublicEntityLifecycleLookup> {
	const where: Where | null =
		input.entityType === "property" && input.publicUrlId
			? { publicUrlId: { equals: input.publicUrlId } }
			: input.slug
				? { slug: { equals: input.slug } }
				: null;
	if (!where) throw new Error("Entity lifecycle lookup requires an identity.");
	const result = await input.payload.find({
		collection: collections[input.entityType],
		where,
		limit: 1,
		page: 1,
		depth: 0,
		select: { status: true, publishedAt: true, contentPurgedAt: true },
		...entityLifecycleReadAccess(),
	});
	const row = result.docs[0] as
		| {
				status?: LifecyclePublicationStatus;
				publishedAt?: string | null;
				contentPurgedAt?: string | null;
		  }
		| undefined;
	if (!row?.status) return { found: false };

	const redirect = await findPublicRedirectByFromPath(
		input.payload,
		input.canonicalPath,
	);
	const destination = sanitizeExplicitRedirectPath(redirect?.to);
	const chained =
		destination != null &&
		(await publicRedirectDestinationIsChain(
			input.payload,
			destination,
			input.canonicalPath,
		));

	return {
		found: true,
		status: row.status,
		publishedAt: row.publishedAt ?? null,
		contentPurgedAt: row.contentPurgedAt ?? null,
		explicitRedirectPath: chained ? null : destination,
	};
}
