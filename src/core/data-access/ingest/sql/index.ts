import { sql } from "@payloadcms/db-postgres/drizzle";
import type { Payload } from "payload";

/**
 * Approved parameterized SQL for ingest claims, SKIP LOCKED, and heartbeat.
 * Generic query(sql: string) is not exported.
 */
export const ingestSqlLayer = "src/core/data-access/ingest/sql" as const;

export const approvedIngestSqlOperations = {
	claimDueFeedSources: {
		invariant:
			"Each due feed source is claimed by at most one dispatcher tick.",
		reason: "Requires one UPDATE with FOR UPDATE SKIP LOCKED and RETURNING.",
	},
	claimQueuedImportRun: {
		invariant:
			"Exactly one queued-to-running transition can win for an import run.",
		reason:
			"Payload 3.89.0 bulk update reads before per-document updates and cannot prove an atomic conditional claim.",
	},
	touchImportRunHeartbeat: {
		invariant: "Only a running import run receives a heartbeat.",
		reason:
			"The status predicate and timestamp update must be one conditional statement.",
	},
	touchFeedPropertiesLastSeenAt: {
		invariant:
			"Only properties owned by the selected feed source and external IDs are touched.",
		reason:
			"A bounded set update avoids one Local API round trip per unchanged property.",
	},
	countMissingActiveFeedProperties: {
		invariant:
			"The safety count uses the same source, status, and last-seen predicate as deactivation.",
		reason:
			"The aggregate must be evaluated by PostgreSQL without loading candidate rows.",
	},
	deactivateMissingFeedProperties: {
		invariant:
			"Only active, unseen properties from the selected feed source are archived.",
		reason:
			"The guarded bulk transition must use the exact safety-count predicate.",
	},
	consumeDeactivationApproval: {
		invariant:
			"A matching approval with approvedAt and a future expiry can be consumed only once.",
		reason:
			"Approval validation and consumption require one conditional update.",
	},
	finishImportRun: {
		invariant:
			"Only the worker owning a running import can make one terminal transition.",
		reason:
			"The running predicate and terminal write must be one conditional statement with an affected result.",
	},
} as const;

type ApprovedIngestSqlOperation = keyof typeof approvedIngestSqlOperations;

export type ClaimedFeedSource = {
	id: string;
	code: string;
	market: "secondary" | "newbuild";
	feedUrlRef: string;
	refreshIntervalMinutes: number;
	nextDueAt: string;
	lastEtag?: string;
	lastModified?: string;
	lastFeedHash?: string;
	safetyThresholdPercent: number;
	maxDeactivationsPerRun: number;
	lastOfferCount?: number;
	enabled: boolean;
};

type DrizzleExecutor = {
	execute: (query: unknown) => Promise<unknown>;
};

function getDrizzle(payload: Payload): DrizzleExecutor {
	const drizzle = (payload.db as { drizzle?: DrizzleExecutor } | undefined)
		?.drizzle;
	if (!drizzle?.execute) {
		throw new Error("Ingest SQL requires Payload Postgres drizzle.execute.");
	}
	return drizzle;
}

function executeApprovedIngestSql(
	payload: Payload,
	operation: ApprovedIngestSqlOperation,
	query: unknown,
): Promise<unknown> {
	void approvedIngestSqlOperations[operation];
	return getDrizzle(payload).execute(query);
}

function rowsFrom(result: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(result)) {
		return result as Array<Record<string, unknown>>;
	}
	if (result && typeof result === "object" && "rows" in result) {
		const rows = (result as { rows?: unknown }).rows;
		if (Array.isArray(rows)) {
			return rows as Array<Record<string, unknown>>;
		}
	}
	return [];
}

function asString(value: unknown): string {
	if (value == null) return "";
	return String(value);
}

function asOptionalString(value: unknown): string | undefined {
	if (value == null || value === "") return undefined;
	return String(value);
}

function asNumber(value: unknown, fallback = 0): number {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}

