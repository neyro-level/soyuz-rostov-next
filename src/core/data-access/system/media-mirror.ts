import type { Payload } from "payload";
import { systemOverrideAccess } from "./overrides.ts";

const mediaMirrorAccess = systemOverrideAccess("media-mirror");

export async function findMirroredMediaByHash(
	payload: Payload,
	sha256: string,
) {
	const result = await payload.find({
		collection: "media",
		where: { sourceSha256: { equals: sha256 } },
		limit: 1,
		depth: 0,
		...mediaMirrorAccess,
	});
	return result.docs[0] ? { id: String(result.docs[0].id) } : undefined;
}

export async function createMirroredMedia(input: {
	payload: Payload;
	data: {
		alt: string;
		ownership: string;
		sourceUrl: string;
		sourceHost: string;
		sourceRights: string;
		sourceSha256: string;
		sourceFeed: number;
		mirroredAt: string;
	};
	file: { data: Buffer; mimetype: string; name: string; size: number };
}) {
	const created = await input.payload.create({
		collection: "media",
		data: input.data,
		file: input.file,
		...mediaMirrorAccess,
	});
	return { id: String(created.id) };
}
