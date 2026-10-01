import type { Payload, PayloadRequest } from "payload";
import type { LeadDeliveryPolicy } from "./delivery-policy.ts";
import { appendAttemptLog } from "./delivery-state.ts";

const requestAccess = { overrideAccess: false as const };

export type LeadDeliveryOperationAccess = {
	overrideAccess: boolean;
	req?: PayloadRequest;
	context?: Record<string, unknown>;
};

export async function retryLeadDelivery({
	payload,
	req,
	deliveryId,
	actorUserId,
	nowIso,
	enqueue,
	policy,
	access,
}: {
	payload: Payload;
	req?: PayloadRequest;
	deliveryId: string;
	actorUserId: string;
	nowIso: string;
	enqueue: (leadDeliveryId: string) => Promise<string>;
	policy: LeadDeliveryPolicy;
	access?: LeadDeliveryOperationAccess;
}): Promise<{ jobId: string }> {
	const operationAccess = access ?? { ...requestAccess, req };
	const delivery = await payload.findByID({
		collection: "lead-deliveries",
		id: deliveryId,
		depth: 0,
		...operationAccess,
	});

	if (delivery.status === "sending") {
		throw new Error("Manual retry is not allowed while a delivery is sending.");
	}
	if (delivery.status === "delivered") {
		throw new Error("Manual retry is not allowed for a delivered row.");
	}
	if (delivery.jobId) {
		throw new Error(
			"Manual retry requires no live job identity on the delivery.",
		);
	}

	const attemptLog = appendAttemptLog(
		(delivery.attemptLog as
			| { attemptedAt: string; outcome: "skipped"; redactedNote?: string }[]
			| undefined) ?? [],
		{
			attemptedAt: nowIso,
			outcome: "skipped",
			safeCode: "manual_retry",
			redactedNote: `Manual retry requested by user ${actorUserId}.`,
		},
		policy,
	);

	await payload.update({
		collection: "lead-deliveries",
		id: deliveryId,
		data: {
			status: "pending",
			nextAttemptAt: nowIso,
			claimedAt: null,
			heartbeatAt: null,
			abandonedReason: null,
			lastErrorKind: null,
			attemptLog,
		},
		...operationAccess,
	});

	const jobId = await enqueue(String(delivery.id));
	await payload.update({
		collection: "lead-deliveries",
		id: deliveryId,
		data: { jobId },
		...operationAccess,
	});
	return { jobId };
}
