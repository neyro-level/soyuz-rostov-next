import "server-only";

import type { PayloadRequest } from "payload";
import { findPayloadJobByConcurrencyKey } from "../../core/data-access/system/jobs/index.ts";
import { systemQueueJob } from "../../core/data-access/system/queue-job.ts";
import type { IndexNowGateTransition } from "../../core/seo/indexnow.ts";
import { enqueueIndexNowGateTransition } from "../../core/seo/indexnow-enqueue.ts";
import { runtimeEnv } from "../env.ts";
import { payloadJobQueues, payloadJobTaskSlugs } from "./registry.ts";

export async function queueIndexNowGateTransition(input: {
	req: PayloadRequest;
	transition: IndexNowGateTransition;
}) {
	const publicOrigin = runtimeEnv.NEXT_PUBLIC_SERVER_URL?.trim();
	if (!publicOrigin) {
		throw new Error(
			"NEXT_PUBLIC_SERVER_URL is required to enqueue an IndexNow transition.",
		);
	}
	return enqueueIndexNowGateTransition({
		transition: input.transition,
		publicOrigin,
		findExisting: async (concurrencyKey) =>
			Boolean(
				await findPayloadJobByConcurrencyKey(input.req.payload, {
					concurrencyKey,
					taskSlug: payloadJobTaskSlugs.submitIndexNow,
				}),
			),
		queue: async (job) => {
			const queued = (await systemQueueJob({
				req: input.req,
				task: payloadJobTaskSlugs.submitIndexNow as never,
				queue: payloadJobQueues.indexNow,
				input: job as never,
			})) as { id: number | string };
			return { id: String(queued.id) };
		},
	});
}
