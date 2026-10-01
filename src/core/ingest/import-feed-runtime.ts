import type { FeedIngestRepository, FeedIngestResult } from "./feed-ingest.ts";
import { ingestNormalizedFeed } from "./feed-ingest.ts";
import type { FetchFeedResult } from "./feed-fetcher.ts";
import {
	buildFeedSourceBaselinePatch,
	decideFeedRunCompletion,
	isDeactivationApprovalValid,
	type DeactivationApprovalSnapshot,
	type FeedSourceBaselinePatch,
} from "./feed-lifecycle.ts";
import { parseAllowedImageHosts } from "./image-hosts.ts";
import type {
	FeedNormalizationIssue,
	NormalizedFeedOffer,
} from "./feed-normalization.ts";
import { parseYrlFeed } from "./yrl-parser.ts";
import { startImportHeartbeat } from "./dispatch-due-feeds.ts";
import type { FeedPropertyImageDraft } from "./feed-ingest.ts";

const defaultHeartbeatIntervalMs = 15_000;
const defaultIngestBatchSize = 100;

export type ImportFeedSourceSnapshot = {
	id: string;
	code: string;
	enabled: boolean;
	market: "secondary" | "newbuild";
	feedUrlRef: string;
	lastEtag?: string | null;
	lastModified?: string | null;
	lastFeedHash?: string | null;
	lastOfferCount?: number | null;
	safetyThresholdPercent: number;
	maxDeactivationsPerRun: number;
	deactivationApproval?: DeactivationApprovalSnapshot;
};

export type ImportFeedRuntimeDeps = {
	now: () => Date;
	heartbeatIntervalMs?: number;
	ingestBatchSize?: number;
	claimQueuedImportRun: (input: {
		importRunId: string;
		now: Date;
	}) => Promise<string | undefined>;
	touchHeartbeat: (input: { importRunId: string; now: Date }) => Promise<void>;
	loadFeedSource: (feedSourceId: string) => Promise<ImportFeedSourceSnapshot>;
	resolveFeedUrl: (feedUrlRef: string) => string;
	fetchFeed: (input: {
		url: string;
		etag?: string | null;
		lastModified?: string | null;
	}) => Promise<FetchFeedResult>;
	parseFeed?: typeof parseYrlFeed;
	createRepository: (feedSourceId: string) => FeedIngestRepository;
	ingest?: typeof ingestNormalizedFeed;
	finishRun: (input: {
		importRunId: string;
		now: Date;
		status: "success" | "unchanged" | "suspicious" | "interrupted" | "failed";
		offeredCount?: number;
		createdCount?: number;
		updatedCount?: number;
		skippedCount?: number;
		warningCount?: number;
		errorCount?: number;
		feedHash?: string;
		lastErrorRedacted?: string;
	}) => Promise<void>;
	recordSourceContact: (input: {
		feedSourceId: string;
		patch: FeedSourceBaselinePatch;
	}) => Promise<void>;
	consumeDeactivationApproval?: (input: {
		feedSourceId: string;
		importRunId: string;
		now: Date;
	}) => Promise<boolean>;
	invalidatePublicCache?: (
		targets: FeedIngestResult["invalidatedTargets"],
	) => Promise<{ ok: boolean }>;
	allowedImageHosts: ReadonlySet<string>;
	mirrorImages?: (offer: NormalizedFeedOffer) => Promise<{
		images: FeedPropertyImageDraft[];
		issues: Array<{ field: string; messageRedacted: string }>;
	}>;
};

export type ImportFeedRuntimeResult =
	| { claimed: false }
	| {
			claimed: true;
			status: "success" | "unchanged" | "suspicious" | "interrupted" | "failed";
			ingest?: FeedIngestResult;
			cacheInvalidated?: boolean;
			maxBufferedOffersObserved?: number;
	  };

function emptyIngestResult(): FeedIngestResult {
	return {
		offeredCount: 0,
		createdCount: 0,
		updatedCount: 0,
		skippedCount: 0,
		warningCount: 0,
		errorCount: 0,
		invalidatedTargets: [],
	};
}

