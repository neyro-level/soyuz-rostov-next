import { z } from "zod";

const pathTargetSchema = z.object({
	type: z.literal("path"),
	path: z.string().min(1).max(1024).regex(/^\//),
	routeType: z.enum(["page", "layout"]).optional(),
});

const tagTargetSchema = z.object({
	type: z.literal("tag"),
	tag: z
		.string()
		.min(1)
		.max(128)
		.regex(/^[a-z0-9:_-]+$/i),
});

export const cacheTargetSchema = z.discriminatedUnion("type", [
	pathTargetSchema,
	tagTargetSchema,
]);

export const cacheInvalidationRequestSchema = z.object({
	targets: z.array(cacheTargetSchema).min(1).max(32),
	reason: z.string().max(200).optional(),
});

export type CacheTarget = z.output<typeof cacheTargetSchema>;
export type CacheInvalidationRequest = z.output<
	typeof cacheInvalidationRequestSchema
>;
