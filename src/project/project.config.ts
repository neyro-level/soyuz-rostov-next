import { defineLeadDeliveryPolicy } from "../core/leads/delivery-policy.ts";
import { clientReadinessConfig } from "./client-readiness.config.ts";

export const projectConfig = {
	profile: "REALTY_BASE",
	dispatcherIntervalMinutes: 5,
	maintenanceIntervalMinutes: 15,
	dispatchBatchSize: 3,
	ingestBatchSize: 100,
	importHeartbeatIntervalMs: 15_000,
	approvalTtlMinutes: 240,
	leadRetentionDays: clientReadinessConfig.leadRetentionDays,
	archiveRetentionDays: clientReadinessConfig.archiveRetentionDays,
	staleDataSlaMinutes: 30,
	cacheInvalidationMode: "http" as const,
	cacheProofStatus: "http" as const,
	indexedCatalogFilterKeys: [
		"category",
		"dealType",
		"city",
		"district",
		"rooms",
	],
	sitemapUrlsPerShard: 50_000,
	sitemapQueryPageSize: 500,
	sitemapGenerationRevalidateSeconds: 3_600,
	jobsAutorunExactlyOne: true,
	leadDelivery: defineLeadDeliveryPolicy({
		retryScheduleMinutes: [0, 1, 5, 15, 60, 240],
		unknownDeliveryBackoffMinutes: 60,
		staleSendingThresholdMinutes: 15,
		maxAttemptLogEntries: 20,
		routingMode: "all-enabled",
	}),
} as const;

export type ProjectConfig = typeof projectConfig;
