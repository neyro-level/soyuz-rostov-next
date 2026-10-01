import type { LeadIntakeAccepted } from "./intake.ts";

export type LeadChannelConfig = {
	id: string;
	kind: "messenger" | "crm";
	enabled: boolean;
};

export type LeadRecord = LeadIntakeAccepted["lead"] & {
	id: string;
	status: "new";
};

export type LeadDeliveryRecord = {
	id: string;
	lead: string;
	channelId: string;
	channelKind: "messenger" | "crm";
	status: "pending";
	attempts: 0;
	nextAttemptAt: string;
	idempotencyKey: string;
	jobId?: string;
};

export type LeadOutboxRepository = {
	transaction<T>(
		operation: (tx: LeadOutboxTransaction) => Promise<T>,
	): Promise<T>;
	findLeadByIdempotencyKey(
		idempotencyKey: string,
	): Promise<LeadRecord | undefined>;
	findLeadDeliveries(leadId: string): Promise<LeadDeliveryRecord[]>;
	findPendingDeliveriesWithoutJob(
		nowIso: string,
	): Promise<LeadDeliveryRecord[]>;
	attachDeliveryJobId?(deliveryId: string, jobId: string): Promise<void>;
};

export type LeadOutboxTransaction = {
	createLead(
		input: LeadIntakeAccepted["lead"] & { status: "new" },
	): Promise<LeadRecord>;
	createLeadDelivery(
		input: Omit<LeadDeliveryRecord, "id">,
	): Promise<LeadDeliveryRecord>;
};

export type CommitLeadOutboxInput = {
	intake: LeadIntakeAccepted;
	channels: LeadChannelConfig[];
	repository: LeadOutboxRepository;
	nowIso: string;
};

export type CommitLeadOutboxResult = {
	lead: LeadRecord;
	deliveries: LeadDeliveryRecord[];
	reusedExistingLead: boolean;
};

export type LeadDeliveryJobPlan = {
	deliveryId: string;
	task: "deliverLead";
	queue: "lead-deliveries";
	input: { leadDeliveryId: string };
};

export async function commitLeadOutbox({
	intake,
	channels,
	repository,
	nowIso,
}: CommitLeadOutboxInput): Promise<CommitLeadOutboxResult> {
	const existingLead = await repository.findLeadByIdempotencyKey(
		intake.lead.idempotencyKey,
	);
	if (existingLead) {
		return {
			lead: existingLead,
			deliveries: await repository.findLeadDeliveries(existingLead.id),
			reusedExistingLead: true,
		};
	}

	try {
		return await repository.transaction(async (tx) => {
			const lead = await tx.createLead({
				...intake.lead,
				status: "new",
			});
			const deliveries: LeadDeliveryRecord[] = [];

			for (const channel of channels.filter((item) => item.enabled)) {
				deliveries.push(
					await tx.createLeadDelivery({
						lead: lead.id,
						channelId: channel.id,
						channelKind: channel.kind,
						status: "pending",
						attempts: 0,
						nextAttemptAt: nowIso,
						idempotencyKey: buildLeadDeliveryIdempotencyKey(lead.id, channel.id),
					}),
				);
			}

			return { lead, deliveries, reusedExistingLead: false };
		});
	} catch (error) {
		const raced = await repository.findLeadByIdempotencyKey(
			intake.lead.idempotencyKey,
		);
		if (raced) {
			return {
				lead: raced,
				deliveries: await repository.findLeadDeliveries(raced.id),
				reusedExistingLead: true,
			};
		}
		throw error;
	}
}

export async function accelerateLeadDeliveryJobs({
	repository,
	nowIso,
	enqueue,
}: {
	repository: LeadOutboxRepository;
	nowIso: string;
	enqueue: (leadDeliveryId: string) => Promise<string | undefined>;
}): Promise<void> {
	const plans = await planRecoverableLeadDeliveryJobs(repository, nowIso);
	for (const plan of plans) {
		try {
			const jobId = await enqueue(plan.input.leadDeliveryId);
			if (jobId && repository.attachDeliveryJobId) {
				await repository.attachDeliveryJobId(plan.deliveryId, jobId);
			}
		} catch {
			// Immediate enqueue is optional. Sweeper remains the correctness path.
		}
	}
}

export async function planRecoverableLeadDeliveryJobs(
	repository: LeadOutboxRepository,
	nowIso: string,
): Promise<LeadDeliveryJobPlan[]> {
	const recoverable = await repository.findPendingDeliveriesWithoutJob(nowIso);
	return recoverable.map((delivery) => ({
		deliveryId: delivery.id,
		task: "deliverLead",
		queue: "lead-deliveries",
		input: { leadDeliveryId: delivery.id },
	}));
}

export function buildLeadDeliveryIdempotencyKey(
	leadId: string,
	channelId: string,
): string {
	return `lead:${leadId}:channel:${channelId}`;
}
