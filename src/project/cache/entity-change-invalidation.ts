import type { PayloadRequest } from "payload";
import { invalidatePublicCache } from "@/core/cache/invalidator";
import {
	buildPublicEntityInvalidationTargets,
	type PublicEntityDocument,
	type PublicEntityType,
} from "@/core/cache/entity-change-targets";
import { runtimeEnv } from "@/project/env";

export async function invalidatePublicEntityChange(input: {
	entityType: PublicEntityType;
	doc: PublicEntityDocument;
	previousDoc?: PublicEntityDocument | null;
	req: PayloadRequest;
}): Promise<void> {
	if ((input.req.context as { source?: unknown } | undefined)?.source === "import") {
		return;
	}
	await invalidatePublicCache({
		baseUrl: runtimeEnv.INTERNAL_REVALIDATE_BASE_URL,
		secret: runtimeEnv.REVALIDATE_SECRET,
		targets: buildPublicEntityInvalidationTargets(input),
		reason: `${input.entityType}-change`,
	});
}
