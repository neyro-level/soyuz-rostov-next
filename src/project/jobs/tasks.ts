import type { PayloadRequest, TaskConfig } from "payload";
import { invalidatePublicCache } from "../../core/cache/invalidator.ts";
import {
	claimDueFeedSources,
	claimQueuedImportRun,
	consumeDeactivationApproval,
	finishImportRun,
	touchImportRunHeartbeat,
} from "../../core/data-access/ingest/sql/index.ts";
import {
	inspectPayloadJob,
	listPayloadJobsByConcurrencyKey,
} from "../../core/data-access/system/jobs/index.ts";
import { systemOverrideAccess } from "../../core/data-access/system/overrides.ts";
import { systemQueueJob } from "../../core/data-access/system/queue-job.ts";
import { dispatchDueFeeds } from "../../core/ingest/dispatch-due-feeds.ts";
import { fetchConditionalFeed } from "../../core/ingest/feed-fetcher.ts";
import {
	parseFeedUrlRef,
	parseImageHostEnv,
	runImportFeed,
} from "../../core/ingest/import-feed-runtime.ts";
import { createPayloadFeedIngestRepository } from "../../core/ingest/payload-feed-ingest-repository.ts";
import { createPayloadFeedMediaMirror } from "../ingest/payload-media-mirror.ts";
import { runDeliverLeadTask } from "../../core/leads/deliver-lead.ts";
import {
	recoverStaleSendingDelivery,
	type LeadDeliveryStateRecord,
} from "../../core/leads/delivery-state.ts";
import { isLiveFuturePayloadJob } from "../../core/leads/job-liveness.ts";
import {
	anonymizeLeadFields,
	isConfiguredRetentionDays,
	planLeadRetentionRun,
	purgeDeliveryDiagnostics,
} from "../../core/leads/retention.ts";
import {
	importStaleThresholdMs,
	observedSuccessfulDurationMs,
	queuedImportOrphanThresholdMs,
} from "../../core/operations/recovery-thresholds.ts";
import {
	createSafeFeedOutboundFetch,
	parseOutboundHostList,
} from "../../core/security/safe-outbound-client.ts";
import { parseTestApprovedOrigins } from "../../core/security/test-destinations.ts";
import { getRuntimeClock } from "../../core/time/clock.ts";
import { projectConfig } from "../project.config.ts";
import { runtimeEnv } from "../env.ts";
import { runIndexNowTask } from "./indexnow-task.ts";
import {
	type PayloadJobTaskSlug,
	payloadJobQueues,
	payloadJobRegistry,
	payloadJobTaskSlugs,
} from "./registry.ts";

type GenericPayloadJobTask = TaskConfig<{
	input: Record<string, unknown>;
	output: Record<string, unknown>;
}>;

const minuteInMs = 60_000;
const jobAccess = systemOverrideAccess("system-job");

function nowDate() {
	return getRuntimeClock().now();
}

function nowIso() {
	return getRuntimeClock().nowIso();
}

function addMinutes(date: Date, minutes: number) {
	return new Date(date.getTime() + minutes * minuteInMs);
}

export function computeNextDueAt({
	now,
	previousNextDueAt,
	refreshIntervalMinutes,
}: {
	now: Date;
	previousNextDueAt?: null | string;
	refreshIntervalMinutes: number;
}) {
	const nextFromNow = addMinutes(now, refreshIntervalMinutes);
	const previous = previousNextDueAt ? new Date(previousNextDueAt) : undefined;
	const nextFromPrevious = previous
		? addMinutes(previous, refreshIntervalMinutes)
		: undefined;

	if (nextFromPrevious && nextFromPrevious > nextFromNow) {
		return nextFromPrevious.toISOString();
	}

	return nextFromNow.toISOString();
}

function getStaticSchedule(slug: PayloadJobTaskSlug) {
	const task = payloadJobRegistry.find((entry) => entry.slug === slug);

	if (task?.trigger !== "static" || !task.cron) {
		throw new Error(`Task "${slug}" is not a static scheduled task.`);
	}

	return [{ cron: task.cron, queue: task.queue }];
}

