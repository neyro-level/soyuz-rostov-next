import { Fragment, type ReactNode } from "react";
import type { SiteImageRenderer } from "../../lib/adapters";

export type CatalogHeroViewProps = {
	title: string;
	variant?: "default" | "new-building";
	titleLines?: string[];
	titleSize?: "auto" | "standard";
	/** `stack` (default) — строки всегда; `inline` — на lg+ одна строка (для длинных H1 вроде /sotrudniki). */
	titleLinesDesktop?: "stack" | "inline";
	description?: string;
	/** Короткое описание только для mobile/tablet, когда desktop-текст должен остаться прежним. */
	mobileDescription?: string;
	descriptionLines?: string[];
	/** `lg+` (default) — описание только от desktop; `always` — и на mobile/tablet (короткие тексты вроде /sotrudniki). */
	descriptionVisibility?: "lg+" | "always";
	action?: ReactNode;
	/** `lg+` (default) — CTA только от desktop; `always` — CTA виден и на mobile/tablet. */
	actionVisibility?: "lg+" | "always";
	imageSrc: string;
	imagePosition?: string;
	focusImageBottomDesktop?: boolean;
	/** Увеличить высоту широкого hero, чтобы показать больше вертикального кадра без боковых пустот. */
	expandedDesktop?: boolean;
	/** Чуть поднять текстовый блок от нижнего края hero. */
	elevateContent?: boolean;
	/** Использовать более компактный семантический размер H1 до desktop. */
	compactMobileTitle?: boolean;
	imageRenderer: SiteImageRenderer;
	unoptimized?: boolean;
};

