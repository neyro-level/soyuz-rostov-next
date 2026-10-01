import { hostname } from "node:os";
import { getPayload } from "payload";
import { trustedInspectionAccess } from "@/core/data-access/system/overrides";
import configPromise from "../../../../../payload.config.ts";
import { isCacheInvalidationStaleBeyondSla } from "../../../../core/cache/invalidation-sla.ts";
import { resolveEnabledLeadChannels } from "../../../../core/leads/channels.ts";
import {
	evaluateProductionRetentionReadiness,
	isConfiguredRetentionDays,
} from "../../../../core/leads/retention.ts";
import { isAlertChannelIndependent } from "../../../../core/operations/alert-channel.ts";
import { buildOperationalAlerts } from "../../../../core/operations/alerts.ts";
import {
	evaluateBackupFailures,
	readBackupHealthSnapshot,
} from "../../../../core/operations/backup-health.ts";
import {
	importStaleThresholdMs,
	pendingDeliveryOrphanThresholdMs,
} from "../../../../core/operations/recovery-thresholds.ts";
import { detectRuntimeEnvMode } from "../../../../project/env.ts";
import { redactRecord } from "../../../../core/security/redaction.ts";
import {
	isLocalMediaReady,
	readDataVolumeFreeRatio,
} from "../../../../project/storage/local-fs.ts";
import { runtimeEnv } from "../../../../project/env.ts";
import {
	programmaticPayloadJobTasks,
	staticPayloadJobTasks,
} from "../../../../project/jobs/registry.ts";
import { projectConfig } from "../../../../project/project.config.ts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function nowIso() {
	return new Date().toISOString();
}

function hasValidSecret(request: Request): boolean {
	const expected =
		runtimeEnv.INTERNAL_HEALTH_SECRET ?? runtimeEnv.REVALIDATE_SECRET;
	const actual = request.headers.get("x-ams-health-secret");
	return Boolean(expected && actual && actual === expected);
}

function json(body: unknown, init?: ResponseInit) {
	return Response.json(body, {
		...init,
		headers: {
			"cache-control": "no-store",
			...(init?.headers ?? {}),
		},
	});
}

