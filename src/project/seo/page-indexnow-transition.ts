import type { PayloadRequest } from "payload";
import type { IndexNowGateSnapshot } from "../../core/seo/indexnow.ts";
import { queueIndexNowGateTransition } from "../jobs/indexnow-enqueue.ts";

type PageIndexNowDocument = {
	id: string | number;
	slug?: string | null;
	status?: string | null;
	updatedAt?: string | null;
	seo?: { noindex?: boolean | null } | null;
};

function canonicalPath(doc: PageIndexNowDocument): string {
	const slug = doc.slug?.trim().replace(/^\/+|\/+$/g, "");
	if (!slug) throw new Error("Page IndexNow transition requires a slug.");
	return `/${slug}/`;
}

export function pageIndexNowSnapshot(
	doc: PageIndexNowDocument | null | undefined,
): IndexNowGateSnapshot | null {
	if (!doc?.slug?.trim()) return null;
	const published = doc.status === "published";
	const archived = doc.status === "archived";
	const eligible = published && doc.seo?.noindex !== true;
	return {
		canonical: canonicalPath(doc),
		statusCode: published || archived ? 200 : 404,
		indexing: eligible ? "index" : "noindex",
		indexNowEligible: eligible,
	};
}

export async function queuePageIndexNowTransition(input: {
	doc: PageIndexNowDocument;
	previousDoc?: PageIndexNowDocument | null;
	req: PayloadRequest;
}) {
	const revision = input.doc.updatedAt?.trim();
	if (!revision) {
		throw new Error("Page IndexNow transition requires updatedAt.");
	}
	return queueIndexNowGateTransition({
		req: input.req,
		transition: {
			eventId: `page:${input.doc.id}:${revision}`,
			previous: pageIndexNowSnapshot(input.previousDoc),
			next: pageIndexNowSnapshot(input.doc),
		},
	});
}
