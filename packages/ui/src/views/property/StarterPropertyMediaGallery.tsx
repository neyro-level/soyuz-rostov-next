"use client";

import { StarterFeedImage } from "../../lib/starter-image";
import { MediaFallback } from "../starter/MediaFallback";
import { MediaGallery } from "./MediaGallery";

type StarterPropertyMediaGalleryProps = {
	images: ReadonlyArray<{ src: string; alt?: string | null }>;
	title: string;
};

export function StarterPropertyMediaGallery({
	images,
	title,
}: StarterPropertyMediaGalleryProps) {
	return (
		<MediaGallery
			images={images.map((image) => ({
				src: image.src,
				alt: image.alt || title,
			}))}
			imageRenderer={StarterFeedImage}
			imageSizes="(min-width: 1024px) 62vw, 100vw"
			priority
			shouldOptimizeImage={(src) =>
				src.startsWith("/") && !src.startsWith("//")
			}
			emptyContent={<MediaFallback className="absolute inset-0 min-h-full" />}
		/>
	);
}
