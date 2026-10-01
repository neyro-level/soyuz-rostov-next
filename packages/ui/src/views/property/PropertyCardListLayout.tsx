import {
	Building2,
	ChevronLeft,
	ChevronRight,
	Image as ImageIcon,
	MapPin,
	MessageCircle,
	Phone,
} from "lucide-react";
import { Button } from "../../components/ui/button";
import type { PropertyCardLayoutProps } from "./property-card-layout.types";
import {
	AddressLine,
	CatalogBadgeStack,
	ExclusiveBadge,
} from "./property-card-support";

export function PropertyCardListLayout({
	ImageRenderer,
	LinkRenderer,
	activeImage,
	addressParts,
	cityName,
	currentImage,
	imageBadge,
	images,
	isNewBuildingCard,
	isXmlCatalogCard,
	listDescription,
	listing,
	listingDate,
	listTitle,
	onGalleryTouchEnd,
	onGalleryTouchStart,
	openPropertyChat,
	path,
	phone,
	phoneHref,
	phoneVisible,
	priceLabel,
	priority,
	renderCollectionAction,
	setPhoneVisible,
	shouldOptimizeImage = () => false,
	showExclusiveBadge,
	showNext,
	showPrevious,
	stop,
	title,
}: PropertyCardLayoutProps) {
	return (
		<article className="group relative grid cursor-pointer gap-5 bg-transparent p-4 transition duration-300 hover:relative hover:z-10 hover:rounded-lg hover:bg-[var(--surface-card-soft)] hover:shadow-[var(--property-card-shadow-raised)] md:grid-cols-[300px_minmax(0,1fr)_230px] md:px-0 md:py-6">
			<LinkRenderer
				href={path}
				target="_blank"
				rel="noopener noreferrer"
				ariaLabel={`Открыть объект в новой вкладке: ${title}`}
				className="absolute inset-0 z-10 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
			>
				<span className="sr-only">{title}</span>
			</LinkRenderer>

			<div
				className="relative z-20 h-59.5 touch-pan-y select-none overflow-hidden rounded-lg bg-[var(--surface-muted)] sm:h-70 md:h-72"
				onTouchStart={onGalleryTouchStart}
				onTouchEnd={onGalleryTouchEnd}
			>
				{currentImage ? (
					<ImageRenderer
						src={currentImage}
						alt={listing.title}
						fill
						priority={priority}
						loading={priority ? "eager" : "lazy"}
						quality={75}
						unoptimized={!shouldOptimizeImage(currentImage)}
						sizes="(max-width: 767px) calc(100vw - 32px), 300px"
						className="object-cover transition duration-500 group-hover:scale-[1.02]"
					/>
				) : (
					<span className="flex h-full items-center justify-center text-[var(--text-muted)]">
						<Building2 className="size-8" aria-hidden />
					</span>
				)}

				<CatalogBadgeStack imageBadge={imageBadge} className="left-3 top-3" />

				{images.length > 1 ? (
					<>
						<Button
							variant="cardMedia"
							size="content"
							type="button"
							onClick={showPrevious}
							className="left-2.5 size-9 lg:left-3"
							aria-label="Предыдущее фото"
						>
							<ChevronLeft className="" aria-hidden />
						</Button>
						<Button
							variant="cardMedia"
							size="content"
							type="button"
							onClick={showNext}
							className="right-2.5 size-9 lg:right-3"
							aria-label="Следующее фото"
						>
							<ChevronRight className="" aria-hidden />
						</Button>
						<div
							className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1"
							aria-hidden
						>
							{images.map((image, index) => (
								<span
									key={image}
									className={`h-1 rounded-full transition-all ${
										index === activeImage
											? "w-5 bg-[var(--surface-card)]/95"
											: "w-2.5 bg-[var(--surface-card)]/40"
									}`}
								/>
							))}
						</div>
						<span className="absolute bottom-3 right-3 z-20 inline-flex min-h-7 items-center gap-1 rounded-full bg-[var(--surface-dark)]/72 px-2.5 text-overline font-bold tabular-nums text-white shadow-[var(--property-card-shadow-counter)] backdrop-blur-sm">
							<ImageIcon className="size-3.5" aria-hidden />
							{activeImage + 1}/{images.length}
						</span>
					</>
				) : null}
			</div>

			<div className="flex min-h-59.5 flex-col md:min-h-72">
				<div className="min-w-0">
					<h2 className="text-card-title font-extrabold leading-step-copy tracking-compact text-[var(--text-primary)]">
						{listTitle}
					</h2>
					<div className="mt-2 grid gap-1.5 text-body leading-step-body tracking-copy text-[var(--text-muted)]">
						{listing.district && listing.district !== cityName ? (
							<p className="font-semibold text-[var(--accent)]">
								{listing.district}
							</p>
						) : null}
						<p className="flex min-w-0 items-center gap-1.5 text-body-dense leading-heading-pixel text-[var(--text-secondary)] lg:text-body lg:leading-step-body">
							<MapPin
								className="size-3.5 shrink-0 text-[var(--accent)]"
								aria-hidden
							/>
							<AddressLine
								visiblePrefix={addressParts.visiblePrefix}
								hiddenHousePart={addressParts.hiddenHousePart}
							/>
						</p>
					</div>
				</div>

				{listDescription ? (
					<p className="mt-8 line-clamp-3 text-body leading-step-copy tracking-copy text-[var(--text-primary)] md:mt-9">
						{listDescription}
					</p>
				) : null}

				<div className="mt-auto flex flex-col gap-3 pt-5 sm:flex-row">
					{phoneVisible ? (
						<a
							href={phoneHref}
							onClick={stop}
							data-analytics-context="catalog_property_card"
							data-analytics-item={listing.slug}
							className="relative z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--surface-dark)] px-5 text-center text-body-dense font-semibold tabular-nums text-white transition hover:bg-[var(--property-card-surface-action-hover)] lg:text-body sm:min-w-47.5"
						>
							<Phone className="size-[17.6px] lg:size-4" aria-hidden />
							{phone}
						</a>
					) : (
						<Button
							variant="plain"
							type="button"
							data-analytics-event="phone_reveal"
							data-analytics-context="catalog_property_card"
							data-analytics-item={listing.slug}
							onClick={(event) => {
								stop(event);
								setPhoneVisible(true);
							}}
							className="relative z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-[var(--surface-dark)] px-5 text-center text-body-dense font-semibold text-white transition hover:bg-[var(--property-card-surface-action-hover)] lg:text-body sm:min-w-47.5"
						>
							<Phone className="" aria-hidden />
							Показать телефон
						</Button>
					)}
					<Button
						variant="plain"
						type="button"
						onClick={openPropertyChat}
						className="relative z-20 inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card-soft)] px-5 text-center text-body-dense font-semibold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)] lg:text-body sm:min-w-32.5"
					>
						<MessageCircle className="" aria-hidden />
						Написать
					</Button>
				</div>
			</div>

			<div
				className={`flex min-h-59.5 flex-col justify-between gap-4 md:min-h-72 ${isNewBuildingCard || isXmlCatalogCard ? "md:pr-6" : ""}`}
			>
				<div
					className={
						isNewBuildingCard
							? "flex flex-col items-end gap-4 pt-1"
							: "flex items-start justify-between gap-4 md:justify-end"
					}
				>
					<div
						data-catalog-price-row
						className="flex min-w-0 items-center gap-2 md:justify-end"
					>
						<p className="text-price-large font-extrabold leading-flat tabular-nums tracking-compact text-[var(--text-primary)]">
							{priceLabel}
						</p>
						{showExclusiveBadge ? <ExclusiveBadge /> : null}
					</div>

					<div
						className={`relative z-20 flex shrink-0 flex-row gap-2 ${isNewBuildingCard ? "" : "md:flex-col"}`}
					>
						{renderCollectionAction?.({
							kind: "compare",
							className:
								"flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-card-soft)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]",
						})}
						{renderCollectionAction?.({
							kind: "favorites",
							className:
								"flex size-10 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-card-soft)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]",
						})}
					</div>
				</div>

				{listingDate ? (
					<p className="hidden text-right text-label font-medium leading-step-body text-[var(--text-muted)] md:block">
						{listingDate}
					</p>
				) : null}
			</div>
		</article>
	);
}
