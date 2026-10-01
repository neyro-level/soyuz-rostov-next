export type OperationalAlertSeverity = "info" | "warning" | "critical";
export type OperationalAlertComponent =
	| "feeds"
	| "jobs"
	| "delivery"
	| "storage"
	| "cache"
	| "retention"
	| "backup"
	| "disk"
	| "alerts"
	| "outbound";

export type OperationalAlert = {
	code: string;
	severity: OperationalAlertSeverity;
	component: OperationalAlertComponent;
	message: string;
	count?: number;
};

export type OperationalHealthSnapshot = {
	feeds: {
		overdueEnabled: number;
		suspiciousRuns: number;
		failedRuns: number;
		staleRunningRuns: number;
	};
	jobs: {
		autorunEnabled: boolean;
		staticTaskCount: number;
		programmaticTaskCount: number;
	};
	delivery: {
		duePending: number;
		staleSending: number;
		abandoned: number;
	};
	storage: {
		localMediaReady: boolean;
	};
	cache?: {
		invalidationStaleBeyondSla: boolean;
	};
	retention?: {
		leadPolicyConfigured: boolean;
		productionReadinessFailed?: boolean;
	};
	backup?: {
		dbFailed: boolean;
		mediaFailed: boolean;
	};
	disk?: {
		freeRatio?: number | null;
	};
	alerts?: {
		independentChannel: boolean;
	};
	outbound?: {
		criticalFailures: number;
	};
};

export function buildOperationalAlerts(
	snapshot: OperationalHealthSnapshot,
): OperationalAlert[] {
	const alerts: OperationalAlert[] = [];

	if (snapshot.feeds.overdueEnabled > 0) {
		alerts.push({
			code: "feeds_overdue",
			severity: "warning",
			component: "feeds",
			message: "Enabled feeds are overdue for dispatch.",
			count: snapshot.feeds.overdueEnabled,
		});
	}

	if (snapshot.feeds.suspiciousRuns > 0) {
		alerts.push({
			code: "feeds_suspicious_runs",
			severity: "critical",
			component: "feeds",
			message:
				"Suspicious import runs require owner approval before deactivation.",
			count: snapshot.feeds.suspiciousRuns,
		});
	}

	if (snapshot.feeds.failedRuns > 0 || snapshot.feeds.staleRunningRuns > 0) {
		alerts.push({
			code: "feeds_import_failures",
			severity: "warning",
			component: "feeds",
			message:
				"Import failures or stale running imports require operator review.",
			count: snapshot.feeds.failedRuns + snapshot.feeds.staleRunningRuns,
		});
	}

	if (!snapshot.jobs.autorunEnabled) {
		alerts.push({
			code: "jobs_autorun_disabled",
			severity: "warning",
			component: "jobs",
			message: "Jobs autorun is disabled on this runtime.",
		});
	}

	if (snapshot.delivery.duePending > 0) {
		alerts.push({
			code: "delivery_due_pending",
			severity: "warning",
			component: "delivery",
			message: "Lead deliveries are due and waiting for queue dispatch.",
			count: snapshot.delivery.duePending,
		});
	}

	if (snapshot.delivery.staleSending > 0) {
		alerts.push({
			code: "delivery_stale_sending",
			severity: "critical",
			component: "delivery",
			message: "Lead deliveries are stuck in sending state.",
			count: snapshot.delivery.staleSending,
		});
	}

	if (snapshot.delivery.abandoned > 0) {
		alerts.push({
			code: "delivery_abandoned",
			severity: "warning",
			component: "delivery",
			message: "Lead deliveries have been abandoned and need operator review.",
			count: snapshot.delivery.abandoned,
		});
	}

	if (!snapshot.storage.localMediaReady) {
		alerts.push({
			code: "storage_media_dir_unavailable",
			severity: "critical",
			component: "storage",
			message: "Local media directory is not available.",
		});
	}

	if (snapshot.cache?.invalidationStaleBeyondSla) {
		alerts.push({
			code: "cache_invalidation_failure",
			severity: "critical",
			component: "cache",
			message: "Public cache is stale after a failed invalidation.",
		});
	}

	if (snapshot.retention && snapshot.retention.leadPolicyConfigured === false) {
		alerts.push({
			code: "retention_policy_missing",
			severity: "warning",
			component: "retention",
			message: "Lead retention days are unset; destructive cleanup is skipped.",
		});
	}

	if (snapshot.retention?.productionReadinessFailed) {
		alerts.push({
			code: "production_retention_unready",
			severity: "critical",
			component: "retention",
			message:
				"Production PII intake or catalog archive is active without an owner retention policy.",
		});
	}

	if (snapshot.backup?.dbFailed) {
		alerts.push({
			code: "backup_db_failure",
			severity: "critical",
			component: "backup",
			message: "Database backup missed the offsite integrity window.",
		});
	}

	if (snapshot.backup?.mediaFailed) {
		alerts.push({
			code: "backup_media_failure",
			severity: "critical",
			component: "backup",
			message: "Media backup missed the offsite integrity window.",
		});
	}

	if (typeof snapshot.disk?.freeRatio === "number") {
		if (snapshot.disk.freeRatio < 0.1) {
			alerts.push({
				code: "disk_low",
				severity: "critical",
				component: "disk",
				message: "Data volume free space is below 10 percent.",
			});
		} else if (snapshot.disk.freeRatio < 0.2) {
			alerts.push({
				code: "disk_low",
				severity: "warning",
				component: "disk",
				message: "Data volume free space is below 20 percent.",
			});
		}
	}

	if (snapshot.alerts && snapshot.alerts.independentChannel === false) {
		alerts.push({
			code: "alert_channel_not_independent",
			severity: "critical",
			component: "alerts",
			message: "Operational alerts share the only lead delivery channel.",
		});
	}

	if ((snapshot.outbound?.criticalFailures ?? 0) > 0) {
		alerts.push({
			code: "outbound_integration_failure",
			severity: "critical",
			component: "outbound",
			message: "A critical outbound integration is failing.",
			count: snapshot.outbound?.criticalFailures,
		});
	}

	return alerts;
}
