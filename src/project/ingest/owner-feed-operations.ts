import type { PayloadRequest } from "payload";
import { systemQueueJob } from "../../core/data-access/system/queue-job.ts";

const requestAccess = { overrideAccess: false as const };

export async function queueManualFeedImport(
	req: PayloadRequest,
	input: { feedSourceId: string; now?: Date },
): Promise<{ importRunId: string; jobId: string }> {
	const now = input.now ?? new Date();
	const source = await req.payload.findByID({
		collection: "feed-sources",
		id: input.feedSourceId,
		depth: 0,
		req,
		...requestAccess,
	});
	if (!source.enabled) {
		throw new Error("Manual import requires an enabled feed source.");
	}

	const created = await req.payload.create({
		collection: "import-runs",
		data: {
			feedSource: Number(source.id),
			status: "queued",
			queuedAt: now.toISOString(),
			heartbeatAt: now.toISOString(),
		},
		req,
		...requestAccess,
	});
	const importRunId = String(created.id);
	const queued = (await systemQueueJob({
		req,
		task: "importFeed" as never,
		queue: "imports",
		input: {
			feedSourceId: String(source.id),
			importRunId,
		} as never,
	})) as { id: number | string };

	await req.payload.update({
		collection: "import-runs",
		id: importRunId,
		data: { jobId: String(queued.id) },
		req,
		...requestAccess,
	});

	return { importRunId, jobId: String(queued.id) };
}

export async function approveSuspiciousDeactivation(
	req: PayloadRequest,
	input: {
		feedSourceId: string;
		importRunId: string;
		approvedByUserId: string;
		now?: Date;
		approvalTtlMinutes: number;
	},
): Promise<{ expiresAt: string }> {
	const now = input.now ?? new Date();
	const run = await req.payload.findByID({
		collection: "import-runs",
		id: input.importRunId,
		depth: 0,
		req,
		...requestAccess,
	});
	if (run.status !== "suspicious") {
		throw new Error("Deactivation approval is only valid for a suspicious import run.");
	}
	const runSourceId =
		typeof run.feedSource === "object" && run.feedSource
			? String(run.feedSource.id)
			: String(run.feedSource);
	if (runSourceId !== input.feedSourceId) {
		throw new Error("Deactivation approval must belong to the same feed source.");
	}

	const expiresAt = new Date(
		now.getTime() + input.approvalTtlMinutes * 60_000,
	).toISOString();

	await req.payload.update({
		collection: "feed-sources",
		id: input.feedSourceId,
		data: {
			deactivationApproval: {
				runId: Number(input.importRunId),
				approvedBy: Number(input.approvedByUserId),
				approvedAt: now.toISOString(),
				expiresAt,
				consumedAt: null,
			},
		},
		req,
		...requestAccess,
	});

	return { expiresAt };
}
