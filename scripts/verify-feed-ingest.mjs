import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	dispatchDueFeeds,
	ingestNormalizedFeed,
	isEnabledFeedDue,
	parseYrlFeed,
	runImportFeed,
	startImportHeartbeat,
} from "../src/core/ingest/index.ts";

const repository = createRepository();
const baseContext = {
	feedSourceId: "feed-source-a",
	feedSourceCode: "source-a",
	importRunId: "run-1",
	market: "secondary",
	nowIso: "2026-09-16T12:00:00.000Z",
};
const offer = {
	externalId: "external-1",
	title: "Квартира на Тестовой",
	category: "apartment",
	dealType: "sale",
	priceMinor: 12_000_000_00,
	currency: "RUB",
	publicAddress: "Москва, Тестовая, 1",
	locality: "Москва",
	images: [
		{ url: "https://img.allowed.example/1.jpg", host: "img.allowed.example" },
	],
};

const unsupportedCurrency = await parseYrlFeed({
	stream: [
		new TextEncoder().encode(
			'<realty-feed><offer id="foreign-currency"><title>Foreign</title><price><value>1000000</value><currency>USD</currency></price></offer></realty-feed>',
		),
	],
	allowedImageHosts: new Set(),
	collectOffers: true,
	collectIssues: true,
});
const currencyRepository = createRepository();
await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-unsupported-currency" },
	offers: unsupportedCurrency.offers,
	issues: unsupportedCurrency.issues,
	repository: currencyRepository,
});
assert.equal(currencyRepository.byId.size, 0);
assert.equal(currencyRepository.issues.length, 1);
assert.equal(currencyRepository.issues[0].field, "currency");

const marketRepository = createRepository();
const rejectedMarket = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-market-hint" },
	offers: [{ ...offer, marketHint: "newbuild" }],
	repository: marketRepository,
});
assert.equal(rejectedMarket.createdCount, 0);
assert.equal(rejectedMarket.errorCount, 1);
assert.equal(marketRepository.byId.size, 0);

const mirrorRepository = createRepository();
await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-mirror" },
	offers: [offer],
	repository: mirrorRepository,
	mirrorImages: async () => ({
		images: [{ kind: "managed", media: "77", alt: offer.title, order: 0 }],
		issues: [],
	}),
});
assert.deepEqual(mirrorRepository.byId.get("property-1").images, [
	{ kind: "managed", media: "77", alt: offer.title, order: 0 },
]);

const firstRun = await ingestNormalizedFeed({
	context: baseContext,
	offers: [offer],
	issues: [
		{
			severity: "warning",
			code: "feed.image_host_disallowed",
			externalId: "external-1",
			field: "images",
			messageRedacted:
				"Feed image skipped because its URL or host is not allowed.",
		},
	],
	repository,
	invalidateCache: repository.invalidateCache,
});
assert.equal(firstRun.createdCount, 1);
assert.equal(firstRun.updatedCount, 0);
assert.equal(firstRun.warningCount, 1);
assert.equal(repository.issues.length, 1);
assert.deepEqual(firstRun.invalidatedTargets, [
	{ type: "tag", tag: "properties" },
	{ type: "path", path: "/kvartiry/", routeType: "page" },
]);
assert.equal(repository.byId.get("property-1").pricePerMeterMinor, null);

const derivedRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-derived" },
	offers: [{ ...offer, priceMinor: 10_000_000_00, totalArea: 50 }],
	repository,
});
assert.equal(derivedRun.updatedCount, 1);
assert.equal(repository.byId.get("property-1").pricePerMeterMinor, 20_000_000);

const priceRemovedRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-price-removed" },
	offers: [{ ...offer, priceMinor: undefined, totalArea: 50 }],
	repository,
});
assert.equal(priceRemovedRun.updatedCount, 1);
assert.equal(repository.byId.get("property-1").pricePerMeterMinor, null);

const areaRestoredRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-area-restored" },
	offers: [{ ...offer, priceMinor: 10_000_000_00, totalArea: 50 }],
	repository,
});
assert.equal(areaRestoredRun.updatedCount, 1);
assert.equal(repository.byId.get("property-1").pricePerMeterMinor, 20_000_000);

const areaRemovedRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-area-removed" },
	offers: [{ ...offer, priceMinor: 10_000_000_00, totalArea: undefined }],
	repository,
});
assert.equal(areaRemovedRun.updatedCount, 1);
assert.equal(repository.byId.get("property-1").pricePerMeterMinor, null);

await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-restore-original" },
	offers: [offer],
	repository,
});

const sameRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-2" },
	offers: [offer],
	repository,
	invalidateCache: repository.invalidateCache,
});
assert.equal(sameRun.createdCount, 0);
assert.equal(sameRun.updatedCount, 0);
assert.equal(sameRun.skippedCount, 1);
assert.equal(
	repository.byId.get("property-1").slug,
	"feed-source-a-external-1",
);
assert.equal(repository.touched.at(-1)?.importRunId, "run-2");

repository.byId.get("property-1").manualOverrides = [{ field: "title" }];
repository.byId.get("property-1").title = "Ручной заголовок";
const manualOverrideRun = await ingestNormalizedFeed({
	context: { ...baseContext, importRunId: "run-3" },
	offers: [
		{ ...offer, title: "Новый заголовок из feed", priceMinor: 13_000_000_00 },
	],
	repository,
});
assert.equal(manualOverrideRun.updatedCount, 1);
assert.equal(repository.byId.get("property-1").title, "Ручной заголовок");
assert.equal(repository.byId.get("property-1").priceMinor, 13_000_000_00);

const sourceIsolationRun = await ingestNormalizedFeed({
	context: {
		...baseContext,
		feedSourceId: "feed-source-b",
		feedSourceCode: "source-b",
		importRunId: "run-4",
	},
	offers: [offer],
	repository,
});
assert.equal(sourceIsolationRun.createdCount, 1);
assert.equal(repository.byId.size, 2);

const otherMarket = await ingestNormalizedFeed({
	context: { ...baseContext, market: "newbuild", importRunId: "run-market" },
	offers: [offer],
	repository,
});
assert.equal(otherMarket.errorCount, 1);
assert.equal(repository.byId.get("property-1").market, "secondary");

const firstClaim = await dispatchDueFeeds({
	now: new Date("2026-09-18T06:00:00.000Z"),
	batchSize: 3,
	claimDueFeedSources: async ({ batchSize }) => {
		assert.equal(batchSize, 3);
		return [
			{
				id: "11",
				code: "a",
				market: "secondary",
				feedUrlRef: "FEED_A_URL",
				refreshIntervalMinutes: 60,
				nextDueAt: "2026-09-18T07:00:00.000Z",
				safetyThresholdPercent: 30,
				maxDeactivationsPerRun: 50,
				enabled: true,
			},
		];
	},
	createQueuedImportRun: async ({ feedSourceId }) => ({
		id: `run-${feedSourceId}`,
	}),
	enqueueImportFeed: async () => ({ id: "job-1" }),
	attachJobId: async () => undefined,
});
assert.equal(firstClaim.dispatched.length, 1);

const secondClaimer = { calls: 0 };
const concurrent = await Promise.all([
	dispatchDueFeeds({
		now: new Date("2026-09-18T06:00:00.000Z"),
		claimDueFeedSources: async () => {
			secondClaimer.calls += 1;
			return secondClaimer.calls === 1
				? [
						{
							id: "11",
							code: "a",
							market: "secondary",
							feedUrlRef: "FEED_A_URL",
							refreshIntervalMinutes: 60,
							nextDueAt: "2026-09-18T07:00:00.000Z",
							safetyThresholdPercent: 30,
							maxDeactivationsPerRun: 50,
							enabled: true,
						},
					]
				: [];
		},
		createQueuedImportRun: async ({ feedSourceId }) => ({
			id: `run-${feedSourceId}`,
		}),
		enqueueImportFeed: async () => ({ id: "job-1" }),
		attachJobId: async () => undefined,
	}),
	dispatchDueFeeds({
		now: new Date("2026-09-18T06:00:00.000Z"),
		claimDueFeedSources: async () => [],
		createQueuedImportRun: async () => ({ id: "x" }),
		enqueueImportFeed: async () => ({ id: "y" }),
		attachJobId: async () => undefined,
	}),
]);
assert.equal(
	concurrent[0].dispatched.length + concurrent[1].dispatched.length,
	1,
);

