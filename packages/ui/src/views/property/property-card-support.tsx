import type { PropertyCardDto } from "../../view-models/property";
import { formatRublePrice } from "../../lib/realty-format";
import type { PropertyCardViewProps } from "./property-card.types";

export function AddressLine({
	visiblePrefix,
	hiddenHousePart,
	compact = false,
}: {
	visiblePrefix: string | null;
	hiddenHousePart: string | null;
	compact?: boolean;
}) {
	if (!hiddenHousePart) {
		return (
			<span className={compact ? "min-w-0 truncate" : "line-clamp-1"}>
				{visiblePrefix}
			</span>
		);
	}

	return (
		<span className={`min-w-0 ${compact ? "truncate" : "line-clamp-1"}`}>
			<span>{visiblePrefix}</span>
			<span
				role="img"
				aria-label="Номер дома скрыт"
				className="inline-flex align-baseline text-slate-400 select-none"
			>
				…
			</span>
		</span>
	);
}

export function formatCardPrice(
	listing: PropertyCardDto,
	cardKind: NonNullable<PropertyCardViewProps["cardKind"]>,
) {
	const price = formatRublePrice(listing.price);

	if (
		(cardKind === "construction" || cardKind === "new-building") &&
		listing.price
	) {
		return `от ${price}`;
	}

	return price;
}

export function formatListingDate(value?: string | null) {
	if (!value) return null;

	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return null;

	return new Intl.DateTimeFormat("ru-RU", {
		day: "numeric",
		month: "long",
		year: "numeric",
	}).format(date);
}

export function cleanListingDescription(
	value?: string | null,
	objectCode?: string,
) {
	if (!value) return null;

	const escapedCode = objectCode?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
	const codePattern = escapedCode
		? new RegExp(`^\\s*Код\\s+объекта\\s*[:№#]?\\s*${escapedCode}\\.?\\s*`, "i")
		: /^\s*Код\s+объекта\s*[:№#]?\s*[\w.-]+\.?\s*/i;

	const normalized = value
		.replace(/<br\s*\/?>/gi, " ")
		.replace(/<\/?[^>]+>/g, " ")
		.replace(codePattern, "")
		.replace(/\s+/g, " ")
		.trim();

	return normalized || null;
}

export function CatalogBadgeStack({
	imageBadge,
	className,
}: {
	imageBadge?: string;
	className: string;
}) {
	if (!imageBadge) return null;

	return (
		<div
			data-catalog-badge-stack
			className={`absolute z-10 flex flex-col items-start gap-1.5 ${className}`}
		>
			<span
				data-sales-leader-badge
				className="inline-flex min-h-6 items-center rounded-md bg-[var(--accent)] px-2.5 text-overline font-bold leading-flat text-white shadow-[var(--property-card-shadow-sales-badge)]"
			>
				{imageBadge}
			</span>
		</div>
	);
}

export function ExclusiveBadge() {
	return (
		<span
			data-exclusive-badge
			data-exclusive-placement="price"
			className="inline-flex min-h-6 shrink-0 items-center rounded-md bg-[var(--accent)] px-2 text-micro font-bold leading-flat text-white shadow-[var(--property-card-shadow-sales-badge)] sm:text-overline"
		>
			Эксклюзив
		</span>
	);
}
