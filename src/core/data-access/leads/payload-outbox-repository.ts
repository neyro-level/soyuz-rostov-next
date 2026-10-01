import type { Payload, PayloadRequest } from "payload";
import { systemOverrideAccess } from "../system/overrides.ts";
import type {
	LeadDeliveryRecord,
	LeadOutboxRepository,
	LeadOutboxTransaction,
	LeadRecord,
} from "../../leads/outbox.ts";

const access = systemOverrideAccess("system-job");

type TransactionalDb = {
	beginTransaction?: (
		options?: unknown,
	) => Promise<string | number | false | null | undefined>;
	commitTransaction?: (id: string | number) => Promise<void>;
	rollbackTransaction?: (id: string | number) => Promise<void>;
};

function asRequest(
	transactionID?: string | number,
): PayloadRequest | undefined {
	if (transactionID === undefined) {
		return undefined;
	}
	return { transactionID } as PayloadRequest;
}

function relationId(value: unknown): string {
	if (value && typeof value === "object" && "id" in value) {
		return String((value as { id: unknown }).id);
	}
	return String(value);
}

function parsePropertyId(value?: string): number | undefined {
	if (!value || !/^\d+$/.test(value)) {
		return undefined;
	}
	return Number(value);
}

function mapLead(doc: Record<string, unknown>): LeadRecord {
	const consent = (doc.consent ?? {}) as {
		accepted?: boolean;
		version?: string;
		consentedAt?: string;
	};
	return {
		id: String(doc.id),
		status: "new",
		name: String(doc.name),
		phoneRaw: String(doc.phoneRaw ?? ""),
		phoneE164: String(doc.phoneE164),
		email: typeof doc.email === "string" ? doc.email : undefined,
		message: typeof doc.message === "string" ? doc.message : undefined,
		formKind: doc.formKind as LeadRecord["formKind"],
		sourcePage: String(doc.sourcePage),
		referrer: typeof doc.referrer === "string" ? doc.referrer : undefined,
		property:
			doc.property === null || doc.property === undefined
				? undefined
				: relationId(doc.property),
		context: (doc.context as LeadRecord["context"]) ?? undefined,
		utm: (doc.utm as LeadRecord["utm"]) ?? undefined,
		consent: {
			accepted: true,
			version: String(consent.version ?? ""),
			consentedAt: String(consent.consentedAt ?? ""),
		},
		idempotencyKey: String(doc.idempotencyKey),
		retentionUntil:
			typeof doc.retentionUntil === "string" ? doc.retentionUntil : undefined,
		fraudFingerprint:
			typeof doc.fraudFingerprint === "string"
				? doc.fraudFingerprint
				: undefined,
	};
}

function mapDelivery(doc: Record<string, unknown>): LeadDeliveryRecord {
	return {
		id: String(doc.id),
		lead: relationId(doc.lead),
		channelId: String(doc.channelId),
		channelKind: doc.channelKind as LeadDeliveryRecord["channelKind"],
		status: "pending",
		attempts: 0,
		nextAttemptAt: String(doc.nextAttemptAt ?? ""),
		idempotencyKey: String(doc.idempotencyKey),
		jobId: typeof doc.jobId === "string" && doc.jobId ? doc.jobId : undefined,
	};
}

export function createPayloadLeadOutboxRepository(
	payload: Payload,
): LeadOutboxRepository {
	const createTx = (transactionID?: string | number): LeadOutboxTransaction => {
		const req = asRequest(transactionID);
		return {
			async createLead(input) {
				const created = await payload.create({
					collection: "leads",
					data: {
						name: input.name,
						phoneRaw: input.phoneRaw,
						phoneE164: input.phoneE164,
						email: input.email,
						message: input.message,
						formKind: input.formKind,
						sourcePage: input.sourcePage,
						referrer: input.referrer,
						property: parsePropertyId(input.property),
						context: input.context,
						utm: input.utm,
						consent: input.consent,
						status: "new",
						idempotencyKey: input.idempotencyKey,
						retentionMode: "delete",
						retentionUntil: input.retentionUntil,
						fraudFingerprint: input.fraudFingerprint,
					},
					depth: 0,
					...(req ? { req } : {}),
					...access,
				});
				return mapLead(created as unknown as Record<string, unknown>);
			},
			async createLeadDelivery(input) {
				const created = await payload.create({
					collection: "lead-deliveries",
					data: {
						lead: Number(input.lead),
						channelId: input.channelId,
						channelKind: input.channelKind,
						status: "pending",
						attempts: 0,
						nextAttemptAt: input.nextAttemptAt,
						idempotencyKey: input.idempotencyKey,
					},
					depth: 0,
					...(req ? { req } : {}),
					...access,
				});
				return mapDelivery(created as unknown as Record<string, unknown>);
			},
		};
	};

	return {
		async transaction(operation) {
			const db = payload.db as TransactionalDb;
			const transactionID = await db.beginTransaction?.();
			const activeId =
				typeof transactionID === "string" || typeof transactionID === "number"
					? transactionID
					: undefined;
			try {
				const result = await operation(createTx(activeId));
				if (activeId !== undefined) {
					await db.commitTransaction?.(activeId);
				}
				return result;
			} catch (error) {
				if (activeId !== undefined) {
					await db.rollbackTransaction?.(activeId);
				}
				throw error;
			}
		},
		async findLeadByIdempotencyKey(idempotencyKey) {
			const found = await payload.find({
				collection: "leads",
				where: { idempotencyKey: { equals: idempotencyKey } },
				limit: 1,
				depth: 0,
				...access,
			});
			const doc = found.docs[0] as unknown as
				| Record<string, unknown>
				| undefined;
			return doc ? mapLead(doc) : undefined;
		},
		async findLeadDeliveries(leadId) {
			const found = await payload.find({
				collection: "lead-deliveries",
				where: { lead: { equals: Number(leadId) } },
				limit: 50,
				depth: 0,
				...access,
			});
			return found.docs.map((doc) =>
				mapDelivery(doc as unknown as Record<string, unknown>),
			);
		},
		async findPendingDeliveriesWithoutJob(nowIso) {
			const found = await payload.find({
				collection: "lead-deliveries",
				where: {
					and: [
						{ status: { equals: "pending" } },
						{ nextAttemptAt: { less_than_equal: nowIso } },
						{ jobId: { exists: false } },
					],
				},
				limit: 50,
				depth: 0,
				...access,
			});
			return found.docs.map((doc) =>
				mapDelivery(doc as unknown as Record<string, unknown>),
			);
		},
		async attachDeliveryJobId(deliveryId, jobId) {
			await payload.update({
				collection: "lead-deliveries",
				id: Number(deliveryId),
				data: { jobId },
				depth: 0,
				...access,
			});
		},
	};
}
