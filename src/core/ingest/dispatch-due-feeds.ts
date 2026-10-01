import type { ClaimedFeedSource } from "../data-access/ingest/sql/index.ts";

export type DispatchDueFeedsDeps = {
	now: Date;
	batchSize?: number;
	claimDueFeedSources: (input: {
		now: Date;
		batchSize: number;
	}) => Promise<ClaimedFeedSource[]>;
	createQueuedImportRun: (input: {
		feedSourceId: string;
		now: Date;
	}) => Promise<{ id: string }>;
	enqueueImportFeed: (input: {
		feedSourceId: string;
		importRunId: string;
	}) => Promise<{ id: string }>;
	attachJobId: (input: { importRunId: string; jobId: string }) => Promise<void>;
};

export type DispatchedFeed = {
	feedSourceId: string;
	importRunId: string;
	nextDueAt: string;
};

export async function dispatchDueFeeds({
	now,
	batchSize = 3,
	claimDueFeedSources,
	createQueuedImportRun,
	enqueueImportFeed,
	attachJobId,
}: DispatchDueFeedsDeps): Promise<{ dispatched: DispatchedFeed[] }> {
	const claimed = await claimDueFeedSources({ now, batchSize });
	const dispatched: DispatchedFeed[] = [];

	for (const feed of claimed) {
		const importRun = await createQueuedImportRun({
			feedSourceId: feed.id,
			now,
		});
		const job = await enqueueImportFeed({
			feedSourceId: feed.id,
			importRunId: importRun.id,
		});
		await attachJobId({ importRunId: importRun.id, jobId: job.id });
		dispatched.push({
			feedSourceId: feed.id,
			importRunId: importRun.id,
			nextDueAt: feed.nextDueAt,
		});
	}

	return { dispatched };
}

export function startImportHeartbeat(input: {
	intervalMs: number;
	tick: () => Promise<void>;
}): { stop: () => void } {
	const timer = setInterval(() => {
		void input.tick().catch(() => undefined);
	}, input.intervalMs);
	if (typeof timer === "object" && "unref" in timer) {
		timer.unref();
	}
	return {
		stop() {
			clearInterval(timer);
		},
	};
}