export async function GET(request: Request) {
	if (!hasValidSecret(request)) {
		return json({ error: "not_found" }, { status: 404 });
	}

	const checkedAt = nowIso();
	const jobsOwner = {
		identity: hostname(),
		pid: process.pid,
		autorunEnabled: runtimeEnv.JOBS_AUTORUN,
		exactlyOne: projectConfig.jobsAutorunExactlyOne,
	};
	const components = {
		app: { status: "ok" as const },
		database: { status: "unknown" as "ok" | "down" | "unknown" },
		storage: {
			status: isLocalMediaReady() ? ("ok" as const) : ("down" as const),
		},
		jobs: {
			status: "ok" as const,
			autorunEnabled: runtimeEnv.JOBS_AUTORUN,
			ownerIdentity: jobsOwner.identity,
			ownerPid: jobsOwner.pid,
			exactlyOne: jobsOwner.exactlyOne,
			staticTaskCount: staticPayloadJobTasks.length,
			programmaticTaskCount: programmaticPayloadJobTasks.length,
		},
	};

	try {
		const payload = await getPayload({ config: configPromise });
		const inspectionAccess = trustedInspectionAccess;
		const importStaleBefore = new Date(
			Date.now() - importStaleThresholdMs(),
		).toISOString();
		const deliveryOrphanBefore = new Date(
			Date.now() -
				pendingDeliveryOrphanThresholdMs(
					projectConfig.maintenanceIntervalMinutes,
				),
		).toISOString();
		const [
			overdueFeeds,
			suspiciousRuns,
			failedRuns,
			staleRunningRuns,
			duePendingDeliveries,
			staleSendingDeliveries,
			abandonedDeliveries,
		] = await Promise.all([
			payload.count({
				collection: "feed-sources",
				where: {
					and: [
						{ enabled: { equals: true } },
						{ nextDueAt: { less_than_equal: checkedAt } },
					],
				},
				...inspectionAccess,
			}),
			payload.count({
				collection: "import-runs",
				where: { status: { equals: "suspicious" } },
				...inspectionAccess,
			}),
			payload.count({
				collection: "import-runs",
				where: { status: { equals: "failed" } },
				...inspectionAccess,
			}),
			payload.count({
				collection: "import-runs",
				where: {
					and: [
						{ status: { equals: "running" } },
						{ heartbeatAt: { less_than: importStaleBefore } },
					],
				},
				...inspectionAccess,
			}),
			payload.count({
				collection: "lead-deliveries",
				where: {
					and: [
						{ status: { equals: "pending" } },
						{ nextAttemptAt: { less_than_equal: checkedAt } },
						{ jobId: { exists: false } },
					],
				},
				...inspectionAccess,
			}),
			payload.count({
				collection: "lead-deliveries",
				where: {
					and: [
						{ status: { equals: "sending" } },
						{ heartbeatAt: { less_than: deliveryOrphanBefore } },
					],
				},
				...inspectionAccess,
			}),
			payload.count({
				collection: "lead-deliveries",
				where: { status: { equals: "abandoned" } },
				...inspectionAccess,
			}),
		]);

		components.database.status = "ok";
		const backupSnapshot = runtimeEnv.BACKUP_STATUS_PATH
			? readBackupHealthSnapshot(runtimeEnv.BACKUP_STATUS_PATH)
			: process.env.NODE_ENV === "production"
				? { statusKnown: false as const }
				: undefined;
		const backup = backupSnapshot
			? evaluateBackupFailures(backupSnapshot)
			: undefined;
		const alerts = buildOperationalAlerts({
			feeds: {
				overdueEnabled: overdueFeeds.totalDocs,
				suspiciousRuns: suspiciousRuns.totalDocs,
				failedRuns: failedRuns.totalDocs,
				staleRunningRuns: staleRunningRuns.totalDocs,
			},
			jobs: {
				autorunEnabled: runtimeEnv.JOBS_AUTORUN,
				staticTaskCount: staticPayloadJobTasks.length,
				programmaticTaskCount: programmaticPayloadJobTasks.length,
			},
			delivery: {
				duePending: duePendingDeliveries.totalDocs,
				staleSending: staleSendingDeliveries.totalDocs,
				abandoned: abandonedDeliveries.totalDocs,
			},
			storage: {
				localMediaReady: isLocalMediaReady(),
			},
			cache: {
				invalidationStaleBeyondSla: isCacheInvalidationStaleBeyondSla(
					projectConfig.staleDataSlaMinutes,
					checkedAt,
				),
			},
			retention: {
				leadPolicyConfigured:
					isConfiguredRetentionDays(projectConfig.leadRetentionDays) &&
					isConfiguredRetentionDays(projectConfig.archiveRetentionDays),
				productionReadinessFailed: !evaluateProductionRetentionReadiness({
					runtimeMode: detectRuntimeEnvMode(),
					publicLeadIntakeEnabled: true,
					enabledLeadChannelCount:
						resolveEnabledLeadChannels(runtimeEnv).length,
					leadRetentionDays: projectConfig.leadRetentionDays,
					archiveRetentionDays: projectConfig.archiveRetentionDays,
				}).ok,
			},
			backup: backup
				? {
						dbFailed: backup.dbBackupFailed,
						mediaFailed: backup.mediaBackupFailed,
					}
				: undefined,
			disk: {
				freeRatio: readDataVolumeFreeRatio(),
			},
			alerts: runtimeEnv.ALERT_WEBHOOK_URL
				? {
						independentChannel: isAlertChannelIndependent({
							alertWebhookUrl: runtimeEnv.ALERT_WEBHOOK_URL,
							leadChannelUrls: [
								runtimeEnv.CUSTOM_WEBHOOK_URL,
								runtimeEnv.MAX_API_URL,
							],
						}),
					}
				: undefined,
		});
		const status = alerts.some((alert) => alert.severity === "critical")
			? "degraded"
			: "ok";

		return json({ status, checkedAt, components, alerts });
	} catch (error) {
		components.database.status = "down";
		console.warn(
			"healthz dependency failure",
			redactRecord({
				component: "database",
				error: error instanceof Error ? error.message : "unknown",
			}),
		);
		return json(
			{
				status: "down",
				checkedAt,
				components,
				alerts: [
					{
						code: "database_unavailable",
						severity: "critical",
						component: "database",
						message: "Payload database dependency is unavailable.",
					},
				],
			},
			{ status: 503 },
		);
	}
}
