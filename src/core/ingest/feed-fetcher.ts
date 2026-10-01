import type { SafeOutboundStreamResult } from "../security/safe-outbound-client.ts";

export type ConditionalFeedState = {
	etag?: string | null;
	lastModified?: string | null;
};

export type ConditionalFeedHeaders = {
	"If-None-Match"?: string;
	"If-Modified-Since"?: string;
};

export type FeedOutboundFetch = (input: {
	url: URL;
	headers: ConditionalFeedHeaders;
	signal?: AbortSignal;
}) => Promise<SafeOutboundStreamResult>;

export type FetchFeedInput = ConditionalFeedState & {
	url: string;
	outboundFetch: FeedOutboundFetch;
	signal?: AbortSignal;
};

export type FetchedFeed = {
	status: "fetched";
	body: ReadableStream<Uint8Array>;
	sha256: Promise<string | null>;
	etag?: string;
	lastModified?: string;
};

export type UnchangedFeed = {
	status: "unchanged";
	etag?: string;
	lastModified?: string;
};

export type FetchFeedResult = FetchedFeed | UnchangedFeed;

export function buildConditionalFeedHeaders({
	etag,
	lastModified,
}: ConditionalFeedState): ConditionalFeedHeaders {
	const headers: ConditionalFeedHeaders = {};
	if (etag) {
		headers["If-None-Match"] = etag;
	}
	if (lastModified) {
		headers["If-Modified-Since"] = lastModified;
	}
	return headers;
}

export async function fetchConditionalFeed({
	url,
	etag,
	lastModified,
	outboundFetch,
	signal,
}: FetchFeedInput): Promise<FetchFeedResult> {
	const parsedUrl = new URL(url);
	if (parsedUrl.protocol !== "https:" && parsedUrl.protocol !== "http:") {
		throw new Error("Feed URL must use http or https.");
	}

	const response = await outboundFetch({
		url: parsedUrl,
		headers: buildConditionalFeedHeaders({ etag, lastModified }),
		signal,
	});

	const responseEtag = response.headers.get("etag") ?? undefined;
	const responseLastModified = response.headers.get("last-modified") ?? undefined;

	if (response.status === 304) {
		return {
			status: "unchanged",
			etag: responseEtag ?? etag ?? undefined,
			lastModified: responseLastModified ?? lastModified ?? undefined,
		};
	}

	if (response.status < 200 || response.status >= 300) {
		throw new Error(`Feed request failed with status ${response.status}.`);
	}

	if (!response.body) {
		throw new Error("Feed response body is empty.");
	}

	return {
		status: "fetched",
		body: response.body,
		sha256: response.sha256,
		etag: responseEtag,
		lastModified: responseLastModified,
	};
}
