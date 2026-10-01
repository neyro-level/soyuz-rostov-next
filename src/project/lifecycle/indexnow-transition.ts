import type { PayloadRequest } from "payload";
import type {
	IndexNowGateSnapshot,
	IndexNowGateTransition,
} from "../../core/seo/indexnow.ts";
import { queueIndexNowGateTransition } from "../jobs/indexnow-enqueue.ts";

type LifecycleIndexNowEvent = {
	id: string | number;
	action: "published" | "archived" | "purged" | "canonical_move";
	canonicalPath?: string | null;
	fromPath?: string | null;
	toPath?: string | null;
};

function snapshot(
	canonical: string,
	input: Omit<IndexNowGateSnapshot, "canonical">,
): IndexNowGateSnapshot {
	return { canonical, ...input };
}

export function lifecycleIndexNowTransition(
	event: LifecycleIndexNowEvent,
): IndexNowGateTransition {
	const eventId = `lifecycle:${event.id}`;
	if (event.action === "canonical_move") {
		if (!event.fromPath || !event.toPath) {
			throw new Error("Canonical move requires fromPath and toPath.");
		}
		return {
			eventId,
			previous: snapshot(event.fromPath, {
				statusCode: 200,
				indexing: "index",
				indexNowEligible: true,
			}),
			next: snapshot(event.toPath, {
				statusCode: 200,
				indexing: "index",
				indexNowEligible: true,
			}),
		};
	}
	if (!event.canonicalPath) {
		throw new Error(`${event.action} requires canonicalPath.`);
	}
	if (event.action === "published") {
		return {
			eventId,
			previous: snapshot(event.canonicalPath, {
				statusCode: 404,
				indexing: "noindex",
				indexNowEligible: false,
			}),
			next: snapshot(event.canonicalPath, {
				statusCode: 200,
				indexing: "index",
				indexNowEligible: true,
			}),
		};
	}
	if (event.action === "archived") {
		return {
			eventId,
			previous: snapshot(event.canonicalPath, {
				statusCode: 200,
				indexing: "index",
				indexNowEligible: true,
			}),
			next: snapshot(event.canonicalPath, {
				statusCode: 200,
				indexing: "noindex",
				indexNowEligible: false,
			}),
		};
	}
	return {
		eventId,
		previous: snapshot(event.canonicalPath, {
			statusCode: 200,
			indexing: "noindex",
			indexNowEligible: false,
		}),
		next: snapshot(event.canonicalPath, {
			statusCode: 410,
			indexing: "noindex",
			indexNowEligible: false,
		}),
	};
}

export async function queueLifecycleIndexNowEvent(input: {
	event: LifecycleIndexNowEvent;
	req: PayloadRequest;
}) {
	return queueIndexNowGateTransition({
		req: input.req,
		transition: lifecycleIndexNowTransition(input.event),
	});
}
