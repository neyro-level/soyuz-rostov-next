import {
	type IndexNowGateTransition,
	type IndexNowJobInput,
	planIndexNowGateTransition,
} from "./indexnow.ts";

export type IndexNowEnqueueResult =
	| { status: "unchanged"; eventId: string }
	| { status: "duplicate"; eventId: string; concurrencyKey: string }
	| {
			status: "queued";
			eventId: string;
			concurrencyKey: string;
			jobId: string;
			urls: readonly string[];
	  };

export async function enqueueIndexNowGateTransition(input: {
	transition: IndexNowGateTransition;
	publicOrigin: string;
	findExisting: (concurrencyKey: string) => Promise<boolean>;
	queue: (
		job: IndexNowJobInput,
		concurrencyKey: string,
	) => Promise<{ id: string }>;
}): Promise<IndexNowEnqueueResult> {
	const job = planIndexNowGateTransition(input.transition, input.publicOrigin);
	if (!job) {
		return { status: "unchanged", eventId: input.transition.eventId };
	}
	const concurrencyKey = `index-now:${job.eventId}`;
	if (await input.findExisting(concurrencyKey)) {
		return { status: "duplicate", eventId: job.eventId, concurrencyKey };
	}
	const queued = await input.queue(job, concurrencyKey);
	return {
		status: "queued",
		eventId: job.eventId,
		concurrencyKey,
		jobId: queued.id,
		urls: job.urls,
	};
}
