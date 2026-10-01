import type { PayloadRequest } from "payload";
import {
	assertDevelopmentKindFields,
	assertDevelopmentMediaItems,
	assertDevelopmentSlug,
	assertPublishedDevelopmentSlugImmutable,
	computeDevelopmentCompletenessScore,
} from "../../core/developments/domain.ts";

type Data = Record<string, unknown>;

function merged(
	data: Data,
	originalDoc: Data | undefined,
	key: string,
): unknown {
	return data[key] === undefined ? originalDoc?.[key] : data[key];
}

export async function validateDevelopmentWrite(input: {
	data: Data;
	originalDoc?: Data;
	req: PayloadRequest;
}): Promise<Data> {
	const combined = { ...input.originalDoc, ...input.data };
	const slug = assertDevelopmentSlug(combined.slug);
	assertPublishedDevelopmentSlugImmutable({
		nextSlug: slug,
		originalSlug:
			typeof input.originalDoc?.slug === "string"
				? input.originalDoc.slug
				: null,
		originalPublishedAt:
			typeof input.originalDoc?.publishedAt === "string"
				? input.originalDoc.publishedAt
				: null,
	});
	assertDevelopmentKindFields(combined);
	assertDevelopmentMediaItems(combined.mediaItems);

	const city = merged(input.data, input.originalDoc, "city");
	if (city == null) throw new Error("Development city is required.");
	const region = merged(input.data, input.originalDoc, "region");
	if (region == null) throw new Error("Development region is required.");

	input.data.slug = slug;
	input.data.completenessScore = computeDevelopmentCompletenessScore(combined);
	return input.data;
}

export function validateDeveloperWrite(data: Data, originalDoc?: Data): Data {
	const slug = assertDevelopmentSlug(merged(data, originalDoc, "slug"));
	if (
		originalDoc?.publishedAt &&
		typeof originalDoc.slug === "string" &&
		slug !== originalDoc.slug
	) {
		throw new Error("Published developer slug is immutable.");
	}
	data.slug = slug;
	return data;
}
