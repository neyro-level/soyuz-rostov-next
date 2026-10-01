import { createHash } from "node:crypto";
import type { Payload } from "payload";
import {
	createMirroredMedia,
	findMirroredMediaByHash,
} from "../../core/data-access/system/media-mirror.ts";
import type { NormalizedFeedOffer } from "../../core/ingest/feed-normalization.ts";
import { mirrorFeedImages } from "../../core/ingest/media-mirror.ts";
import { safeOutboundFetch } from "../../core/security/safe-outbound-client.ts";

const allowedMimeTypes = new Set([
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
]);
const extensionByMime = new Map([
	["image/jpeg", "jpg"],
	["image/png", "png"],
	["image/webp", "webp"],
	["image/gif", "gif"],
]);

export function createPayloadFeedMediaMirror(input: {
	payload: Payload;
	allowedHosts: ReadonlySet<string>;
	feedSourceId: string;
	nowIso: () => string;
}) {
	return (offer: NormalizedFeedOffer) =>
		mirrorFeedImages({
			offer,
			maxImages: 30,
			concurrency: 3,
			retries: 2,
			persist: async (image, index) => {
				if (!input.allowedHosts.has(image.host))
					throw new Error("Image host is not allowlisted.");
				const response = await safeOutboundFetch(image.url, {
					allowedHosts: [...input.allowedHosts],
					timeoutMs: 10_000,
					maxBytes: 8 * 1024 * 1024,
					maxRedirects: 3,
				});
				if (!response.ok) throw new Error("Image download failed.");
				const mimeType = response.headers
					.get("content-type")
					?.split(";", 1)[0]
					?.trim()
					.toLowerCase();
				if (!mimeType || !allowedMimeTypes.has(mimeType))
					throw new Error("Image MIME type is not allowed.");
				const data = Buffer.from(await response.arrayBuffer());
				if (data.length === 0 || data.length > 8 * 1024 * 1024)
					throw new Error("Image size is out of bounds.");
				const sha256 = createHash("sha256").update(data).digest("hex");
				const existing = await findMirroredMediaByHash(input.payload, sha256);
				if (existing) return { id: existing.id, sourceUrl: image.url };
				const extension = extensionByMime.get(mimeType) ?? "bin";
				try {
					const created = await createMirroredMedia({
						payload: input.payload,
						data: {
							alt: offer.title,
							ownership: "owned-feed-mirror",
							sourceUrl: image.url,
							sourceHost: image.host,
							sourceRights:
								"Provided by feed source; publication rights require source agreement.",
							sourceSha256: sha256,
							sourceFeed: Number(input.feedSourceId),
							mirroredAt: input.nowIso(),
						},
						file: {
							data,
							mimetype: mimeType,
							name: `feed-${sha256.slice(0, 20)}-${index}.${extension}`,
							size: data.length,
						},
					});
					return { id: created.id, sourceUrl: image.url };
				} catch (error) {
					const raced = await findMirroredMediaByHash(input.payload, sha256);
					if (raced) return { id: raced.id, sourceUrl: image.url };
					throw error;
				}
			},
		});
}
