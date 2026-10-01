import { recordCacheInvalidationOutcome } from "./invalidation-sla.ts";

export type HttpCacheTarget =
	| { type: "tag"; tag: string }
	| { type: "path"; path: string; routeType?: "page" | "layout" };

export type HttpCacheInvalidationResult =
	| { ok: true; count: number }
	| { ok: false; warning: true; reason: "not_configured" | "request_failed" | "rejected" };

const maxTargetsPerRequest = 32;

export function chunkCacheTargets(
	targets: HttpCacheTarget[],
	size = maxTargetsPerRequest,
): HttpCacheTarget[][] {
	const chunks: HttpCacheTarget[][] = [];
	for (let index = 0; index < targets.length; index += size) {
		chunks.push(targets.slice(index, index + size));
	}
	return chunks;
}

export async function postBatchedHttpRevalidate(input: {
	baseUrl?: string;
	secret?: string;
	targets: HttpCacheTarget[];
	reason?: string;
	fetchImpl?: typeof fetch;
}): Promise<HttpCacheInvalidationResult> {
	if (input.targets.length === 0) {
		recordCacheInvalidationOutcome(true);
		return { ok: true, count: 0 };
	}

	const baseUrl = input.baseUrl?.replace(/\/$/, "");
	if (!baseUrl || !input.secret) {
		recordCacheInvalidationOutcome(false);
		return { ok: false, warning: true, reason: "not_configured" };
	}

	const fetchImpl = input.fetchImpl ?? fetch;
	let posted = 0;

	for (const chunk of chunkCacheTargets(input.targets)) {
		try {
			const response = await fetchImpl(`${baseUrl}/api/internal/revalidate`, {
				method: "POST",
				headers: {
					"content-type": "application/json",
					"x-ams-revalidate-secret": input.secret,
				},
				body: JSON.stringify({
					targets: chunk,
					reason: input.reason,
				}),
			});
			if (!response.ok) {
				recordCacheInvalidationOutcome(false);
				return { ok: false, warning: true, reason: "rejected" };
			}
			posted += chunk.length;
		} catch {
			recordCacheInvalidationOutcome(false);
			return { ok: false, warning: true, reason: "request_failed" };
		}
	}

	recordCacheInvalidationOutcome(true);
	return { ok: true, count: posted };
}
