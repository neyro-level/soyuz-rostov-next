export type LeadRetentionDecision =
	| {
			destructive: false;
			reason: "missing_policy";
			alert: {
				code: "retention_policy_missing";
				severity: "warning" | "critical";
				component: "retention";
				message: string;
			};
	  }
	| {
			destructive: true;
			leadRetentionDays: number;
	  };

export function isConfiguredRetentionDays(
	value: number | null | undefined,
): value is number {
	return typeof value === "number" && Number.isInteger(value) && value >= 1;
}

export function planLeadRetentionRun(leadRetentionDays: number | null): LeadRetentionDecision {
	if (!isConfiguredRetentionDays(leadRetentionDays)) {
		return {
			destructive: false,
			reason: "missing_policy",
			alert: {
				code: "retention_policy_missing",
				severity: "warning",
				component: "retention",
				message: "Lead retention days are unset; destructive cleanup is skipped.",
			},
		};
	}

	return { destructive: true, leadRetentionDays };
}

export function evaluateProductionRetentionReadiness(input: {
	runtimeMode: "build" | "migrate" | "runtime" | "development" | "test";
	publicLeadIntakeEnabled: boolean;
	enabledLeadChannelCount: number;
	leadRetentionDays: number | null;
	archiveRetentionDays: number | null;
}): { ok: boolean; failures: readonly string[] } {
	if (input.runtimeMode !== "runtime") {
		return { ok: true, failures: [] };
	}

	const failures: string[] = [];
	const piiIntakeActive =
		input.publicLeadIntakeEnabled || input.enabledLeadChannelCount > 0;
	if (piiIntakeActive && !isConfiguredRetentionDays(input.leadRetentionDays)) {
		failures.push("leadRetentionDays");
	}
	if (!isConfiguredRetentionDays(input.archiveRetentionDays)) {
		failures.push("archiveRetentionDays");
	}

	return { ok: failures.length === 0, failures };
}

export type LeadRetentionCandidate = {
	id: string;
	retentionUntil: string | null;
	retentionMode: "delete" | "anonymize";
	piiPurgedAt: string | null;
	phoneE164?: string | null;
	email?: string | null;
	message?: string | null;
	name?: string | null;
};

export function leadIsDueForRetention(
	lead: LeadRetentionCandidate,
	nowIso: string,
	decision: LeadRetentionDecision,
): boolean {
	if (!decision.destructive) return false;
	if (lead.piiPurgedAt) return false;
	if (!lead.retentionUntil) return false;
	return lead.retentionUntil <= nowIso;
}

export function purgeDeliveryDiagnostics(purgedAt: string) {
	return {
		attemptLog: [] as Array<{
			attemptedAt?: string;
			safeCode?: string | null;
			outcome?: "delivered" | "retryable" | "permanent" | "skipped";
			redactedNote?: string | null;
			id?: string;
		}>,
		lastErrorRedacted: null,
		diagnosticsPurgedAt: purgedAt,
	};
}

export function assertNoPiiInDiagnostics(record: {
	attemptLog: unknown;
	lastErrorRedacted: string | null;
	sourceLead?: LeadRetentionCandidate;
}): void {
	const blob = JSON.stringify(record.attemptLog ?? "") + (record.lastErrorRedacted ?? "");
	const lead = record.sourceLead;
	for (const value of [lead?.phoneE164, lead?.email, lead?.message, lead?.name]) {
		if (value && blob.includes(value)) {
			throw new Error("PII must not remain in delivery diagnostics.");
		}
	}
}

export function anonymizeLeadFields(purgedAt: string) {
	return {
		name: "Anonymized lead",
		phoneRaw: null,
		phoneE164: "+00000000000",
		email: null,
		message: null,
		fraudFingerprint: null,
		piiPurgedAt: purgedAt,
	};
}

export type LinkedDeliveryCandidate = {
	id: string;
	leadId: string;
	attemptLog: unknown;
	lastErrorRedacted: string | null;
};

export function planRetentionActions(input: {
	leads: readonly LeadRetentionCandidate[];
	deliveries: readonly LinkedDeliveryCandidate[];
	nowIso: string;
	decision: LeadRetentionDecision;
}): {
	processedLeadIds: string[];
	untouchedLeadIds: string[];
	processedDeliveryIds: string[];
	purgedDiagnostics: ReturnType<typeof purgeDeliveryDiagnostics> | null;
} {
	const processedLeadIds: string[] = [];
	const untouchedLeadIds: string[] = [];
	for (const lead of input.leads) {
		if (leadIsDueForRetention(lead, input.nowIso, input.decision)) {
			processedLeadIds.push(lead.id);
		} else {
			untouchedLeadIds.push(lead.id);
		}
	}

	const processed = new Set(processedLeadIds);
	const processedDeliveryIds = input.deliveries
		.filter((delivery) => processed.has(delivery.leadId))
		.map((delivery) => delivery.id);

	return {
		processedLeadIds,
		untouchedLeadIds,
		processedDeliveryIds,
		purgedDiagnostics: processedDeliveryIds.length
			? purgeDeliveryDiagnostics(input.nowIso)
			: null,
	};
}
