export const indexNowEndpoint = "https://api.indexnow.org/indexnow";
export const indexNowUrlLimit = 10_000;
const keyPattern = /^[A-Za-z0-9-]{8,128}$/;

export type IndexNowEvent =
	| { id: string; kind: "publish" | "archive" | "gone"; url: string }
	| { id: string; kind: "canonical_move"; oldUrl: string; newUrl: string };

export type IndexNowJobInput = {
	eventId: string;
	urls: string[];
	attempt: number;
};

export type IndexNowGateSnapshot = {
	canonical: string;
	statusCode: 200 | 301 | 404 | 410;
	indexing: "index" | "noindex";
	indexNowEligible: boolean;
};

export type IndexNowGateTransition = {
	eventId: string;
	previous?: IndexNowGateSnapshot | null;
	next?: IndexNowGateSnapshot | null;
};

function publicOrigin(value: string): URL {
	const parsed = new URL(value);
	if (
		!(["http:", "https:"] as const).includes(
			parsed.protocol as "http:" | "https:",
		)
	) {
		throw new Error("IndexNow public origin must use HTTP or HTTPS.");
	}
	if (
		parsed.username ||
		parsed.password ||
		parsed.pathname !== "/" ||
		parsed.search ||
		parsed.hash
	) {
		throw new Error(
			"IndexNow public origin must not contain credentials or a path.",
		);
	}
	return parsed;
}

function sameOriginUrl(value: string, origin: URL): string {
	const parsed = new URL(value, origin);
	if (
		parsed.origin !== origin.origin ||
		parsed.username ||
		parsed.password ||
		parsed.hash
	) {
		throw new Error(
			`IndexNow URL must belong to public origin ${origin.origin}.`,
		);
	}
	return parsed.href;
}

function assertKey(key: string): string {
	if (!keyPattern.test(key)) {
		throw new Error("IndexNow key must be 8-128 letters, digits, or dashes.");
	}
	return key;
}

export function planIndexNowJob(
	event: IndexNowEvent,
	originValue: string,
): IndexNowJobInput {
	if (!event.id.trim()) throw new Error("IndexNow event id is required.");
	const origin = publicOrigin(originValue);
	const rawUrls =
		event.kind === "canonical_move"
			? [event.oldUrl, event.newUrl]
			: [event.url];
	const urls = [...new Set(rawUrls.map((url) => sameOriginUrl(url, origin)))];
	return { eventId: event.id, urls, attempt: 1 };
}

function gateSignature(snapshot: IndexNowGateSnapshot | null | undefined) {
	return snapshot
		? [
				snapshot.canonical,
				snapshot.statusCode,
				snapshot.indexing,
				snapshot.indexNowEligible,
			].join("|")
		: "missing";
}

export function planIndexNowGateTransition(
	transition: IndexNowGateTransition,
	publicOrigin: string,
): IndexNowJobInput | null {
	if (!transition.eventId.trim())
		throw new Error("IndexNow event id is required.");
	if (gateSignature(transition.previous) === gateSignature(transition.next)) {
		return null;
	}
	const statusChangedOnKnownPage = Boolean(
		transition.previous &&
			transition.next &&
			transition.previous.statusCode !== transition.next.statusCode &&
			transition.previous.statusCode !== 404,
	);
	if (
		!transition.previous?.indexNowEligible &&
		!transition.next?.indexNowEligible &&
		!statusChangedOnKnownPage
	) {
		return null;
	}
	const canonicals = [
		transition.previous?.canonical,
		transition.next?.canonical,
	].filter((value): value is string => Boolean(value?.trim()));
	if (canonicals.length === 0) return null;
	return planIndexNowJob(
		canonicals.length > 1
			? {
					id: transition.eventId,
					kind: "canonical_move",
					oldUrl: canonicals[0],
					newUrl: canonicals[1],
				}
			: {
					id: transition.eventId,
					kind: "publish",
					url: canonicals[0],
				},
		publicOrigin,
	);
}

export function buildIndexNowRequest(input: {
	publicOrigin: string;
	key: string;
	keyLocation?: string;
	urls: readonly string[];
}): { endpoint: string; body: string; submitted: number } {
	const origin = publicOrigin(input.publicOrigin);
	const key = assertKey(input.key);
	const urls = [
		...new Set(input.urls.map((url) => sameOriginUrl(url, origin))),
	];
	if (urls.length < 1 || urls.length > indexNowUrlLimit) {
		throw new Error(`IndexNow batch must contain 1-${indexNowUrlLimit} URLs.`);
	}
	const keyLocation = sameOriginUrl(
		input.keyLocation ?? `/${encodeURIComponent(key)}.txt`,
		origin,
	);
	const keyDirectory = new URL(".", keyLocation).pathname;
	for (const url of urls) {
		if (!new URL(url).pathname.startsWith(keyDirectory)) {
			throw new Error(
				"IndexNow URL is outside the configured keyLocation scope.",
			);
		}
	}
	return {
		endpoint: indexNowEndpoint,
		body: JSON.stringify({
			host: origin.host,
			key,
			keyLocation,
			urlList: urls,
		}),
		submitted: urls.length,
	};
}

export function buildIndexNowKeyFile(input: {
	key: string;
	pathname: string;
	keyLocationPathname?: string;
}): {
	body: string;
	contentType: string;
} {
	const key = assertKey(input.key);
	const expectedPathname =
		input.keyLocationPathname ?? `/${encodeURIComponent(key)}.txt`;
	if (!expectedPathname.startsWith("/") || expectedPathname.startsWith("//")) {
		throw new Error("IndexNow keyLocation pathname must be root-relative.");
	}
	if (input.pathname !== expectedPathname) {
		throw new Error(
			"IndexNow key file pathname does not match the configured key.",
		);
	}
	return { body: key, contentType: "text/plain; charset=utf-8" };
}

export function planIndexNowRetry(input: {
	status: number;
	attempt: number;
	now: Date;
	maxAttempts?: number;
}): { attempt: number; waitUntil: Date } | null {
	const maxAttempts = input.maxAttempts ?? 4;
	const retryable = input.status === 429 || input.status >= 500;
	if (!retryable || input.attempt >= maxAttempts) return null;
	const delayMinutes = 2 ** (input.attempt - 1);
	return {
		attempt: input.attempt + 1,
		waitUntil: new Date(input.now.getTime() + delayMinutes * 60_000),
	};
}
