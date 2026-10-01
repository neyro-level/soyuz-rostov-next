import type { NormalizedFeedOffer } from "./feed-normalization.ts";
import type { FeedPropertyImageDraft } from "./feed-ingest.ts";

export type MirroredMediaFile = {
	id: string;
	sourceUrl: string;
};

export type FeedMediaMirrorIssue = {
	field: "images";
	messageRedacted: string;
};

export async function mirrorFeedImages(input: {
	offer: NormalizedFeedOffer;
	persist: (
		image: NormalizedFeedOffer["images"][number],
		index: number,
	) => Promise<MirroredMediaFile>;
	maxImages?: number;
	concurrency?: number;
	retries?: number;
}): Promise<{
	images: FeedPropertyImageDraft[];
	issues: FeedMediaMirrorIssue[];
}> {
	const maxImages = input.maxImages ?? 30;
	const concurrency = input.concurrency ?? 3;
	const retries = input.retries ?? 2;
	if (!Number.isInteger(maxImages) || maxImages < 1)
		throw new Error("maxImages must be positive.");
	if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 8)
		throw new Error("media concurrency is out of bounds.");
	if (!Number.isInteger(retries) || retries < 0 || retries > 3)
		throw new Error("media retries are out of bounds.");

	const source = input.offer.images.slice(0, maxImages);
	const results: Array<FeedPropertyImageDraft | undefined> = new Array(
		source.length,
	);
	const issues: FeedMediaMirrorIssue[] = [];
	let cursor = 0;
	const worker = async () => {
		while (cursor < source.length) {
			const index = cursor++;
			let lastError: unknown;
			for (let attempt = 0; attempt <= retries; attempt += 1) {
				try {
					const mirrored = await input.persist(source[index], index);
					results[index] = {
						kind: "managed",
						media: mirrored.id,
						alt: input.offer.title,
						order: index,
					};
					lastError = undefined;
					break;
				} catch (error) {
					lastError = error;
				}
			}
			if (lastError)
				issues.push({
					field: "images",
					messageRedacted:
						"Feed image could not be mirrored within the configured safety bounds and was skipped.",
				});
		}
	};
	await Promise.all(
		Array.from({ length: Math.min(concurrency, source.length) }, worker),
	);
	if (input.offer.images.length > maxImages)
		issues.push({
			field: "images",
			messageRedacted:
				"Feed images beyond the configured per-offer limit were skipped.",
		});
	return {
		images: results.filter((item): item is FeedPropertyImageDraft =>
			Boolean(item),
		),
		issues,
	};
}