function mapClaimedFeed(row: Record<string, unknown>): ClaimedFeedSource {
	const market = row.market === "newbuild" ? "newbuild" : "secondary";
	return {
		id: asString(row.id),
		code: asString(row.code),
		market,
		feedUrlRef: asString(row.feed_url_ref),
		refreshIntervalMinutes: asNumber(row.refresh_interval_minutes, 1440),
		nextDueAt: asString(row.next_due_at),
		lastEtag: asOptionalString(row.last_etag),
		lastModified: asOptionalString(row.last_modified),
		lastFeedHash: asOptionalString(row.last_feed_hash),
		safetyThresholdPercent: asNumber(row.safety_threshold_percent, 30),
		maxDeactivationsPerRun: asNumber(row.max_deactivations_per_run, 50),
		lastOfferCount:
			row.last_offer_count == null ? undefined : asNumber(row.last_offer_count),
		enabled: row.enabled === true || row.enabled === "t",
	};
}

export async function claimDueFeedSources(
	payload: Payload,
	input: { now: Date; batchSize: number },
): Promise<ClaimedFeedSource[]> {
	const batchSize = Math.trunc(input.batchSize);
	if (!Number.isInteger(batchSize) || batchSize < 1) {
		throw new Error("dispatchBatchSize must be a positive integer.");
	}
	const now = input.now.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"claimDueFeedSources",
		sql`
		UPDATE feed_sources AS claimed
		SET
			last_attempt_at = ${now}::timestamptz,
			next_due_at = GREATEST(
				${now}::timestamptz + (claimed.refresh_interval_minutes * interval '1 minute'),
				COALESCE(claimed.next_due_at, ${now}::timestamptz) + (claimed.refresh_interval_minutes * interval '1 minute')
			)
		WHERE claimed.id IN (
			SELECT source.id
			FROM feed_sources AS source
			WHERE source.enabled = true
				AND (
					source.next_due_at IS NULL
					OR source.next_due_at <= ${now}::timestamptz
				)
			ORDER BY source.next_due_at ASC
			LIMIT ${batchSize}
			FOR UPDATE SKIP LOCKED
		)
		RETURNING
			claimed.id,
			claimed.code,
			claimed.market,
			claimed.feed_url_ref,
			claimed.refresh_interval_minutes,
			claimed.next_due_at,
			claimed.last_etag,
			claimed.last_modified,
			claimed.last_feed_hash,
			claimed.safety_threshold_percent,
			claimed.max_deactivations_per_run,
			claimed.last_offer_count,
			claimed.enabled
	`,
	);
	return rowsFrom(result).map(mapClaimedFeed);
}

export async function claimQueuedImportRun(
	payload: Payload,
	input: { importRunId: string; now: Date },
): Promise<string | undefined> {
	const now = input.now.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"claimQueuedImportRun",
		sql`
		UPDATE import_runs
		SET
			status = 'running',
			started_at = ${now}::timestamptz,
			heartbeat_at = ${now}::timestamptz
		WHERE id = ${input.importRunId}::integer
			AND status = 'queued'
		RETURNING id
	`,
	);
	const id = rowsFrom(result)[0]?.id;
	return id == null ? undefined : asString(id);
}

export async function touchImportRunHeartbeat(
	payload: Payload,
	input: { importRunId: string; now: Date },
): Promise<boolean> {
	const now = input.now.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"touchImportRunHeartbeat",
		sql`
		UPDATE import_runs
		SET heartbeat_at = ${now}::timestamptz
		WHERE id = ${input.importRunId}::integer
			AND status = 'running'
		RETURNING id
	`,
	);
	return rowsFrom(result).length > 0;
}

const ingestSqlBatchSize = 200;

function chunkValues(values: string[], size = ingestSqlBatchSize): string[][] {
	const chunks: string[][] = [];
	for (let index = 0; index < values.length; index += size) {
		chunks.push(values.slice(index, index + size));
	}
	return chunks;
}

function sqlStringList(values: string[]) {
	return sql.join(
		values.map((value) => sql`${value}`),
		sql`, `,
	);
}

