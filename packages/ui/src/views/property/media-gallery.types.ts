import type { ReactNode } from "react";
import type { SlideImage } from "yet-another-react-lightbox";
import type { SiteImageRenderer } from "../../lib/adapters";

export type MediaGalleryImage = SlideImage & { alt: string };

export type MediaGalleryProps = {
	images: MediaGalleryImage[];
	imageRenderer: SiteImageRenderer;
	imageSizes: string;
	imageClassName?: string;
	priority?: boolean;
	shouldOptimizeImage?: (src: string) => boolean;
	emptyLabel?: string;
	emptyContent?: ReactNode;
	variant?: "dark-controls" | "light-controls";
};
