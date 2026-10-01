export type FeedRunCompletionInput = {
	nowIso: string;
	sourceEnabled: boolean;
	parserCompleted: boolean;
	criticalStructuralError: boolean;
	identityValid: boolean;
	runInterrupted: boolean;
	isFirstFullRun: boolean;
	offeredCount: number;
	previousOfferCount?: number;
	safetyThresholdPercent: number;
	plannedDeactivations: number;
	maxDeactivationsPerRun: number;
	hasValidDeactivationApproval?: boolean;
	fetchStatus: "fetched" | "unchanged";
	feedHash?: string;
	lastFeedHash?: string;
};

export type FeedRunCompletionDecision = {
	status: "success" | "unchanged" | "suspicious" | "failed" | "interrupted";
	canDeactivateMissing: boolean;
	createBaseline: boolean;
	retryAt?: string;
	reason:
		| "completed"
		| "not_modified"
		| "same_hash"
		| "first_full_run"
		| "source_disabled"
		| "parser_incomplete"
		| "critical_structural_error"
		| "identity_invalid"
		| "run_interrupted"
		| "below_safety_threshold"
		| "too_many_deactivations"
		| "approved_deactivation";
};

export type StaleRunInput = {
	status:
		| "queued"
		| "running"
		| "success"
		| "unchanged"
		| "suspicious"
		| "interrupted"
		| "failed";
	queuedAt?: string;
	startedAt?: string;
	heartbeatAt?: string;
	nowIso: string;
	staleThresholdMs?: number;
};

export type StaleRunDecision =
	| { stale: false }
	| {
			stale: true;
			nextStatus: "interrupted";
			reason: "queued_without_job" | "heartbeat_stale";
	  };

const transientRetryDelayMs = 15 * 60 * 1000;
const defaultStaleThresholdMs = 15 * 60 * 1000;

export function decideFeedRunCompletion(
	input: FeedRunCompletionInput,
): FeedRunCompletionDecision {
	if (input.fetchStatus === "unchanged") {
		return unchanged("not_modified");
	}

	if (
		input.feedHash &&
		input.lastFeedHash &&
		input.feedHash === input.lastFeedHash
	) {
		return unchanged("same_hash");
	}

	if (input.runInterrupted) {
		return retryableStop(input.nowIso, "interrupted", "run_interrupted");
	}

	if (!input.sourceEnabled) {
		return retryableStop(input.nowIso, "failed", "source_disabled");
	}

	if (!input.parserCompleted) {
		return retryableStop(input.nowIso, "failed", "parser_incomplete");
	}

	if (input.criticalStructuralError) {
		return retryableStop(input.nowIso, "failed", "critical_structural_error");
	}

	if (!input.identityValid) {
		return retryableStop(input.nowIso, "failed", "identity_invalid");
	}

	if (input.isFirstFullRun) {
		return {
			status: "success",
			canDeactivateMissing: false,
			createBaseline: true,
			reason: "first_full_run",
		};
	}

	const minimumExpectedCount = computeMinimumSafeOfferCount(
		input.previousOfferCount,
		input.safetyThresholdPercent,
	);

	if (
		minimumExpectedCount !== undefined &&
		input.offeredCount < minimumExpectedCount
	) {
		return suspiciousOrApproved(input, "below_safety_threshold");
	}

	if (input.plannedDeactivations > input.maxDeactivationsPerRun) {
		return suspiciousOrApproved(input, "too_many_deactivations");
	}

	return {
		status: "success",
		canDeactivateMissing: true,
		createBaseline: false,
		reason: "completed",
	};
}

export function decideStaleRunRecovery(input: StaleRunInput): StaleRunDecision {
	if (input.status !== "queued" && input.status !== "running") {
		return { stale: false };
	}

	const threshold = input.staleThresholdMs ?? defaultStaleThresholdMs;
	const now = new Date(input.nowIso).getTime();
	const heartbeatAt = input.heartbeatAt
		? new Date(input.heartbeatAt).getTime()
		: undefined;

	if (
		input.status === "running" &&
		heartbeatAt &&
		now - heartbeatAt > threshold
	) {
		return {
			stale: true,
			nextStatus: "interrupted",
			reason: "heartbeat_stale",
		};
	}

	const queuedAt = input.queuedAt
		? new Date(input.queuedAt).getTime()
		: undefined;
	if (input.status === "queued" && queuedAt && now - queuedAt > threshold) {
		return {
			stale: true,
			nextStatus: "interrupted",
			reason: "queued_without_job",
		};
	}

	return { stale: false };
}

