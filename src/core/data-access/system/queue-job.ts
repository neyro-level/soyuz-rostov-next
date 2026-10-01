import type { PayloadRequest } from "payload";
import { systemOverrideAccess } from "./overrides.ts";

export async function systemQueueJob({
	req,
	task,
	queue,
	input,
	waitUntil,
}: {
	req: PayloadRequest;
	task: never;
	queue: string;
	input: never;
	waitUntil?: Date;
}) {
	return req.payload.jobs.queue({
		task,
		queue,
		input,
		waitUntil,
		req,
		...systemOverrideAccess("system-job"),
	});
}
