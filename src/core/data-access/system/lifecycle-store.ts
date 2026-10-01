import "server-only";

import type { Payload } from "payload";
import type { LifecycleEntityType } from "../../lifecycle/entity-lifecycle.ts";
import { systemOverrideAccess } from "./overrides.ts";

export type LifecycleEventInput = {
	entityType: LifecycleEntityType;
	entityId: string | number;
	action: "published" | "archived" | "purged" | "canonical_move";
	canonicalPath?: string | null;
	fromPath?: string | null;
	toPath?: string | null;
	reason?: string | null;
	occurredAt?: string;
};

export async function appendLifecycleEvent(
	payload: Payload,
	input: LifecycleEventInput,
): Promise<void> {
	await payload.create({
		collection: "lifecycle-events",
		data: {
			...input,
			entityId: String(input.entityId),
			occurredAt: input.occurredAt ?? new Date().toISOString(),
		},
		...systemOverrideAccess("record-lifecycle-event"),
	});
}
