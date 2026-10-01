import "server-only";
import type { Payload } from "payload";
import { systemOverrideAccess } from "../overrides.ts";

export async function listStalePayloadJobs(
	payload: Payload,
	input: { olderThan: Date; limit?: number },
) {
	const limit = input.limit ?? 20;
	return payload.find({
		collection: "payload-jobs",
		where: {
			and: [
				{ processing: { equals: true } },
				{ updatedAt: { less_than: input.olderThan.toISOString() } },
			],
		},
		limit,
		depth: 0,
		...systemOverrideAccess("payload-jobs-inspect"),
	});
}

export async function emergencyUnstuckPayloadJob(
	payload: Payload,
	input: { jobId: string },
): Promise<{ unstuck: boolean }> {
	const existing = await payload.findByID({
		collection: "payload-jobs",
		id: input.jobId,
		depth: 0,
		...systemOverrideAccess("payload-jobs-inspect"),
	});
	if (!existing.processing) {
		return { unstuck: false };
	}

	await payload.update({
		collection: "payload-jobs",
		id: input.jobId,
		data: {
			processing: false,
			hasError: true,
			error: {
				message:
					"Recovered by documented emergency unstuck. No system fields were edited ad hoc.",
			},
		},
		...systemOverrideAccess("payload-jobs-unstuck"),
	});
	return { unstuck: true };
}
