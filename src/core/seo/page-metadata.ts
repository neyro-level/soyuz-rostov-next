import type { MediaDTO, PageSEOContract } from "@ams/realtbase-contracts";
import type { Metadata } from "next";
import {
	composeFinalRobots,
	type GlobalIndexingPolicy,
} from "./final-robots.ts";

export type PublicMetadataOptions = {
	globalIndexingPolicy: GlobalIndexingPolicy;
	webmasterVerification?: Metadata["verification"];
};

export function toOpenGraphImage(image: MediaDTO | undefined) {
	if (!image) return undefined;
	if (image.kind === "managed") {
		return {
			url: image.src,
			alt: image.alt,
			width: image.width,
			height: image.height,
		};
	}

	try {
		const url = new URL(image.src);
		if (url.protocol !== "https:") return undefined;
		return {
			url: url.toString(),
			alt: image.alt,
			width: image.width,
			height: image.height,
		};
	} catch {
		return undefined;
	}
}

export function toMetadata(
	seo: PageSEOContract,
	options: PublicMetadataOptions = { globalIndexingPolicy: "public" },
): Metadata {
	return {
		title: seo.title,
		description: seo.description,
		alternates: { canonical: seo.canonicalPath },
		robots: composeFinalRobots(options.globalIndexingPolicy, seo),
		verification: options.webmasterVerification,
		openGraph: seo.openGraph
			? {
					title: seo.openGraph.title ?? seo.title,
					description: seo.openGraph.description ?? seo.description,
					url: seo.canonicalPath,
					images: toOpenGraphImage(seo.openGraph.image),
				}
			: undefined,
	};
}

export function toPublicSiteMetadata(input: {
	title: string;
	metadataBase: URL;
	options: PublicMetadataOptions;
}): Metadata {
	return {
		metadataBase: input.metadataBase,
		title: input.title,
		robots: composeFinalRobots(input.options.globalIndexingPolicy, {
			indexing: "index",
			following: "follow",
		}),
		verification: input.options.webmasterVerification,
	};
}
