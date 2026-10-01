import assert from "node:assert/strict";
import {
	buildIndexNowKeyFile,
	buildIndexNowRequest,
	planIndexNowGateTransition,
	planIndexNowJob,
	planIndexNowRetry,
} from "../src/core/seo/indexnow.ts";
import { enqueueIndexNowGateTransition } from "../src/core/seo/indexnow-enqueue.ts";
import { runIndexNowTask } from "../src/project/jobs/indexnow-task.ts";

const origin = "https://example.test";
const fixtureKey = "Fixture-Key-2026";

assert.deepEqual(
	planIndexNowJob(
		{
			id: "move-1",
			kind: "canonical_move",
			oldUrl: "/old/",
			newUrl: "/new/",
		},
		origin,
	),
	{
		eventId: "move-1",
		urls: ["https://example.test/old/", "https://example.test/new/"],
		attempt: 1,
	},
);
for (const kind of ["publish", "archive", "gone"] as const) {
	assert.equal(
		planIndexNowJob({ id: kind, kind, url: `/${kind}/` }, origin).urls[0],
		`https://example.test/${kind}/`,
	);
}
assert.throws(
	() =>
		planIndexNowJob(
			{ id: "foreign", kind: "publish", url: "https://evil.test/" },
			origin,
		),
	/parent|belong/i,
);

const request = buildIndexNowRequest({
	publicOrigin: origin,
	key: fixtureKey,
	urls: ["/one/", "/one/", "/two/"],
});
assert.equal(request.endpoint, "https://api.indexnow.org/indexnow");
assert.equal(request.submitted, 2);
assert.deepEqual(JSON.parse(request.body), {
	host: "example.test",
	key: fixtureKey,
	keyLocation: `https://example.test/${fixtureKey}.txt`,
	urlList: ["https://example.test/one/", "https://example.test/two/"],
});
assert.throws(
	() =>
		buildIndexNowRequest({
			publicOrigin: origin,
			key: "short",
			urls: ["/one/"],
		}),
	/8-128/,
);
assert.throws(
	() =>
		buildIndexNowRequest({
			publicOrigin: origin,
			key: fixtureKey,
			keyLocation: "https://evil.test/key.txt",
			urls: ["/one/"],
		}),
	/belong/i,
);

const indexable = (canonical: string) => ({
	canonical,
	statusCode: 200 as const,
	indexing: "index" as const,
	indexNowEligible: true,
});
const hidden = (canonical: string, statusCode: 200 | 404 | 410 = 200) => ({
	canonical,
	statusCode,
	indexing: "noindex" as const,
	indexNowEligible: false,
});
const transitionMatrix = [
	{
		name: "publish",
		previous: hidden("/page/", 404),
		next: indexable("/page/"),
		expected: ["https://example.test/page/"],
	},
	{
		name: "archive",
		previous: indexable("/page/"),
		next: hidden("/page/"),
		expected: ["https://example.test/page/"],
	},
	{
		name: "canonical-move",
		previous: indexable("/old/"),
		next: indexable("/new/"),
		expected: ["https://example.test/old/", "https://example.test/new/"],
	},
	{
		name: "indexability-change",
		previous: hidden("/page/"),
		next: indexable("/page/"),
		expected: ["https://example.test/page/"],
	},
] as const;
for (const testCase of transitionMatrix) {
	assert.deepEqual(
		planIndexNowGateTransition(
			{
				eventId: testCase.name,
				previous: testCase.previous,
				next: testCase.next,
			},
			origin,
		)?.urls,
		[...testCase.expected],
		testCase.name,
	);
}
assert.equal(
	planIndexNowGateTransition(
		{
			eventId: "unchanged",
			previous: indexable("/page/"),
			next: indexable("/page/"),
		},
		origin,
	),
	null,
);
assert.equal(
	planIndexNowGateTransition(
		{
			eventId: "draft-create",
			previous: null,
			next: hidden("/draft/", 404),
		},
		origin,
	),
	null,
);
assert.throws(
	() =>
		planIndexNowGateTransition(
			{
				eventId: "foreign-transition",
				previous: indexable("/old/"),
				next: indexable("https://evil.test/new/"),
			},
			origin,
		),
	/belong/i,
);