async function queueTask({
	req,
	task,
	queue,
	input,
	waitUntil,
}: {
	req: PayloadRequest;
	task: PayloadJobTaskSlug;
	queue: string;
	input: Record<string, unknown>;
	waitUntil?: Date;
}) {
	return systemQueueJob({
		req,
		task: task as never,
		queue,
		input: input as never,
		waitUntil,
	});
}

export const payloadJobTasks: GenericPayloadJobTask[] = [
	{
		slug: payloadJobTaskSlugs.dispatchDueFeeds,
		label: "Dispatch due feeds",
		schedule: getStaticSchedule(payloadJobTaskSlugs.dispatchDueFeeds),
		handler: async ({ req }) => {
			const now = nowDate();
			const result = await dispatchDueFeeds({
				now,
				batchSize: projectConfig.dispatchBatchSize,
				claimDueFeedSources: (input) => claimDueFeedSources(req.payload, input),
				createQueuedImportRun: async ({ feedSourceId, now: queuedAt }) => {
					const created = await req.payload.create({
						collection: "import-runs",
						data: {
							feedSource: Number(feedSourceId),
							status: "queued",
							queuedAt: queuedAt.toISOString(),
							heartbeatAt: queuedAt.toISOString(),
						},
						...systemOverrideAccess("system-job"),
					});
					return { id: String(created.id) };
				},
				enqueueImportFeed: async (input) => {
					const queuedJob = (await queueTask({
						req,
						task: payloadJobTaskSlugs.importFeed,
						queue: payloadJobQueues.imports,
						input,
					})) as { id: number | string };
					return { id: String(queuedJob.id) };
				},
				attachJobId: async ({ importRunId, jobId }) => {
					await req.payload.update({
						collection: "import-runs",
						id: importRunId,
						data: { jobId },
						...systemOverrideAccess("system-job"),
					});
				},
			});

			return {
				output: {
					dispatched: result.dispatched.length > 0,
					count: result.dispatched.length,
					items: result.dispatched,
				},
			};
		},
	},
	{
		slug: payloadJobTaskSlugs.importFeed,
		label: "Import feed",
		retries: 0,
		inputSchema: [
			{ name: "feedSourceId", type: "text", required: true },
			{ name: "importRunId", type: "text", required: true },
		],
		concurrency: {
			key: ({ input }) => `import:feed:${input.feedSourceId}`,
			exclusive: true,
			supersedes: false,
		},
		handler: async ({ req, input }) => {
			const payload = req.payload;
			const testOrigins = parseTestApprovedOrigins(process.env);
			const testHosts = [
				...new Set(testOrigins.map((origin) => new URL(origin).hostname)),
			];
			const imageHosts = parseImageHostEnv(runtimeEnv.EXTERNAL_IMAGE_HOSTS);
			const result = await runImportFeed(
				{
					now: () => nowDate(),
					heartbeatIntervalMs: projectConfig.importHeartbeatIntervalMs,
					ingestBatchSize: projectConfig.ingestBatchSize,
					claimQueuedImportRun: (claim) => claimQueuedImportRun(payload, claim),
					touchHeartbeat: async (tick) => {
						await touchImportRunHeartbeat(payload, tick);
					},
					loadFeedSource: async (feedSourceId) => {
						const source = await payload.findByID({
							collection: "feed-sources",
							id: feedSourceId,
							depth: 0,
							...systemOverrideAccess("system-job"),
						});
						return {
							id: String(source.id),
							code: source.code,
							enabled: Boolean(source.enabled),
							market: source.market,
							feedUrlRef: source.feedUrlRef,
							lastEtag: source.lastEtag,
							lastModified: source.lastModified,
							lastFeedHash: source.lastFeedHash,
							lastOfferCount: source.lastOfferCount,
							safetyThresholdPercent: source.safetyThresholdPercent,
							maxDeactivationsPerRun: source.maxDeactivationsPerRun,
							deactivationApproval: {
								runId:
									typeof source.deactivationApproval?.runId === "object" &&
									source.deactivationApproval.runId
										? String(source.deactivationApproval.runId.id)
										: source.deactivationApproval?.runId == null
											? undefined
											: String(source.deactivationApproval.runId),
								approvedAt: source.deactivationApproval?.approvedAt,
								expiresAt: source.deactivationApproval?.expiresAt,
								consumedAt: source.deactivationApproval?.consumedAt,
							},
						};
					},
					resolveFeedUrl: parseFeedUrlRef,
					fetchFeed: ({ url, etag, lastModified }) =>
						fetchConditionalFeed({
							url,
							etag,
							lastModified,
							outboundFetch: createSafeFeedOutboundFetch({
								allowedHosts: [
									...parseOutboundHostList(runtimeEnv.OUTBOUND_ALLOWED_HOSTS),
									...testHosts,
								],
								approvedHttpHosts: testHosts,
								approvedExactOrigins: testOrigins,
								maxBytes: 64 * 1024 * 1024,
							}),
						}),
					createRepository: (feedSourceId) =>
						createPayloadFeedIngestRepository(payload, feedSourceId),
					finishRun: async (finish) => {
						const transitioned = await finishImportRun(payload, finish);
						if (!transitioned) {
							throw new Error(
								"Import run terminal transition rejected because it is no longer running.",
							);
						}
					},
					recordSourceContact: async ({ feedSourceId, patch }) => {
						if (Object.keys(patch).length === 0) return;
						await payload.update({
							collection: "feed-sources",
							id: feedSourceId,
							data: patch,
							...systemOverrideAccess("system-job"),
						});
					},
					consumeDeactivationApproval: (input) =>
						consumeDeactivationApproval(payload, input),
					invalidatePublicCache: async (targets) => {
						const result = await invalidatePublicCache({
							baseUrl: runtimeEnv.INTERNAL_REVALIDATE_BASE_URL,
							secret: runtimeEnv.REVALIDATE_SECRET,
							targets,
							reason: "import-feed",
						});
						return { ok: result.ok };
					},
					allowedImageHosts: imageHosts,
					mirrorImages: createPayloadFeedMediaMirror({
						payload,
						allowedHosts: imageHosts,
						feedSourceId: String(input.feedSourceId),
						nowIso,
					}),
				},
				{
					feedSourceId: String(input.feedSourceId),
					importRunId: String(input.importRunId),
				},
			);

			return { output: result };
		},
	},
	{
		slug: payloadJobTaskSlugs.jobsJanitor,
		label: "Jobs janitor",
		schedule: getStaticSchedule(payloadJobTaskSlugs.jobsJanitor),
		handler: async ({ req }) => {
			const recentSuccess = await req.payload.find({
				collection: "import-runs",
				where: { status: { equals: "success" } },
				sort: "-finishedAt",
				limit: 5,
				depth: 0,
				req,
				...jobAccess,
			});
			const importStaleMs = importStaleThresholdMs(
				observedSuccessfulDurationMs(recentSuccess.docs),
			);
			const queuedOrphanMs = queuedImportOrphanThresholdMs(
				projectConfig.dispatcherIntervalMinutes,
			);
			const importStaleBefore = new Date(
				nowDate().getTime() - importStaleMs,
			).toISOString();
			const queuedOrphanBefore = new Date(
				nowDate().getTime() - queuedOrphanMs,
			).toISOString();
			const staleRuns = await req.payload.find({
				collection: "import-runs",
				where: {
					or: [
						{
							and: [
								{ status: { equals: "running" } },
								{ heartbeatAt: { less_than: importStaleBefore } },
							],
						},
						{
							and: [
								{ status: { equals: "queued" } },
								{ queuedAt: { less_than: queuedOrphanBefore } },
								{ jobId: { exists: false } },
							],
						},
					],
				},
				limit: 20,
				depth: 0,
				req,
				...jobAccess,
			});

			for (const run of staleRuns.docs) {
				await req.payload.update({
					collection: "import-runs",
					id: run.id,
					data: {
						status: "interrupted",
						finishedAt: nowIso(),
						lastErrorRedacted:
							"Recovered by jobsJanitor: stale or orphan import run.",
					},
					req,
					...systemOverrideAccess("system-job"),
				});
			}

			return { output: { interruptedRuns: staleRuns.docs.length } };
		},
	},
	{
		slug: payloadJobTaskSlugs.leadRetentionCleanup,
		label: "Lead retention cleanup",
		schedule: getStaticSchedule(payloadJobTaskSlugs.leadRetentionCleanup),
		handler: async ({ req }) => {
			const decision = planLeadRetentionRun(projectConfig.leadRetentionDays);
			if (!decision.destructive) {
				return {
					output: {
						purgedLeads: 0,
						skipped: decision.reason,
						alert: decision.alert.code,
					},
				};
			}

			const expiredLeads = await req.payload.find({
				collection: "leads",
				where: {
					and: [
						{ retentionUntil: { less_than_equal: nowIso() } },
						{ piiPurgedAt: { exists: false } },
					],
				},
				limit: 20,
				depth: 0,
				req,
				...jobAccess,
			});
			const purgedAt = nowIso();
			let deleted = 0;
			let anonymized = 0;

			for (const lead of expiredLeads.docs) {
				const deliveries = await req.payload.find({
					collection: "lead-deliveries",
					where: { lead: { equals: lead.id } },
					limit: 50,
					depth: 0,
					req,
					...jobAccess,
				});

				for (const delivery of deliveries.docs) {
					await req.payload.update({
						collection: "lead-deliveries",
						id: delivery.id,
						data: purgeDeliveryDiagnostics(purgedAt),
						req,
						...jobAccess,
					});
				}

				if (lead.retentionMode === "delete") {
					await req.payload.delete({
						collection: "leads",
						id: lead.id,
						req,
						...jobAccess,
					});
					deleted += 1;
					continue;
				}

				await req.payload.update({
					collection: "leads",
					id: lead.id,
					data: anonymizeLeadFields(purgedAt),
					req,
					...jobAccess,
				});
				anonymized += 1;
			}

			return {
				output: {
					purgedLeads: deleted + anonymized,
					deleted,
					anonymized,
				},
			};
		},
	},
	{
		slug: payloadJobTaskSlugs.catalogLifecycle,
		label: "Catalog lifecycle",
		schedule: getStaticSchedule(payloadJobTaskSlugs.catalogLifecycle),
		handler: async ({ req }) => {
			const retentionDays = projectConfig.archiveRetentionDays;
			if (!isConfiguredRetentionDays(retentionDays)) {
				return {
					output: {
						purgedProperties: 0,
						skipped: "missing_policy",
					},
				};
			}
			const threshold = new Date(
				Date.now() - retentionDays * 24 * 60 * minuteInMs,
			).toISOString();
			const archivedProperties = await req.payload.find({
				collection: "properties",
				where: {
					and: [
						{ status: { equals: "archived" } },
						{ contentPurgedAt: { exists: false } },
						{ deactivatedAt: { less_than_equal: threshold } },
					],
				},
				limit: 20,
				depth: 0,
				req,
				...jobAccess,
			});
			const purgedAt = nowIso();

			for (const property of archivedProperties.docs) {
				await req.payload.update({
					collection: "properties",
					id: property.id,
					data: {
						description: null,
						images: [],
						contentPurgedAt: purgedAt,
					},
					req,
					...jobAccess,
				});
				// Purge never writes a homepage redirect; public path becomes 410
				// unless an explicit redirects.from row already exists.
			}

			return { output: { purgedProperties: archivedProperties.docs.length } };
		},
	},
	{
		slug: payloadJobTaskSlugs.recoverLeadDeliveries,
		label: "Recover lead deliveries",
		schedule: getStaticSchedule(payloadJobTaskSlugs.recoverLeadDeliveries),
		handler: async ({ req }) => {
			const recoveryNowIso = nowIso();
			const staleThreshold = new Date(
				nowDate().getTime() -
					projectConfig.leadDelivery.staleSendingThresholdMinutes * 60_000,
			).toISOString();
			const staleSending = await req.payload.find({
				collection: "lead-deliveries",
				where: {
					and: [
						{ status: { equals: "sending" } },
						{ heartbeatAt: { less_than: staleThreshold } },
					],
				},
				limit: 20,
				depth: 0,
				req,
				...jobAccess,
			});

			for (const delivery of staleSending.docs) {
				const recovered = recoverStaleSendingDelivery(
					{
						id: String(delivery.id),
						lead: String(delivery.lead),
						channelId: delivery.channelId,
						status: "sending",
						attempts: delivery.attempts,
						nextAttemptAt: delivery.nextAttemptAt ?? undefined,
						jobId: delivery.jobId ?? undefined,
						claimedAt: delivery.claimedAt ?? undefined,
						heartbeatAt: delivery.heartbeatAt ?? undefined,
						attemptLog:
							(delivery.attemptLog as LeadDeliveryStateRecord["attemptLog"]) ??
							undefined,
					},
					recoveryNowIso,
					projectConfig.leadDelivery,
				);
				if (!recovered) continue;
				await req.payload.update({
					collection: "lead-deliveries",
					id: delivery.id,
					data: {
						status: recovered.status,
						nextAttemptAt: recovered.nextAttemptAt,
						jobId: recovered.jobId ?? null,
						claimedAt: recovered.claimedAt ?? null,
						heartbeatAt: recovered.heartbeatAt ?? null,
						lastErrorKind: recovered.lastErrorKind,
						lastErrorRedacted: recovered.lastErrorRedacted,
						attemptLog: recovered.attemptLog,
					},
					req,
					...systemOverrideAccess("system-job"),
				});
			}

			const duePending = await req.payload.find({
				collection: "lead-deliveries",
				where: {
					and: [
						{ status: { equals: "pending" } },
						{ nextAttemptAt: { less_than_equal: nowIso() } },
					],
				},
				limit: 20,
				depth: 0,
				req,
				...jobAccess,
			});

			let queuedPending = 0;
			for (const delivery of duePending.docs) {
				let liveJobId: string | undefined;
				if (delivery.jobId) {
					try {
						const job = await inspectPayloadJob(
							req.payload,
							String(delivery.jobId),
						);
						if (
							isLiveFuturePayloadJob(
								{
									waitUntil:
										typeof job.waitUntil === "string" ? job.waitUntil : null,
									completedAt:
										typeof job.completedAt === "string"
											? job.completedAt
											: null,
									processing: Boolean(
										(job as { processing?: boolean }).processing,
									),
								},
								nowDate(),
							)
						) {
							liveJobId = String(job.id);
						}
					} catch {
						liveJobId = undefined;
					}
				}

				if (!liveJobId) {
					const matchingJobs = await listPayloadJobsByConcurrencyKey(
						req.payload,
						{
							concurrencyKey: `lead-delivery:${delivery.id}`,
							taskSlug: payloadJobTaskSlugs.deliverLead,
						},
					);
					const liveJob = matchingJobs.docs.find((job) =>
						isLiveFuturePayloadJob(
							{
								waitUntil: job.waitUntil,
								completedAt: job.completedAt,
								processing: job.processing,
							},
							nowDate(),
						),
					);
					liveJobId = liveJob ? String(liveJob.id) : undefined;
				}

				if (liveJobId) {
					if (String(delivery.jobId ?? "") !== liveJobId) {
						await req.payload.update({
							collection: "lead-deliveries",
							id: delivery.id,
							data: { jobId: liveJobId },
							req,
							...systemOverrideAccess("system-job"),
						});
					}
					continue;
				}

				const queuedJob = (await queueTask({
					req,
					task: payloadJobTaskSlugs.deliverLead,
					queue: payloadJobQueues.leadDeliveries,
					input: { leadDeliveryId: String(delivery.id) },
				})) as { id: number | string };

				await req.payload.update({
					collection: "lead-deliveries",
					id: delivery.id,
					data: {
						jobId: String(queuedJob.id),
					},
					req,
					...systemOverrideAccess("system-job"),
				});
				queuedPending += 1;
			}

			return {
				output: {
					recoveredSending: staleSending.docs.length,
					queuedPending,
				},
			};
		},
	},
	{
		slug: payloadJobTaskSlugs.deliverLead,
		label: "Deliver lead",
		inputSchema: [{ name: "leadDeliveryId", type: "text", required: true }],
		retries: 0,
		concurrency: {
			key: ({ input }) => `lead-delivery:${input.leadDeliveryId}`,
			exclusive: true,
			supersedes: false,
		},
		handler: async ({ input, req }) => {
			const result = await runDeliverLeadTask({
				payload: req.payload,
				leadDeliveryId: String(input.leadDeliveryId),
				nowIso: nowIso(),
				policy: projectConfig.leadDelivery,
				env: {
					LEAD_OUTBOUND_HOSTS: runtimeEnv.LEAD_OUTBOUND_HOSTS,
					MAX_API_URL: runtimeEnv.MAX_API_URL,
					MAX_BOT_TOKEN: runtimeEnv.MAX_BOT_TOKEN,
					MAX_CHAT_ID: runtimeEnv.MAX_CHAT_ID,
					CUSTOM_WEBHOOK_URL: runtimeEnv.CUSTOM_WEBHOOK_URL,
					CUSTOM_WEBHOOK_HMAC_SECRET: runtimeEnv.CUSTOM_WEBHOOK_HMAC_SECRET,
					AMS_ALLOW_TEST_DESTINATIONS: process.env.AMS_ALLOW_TEST_DESTINATIONS,
					AMS_TEST_APPROVED_ORIGINS: process.env.AMS_TEST_APPROVED_ORIGINS,
					NODE_ENV: process.env.NODE_ENV,
				},
				queueRetry: async ({ leadDeliveryId, waitUntil }) => {
					const queued = (await queueTask({
						req,
						task: payloadJobTaskSlugs.deliverLead,
						queue: payloadJobQueues.leadDeliveries,
						input: { leadDeliveryId },
						waitUntil,
					})) as { id: number | string };
					return String(queued.id);
				},
			});
			return result;
		},
	},
	{
		slug: payloadJobTaskSlugs.submitIndexNow,
		label: "Submit changed URLs to IndexNow",
		inputSchema: [
			{ name: "eventId", type: "text", required: true },
			{ name: "urls", type: "json", required: true },
			{ name: "attempt", type: "number", required: true },
		],
		retries: 0,
		concurrency: {
			key: ({ input }) => `index-now:${input.eventId}`,
			exclusive: true,
			supersedes: false,
		},
		handler: async ({ input, req }) => {
			const urls = Array.isArray(input.urls)
				? input.urls.map((url) => String(url))
				: [];
			return runIndexNowTask({
				job: {
					eventId: String(input.eventId),
					urls,
					attempt: Number(input.attempt),
				},
				env: {
					NEXT_PUBLIC_SERVER_URL: runtimeEnv.NEXT_PUBLIC_SERVER_URL,
					INDEXNOW_KEY: runtimeEnv.INDEXNOW_KEY,
					INDEXNOW_KEY_LOCATION: runtimeEnv.INDEXNOW_KEY_LOCATION,
				},
				now: nowDate(),
				queueRetry: async ({ waitUntil, ...retryInput }) => {
					await queueTask({
						req,
						task: payloadJobTaskSlugs.submitIndexNow,
						queue: payloadJobQueues.indexNow,
						input: retryInput,
						waitUntil,
					});
				},
			});
		},
	},
];
