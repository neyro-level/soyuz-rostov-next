import "server-only";
import { z } from "zod";

export const ingestSourceScopeSchema = z.object({
	sourceId: z.string().min(1),
	externalId: z.string().min(1),
});

export type IngestSourceScope = z.output<typeof ingestSourceScopeSchema>;

export function parseIngestSourceScope(input: unknown): IngestSourceScope {
	return ingestSourceScopeSchema.parse(input);
}

export const ingestGatewayPolicy = {
	boundedBatches: true,
	normalizeBeforeWrite: true,
	noExternalHttpInsideTransaction: true,
	idempotentUpsertRequired: true,
} as const;