export async function touchFeedPropertiesLastSeenAt(
	payload: Payload,
	input: {
		feedSourceId: string;
		importRunId: string;
		externalIds: string[];
		now: Date;
	},
): Promise<number> {
	if (input.externalIds.length === 0) return 0;
	const now = input.now.toISOString();
	let touched = 0;
	for (const chunk of chunkValues(input.externalIds)) {
		const result = await executeApprovedIngestSql(
			payload,
			"touchFeedPropertiesLastSeenAt",
			sql`
			UPDATE properties
			SET
				last_seen_at = ${now}::timestamptz,
				last_import_run_id = ${input.importRunId}::integer,
				updated_at = ${now}::timestamptz
			WHERE origin = 'feed'
				AND feed_source_id = ${input.feedSourceId}::integer
				AND external_id IN (${sqlStringList(chunk)})
			RETURNING id
		`,
		);
		touched += rowsFrom(result).length;
	}
	return touched;
}

export async function countMissingActiveFeedProperties(
	payload: Payload,
	input: { feedSourceId: string; seenBefore: Date },
): Promise<number> {
	const seenBefore = input.seenBefore.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"countMissingActiveFeedProperties",
		sql`
		SELECT count(*)::int AS count
		FROM properties
		WHERE origin = 'feed'
			AND feed_source_id = ${input.feedSourceId}::integer
			AND status = 'active'
			AND (last_seen_at IS NULL OR last_seen_at < ${seenBefore}::timestamptz)
	`,
	);
	return asNumber(rowsFrom(result)[0]?.count, 0);
}

export async function deactivateMissingFeedProperties(
	payload: Payload,
	input: {
		feedSourceId: string;
		importRunId: string;
		seenBefore: Date;
		now: Date;
	},
): Promise<number> {
	const now = input.now.toISOString();
	const seenBefore = input.seenBefore.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"deactivateMissingFeedProperties",
		sql`
		UPDATE properties
		SET
			status = 'archived',
			deactivated_at = ${now}::timestamptz,
			deactivated_by_run_id = ${input.importRunId}::integer,
			updated_at = ${now}::timestamptz
		WHERE origin = 'feed'
			AND feed_source_id = ${input.feedSourceId}::integer
			AND status = 'active'
			AND (last_seen_at IS NULL OR last_seen_at < ${seenBefore}::timestamptz)
		RETURNING id
	`,
	);
	return rowsFrom(result).length;
}

export async function consumeDeactivationApproval(
	payload: Payload,
	input: { feedSourceId: string; importRunId: string; now: Date },
): Promise<boolean> {
	const now = input.now.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"consumeDeactivationApproval",
		sql`
		UPDATE feed_sources
		SET deactivation_approval_consumed_at = ${now}::timestamptz
		WHERE id = ${input.feedSourceId}::integer
			AND deactivation_approval_run_id_id = ${input.importRunId}::integer
			AND deactivation_approval_approved_at IS NOT NULL
			AND deactivation_approval_approved_at <= ${now}::timestamptz
			AND deactivation_approval_consumed_at IS NULL
			AND deactivation_approval_expires_at IS NOT NULL
			AND deactivation_approval_expires_at > ${now}::timestamptz
		RETURNING id
	`,
	);
	return rowsFrom(result).length > 0;
}

export async function finishImportRun(
	payload: Payload,
	input: {
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
	},
): Promise<boolean> {
	const now = input.now.toISOString();
	const result = await executeApprovedIngestSql(
		payload,
		"finishImportRun",
		sql`
		UPDATE import_runs
		SET
			status = ${input.status},
			finished_at = ${now}::timestamptz,
			heartbeat_at = ${now}::timestamptz,
			offered_count = ${input.offeredCount ?? null},
			created_count = ${input.createdCount ?? null},
			updated_count = ${input.updatedCount ?? null},
			skipped_count = ${input.skippedCount ?? null},
			warning_count = ${input.warningCount ?? null},
			error_count = ${input.errorCount ?? null},
			feed_hash = ${input.feedHash ?? null},
			last_error_redacted = ${input.lastErrorRedacted ?? null}
		WHERE id = ${input.importRunId}::integer
			AND status = 'running'
		RETURNING id
	`,
	);
	return rowsFrom(result).length > 0;
}
