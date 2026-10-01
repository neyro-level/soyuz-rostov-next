"use client";

import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Fullscreen from "yet-another-react-lightbox/plugins/fullscreen";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";

import type { MediaGalleryImage } from "./media-gallery.types";

export function MediaLightbox({
	open,
	index,
	slides,
	hasMany,
	onClose,
	onView,
	onExited,
}: {
	open: boolean;
	index: number;
	slides: MediaGalleryImage[];
	hasMany: boolean;
	onClose: () => void;
	onView: (index: number) => void;
	onExited: () => void;
}) {
	return (
		<Lightbox
			open={open}
			close={onClose}
			index={index}
			slides={slides}
			plugins={[Counter, Fullscreen, Thumbnails, Zoom]}
			className="ams-realty-media-lightbox"
			carousel={{ finite: !hasMany, preload: 2 }}
			thumbnails={{ hidden: !hasMany, showToggle: hasMany }}
			zoom={{ maxZoomPixelRatio: 3, pinchZoomV4: true, scrollToZoom: true }}
			labels={{
				Previous: "Предыдущее фото",
				Next: "Следующее фото",
				Close: "Закрыть",
				Thumbnails: "Миниатюры",
				"Show thumbnails": "Показать миниатюры",
				"Hide thumbnails": "Скрыть миниатюры",
				"Enter Fullscreen": "На весь экран",
				"Exit Fullscreen": "Выйти из полноэкранного режима",
				"Zoom in": "Увеличить",
				"Zoom out": "Уменьшить",
			}}
			on={{
				view: ({ index: viewedIndex }) => onView(viewedIndex),
				exited: onExited,
			}}
		/>
	);
}