export function computeTransientRetryAt(nowIso: string): string {
	return new Date(
		new Date(nowIso).getTime() + transientRetryDelayMs,
	).toISOString();
}

function unchanged(
	reason: "not_modified" | "same_hash",
): FeedRunCompletionDecision {
	return {
		status: "unchanged",
		canDeactivateMissing: false,
		createBaseline: false,
		reason,
	};
}

function suspiciousOrApproved(
	input: FeedRunCompletionInput,
	reason: "below_safety_threshold" | "too_many_deactivations",
): FeedRunCompletionDecision {
	if (input.hasValidDeactivationApproval) {
		return {
			status: "success",
			canDeactivateMissing: true,
			createBaseline: false,
			reason: "approved_deactivation",
		};
	}

	return {
		status: "suspicious",
		canDeactivateMissing: false,
		createBaseline: false,
		reason,
	};
}

export type DeactivationApprovalSnapshot = {
	runId?: string | number | null;
	approvedAt?: string | null;
	expiresAt?: string | null;
	consumedAt?: string | null;
};

export function isDeactivationApprovalValid(input: {
	importRunId: string;
	nowIso: string;
	approval?: DeactivationApprovalSnapshot;
}): boolean {
	const approval = input.approval;
	if (!approval) return false;
	if (approval.consumedAt) return false;
	if (String(approval.runId ?? "") !== input.importRunId) return false;
	if (!approval.approvedAt || !approval.expiresAt) return false;
	const now = new Date(input.nowIso).getTime();
	const approvedAt = new Date(approval.approvedAt).getTime();
	const expiresAt = new Date(approval.expiresAt).getTime();
	return (
		Number.isFinite(now) &&
		Number.isFinite(approvedAt) &&
		Number.isFinite(expiresAt) &&
		approvedAt <= now &&
		expiresAt > now
	);
}

export type FeedSourceBaselineInput = {
	status: "success" | "unchanged" | "suspicious" | "interrupted" | "failed";
	parserCompleted: boolean;
	criticalStructuralError: boolean;
	nowIso: string;
	etag?: string;
	lastModified?: string;
	feedHash?: string;
	offeredCount?: number;
};

export type FeedSourceBaselinePatch = {
	lastSuccessfulRunAt?: string;
	lastFullRunAt?: string;
	lastOfferCount?: number;
	lastEtag?: string;
	lastModified?: string;
	lastFeedHash?: string;
};

export function buildFeedSourceBaselinePatch(
	input: FeedSourceBaselineInput,
): FeedSourceBaselinePatch {
	const patch: FeedSourceBaselinePatch = {};
	const structurallyValid =
		input.parserCompleted && !input.criticalStructuralError;

	if (input.status === "success" || input.status === "unchanged") {
		patch.lastSuccessfulRunAt = input.nowIso;
		if (input.etag) patch.lastEtag = input.etag;
		if (input.lastModified) patch.lastModified = input.lastModified;
	}

	if (input.status === "success" && structurallyValid) {
		patch.lastFullRunAt = input.nowIso;
		if (input.offeredCount !== undefined) {
			patch.lastOfferCount = input.offeredCount;
		}
		if (input.feedHash) patch.lastFeedHash = input.feedHash;
	}

	return patch;
}

function retryableStop(
	nowIso: string,
	status: "failed" | "interrupted",
	reason:
		| "source_disabled"
		| "parser_incomplete"
		| "critical_structural_error"
		| "identity_invalid"
		| "run_interrupted",
): FeedRunCompletionDecision {
	return {
		status,
		canDeactivateMissing: false,
		createBaseline: false,
		retryAt: computeTransientRetryAt(nowIso),
		reason,
	};
}

function computeMinimumSafeOfferCount(
	previousOfferCount: number | undefined,
	safetyThresholdPercent: number,
): number | undefined {
	if (previousOfferCount === undefined) {
		return undefined;
	}

	const missingPercent = Math.max(0, Math.min(100, safetyThresholdPercent));
	return Math.ceil(previousOfferCount * (1 - missingPercent / 100));
}