let ticks = 0;
const heartbeat = startImportHeartbeat({
	intervalMs: 20,
	tick: async () => {
		ticks += 1;
	},
});
await new Promise((resolve) => setTimeout(resolve, 60));
heartbeat.stop();
assert.ok(ticks >= 1, "heartbeat ticks must run outside ingest work");

const ingestSource = readFileSync("src/core/ingest/feed-ingest.ts", "utf8");
assert.equal(
	ingestSource.includes("startImportHeartbeat"),
	false,
	"ingest transaction/work must not own the heartbeat timer",
);
assert.equal(
	/transaction|db\.begin|payload\.db/.test(ingestSource),
	false,
	"normalized ingest must not wrap heartbeat in a DB transaction",
);
const runtimeSource = readFileSync(
	"src/core/ingest/import-feed-runtime.ts",
	"utf8",
);
assert.ok(
	runtimeSource.includes("const heartbeat = startImportHeartbeat"),
	"heartbeat must start in import runtime, outside ingestNormalizedFeed",
);
assert.ok(
	runtimeSource.indexOf("const heartbeat = startImportHeartbeat") <
		runtimeSource.indexOf("const ingest = deps.ingest"),
	"heartbeat must be scheduled before ingest work",
);
const heartbeatSource = readFileSync(
	"src/core/ingest/dispatch-due-feeds.ts",
	"utf8",
);
assert.ok(
	heartbeatSource.includes("setInterval"),
	"heartbeat must tick on an interval outside ingest work",
);

let ingestCalls = 0;
const unchanged = await runImportFeed(
	{
		now: () => new Date("2026-09-18T06:00:00.000Z"),
		heartbeatIntervalMs: 60_000,
		claimQueuedImportRun: async () => "7",
		touchHeartbeat: async () => undefined,
		loadFeedSource: async () => ({
			id: "11",
			code: "a",
			enabled: true,
			market: "secondary",
			feedUrlRef: "FEED_A_URL",
			safetyThresholdPercent: 30,
			maxDeactivationsPerRun: 50,
		}),
		resolveFeedUrl: () => "https://feeds.example.test/a.xml",
		fetchFeed: async () => ({
			status: "unchanged",
			etag: '"next"',
		}),
		createRepository: () => repository,
		ingest: async () => {
			ingestCalls += 1;
			throw new Error("ingest must not run on 304");
		},
		finishRun: async () => undefined,
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(["img.allowed.example"]),
	},
	{ feedSourceId: "11", importRunId: "7" },
);
assert.equal(unchanged.claimed, true);
assert.equal(unchanged.status, "unchanged");
assert.equal(ingestCalls, 0);

const skipped = await runImportFeed(
	{
		now: () => new Date("2026-09-18T06:00:00.000Z"),
		claimQueuedImportRun: async () => undefined,
		touchHeartbeat: async () => {
			throw new Error("heartbeat must not start if claim failed");
		},
		loadFeedSource: async () => {
			throw new Error("source must not load if claim failed");
		},
		resolveFeedUrl: () => {
			throw new Error("url must not resolve if claim failed");
		},
		fetchFeed: async () => {
			throw new Error("fetch must not run if claim failed");
		},
		createRepository: () => repository,
		finishRun: async () => undefined,
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(),
	},
	{ feedSourceId: "11", importRunId: "7" },
);
assert.equal(skipped.claimed, false);