export function CatalogHeroView({
	title,
	variant = "default",
	titleLines,
	titleSize = "auto",
	titleLinesDesktop = "stack",
	description,
	mobileDescription,
	descriptionLines,
	descriptionVisibility = "lg+",
	action,
	actionVisibility = "lg+",
	imageSrc,
	imagePosition = "center",
	focusImageBottomDesktop = false,
	expandedDesktop = false,
	elevateContent = false,
	compactMobileTitle = false,
	imageRenderer: ImageRenderer,
	unoptimized = false,
}: CatalogHeroViewProps) {
	const isNewBuildingHero = variant === "new-building";
	const hasTitleLines = Boolean(titleLines?.length);
	const hasDescriptionLines = Boolean(descriptionLines?.length);
	const hasControlledLines = hasTitleLines || hasDescriptionLines;
	const collapseTitleLinesOnDesktop =
		hasTitleLines && titleLinesDesktop === "inline";
	const isLongTitle = hasControlledLines || title.length > 48;
	const descriptionVisibleAlways = descriptionVisibility === "always";
	const actionVisibleAlways = actionVisibility === "always";
	const mobileTitleClassName = compactMobileTitle
		? "text-section-title lg:text-page-title"
		: "text-page-title";
	const titleClassName = isNewBuildingHero
		? "text-page-title font-extrabold leading-page-title text-white"
		: titleSize === "standard"
			? `${mobileTitleClassName} font-extrabold leading-page-title text-white`
			: isLongTitle
				? `${mobileTitleClassName} font-extrabold leading-page-title text-white md:max-w-245${
						collapseTitleLinesOnDesktop
							? " lg:max-w-none lg:whitespace-nowrap"
							: ""
					}`
				: `${mobileTitleClassName} font-extrabold leading-page-title text-white lg:whitespace-nowrap`;
	const contentClassName = hasControlledLines ? "max-w-245" : "max-w-195";
	const descriptionMaxWidth = hasControlledLines ? "max-w-245" : "max-w-190";
	const descriptionClassName = isNewBuildingHero
		? "mt-4 w-fit max-w-155 rounded-lg border border-white/20 bg-black/30 px-4 py-3 text-body-compact font-medium leading-step-copy text-white/92 shadow-[var(--catalog-hero-shadow-panel)] backdrop-blur-md [text-wrap:pretty] sm:text-body-large sm:leading-step-relaxed md:mt-5 md:px-5 md:py-4 md:text-body-emphasis lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0 lg:shadow-none lg:backdrop-blur-none"
		: descriptionVisibleAlways
			? `mt-3 ${descriptionMaxWidth} text-body-compact font-medium leading-step-copy text-white/84 [text-wrap:pretty] sm:mt-4 sm:text-body-large sm:leading-step-relaxed md:mt-5 md:text-body-emphasis`
			: `mt-5 hidden ${descriptionMaxWidth} text-body-large font-medium leading-step-relaxed text-white/84 [text-wrap:pretty] lg:block md:text-body-emphasis`;
	const desktopHeightClassName = expandedDesktop
		? "lg:min-h-115"
		: "lg:min-h-97.5";
	const shellClassName = isNewBuildingHero
		? `relative z-10 flex min-h-85 flex-col justify-end p-5 pb-6 sm:min-h-90 sm:p-6 sm:pb-7 md:min-h-70 md:p-8 md:pb-9 ${desktopHeightClassName} lg:p-12`
		: elevateContent
			? `relative z-10 flex min-h-55 flex-col justify-end p-5 pb-6 sm:min-h-60 sm:pb-7 md:min-h-65 md:p-8 md:pb-10 ${desktopHeightClassName} lg:p-12 lg:pb-16`
			: `relative z-10 flex min-h-55 flex-col justify-end p-5 sm:min-h-60 md:min-h-65 md:p-8 ${desktopHeightClassName} lg:p-12`;
	const titleLineClassName = collapseTitleLinesOnDesktop
		? "block lg:inline"
		: "block lg:whitespace-nowrap";

	return (
		<div
			className={`relative overflow-hidden rounded-lg bg-[var(--surface-dark)] text-white shadow-[var(--catalog-hero-shadow-panel)] ${isNewBuildingHero ? `min-h-85 sm:min-h-90 md:min-h-70 ${desktopHeightClassName}` : `min-h-55 sm:min-h-60 md:min-h-65 ${desktopHeightClassName}`}`}
		>
			<ImageRenderer
				src={imageSrc}
				alt=""
				fill
				priority
				// Dev: skip /_next/image cache so public/ swaps show up without rebuild.
				unoptimized={unoptimized}
				sizes="(max-width: 1440px) calc(100vw - 40px), 1380px"
				className={`object-cover ${isNewBuildingHero ? "brightness-[0.88] contrast-[1.04] saturate-[0.94]" : "brightness-[1.08] contrast-[1.02]"} ${focusImageBottomDesktop ? "lg:object-bottom" : ""}`}
				style={{
					objectPosition: focusImageBottomDesktop ? undefined : imagePosition,
				}}
			/>
			<div
				className={
					isNewBuildingHero
						? "absolute inset-0 bg-[linear-gradient(90deg,var(--catalog-hero-overlay-horizontal-strong)_0%,var(--catalog-hero-overlay-horizontal-default)_50%,var(--catalog-hero-overlay-horizontal-transparent)_100%)]"
						: "absolute inset-0 bg-[linear-gradient(90deg,var(--catalog-hero-overlay-horizontal-strong)_0%,var(--catalog-hero-overlay-horizontal-default)_38%,var(--catalog-hero-overlay-horizontal-soft)_72%,var(--catalog-hero-overlay-horizontal-transparent)_100%)]"
				}
			/>
			<div
				className={
					isNewBuildingHero
						? "absolute inset-0 bg-[linear-gradient(0deg,var(--catalog-hero-overlay-vertical-strong)_0%,var(--catalog-hero-overlay-vertical-soft)_64%,var(--catalog-hero-overlay-vertical-transparent)_100%)]"
						: "absolute inset-0 bg-[linear-gradient(0deg,var(--catalog-hero-overlay-vertical-strong)_0%,var(--catalog-hero-overlay-vertical-soft)_54%,var(--catalog-hero-overlay-vertical-transparent)_100%)]"
				}
			/>
			<div className={shellClassName}>
				<div className={contentClassName}>
					<h1 className={titleClassName}>
						{hasTitleLines
							? titleLines?.map((line, index) => (
									<Fragment key={line}>
										{collapseTitleLinesOnDesktop && index > 0 ? (
											<span className="hidden lg:inline"> </span>
										) : null}
										<span className={titleLineClassName}>{line}</span>
									</Fragment>
								))
							: title}
					</h1>
					{description || hasDescriptionLines ? (
						<p className={descriptionClassName}>
							{hasDescriptionLines
								? descriptionLines?.map((line) => (
										<span key={line} className="block lg:whitespace-nowrap">
											{line}
										</span>
									))
								: protectShortEnding(description ?? "")}
						</p>
					) : null}
					{mobileDescription ? (
						<p className="mt-3 max-w-155 text-body font-medium leading-step-copy text-white/84 [text-wrap:pretty] lg:hidden">
							{mobileDescription}
						</p>
					) : null}
					{action ? (
						<div
							className={`mt-5 flex-col items-start gap-4 sm:flex-row sm:items-center lg:mt-7 ${actionVisibleAlways ? "flex" : "hidden lg:flex"}`}
						>
							{action}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function protectShortEnding(value: string) {
	return value.replace("ипотеки и торгом.", "ипотеки\u00a0и\u00a0торгом.");
}
