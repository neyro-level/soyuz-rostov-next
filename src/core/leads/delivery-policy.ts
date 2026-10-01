export type LeadDeliveryRoutingMode = "all-enabled";

export type LeadDeliveryPolicy = {
	retryScheduleMinutes: readonly number[];
	unknownDeliveryBackoffMinutes: number;
	staleSendingThresholdMinutes: number;
	maxAttemptLogEntries: number;
	routingMode: LeadDeliveryRoutingMode;
};

const maximumAttemptLogEntries = 100;

export function defineLeadDeliveryPolicy(
	input: LeadDeliveryPolicy,
): Readonly<LeadDeliveryPolicy> {
	const schedule = [...input.retryScheduleMinutes];
	if (schedule.length === 0) {
		throw new Error("Lead delivery retry schedule must not be empty.");
	}
	if (schedule[0] !== 0) {
		throw new Error("Lead delivery retry schedule must start with zero.");
	}
	if (schedule.some((value) => !Number.isInteger(value) || value < 0)) {
		throw new Error(
			"Lead delivery retry schedule values must be non-negative integers.",
		);
	}
	if (
		schedule.some((value, index) => index > 0 && value < schedule[index - 1])
	) {
		throw new Error("Lead delivery retry schedule must be non-decreasing.");
	}
	const normalRetryFloor = schedule[1] ?? schedule[0];
	if (
		!Number.isInteger(input.unknownDeliveryBackoffMinutes) ||
		input.unknownDeliveryBackoffMinutes < normalRetryFloor
	) {
		throw new Error(
			"Unknown delivery backoff must be an integer at least as large as the normal retry floor.",
		);
	}
	if (
		!Number.isInteger(input.staleSendingThresholdMinutes) ||
		input.staleSendingThresholdMinutes <= 0
	) {
		throw new Error("Stale sending threshold must be a positive integer.");
	}
	if (
		!Number.isInteger(input.maxAttemptLogEntries) ||
		input.maxAttemptLogEntries <= 0 ||
		input.maxAttemptLogEntries > maximumAttemptLogEntries
	) {
		throw new Error(
			`Attempt log cap must be an integer from 1 to ${maximumAttemptLogEntries}.`,
		);
	}
	if (input.routingMode !== "all-enabled") {
		throw new Error("Unsupported lead delivery routing mode.");
	}

	return Object.freeze({
		...input,
		retryScheduleMinutes: Object.freeze(schedule),
	});
}

export function leadDeliveryMaxAttempts(policy: LeadDeliveryPolicy): number {
	return policy.retryScheduleMinutes.length;
}