let largestIngestBatch = 0;
let boundedIngestCalls = 0;
const boundedRuntime = await runImportFeed(
	{
		now: () => new Date("2026-09-18T06:00:00.000Z"),
		ingestBatchSize: 37,
		claimQueuedImportRun: async () => "bounded-run",
		touchHeartbeat: async () => undefined,
		loadFeedSource: async () => ({
			id: "bounded-source",
			code: "bounded",
			enabled: true,
			market: "secondary",
			feedUrlRef: "BOUNDED_FEED_URL",
			lastOfferCount: null,
			safetyThresholdPercent: 30,
			maxDeactivationsPerRun: 50,
		}),
		resolveFeedUrl: () => "https://feeds.example.test/bounded.xml",
		fetchFeed: async () => ({
			status: "fetched",
			body: [],
			sha256: Promise.resolve("bounded-hash"),
		}),
		parseFeed: async ({ onOffer }) => {
			for (let index = 0; index < 10_001; index += 1) {
				await onOffer?.({ ...offer, externalId: `bounded-${index}` });
			}
			return {
				offers: [],
				issues: [],
				stats: {
					offersSeen: 10_001,
					maxRetainedCharsObserved: 0,
					maxBufferedOffersObserved: 1,
					parserCompleted: true,
					criticalStructuralAnomaly: false,
				},
			};
		},
		createRepository: () => createRepository(),
		ingest: async ({ offers, issues }) => {
			boundedIngestCalls += 1;
			largestIngestBatch = Math.max(
				largestIngestBatch,
				offers.length + issues.length,
			);
			return {
				offeredCount: offers.length,
				createdCount: offers.length,
				updatedCount: 0,
				skippedCount: 0,
				warningCount: 0,
				errorCount: 0,
				invalidatedTargets: [],
			};
		},
		finishRun: async () => undefined,
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(),
	},
	{ feedSourceId: "bounded-source", importRunId: "bounded-run" },
);
assert.equal(boundedRuntime.claimed, true);
assert.equal(boundedRuntime.status, "success");
assert.equal(boundedRuntime.ingest?.offeredCount, 10_001);
assert.ok(
	boundedIngestCalls > 1,
	"large feed must be ingested through awaited batches",
);
assert.ok(
	largestIngestBatch <= 37,
	"ingest batch must stay within its configured bound",
);
assert.ok(
	(boundedRuntime.maxBufferedOffersObserved ?? Number.POSITIVE_INFINITY) <= 37,
	"runtime must never buffer more offers than the configured batch bound",
);

let cacheWarningFinish;
const cacheWarningRuntime = await runImportFeed(
	{
		now: () => new Date("2026-09-18T06:00:00.000Z"),
		claimQueuedImportRun: async () => "cache-warning-run",
		touchHeartbeat: async () => undefined,
		loadFeedSource: async () => ({
			id: "cache-warning-source",
			code: "cache-warning",
			enabled: true,
			market: "secondary",
			feedUrlRef: "CACHE_WARNING_FEED_URL",
			lastOfferCount: null,
			safetyThresholdPercent: 30,
			maxDeactivationsPerRun: 50,
		}),
		resolveFeedUrl: () => "https://feeds.example.test/cache-warning.xml",
		fetchFeed: async () => ({
			status: "fetched",
			body: [],
			sha256: Promise.resolve("cache-warning-hash"),
		}),
		parseFeed: async ({ onOffer }) => {
			await onOffer?.(offer);
			return {
				offers: [],
				issues: [],
				stats: {
					offersSeen: 1,
					maxRetainedCharsObserved: 0,
					maxBufferedOffersObserved: 1,
					parserCompleted: true,
					criticalStructuralAnomaly: false,
				},
			};
		},
		createRepository: () => createRepository(),
		ingest: async () => ({
			offeredCount: 1,
			createdCount: 1,
			updatedCount: 0,
			skippedCount: 0,
			warningCount: 0,
			errorCount: 0,
			invalidatedTargets: [{ type: "tag", tag: "properties" }],
		}),
		invalidatePublicCache: async () => ({ ok: false }),
		finishRun: async (finish) => {
			cacheWarningFinish = finish;
		},
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(),
	},
	{ feedSourceId: "cache-warning-source", importRunId: "cache-warning-run" },
);
assert.equal(cacheWarningRuntime.status, "success");
assert.equal(cacheWarningRuntime.cacheInvalidated, false);
assert.equal(cacheWarningRuntime.ingest?.warningCount, 1);
assert.equal(cacheWarningFinish?.status, "success");
assert.equal(cacheWarningFinish?.warningCount, 1);

