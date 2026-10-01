"use client";

import { ChevronLeft, ChevronRight, Images } from "lucide-react";
import {
	lazy,
	Suspense,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { Button } from "../../components/ui/button";

import {
	Carousel,
	type CarouselApi,
	CarouselContent,
	CarouselItem,
} from "../../components/ui/carousel";
import { Skeleton } from "../../components/ui/skeleton";
import { cn } from "../../lib/utils";
import type { MediaGalleryProps } from "./media-gallery.types";

const MediaLightbox = lazy(() =>
	import("../property/MediaLightbox").then((module) => ({
		default: module.MediaLightbox,
	})),
);

export type {
	MediaGalleryImage,
	MediaGalleryProps,
} from "./media-gallery.types";

export function MediaGallery({
	images,
	imageRenderer: ImageRenderer,
	imageSizes,
	imageClassName = "object-cover",
	priority = false,
	shouldOptimizeImage = () => true,
	emptyLabel = "Изображения готовятся к публикации",
	emptyContent,
	variant = "dark-controls",
}: MediaGalleryProps) {
	const safeImages = useMemo(
		() => [
			...new Map(
				images
					.filter((image) => Boolean(image.src))
					.map((image) => [image.src, image]),
			).values(),
		],
		[images],
	);
	const [api, setApi] = useState<CarouselApi>();
	const [index, setIndex] = useState(0);
	const [lightboxOpen, setLightboxOpen] = useState(false);
	const [lightboxRequested, setLightboxRequested] = useState(false);
	const openerRef = useRef<HTMLButtonElement | null>(null);
	const hasMany = safeImages.length > 1;

	useEffect(() => {
		if (!api) return;
		const onSelect = () => setIndex(api.selectedScrollSnap());
		queueMicrotask(onSelect);
		api.on("select", onSelect).on("reInit", onSelect);
		return () => {
			api.off("select", onSelect).off("reInit", onSelect);
		};
	}, [api]);

	const openAt = useCallback(
		(nextIndex: number, trigger: HTMLButtonElement) => {
			openerRef.current = trigger;
			setIndex(nextIndex);
			setLightboxRequested(true);
			setLightboxOpen(true);
		},
		[],
	);

	if (!safeImages.length) {
		if (emptyContent) return emptyContent;
		return (
			<div className="relative grid h-full place-items-center bg-muted px-6 text-center">
				<Skeleton className="absolute inset-0 rounded-none" />
				<span className="relative inline-flex items-center gap-2 text-body font-semibold text-muted-foreground">
					<Images className="size-5" aria-hidden />
					{emptyLabel}
				</span>
			</div>
		);
	}

	const controlClass =
		variant === "light-controls"
			? "bg-[var(--surface-card)] text-[var(--text-primary)] shadow-[var(--media-gallery-shadow-primary)] hover:bg-[var(--home-articles-chip)]"
			: "border border-[var(--media-control-border)] bg-[var(--media-control-surface)] text-[var(--media-control-content)] hover:bg-[var(--surface-dark)]";

	return (
		<>
			<Carousel
				className="h-full"
				opts={{ loop: hasMany, watchDrag: hasMany }}
				setApi={setApi}
			>
				<CarouselContent className="h-full">
					{safeImages.map((image, imageIndex) => (
						<CarouselItem key={image.src} className="relative h-full">
							<Button
								variant="plain"
								type="button"
								ref={imageIndex === index ? openerRef : undefined}
								onClick={(event) => openAt(imageIndex, event.currentTarget)}
								className="relative block h-full w-full cursor-zoom-in border-0 bg-transparent p-0"
								aria-label={`Открыть фото ${imageIndex + 1} на весь экран`}
							>
								<ImageRenderer
									src={image.src}
									alt={image.alt}
									fill
									priority={priority && imageIndex === 0}
									unoptimized={!shouldOptimizeImage(image.src)}
									sizes={imageSizes}
									className={imageClassName}
								/>
							</Button>
						</CarouselItem>
					))}
				</CarouselContent>

				{hasMany ? (
					<span className="absolute left-3 top-3 rounded-lg bg-[var(--media-counter-surface)] px-3 py-1.5 text-label font-semibold tabular-nums text-[var(--media-control-content)] backdrop-blur-sm">
						{index + 1} / {safeImages.length}
					</span>
				) : null}
				{hasMany ? (
					<>
						<Button
							variant="plain"
							type="button"
							onClick={() => api?.scrollPrev()}
							className={cn(
								"absolute left-3 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg transition duration-[var(--motion-duration-fast)] ease-site lg:left-5",
								controlClass,
							)}
							aria-label="Предыдущее фото"
						>
							<ChevronLeft className="" aria-hidden />
						</Button>
						<Button
							variant="plain"
							type="button"
							onClick={() => api?.scrollNext()}
							className={cn(
								"absolute right-3 top-1/2 z-10 inline-flex size-11 -translate-y-1/2 items-center justify-center rounded-lg transition duration-[var(--motion-duration-fast)] ease-site lg:right-5",
								controlClass,
							)}
							aria-label="Следующее фото"
						>
							<ChevronRight className="" aria-hidden />
						</Button>
					</>
				) : null}
			</Carousel>

			{lightboxRequested ? (
				<Suspense fallback={null}>
					<MediaLightbox
						open={lightboxOpen}
						index={index}
						slides={safeImages}
						hasMany={hasMany}
						onClose={() => setLightboxOpen(false)}
						onView={(viewedIndex) => {
							setIndex(viewedIndex);
							api?.scrollTo(viewedIndex);
						}}
						onExited={() => openerRef.current?.focus()}
					/>
				</Suspense>
			) : null}
		</>
	);
}