function mergeIngestResult(
	target: FeedIngestResult,
	batch: FeedIngestResult,
): void {
	for (const key of [
		"offeredCount",
		"createdCount",
		"updatedCount",
		"skippedCount",
		"warningCount",
		"errorCount",
	] as const) {
		target[key] += batch[key];
	}
	for (const next of batch.invalidatedTargets) {
		if (
			!target.invalidatedTargets.some(
				(current) => JSON.stringify(current) === JSON.stringify(next),
			)
		) {
			target.invalidatedTargets.push(next);
		}
	}
}

export async function runImportFeed(
	deps: ImportFeedRuntimeDeps,
	input: { feedSourceId: string; importRunId: string },
): Promise<ImportFeedRuntimeResult> {
	const now = deps.now();
	const claimedId = await deps.claimQueuedImportRun({
		importRunId: input.importRunId,
		now,
	});
	if (!claimedId) {
		return { claimed: false };
	}

	const heartbeat = startImportHeartbeat({
		intervalMs: deps.heartbeatIntervalMs ?? defaultHeartbeatIntervalMs,
		tick: () =>
			deps.touchHeartbeat({ importRunId: input.importRunId, now: deps.now() }),
	});

	try {
		const source = await deps.loadFeedSource(input.feedSourceId);
		const url = deps.resolveFeedUrl(source.feedUrlRef);
		const fetched = await deps.fetchFeed({
			url,
			etag: source.lastEtag,
			lastModified: source.lastModified,
		});

		if (fetched.status === "unchanged") {
			await deps.finishRun({
				importRunId: input.importRunId,
				now: deps.now(),
				status: "unchanged",
			});
			await deps.recordSourceContact({
				feedSourceId: source.id,
				patch: buildFeedSourceBaselinePatch({
					status: "unchanged",
					parserCompleted: true,
					criticalStructuralError: false,
					nowIso: deps.now().toISOString(),
					etag: fetched.etag,
					lastModified: fetched.lastModified,
				}),
			});
			return { claimed: true, status: "unchanged" };
		}

		const parse = deps.parseFeed ?? parseYrlFeed;
		const ingest = deps.ingest ?? ingestNormalizedFeed;
		const repository = deps.createRepository(source.id);
		const batchSize = deps.ingestBatchSize ?? defaultIngestBatchSize;
		if (!Number.isInteger(batchSize) || batchSize < 1) {
			throw new Error("ingestBatchSize must be a positive integer.");
		}
		const context = {
			feedSourceId: source.id,
			feedSourceCode: source.code,
			importRunId: input.importRunId,
			market: source.market,
			nowIso: now.toISOString(),
		};
		let offerBatch: NormalizedFeedOffer[] = [];
		let issueBatch: FeedNormalizationIssue[] = [];
		let maxBufferedOffersObserved = 0;
		const ingestResult = emptyIngestResult();
		const flushBatch = async () => {
			if (offerBatch.length === 0 && issueBatch.length === 0) return;
			const currentOffers = offerBatch;
			const currentIssues = issueBatch;
			offerBatch = [];
			issueBatch = [];
			mergeIngestResult(
				ingestResult,
				await ingest({
					context,
					offers: currentOffers,
					issues: currentIssues,
					repository,
					mirrorImages: deps.mirrorImages,
				}),
			);
		};
		const parsed = await parse({
			stream: fetched.body,
			allowedImageHosts: deps.allowedImageHosts,
			onOffer: async (offer) => {
				offerBatch.push(offer);
				maxBufferedOffersObserved = Math.max(
					maxBufferedOffersObserved,
					offerBatch.length,
				);
				if (offerBatch.length + issueBatch.length >= batchSize)
					await flushBatch();
			},
			onIssue: async (issue) => {
				issueBatch.push(issue);
				if (offerBatch.length + issueBatch.length >= batchSize)
					await flushBatch();
			},
			collectOffers: false,
			collectIssues: false,
		});
		await flushBatch();
		const bodyHash = (await fetched.sha256) ?? undefined;

		const seenBefore = now;
		const plannedDeactivations = await repository.countMissingActive({
			feedSourceId: source.id,
			seenBeforeIso: seenBefore.toISOString(),
		});
		const hasValidDeactivationApproval = isDeactivationApprovalValid({
			importRunId: input.importRunId,
			nowIso: seenBefore.toISOString(),
			approval: source.deactivationApproval,
		});
		const decisionInput = {
			nowIso: seenBefore.toISOString(),
			sourceEnabled: source.enabled,
			parserCompleted: parsed.stats.parserCompleted,
			criticalStructuralError: parsed.stats.criticalStructuralAnomaly,
			identityValid: true,
			runInterrupted: false,
			isFirstFullRun: source.lastOfferCount == null,
			offeredCount: ingestResult.offeredCount,
			previousOfferCount: source.lastOfferCount ?? undefined,
			safetyThresholdPercent: source.safetyThresholdPercent,
			plannedDeactivations,
			maxDeactivationsPerRun: source.maxDeactivationsPerRun,
			hasValidDeactivationApproval,
			fetchStatus: "fetched" as const,
			feedHash: bodyHash,
			lastFeedHash: source.lastFeedHash ?? undefined,
		};
		let decision = decideFeedRunCompletion(decisionInput);
		if (decision.reason === "approved_deactivation") {
			const consumed = await deps.consumeDeactivationApproval?.({
				feedSourceId: source.id,
				importRunId: input.importRunId,
				now: seenBefore,
			});
			if (!consumed) {
				decision = decideFeedRunCompletion({
					...decisionInput,
					hasValidDeactivationApproval: false,
				});
			}
		}

		if (decision.canDeactivateMissing && plannedDeactivations > 0) {
			await repository.deactivateMissing({
				feedSourceId: source.id,
				importRunId: input.importRunId,
				seenBeforeIso: seenBefore.toISOString(),
				nowIso: deps.now().toISOString(),
			});
			if (ingestResult.invalidatedTargets.length === 0) {
				ingestResult.invalidatedTargets = [
					{ type: "tag", tag: "properties" },
					{ type: "path", path: "/kvartiry/", routeType: "page" },
				];
			}
		}

		let cacheOk = true;
		if (
			ingestResult.invalidatedTargets.length > 0 &&
			deps.invalidatePublicCache
		) {
			const cacheResult = await deps.invalidatePublicCache(
				ingestResult.invalidatedTargets,
			);
			cacheOk = cacheResult.ok;
			if (!cacheOk) {
				ingestResult.warningCount += 1;
			}
		}

		await deps.finishRun({
			importRunId: input.importRunId,
			now: deps.now(),
			status: decision.status,
			offeredCount: ingestResult.offeredCount,
			createdCount: ingestResult.createdCount,
			updatedCount: ingestResult.updatedCount,
			skippedCount: ingestResult.skippedCount,
			warningCount: ingestResult.warningCount,
			errorCount: ingestResult.errorCount,
			feedHash: bodyHash,
		});
		await deps.recordSourceContact({
			feedSourceId: source.id,
			patch: buildFeedSourceBaselinePatch({
				status: decision.status,
				parserCompleted: parsed.stats.parserCompleted,
				criticalStructuralError: parsed.stats.criticalStructuralAnomaly,
				nowIso: deps.now().toISOString(),
				etag: fetched.etag,
				lastModified: fetched.lastModified,
				feedHash: bodyHash,
				offeredCount: ingestResult.offeredCount,
			}),
		});
		return {
			claimed: true,
			status: decision.status,
			ingest: ingestResult,
			cacheInvalidated: cacheOk,
			maxBufferedOffersObserved,
		};
	} catch {
		await deps.finishRun({
			importRunId: input.importRunId,
			now: deps.now(),
			status: "failed",
			lastErrorRedacted:
				"Import feed failed without exposing destination details.",
		});
		return { claimed: true, status: "failed" };
	} finally {
		heartbeat.stop();
	}
}

export function parseFeedUrlRef(
	feedUrlRef: string,
	env: NodeJS.ProcessEnv = process.env,
): string {
	const value = env[feedUrlRef];
	if (
		!value ||
		(!value.startsWith("https://") && !value.startsWith("http://"))
	) {
		throw new Error("Feed URL reference is not configured.");
	}
	return value;
}

export function parseImageHostEnv(value?: string): ReadonlySet<string> {
	return parseAllowedImageHosts(value ?? "");
}
