import { sql } from "@payloadcms/db-postgres/drizzle";
import type { Payload } from "payload";

/**
 * Approved parameterized SQL for system atomic/bulk operations.
 * Generic query(sql: string) is not exported.
 */
export const systemSqlLayer = "src/core/data-access/system/sql" as const;

export const approvedSystemSqlOperations = {
	createPublicGatewayBudgetFixtureRows: {
		invariant:
			"A bounded deterministic fixture is inserted with unique slugs in one isolated-test setup statement.",
		reason:
			"The 2000-row performance fixture must avoid per-document hooks and Local API round trips that would measure setup rather than the Public Gateway.",
	},
	claimLeadDeliveryRow: {
		invariant: "Exactly one due pending delivery can transition to sending.",
		reason:
			"Claim, attempt increment, and affected result must be one conditional statement.",
	},
} as const;

type ApprovedSystemSqlOperation = keyof typeof approvedSystemSqlOperations;

type DrizzleExecutor = {
	execute: (query: unknown) => Promise<unknown>;
};

export type ClaimedLeadDeliveryRow = {
	id: string;
	leadId: string;
	channelId: string;
	channelKind: "messenger" | "crm";
	attempts: number;
	idempotencyKey: string;
	jobId?: string;
};

function getDrizzle(payload: Payload): DrizzleExecutor {
	const drizzle = (payload.db as { drizzle?: DrizzleExecutor } | undefined)
		?.drizzle;
	if (!drizzle?.execute) {
		throw new Error("System SQL requires Payload Postgres drizzle.execute.");
	}
	return drizzle;
}

function executeApprovedSystemSql(
	payload: Payload,
	operation: ApprovedSystemSqlOperation,
	query: unknown,
): Promise<unknown> {
	void approvedSystemSqlOperations[operation];
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

export async function createPublicGatewayBudgetFixtureRows(
	payload: Payload,
	input: { start: number; count: number; prefix: string; publishedAt: string },
): Promise<number> {
	if (
		!Number.isInteger(input.start) ||
		input.start < 1 ||
		!Number.isInteger(input.count) ||
		input.count < 0 ||
		input.count > 2000 ||
		!/^plan10-budget-$/.test(input.prefix)
	) {
		throw new Error("Invalid Public Gateway budget fixture request.");
	}
	if (input.count === 0) return 0;
	const last = input.start + input.count - 1;
	const result = await executeApprovedSystemSql(
		payload,
		"createPublicGatewayBudgetFixtureRows",
		sql`
		INSERT INTO properties (
			origin, status, published_at, slug, market, category, deal_type,
			price_minor, rooms, total_area, locality, district, city_ref_id,
			title, updated_at, created_at
		)
		SELECT
			'manual'::enum_properties_origin,
			'active'::enum_properties_status,
			${input.publishedAt}::timestamptz,
			${input.prefix} || lpad(sequence::text, 4, '0'),
			CASE WHEN sequence % 5 = 0 THEN 'newbuild' ELSE 'secondary' END::enum_properties_market,
			CASE WHEN sequence % 7 = 0 THEN 'house' ELSE 'apartment' END::enum_properties_category,
			CASE WHEN sequence % 11 = 0 THEN 'rent' ELSE 'sale' END::enum_properties_deal_type,
			500000000::bigint + sequence::bigint * 1000000::bigint,
			(sequence % 4) + 1,
			35 + (sequence % 90),
			'Приморск',
			'Район ' || ((sequence % 12) + 1)::text,
			(SELECT id FROM cities WHERE slug = 'primorsk' LIMIT 1),
			'Plan 10 budget fixture ' || sequence::text,
			${input.publishedAt}::timestamptz,
			${input.publishedAt}::timestamptz
		FROM generate_series(${input.start}::integer, ${last}::integer) AS sequence
		ON CONFLICT (slug) DO UPDATE SET
			city_ref_id = EXCLUDED.city_ref_id,
			updated_at = EXCLUDED.updated_at
		RETURNING id
	`,
	);
	return rowsFrom(result).length;
}

export async function claimLeadDeliveryRow(
	payload: Payload,
	input: { deliveryId: string; nowIso: string },
): Promise<ClaimedLeadDeliveryRow | undefined> {
	const deliveryId = Number(input.deliveryId);
	if (!Number.isInteger(deliveryId) || deliveryId < 1) {
		return undefined;
	}

	const result = await executeApprovedSystemSql(
		payload,
		"claimLeadDeliveryRow",
		sql`
		UPDATE lead_deliveries AS claimed
		SET
			status = 'sending',
			claimed_at = ${input.nowIso}::timestamptz,
			heartbeat_at = ${input.nowIso}::timestamptz,
			attempts = claimed.attempts + 1
		WHERE claimed.id = ${deliveryId}
			AND claimed.status = 'pending'
			AND claimed.next_attempt_at IS NOT NULL
			AND claimed.next_attempt_at <= ${input.nowIso}::timestamptz
		RETURNING
			claimed.id,
			claimed.lead_id,
			claimed.channel_id,
			claimed.channel_kind,
			claimed.attempts,
			claimed.idempotency_key,
			claimed.job_id
	`,
	);
	const row = rowsFrom(result)[0];
	if (!row) {
		return undefined;
	}

	const channelKind = row.channel_kind === "crm" ? "crm" : "messenger";
	return {
		id: String(row.id),
		leadId: String(row.lead_id),
		channelId: String(row.channel_id),
		channelKind,
		attempts: Number(row.attempts) || 0,
		idempotencyKey: String(row.idempotency_key),
		jobId: row.job_id ? String(row.job_id) : undefined,
	};
}
