type SystemOperation =
	| "bootstrap-owner"
	| "controlled-maintenance"
	| "system-job"
	| "owner-lead-delivery-retry"
	| "migration-helper"
	| "trusted-inspection"
	| "payload-jobs-inspect"
	| "payload-jobs-unstuck"
	| "record-lifecycle-event"
	| "redirect-graph-guard"
	| "media-mirror";

export function systemOverrideAccess(operation: SystemOperation) {
	return {
		overrideAccess: true,
		context: {
			systemGatewayOperation: operation,
		},
	} as const;
}

export const trustedInspectionAccess =
	systemOverrideAccess("trusted-inspection");