const queuedKeys = new Set<string>();
const queuedJobs: unknown[] = [];
const enqueueInput = {
	transition: {
		eventId: "dedupe-1",
		previous: hidden("/dedupe/", 404),
		next: indexable("/dedupe/"),
	},
	publicOrigin: origin,
	findExisting: async (concurrencyKey: string) =>
		queuedKeys.has(concurrencyKey),
	queue: async (job: unknown, concurrencyKey: string) => {
		queuedKeys.add(concurrencyKey);
		queuedJobs.push(job);
		return { id: "job-1" };
	},
};
assert.equal(
	(await enqueueIndexNowGateTransition(enqueueInput)).status,
	"queued",
);
assert.equal(
	(await enqueueIndexNowGateTransition(enqueueInput)).status,
	"duplicate",
);
assert.equal(queuedJobs.length, 1);
assert.equal(JSON.stringify(queuedJobs).includes(fixtureKey), false);
assert.deepEqual(
	buildIndexNowKeyFile({ key: fixtureKey, pathname: `/${fixtureKey}.txt` }),
	{
		body: fixtureKey,
		contentType: "text/plain; charset=utf-8",
	},
);
assert.deepEqual(
	buildIndexNowKeyFile({
		key: fixtureKey,
		pathname: "/verification/indexnow.txt",
		keyLocationPathname: "/verification/indexnow.txt",
	}),
	{ body: fixtureKey, contentType: "text/plain; charset=utf-8" },
);

assert.deepEqual(
	planIndexNowRetry({
		status: 429,
		attempt: 1,
		now: new Date("2026-09-25T10:00:00Z"),
	}),
	{ attempt: 2, waitUntil: new Date("2026-09-25T10:01:00Z") },
);
assert.equal(
	planIndexNowRetry({
		status: 422,
		attempt: 1,
		now: new Date("2026-09-25T10:00:00Z"),
	}),
	null,
);
assert.equal(
	planIndexNowRetry({
		status: 503,
		attempt: 4,
		now: new Date("2026-09-25T10:00:00Z"),
	}),
	null,
);

let capturedBody = "";
let queuedRetry: Record<string, unknown> | undefined;
const job = planIndexNowJob(
	{ id: "publish-1", kind: "publish", url: "/changed/" },
	origin,
);
const result = await runIndexNowTask({
	job,
	env: { NEXT_PUBLIC_SERVER_URL: origin, INDEXNOW_KEY: fixtureKey },
	now: new Date("2026-09-25T10:00:00Z"),
	fetchImpl: async (_url, init) => {
		capturedBody = init.body;
		assert.deepEqual(init.allowedHosts, ["api.indexnow.org"]);
		return new Response("", { status: 429 });
	},
	queueRetry: async (retry) => {
		queuedRetry = retry;
	},
});
assert.equal(JSON.parse(capturedBody).key, fixtureKey);
assert.deepEqual(result.output, {
	eventId: "publish-1",
	status: 429,
	submitted: 1,
	retryQueued: true,
});
assert.equal(JSON.stringify(result).includes(fixtureKey), false);
assert.equal(JSON.stringify(queuedRetry).includes(fixtureKey), false);
assert.deepEqual(queuedRetry, {
	eventId: "publish-1",
	urls: ["https://example.test/changed/"],
	attempt: 2,
	waitUntil: new Date("2026-09-25T10:01:00Z"),
});

let networkRetry: Record<string, unknown> | undefined;
const networkResult = await runIndexNowTask({
	job,
	env: { NEXT_PUBLIC_SERVER_URL: origin, INDEXNOW_KEY: fixtureKey },
	now: new Date("2026-09-25T10:00:00Z"),
	fetchImpl: async () => {
		throw new Error("fixture network failure");
	},
	queueRetry: async (retry) => {
		networkRetry = retry;
	},
});
assert.equal(networkResult.output.status, "network_error");
assert.equal(JSON.stringify(networkResult).includes(fixtureKey), false);
assert.equal(JSON.stringify(networkRetry).includes(fixtureKey), false);

console.log(
	"IndexNow verified: events, same-host, key, retry and secret-safe job payload.",
);
