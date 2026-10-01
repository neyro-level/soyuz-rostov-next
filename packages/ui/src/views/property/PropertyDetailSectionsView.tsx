"use client";

import { BedDouble, Building, Building2, MapPin, Ruler } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type {
	PropertyDetailRowDto,
	PropertyDetailSummaryItemDto,
} from "../../view-models/property";

const SUMMARY_ICONS = {
	area: Ruler,
	"living-area": BedDouble,
	kitchen: Building2,
	floor: Building,
	rooms: BedDouble,
} as const;

export function PropertyDetailSummaryView({
	title,
	address,
	addressHidden = false,
	exclusive = false,
	price,
	meterPrice,
	items,
}: {
	title: string;
	address?: string | null;
	addressHidden?: boolean;
	exclusive?: boolean;
	price: string;
	meterPrice?: string | null;
	items: PropertyDetailSummaryItemDto[];
}) {
	return (
		<Card
			className="grid gap-4 rounded-lg border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-[var(--property-detail-sections-shadow-subtle)] md:p-6"
			aria-labelledby="object-page-title"
		>
			<div className="grid gap-2">
				{exclusive ? (
					<span
						data-exclusive-badge
						className="inline-flex min-h-7 w-fit items-center rounded-md bg-[var(--accent)] px-2.5 text-label font-bold leading-flat text-white"
					>
						Эксклюзив
					</span>
				) : null}
				<h1
					id="object-page-title"
					className="text-property-title font-semibold leading-card-title text-[var(--text-primary)]"
				>
					{title}
				</h1>
				{address ? (
					<p className="inline-flex min-w-0 items-center gap-1.5 text-support font-normal leading-step-body text-[var(--text-secondary)]">
						<MapPin
							className="size-3.5 shrink-0 text-[var(--accent)]"
							aria-hidden
						/>
						<span>
							{address}
							{addressHidden ? (
								<span
									role="img"
									aria-label="Номер дома скрыт"
									className="inline-flex select-none align-baseline text-slate-400"
								>
									…
								</span>
							) : null}
						</span>
					</p>
				) : null}
				<div className="mt-1 lg:hidden" data-property-mobile-price>
					<p className="text-price-large font-extrabold leading-flat tabular-nums tracking-compact text-[var(--text-primary)]">
						{price}
					</p>
					{meterPrice ? (
						<p className="mt-1 text-caption font-semibold leading-step-small text-[var(--text-muted)]">
							{meterPrice}
						</p>
					) : null}
				</div>
			</div>
			<div className="grid gap-1.5">
				<p className="text-label font-semibold uppercase tracking-overline-compact text-[var(--text-muted)]">
					Коротко об объекте
				</p>
			</div>
			<div className="grid grid-cols-4 gap-3 max-[1180px]:grid-cols-2 max-md:grid-cols-1">
				{items.map((item) => {
					const Icon = SUMMARY_ICONS[item.icon];
					return (
						<div
							key={item.label}
							className="flex items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-3"
						>
							<Icon
								className="size-5 shrink-0 text-[var(--text-secondary)]"
								aria-hidden
							/>
							<div className="grid min-w-0 gap-0.5">
								<strong className="text-body font-semibold leading-step-body text-[var(--text-primary)]">
									{item.value}
								</strong>
								<span className="text-caption leading-step-small text-[var(--text-muted)]">
									{item.label}
								</span>
							</div>
						</div>
					);
				})}
			</div>
		</Card>
	);
}

export function PropertyDescriptionView({
	paragraphs,
}: {
	paragraphs?: string[];
}) {
	const [expanded, setExpanded] = useState(false);
	if (!paragraphs?.length) return null;

	const shouldCollapse =
		paragraphs.join(" ").length > 420 || paragraphs.length > 2;
	const visibleParagraphs =
		shouldCollapse && !expanded ? paragraphs.slice(0, 2) : paragraphs;

	return (
		<Card
			className="grid gap-4 rounded-lg border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-[var(--property-detail-sections-shadow-subtle)] md:p-6"
			aria-labelledby="object-description-title"
		>
			<h2
				id="object-description-title"
				className="scroll-mt-32.5 text-heading-compact font-semibold leading-tight-copy text-[var(--text-primary)]"
			>
				Описание
			</h2>
			<div className="grid w-full gap-2 text-support font-normal leading-support text-[var(--text-secondary)] md:text-body md:leading-support">
				{visibleParagraphs.map((paragraph, index) => (
					<p key={paragraph}>
						{paragraph}
						{shouldCollapse &&
						!expanded &&
						index === visibleParagraphs.length - 1
							? "..."
							: ""}
					</p>
				))}
			</div>
			{shouldCollapse ? (
				<Button
					variant="plain"
					type="button"
					onClick={() => setExpanded((current) => !current)}
					className="justify-self-start text-body font-semibold leading-step-body text-[var(--accent)] transition hover:text-[var(--accent-hover)]"
					aria-expanded={expanded}
				>
					{expanded ? "Свернуть" : "Подробнее"}
				</Button>
			) : null}
		</Card>
	);
}

export function PropertyDetailsView({
	title,
	rows,
}: {
	title: string;
	rows: PropertyDetailRowDto[];
}) {
	return (
		<Card
			className="grid gap-4 rounded-lg border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-[var(--property-detail-sections-shadow-subtle)] md:p-6"
			aria-labelledby="object-details-title"
		>
			<h2
				id="object-details-title"
				className="scroll-mt-32.5 text-heading-compact font-semibold leading-tight-copy text-[var(--text-primary)]"
			>
				{title}
			</h2>
			<div className="grid gap-x-10 gap-y-2 md:grid-cols-2">
				{rows.map((row) => (
					<div
						key={`${row.label}-${row.value}`}
						className="grid grid-cols-[auto_minmax(32px,1fr)_auto] items-baseline gap-2 text-body leading-step-copy"
					>
						<span className="text-[var(--text-secondary)]">{row.label}</span>
						<span
							className="border-b border-dotted border-[var(--input)]"
							aria-hidden
						/>
						<span className="max-w-55 text-right font-semibold text-[var(--text-primary)]">
							{row.value}
						</span>
					</div>
				))}
			</div>
		</Card>
	);
}

export function PropertyBuildingView({ description }: { description: string }) {
	return (
		<Card
			className="grid gap-3.5 rounded-lg border-[var(--border)] bg-[var(--surface-card)] p-5 shadow-[var(--property-detail-sections-shadow-subtle)] md:p-6"
			aria-labelledby="object-building-title"
		>
			<h2
				id="object-building-title"
				className="scroll-mt-32.5 text-heading-compact font-semibold leading-tight-copy text-[var(--text-primary)]"
			>
				Дом и район
			</h2>
			<p className="text-support font-normal leading-step-copy text-[var(--text-secondary)] md:text-body">
				{description}
			</p>
		</Card>
	);
}
