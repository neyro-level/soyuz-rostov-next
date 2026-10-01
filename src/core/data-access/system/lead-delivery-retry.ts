import type { PayloadRequest } from "payload";
import {
	type LeadDeliveryOperationAccess,
	retryLeadDelivery,
} from "../../leads/owner-delivery-operations.ts";
import { systemOverrideAccess } from "./overrides.ts";

type RetryInput = Parameters<typeof retryLeadDelivery>[0];

export function retryLeadDeliveryThroughSystemGateway(
	input: Omit<RetryInput, "access"> & { req: PayloadRequest },
) {
	const access: LeadDeliveryOperationAccess = {
		...systemOverrideAccess("owner-lead-delivery-retry"),
		req: input.req,
	};
	return retryLeadDelivery({ ...input, access });
}
