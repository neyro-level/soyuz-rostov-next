import "server-only";

import configPromise from "@payload-config";
import { getPayload } from "payload";
import { isPayloadRuntimeConfigured } from "@/project/env";

export async function getOptionalPublicGatewayPayload() {
	if (!isPayloadRuntimeConfigured) {
		return null;
	}

	return getPayload({ config: configPromise });
}

export async function getPublicGatewayPayload() {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		throw new Error("DATABASE_URI is required for Payload runtime.");
	}

	return payload;
}
