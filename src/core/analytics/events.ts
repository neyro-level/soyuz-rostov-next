import { z } from "zod";

const normalizedKey = z
	.string()
	.min(1)
	.max(120)
	.regex(/^[a-z0-9][a-z0-9-]*$/);

const dimensionsSchema = z
	.object({
		page: z
			.string()
			.min(1)
			.max(512)
			.regex(/^\/(?:[a-z0-9-]+\/?)*$/),
		geo: normalizedKey.optional(),
		surface: z
			.enum([
				"apartments",
				"new-buildings",
				"houses",
				"plots",
				"commercial",
				"garages",
			])
			.optional(),
		market: z.enum(["sale", "rent"]).optional(),
	})
	.strict();

const geoDimensionsSchema = dimensionsSchema.extend({ geo: normalizedKey });
const listingDimensionsSchema = geoDimensionsSchema.extend({
	surface: dimensionsSchema.shape.surface.unwrap(),
	market: dimensionsSchema.shape.market.unwrap(),
});

function eventSchema<Name extends string>(
	name: Name,
	dimensions: z.ZodObject<z.ZodRawShape>,
	entityRequired = false,
) {
	return z
		.object({
			name: z.literal(name),
			dimensions,
			entityKey: entityRequired ? normalizedKey : normalizedKey.optional(),
		})
		.strict();
}

const entityEventSchema = z.discriminatedUnion("name", [
	eventSchema("geo_view", geoDimensionsSchema),
	eventSchema("listing_view", listingDimensionsSchema),
	eventSchema("district_view", geoDimensionsSchema, true),
	eventSchema("facet_view", listingDimensionsSchema, true),
	eventSchema("development_view", geoDimensionsSchema, true),
	eventSchema("developer_view", geoDimensionsSchema, true),
	eventSchema("development_price_request_submit", listingDimensionsSchema, true),
	eventSchema("legal_cta_click", dimensionsSchema),
]);

export type AnalyticsEvent = z.infer<typeof entityEventSchema>;

export type AnalyticsAdapter = {
	track(event: AnalyticsEvent): void | Promise<void>;
};

const forbiddenPiiKey =
	/phone|email|name|message|text|comment|address|contact|user|person/i;

export function parseAnalyticsEvent(input: unknown): AnalyticsEvent {
	assertNoPiiKeys(input);
	return entityEventSchema.parse(input);
}

export async function trackAnalyticsEvent(
	adapter: AnalyticsAdapter,
	input: unknown,
): Promise<void> {
	await adapter.track(parseAnalyticsEvent(input));
}

export function createNoopAnalyticsAdapter(): AnalyticsAdapter {
	return { track: () => undefined };
}

export function createAnalyticsTestSink(): AnalyticsAdapter & {
	readonly events: readonly AnalyticsEvent[];
} {
	const events: AnalyticsEvent[] = [];
	return {
		events,
		track(event) {
			events.push(parseAnalyticsEvent(event));
		},
	};
}

function assertNoPiiKeys(value: unknown, path = "event"): void {
	if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) {
			assertNoPiiKeys(item, `${path}[${index}]`);
		}
		return;
	}
	if (!value || typeof value !== "object") return;
	for (const [key, child] of Object.entries(value)) {
		if (!(path === "event" && key === "name") && forbiddenPiiKey.test(key)) {
			throw new Error(`Analytics payload contains forbidden PII key at ${path}.${key}.`);
		}
		assertNoPiiKeys(child, `${path}.${key}`);
	}
}