let approvalDeactivationCalls = 0;
let approvalFinishStatus;
const approvalRepository = {
	...createRepository(),
	countMissingActive: async () => 51,
	deactivateMissing: async () => {
		approvalDeactivationCalls += 1;
		return 51;
	},
};
const rejectedApproval = await runImportFeed(
	{
		now: () => new Date("2026-09-18T06:00:00.000Z"),
		claimQueuedImportRun: async () => "approval-run",
		touchHeartbeat: async () => undefined,
		loadFeedSource: async () => ({
			id: "approval-source",
			code: "approval",
			enabled: true,
			market: "secondary",
			feedUrlRef: "APPROVAL_FEED_URL",
			lastOfferCount: 100,
			safetyThresholdPercent: 30,
			maxDeactivationsPerRun: 50,
			deactivationApproval: {
				runId: "approval-run",
				approvedAt: "2026-09-18T05:00:00.000Z",
				expiresAt: "2026-09-18T07:00:00.000Z",
			},
		}),
		resolveFeedUrl: () => "https://feeds.example.test/approval.xml",
		fetchFeed: async () => ({
			status: "fetched",
			body: [],
			sha256: Promise.resolve("approval-hash"),
		}),
		parseFeed: async () => ({
			offers: [],
			issues: [],
			stats: {
				offersSeen: 100,
				maxRetainedCharsObserved: 0,
				maxBufferedOffersObserved: 0,
				parserCompleted: true,
				criticalStructuralAnomaly: false,
			},
		}),
		createRepository: () => approvalRepository,
		ingest: async () => ({
			offeredCount: 100,
			createdCount: 0,
			updatedCount: 0,
			skippedCount: 100,
			warningCount: 0,
			errorCount: 0,
			invalidatedTargets: [],
		}),
		consumeDeactivationApproval: async () => false,
		finishRun: async ({ status }) => {
			approvalFinishStatus = status;
		},
		recordSourceContact: async () => undefined,
		allowedImageHosts: new Set(),
	},
	{ feedSourceId: "approval-source", importRunId: "approval-run" },
);
assert.equal(rejectedApproval.status, "suspicious");
assert.equal(approvalFinishStatus, "suspicious");
assert.equal(
	approvalDeactivationCalls,
	0,
	"failed one-time approval consumption must prevent destructive deactivation",
);

const { chunkCacheTargets, postBatchedHttpRevalidate } = await import(
	"../src/core/cache/http-revalidate.ts"
);
const { executeInternalRevalidation } = await import(
	"../src/core/cache/internal-route-executor.ts"
);
let unauthorizedInvalidation = false;
const unauthorized = await executeInternalRevalidation({
	expectedSecret: "expected-secret",
	providedSecret: "wrong-secret",
	body: { targets: [{ type: "tag", tag: "properties" }] },
	invalidate: async () => {
		unauthorizedInvalidation = true;
	},
});
assert.equal(unauthorized.status, 404);
assert.equal(unauthorizedInvalidation, false);
assert.equal(
	chunkCacheTargets(new Array(33).fill({ type: "tag", tag: "properties" }))
		.length,
	2,
);
let postedBodies = 0;
const httpOk = await postBatchedHttpRevalidate({
	baseUrl: "https://start-baza.ams24.ru",
	secret: "fixture-secret",
	targets: [
		{ type: "tag", tag: "properties" },
		{ type: "path", path: "/kvartiry/", routeType: "page" },
	],
	fetchImpl: async (_url, init) => {
		postedBodies += 1;
		const body = JSON.parse(String(init.body));
		assert.equal(body.targets.length, 2);
		return new Response(JSON.stringify({ revalidated: true, count: 2 }), {
			status: 200,
		});
	},
});
assert.equal(httpOk.ok, true);
assert.equal(postedBodies, 1);
const httpFail = await postBatchedHttpRevalidate({
	baseUrl: "https://start-baza.ams24.ru",
	secret: "fixture-secret",
	targets: [{ type: "tag", tag: "properties" }],
	fetchImpl: async () => new Response("no", { status: 500 }),
});
assert.equal(httpFail.ok, false);
assert.equal(httpFail.warning, true);

