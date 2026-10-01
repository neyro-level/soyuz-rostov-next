import "server-only";
import type { Payload } from "payload";
export { systemOverrideAccess } from "./overrides.ts";

export async function destroyPayload(payload: Payload): Promise<void> {
	await payload.destroy();
}
