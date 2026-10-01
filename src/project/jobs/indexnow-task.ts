import { safeOutboundFetch } from "../../core/security/safe-outbound-client.ts";
import {
	buildIndexNowRequest,
	planIndexNowRetry,
	type IndexNowJobInput,
} from "../../core/seo/indexnow.ts";

type IndexNowTaskEnv = {
	NEXT_PUBLIC_SERVER_URL?: string;
	INDEXNOW_KEY?: string;
	INDEXNOW_KEY_LOCATION?: string;
};

type IndexNowFetch = (
	url: string,
	init: {
		allowedHosts: readonly string[];
		method: string;
		headers: HeadersInit;
		body: string;
		maxBytes: number;
	},
) => Promise<Response>;

export async function runIndexNowTask(input: {
	job: IndexNowJobInput;
	env: IndexNowTaskEnv;
	now: Date;
	fetchImpl?: IndexNowFetch;
	queueRetry: (retry: IndexNowJobInput & { waitUntil: Date }) => Promise<void>;
}) {
	if (!input.job.eventId.trim())
		throw new Error("IndexNow event id is required.");
	if (!Number.isSafeInteger(input.job.attempt) || input.job.attempt < 1) {
		throw new Error("IndexNow attempt must be a positive safe integer.");
	}
	const publicOrigin = input.env.NEXT_PUBLIC_SERVER_URL?.trim();
	const key = input.env.INDEXNOW_KEY?.trim();
	if (!publicOrigin || !key) {
		throw new Error("IndexNow runtime is not configured.");
	}
	const request = buildIndexNowRequest({
		publicOrigin,
		key,
		keyLocation: input.env.INDEXNOW_KEY_LOCATION,
		urls: input.job.urls,
	});
	const fetchImpl = input.fetchImpl ?? safeOutboundFetch;
	let response: Response;
	try {
		response = await fetchImpl(request.endpoint, {
			allowedHosts: ["api.indexnow.org"],
			method: "POST",
			headers: { "content-type": "application/json; charset=utf-8" },
			body: request.body,
			maxBytes: 16_384,
		});
	} catch {
		const retry = planIndexNowRetry({
			status: 503,
			attempt: input.job.attempt,
			now: input.now,
		});
		if (!retry) throw new Error("IndexNow network submission failed.");
		await input.queueRetry({
			eventId: input.job.eventId,
			urls: input.job.urls,
			attempt: retry.attempt,
			waitUntil: retry.waitUntil,
		});
		return {
			output: {
				eventId: input.job.eventId,
				status: "network_error",
				submitted: request.submitted,
				retryQueued: true,
			},
		};
	}
	const retry = planIndexNowRetry({
		status: response.status,
		attempt: input.job.attempt,
		now: input.now,
	});
	if (retry) {
		await input.queueRetry({
			eventId: input.job.eventId,
			urls: input.job.urls,
			attempt: retry.attempt,
			waitUntil: retry.waitUntil,
		});
	}
	if (response.status !== 200 && response.status !== 202 && !retry) {
		throw new Error(
			`IndexNow submission failed with status ${response.status}.`,
		);
	}
	return {
		output: {
			eventId: input.job.eventId,
			status: response.status,
			submitted: request.submitted,
			retryQueued: Boolean(retry),
		},
	};
}
