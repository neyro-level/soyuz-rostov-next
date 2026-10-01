import "server-only";
import type { Payload } from "payload";
import { systemOverrideAccess } from "../overrides.ts";

export async function inspectPayloadJob(payload: Payload, id: string) {
	return payload.findByID({
		collection: "payload-jobs",
		id,
		depth: 0,
		...systemOverrideAccess("payload-jobs-inspect"),
	});
}

export async function listPayloadJobsByConcurrencyKey(
	payload: Payload,
	input: { concurrencyKey: string; taskSlug: string; limit?: number },
) {
	return payload.find({
		collection: "payload-jobs",
		where: {
			and: [
				{ concurrencyKey: { equals: input.concurrencyKey } },
				{ taskSlug: { equals: input.taskSlug } },
				{ completedAt: { exists: false } },
				{ hasError: { not_equals: true } },
			],
		},
		sort: "-createdAt",
		limit: input.limit ?? 10,
		depth: 0,
		...systemOverrideAccess("payload-jobs-inspect"),
	});
}

export async function findPayloadJobByConcurrencyKey(
	payload: Payload,
	input: { concurrencyKey: string; taskSlug: string },
) {
	const result = await payload.find({
		collection: "payload-jobs",
		where: {
			and: [
				{ concurrencyKey: { equals: input.concurrencyKey } },
				{ taskSlug: { equals: input.taskSlug } },
			],
		},
		sort: "-createdAt",
		limit: 1,
		depth: 0,
		...systemOverrideAccess("payload-jobs-inspect"),
	});
	return result.docs[0] ?? null;
}
