import type { PayloadRequest } from "payload";
import { appendLifecycleEvent } from "../../core/data-access/system/lifecycle-store.ts";
import type { LifecycleEntityType } from "../../core/lifecycle/entity-lifecycle.ts";
import {
	buildLifecycleCanonicalPath,
	type LifecycleCanonicalDocument,
} from "./canonical-path.ts";

type LifecycleDocument = LifecycleCanonicalDocument & {
	id: string | number;
	status?: string | null;
	publishedAt?: string | null;
	contentPurgedAt?: string | null;
};

export async function recordEntityLifecycleTransition(input: {
	entityType: LifecycleEntityType;
	doc: LifecycleDocument;
	previousDoc?: LifecycleDocument | null;
	req: PayloadRequest;
}): Promise<void> {
	const { doc, previousDoc } = input;
	const becamePublished =
		Boolean(doc.publishedAt) &&
		(doc.status === "active" || doc.status === "published") &&
		(!previousDoc?.publishedAt ||
			(previousDoc.status !== "active" && previousDoc.status !== "published"));
	const becameArchived =
		doc.status === "archived" && previousDoc?.status !== "archived";
	const becamePurged =
		Boolean(doc.contentPurgedAt) && !previousDoc?.contentPurgedAt;
	const canonicalPath =
		becamePublished || becameArchived || becamePurged
			? buildLifecycleCanonicalPath(input.entityType, doc)
			: undefined;

	if (becamePublished) {
		await appendLifecycleEvent(input.req.payload, {
			entityType: input.entityType,
			entityId: doc.id,
			action: "published",
			canonicalPath,
		});
	}
	if (becameArchived) {
		await appendLifecycleEvent(input.req.payload, {
			entityType: input.entityType,
			entityId: doc.id,
			action: "archived",
			canonicalPath,
		});
	}
	if (becamePurged) {
		await appendLifecycleEvent(input.req.payload, {
			entityType: input.entityType,
			entityId: doc.id,
			action: "purged",
			canonicalPath,
		});
	}
}