assert.equal(
	isEnabledFeedDue({
		enabled: true,
		nextDueAt: null,
		nowIso: "2026-09-18T06:00:00.000Z",
	}),
	true,
);
const nullDueDispatch = await dispatchDueFeeds({
	now: new Date("2026-09-18T06:00:00.000Z"),
	claimDueFeedSources: async () =>
		isEnabledFeedDue({
			enabled: true,
			nextDueAt: null,
			nowIso: "2026-09-18T06:00:00.000Z",
		})
			? [
					{
						id: "null-due",
						code: "n",
						market: "secondary",
						feedUrlRef: "FEED_N_URL",
						refreshIntervalMinutes: 60,
						nextDueAt: "2026-09-18T06:00:00.000Z",
						safetyThresholdPercent: 30,
						maxDeactivationsPerRun: 50,
						enabled: true,
					},
				]
			: [],
	createQueuedImportRun: async ({ feedSourceId }) => ({
		id: `run-${feedSourceId}`,
	}),
	enqueueImportFeed: async () => ({ id: "job-null" }),
	attachJobId: async () => undefined,
});
assert.equal(nullDueDispatch.dispatched.length, 1);

const importRuntime = readFileSync(
	"src/core/ingest/import-feed-runtime.ts",
	"utf8",
);
const ownerFeed = readFileSync(
	"src/project/ingest/owner-feed-operations.ts",
	"utf8",
);
assert.ok(
	importRuntime.includes(
		"safetyThresholdPercent: source.safetyThresholdPercent",
	),
	"import runtime must use source safetyThresholdPercent",
);
assert.ok(
	importRuntime.includes(
		"maxDeactivationsPerRun: source.maxDeactivationsPerRun",
	),
	"import runtime must use source maxDeactivationsPerRun",
);
assert.equal(
	ownerFeed.includes("safetyThresholdPercent: 0"),
	false,
	"manual import must not bypass safety knobs",
);
assert.ok(
	ownerFeed.includes('task: "importFeed"'),
	"manual import must enqueue the same importFeed job",
);

console.log("verify-feed-ingest: ok");

function createRepository() {
	const byId = new Map();
	const issues = [];
	const cacheInvalidations = [];
	const touched = [];
	const deactivated = [];

	return {
		byId,
		issues,
		cacheInvalidations,
		touched,
		deactivated,
		async findFeedProperty({ feedSourceId, externalId }) {
			return [...byId.values()].find(
				(record) =>
					record.feedSource === feedSourceId &&
					record.externalId === externalId,
			);
		},
		async createFeedProperty(data) {
			const record = {
				...data,
				id: `property-${byId.size + 1}`,
				slug: data.slug,
				manualOverrides: [],
			};
			byId.set(record.id, record);
			return record;
		},
		async updateFeedProperty(id, data) {
			const existing = byId.get(id);
			if (data.feedSource && data.feedSource !== existing.feedSource) {
				throw new Error("Feed ingest repository is source-scoped.");
			}
			const next = { ...existing, ...data };
			byId.set(id, next);
			return next;
		},
		async createImportIssue(issue) {
			issues.push(issue);
		},
		async touchLastSeenAt(input) {
			touched.push(input);
			for (const record of byId.values()) {
				if (
					record.feedSource === input.feedSourceId &&
					input.externalIds.includes(record.externalId)
				) {
					record.lastSeenAt = input.nowIso;
					record.lastImportRun = input.importRunId;
				}
			}
		},
		async countMissingActive({ feedSourceId, seenBeforeIso }) {
			return [...byId.values()].filter(
				(record) =>
					record.feedSource === feedSourceId &&
					record.status === "active" &&
					(!record.lastSeenAt || record.lastSeenAt < seenBeforeIso),
			).length;
		},
		async deactivateMissing({
			feedSourceId,
			importRunId,
			seenBeforeIso,
			nowIso,
		}) {
			let count = 0;
			for (const record of byId.values()) {
				if (
					record.feedSource === feedSourceId &&
					record.status === "active" &&
					(!record.lastSeenAt || record.lastSeenAt < seenBeforeIso)
				) {
					record.status = "archived";
					record.deactivatedAt = nowIso;
					record.deactivatedByRun = importRunId;
					count += 1;
				}
			}
			deactivated.push({ feedSourceId, importRunId, count });
			return count;
		},
		async invalidateCache(targets) {
			cacheInvalidations.push(targets);
		},
	};
}
