import {
	parseAllowedImageHosts,
	validateExternalImageUrl,
} from "../../core/ingest/image-hosts.ts";

export type PropertyGateImage = {
	kind: "external" | "managed";
	url?: string | null;
	media?: unknown;
};

function hasManagedMediaUrl(media: unknown): boolean {
	return Boolean(
		media &&
			typeof media === "object" &&
			"url" in media &&
			typeof media.url === "string" &&
			media.url.trim(),
	);
}

export function countPropertyGatePhotos(
	images: readonly PropertyGateImage[] | null | undefined,
	allowedHosts: ReadonlySet<string>,
): number {
	return (images ?? []).filter((image) => {
		if (image.kind === "managed") return hasManagedMediaUrl(image.media);
		if (!image.url?.trim()) return false;
		return validateExternalImageUrl(image.url, allowedHosts).ok;
	}).length;
}

export function allowedPropertyImageHosts(
	env: NodeJS.ProcessEnv = process.env,
): ReadonlySet<string> {
	return parseAllowedImageHosts(env.EXTERNAL_IMAGE_HOSTS);
}
