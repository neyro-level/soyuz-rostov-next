import {
	ArrowRight,
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

export function PropertyCardGridLayout({
	ImageRenderer,
	LinkRenderer,
	activeImage,
	addressParts,
	currentImage,
	imageBadge,
	images,
	isList,
	isNewBuildingCard,
	isXmlCatalogCard,
	listing,
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
		<article
			className={`group relative cursor-pointer rounded-lg bg-[var(--surface-card)]/0 transition duration-300 ${
				isList
					? "grid overflow-hidden border border-[var(--border)] bg-[var(--surface-card)] shadow-none hover:-translate-y-0.5 hover:shadow-[var(--property-card-shadow-list-hover)] md:grid-cols-[320px_minmax(0,1fr)_210px]"
					: "-m-2 overflow-visible border border-transparent p-2 shadow-[var(--property-card-shadow-grid-rest)] transition-shadow lg:shadow-none hover:-translate-y-0.5 hover:border-[var(--border)] hover:bg-[var(--surface-card)] hover:shadow-[var(--property-card-shadow-grid-hover)]"
			}`}
		>
			<LinkRenderer
				href={path}
				target="_blank"
				rel="noopener noreferrer"
				ariaLabel={`Открыть объект в новой вкладке: ${title}`}
				className="absolute inset-0 z-10 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
			>
				<span className="sr-only">{title}</span>
			</LinkRenderer>

			<div className={isList ? "p-3 md:pr-0" : ""}>
				<div
					className={`relative z-20 touch-pan-y select-none overflow-hidden rounded-lg bg-[var(--surface-muted)] ${isList ? "aspect-[16/10] md:h-full md:min-h-53.5" : "aspect-[3/2] shadow-[var(--property-card-shadow-media-rest)] transition duration-300 group-hover:shadow-[var(--property-card-shadow-media-hover)]"}`}
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
							sizes={
								isList
									? "(max-width: 767px) calc(100vw - 32px), 280px"
									: "(max-width: 639px) calc(100vw - 40px), (max-width: 1279px) 50vw, 25vw"
							}
							className="object-cover transition duration-500 group-hover:scale-[1.03]"
						/>
					) : (
						<span className="flex h-full items-center justify-center text-[var(--text-muted)]">
							<Building2 className="size-8" aria-hidden />
						</span>
					)}

					<CatalogBadgeStack
						imageBadge={imageBadge}
						className="left-2.5 top-2.5"
					/>
					<div
						className={`absolute right-2.5 top-2.5 z-20 ${isNewBuildingCard || isXmlCatalogCard ? "" : "lg:hidden"}`}
						onClickCapture={stop}
					>
						{renderCollectionAction?.({
							kind: "favorites",
							className:
								"flex size-9 items-center justify-center rounded-lg transition [&_svg]:!size-4",
							inactiveClassName:
								"bg-[var(--surface-card-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]",
							activeClassName: "bg-[var(--accent-soft)] text-[var(--accent)]",
						})}
					</div>

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

							<div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/35 via-black/10 to-transparent px-2.5 pb-2.5 pt-10 lg:hidden" />

							<div
								className="pointer-events-none absolute bottom-2.5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-0.75"
								aria-hidden
								data-gallery-bars
							>
								{images.map((image, index) => (
									<span
										key={image}
										className={`h-px rounded-full transition-opacity ${
											index === activeImage
												? "w-3.5 bg-[var(--surface-card)]/90"
												: "w-2.5 bg-[var(--surface-card)]/35"
										}`}
									/>
								))}
							</div>

							<span className="absolute bottom-2.5 right-2.5 z-20 inline-flex min-h-6 items-center gap-1 rounded-md bg-[var(--surface-dark)]/66 px-2 text-overline font-bold tabular-nums text-white shadow-[var(--property-card-shadow-badge)] backdrop-blur-sm">
								<ImageIcon className="size-3" aria-hidden />
								{activeImage + 1}/{images.length}
							</span>
						</>
					) : null}
				</div>
			</div>

			<div className={isList ? "p-4 md:p-5" : "pb-3 pt-3 md:pb-0 md:pt-2.5"}>
				<div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 lg:block">
					<div
						data-catalog-price-row
						className="flex min-w-0 items-center justify-between gap-2 pr-1 lg:pr-0"
					>
						<p className="min-w-0 text-price font-extrabold leading-flat tabular-nums tracking-compact text-[var(--text-primary)] md:text-price-medium lg:text-price-large">
							{priceLabel}
						</p>
						{showExclusiveBadge ? <ExclusiveBadge /> : null}
					</div>
					<div className="pointer-events-none col-start-2 row-start-3 flex shrink-0 self-end justify-end pb-0.5 lg:hidden">
						<span className="inline-flex min-h-8 items-center gap-1 text-caption font-extrabold text-[var(--accent)]">
							Подробнее
							<ArrowRight className="size-3.5" strokeWidth={1.9} aria-hidden />
						</span>
					</div>
					{!isNewBuildingCard && !isXmlCatalogCard ? (
						<div
							className="relative z-20 hidden items-center justify-end gap-1.5 lg:flex"
							onClickCapture={stop}
						>
							{renderCollectionAction?.({
								kind: "compare",
								className:
									"flex size-10 items-center justify-center rounded-lg transition",
								inactiveClassName:
									"bg-[var(--surface-card-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]",
								activeClassName: "bg-[var(--accent-soft)] text-[var(--accent)]",
							})}
							{renderCollectionAction?.({
								kind: "favorites",
								className:
									"flex size-10 items-center justify-center rounded-lg transition",
								inactiveClassName:
									"bg-[var(--surface-card-soft)] text-[var(--text-secondary)] hover:bg-[var(--accent-soft)] hover:text-[var(--accent)]",
								activeClassName: "bg-[var(--accent-soft)] text-[var(--accent)]",
							})}
						</div>
					) : null}
					<h2 className="col-start-1 row-start-2 line-clamp-2 rounded-md text-card-compact font-extrabold leading-heading tracking-compact text-[var(--text-primary)] underline decoration-[var(--accent-border)] decoration-1 underline-offset-3 transition-colors group-active:text-[var(--accent)] md:text-card-compact-medium md:leading-card-compact-rem lg:mt-2 lg:text-card-compact-large lg:leading-step-body lg:no-underline lg:group-hover:text-[var(--accent)]">
						{title}
					</h2>
					<div className="col-start-1 row-start-3 text-caption-dense leading-card-dense-rem tracking-copy text-[var(--text-muted)] md:text-caption md:leading-card-relaxed-rem lg:mt-2 lg:text-label lg:leading-step-body">
						<p className="flex min-w-0 items-center gap-1 font-semibold text-[var(--text-secondary)] md:gap-1.5">
							<MapPin
								className="size-3 shrink-0 text-[var(--accent)] md:size-3.5"
								aria-hidden
							/>
							<AddressLine
								visiblePrefix={addressParts.visiblePrefix}
								hiddenHousePart={addressParts.hiddenHousePart}
								compact
							/>
						</p>
					</div>
				</div>
				{isList && listing.description ? (
					<p className="mt-3 line-clamp-3 text-body leading-step-copy tracking-copy text-[var(--text-secondary)]">
						{listing.description}
					</p>
				) : null}
				{isList ? (
					<p className="mt-3 text-caption font-bold uppercase tracking-overline-compact text-[var(--text-muted)]">
						{listing.category} · база агентства недвижимости
					</p>
				) : null}
			</div>

			{isList ? (
				<div className="grid content-end gap-2 p-4 md:border-l md:border-[var(--border)] md:p-5">
					{phoneVisible ? (
						<a
							href={phoneHref}
							onClick={stop}
							data-analytics-context="catalog_property_card"
							data-analytics-item={listing.slug}
							className="relative z-20 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-center text-body font-bold tabular-nums text-white transition hover:bg-[var(--accent-hover)]"
						>
							<Phone className="size-4" aria-hidden />
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
							className="relative z-20 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-center text-body font-bold text-white transition hover:bg-[var(--accent-hover)]"
						>
							<Phone className="" aria-hidden />
							Показать телефон
						</Button>
					)}
					<Button
						variant="plain"
						type="button"
						onClick={openPropertyChat}
						className="relative z-20 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 text-center text-body font-bold text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
					>
						<MessageCircle className="" aria-hidden />
						Написать
					</Button>
				</div>
			) : null}
		</article>
	);
}
