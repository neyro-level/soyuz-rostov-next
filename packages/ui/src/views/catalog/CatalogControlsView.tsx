// biome-ignore-all lint/a11y/noLabelWithoutControl: labels wrap project-owned controls that forward native attributes.
import {
	ArrowDown,
	Grid2X2,
	List,
	Loader2,
	Map as MapIcon,
	Search,
	SlidersHorizontal,
	X,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import type {
	CatalogFacetsDto,
	CatalogQueryDto,
	CatalogViewDto,
} from "../../view-models/catalog";
import type { SiteLinkRenderer } from "../../lib/adapters";

export type CatalogTabViewDto = {
	id: string;
	label: string;
	href: string;
	active: boolean;
};
export type CatalogSortViewDto = {
	id: string;
	label: string;
	href: string;
	active: boolean;
};
export type CatalogViewOptionDto = {
	id: CatalogViewDto;
	label: string;
	href: string;
	active: boolean;
};
export type CatalogPaginationItemDto = {
	key: string;
	label: string;
	href?: string;
	current?: boolean;
};

export function CatalogShowcaseView({
	sectionId,
	headline,
	heading,
	resultLabel,
	tabs,
	mobileControls,
	beforeControls,
	desktopFilter,
	activeFilters,
	clearHref,
	shownCount,
	total,
	sorting,
	views,
	children,
	linkRenderer: Link,
}: {
	sectionId: string;
	headline?: string;
	heading: string;
	resultLabel: string;
	tabs: CatalogTabViewDto[];
	mobileControls: ReactNode;
	beforeControls?: ReactNode;
	desktopFilter: ReactNode;
	activeFilters: string[];
	clearHref?: string;
	shownCount: number;
	total: number;
	sorting?: ReactNode;
	views?: ReactNode;
	children: ReactNode;
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<section
			id={sectionId}
			className={
				headline
					? "bg-[var(--surface-card)] pb-10 pt-6 lg:pb-14 lg:pt-8"
					: "bg-[var(--surface-card)] pt-4 pb-10 md:pt-5 lg:py-14"
			}
			aria-label={heading || "Каталог недвижимости"}
		>
			<div className="mx-auto max-w-site-frame px-5">
				{headline ? (
					<div className="mb-7 rounded-lg border border-[var(--catalog-controls-border-headline)] bg-[var(--surface-card-soft)] px-5 py-5 md:px-6 md:py-6">
						<h1 className="max-w-230 text-heading-small font-extrabold leading-card-title-relaxed text-[var(--text-primary)] md:text-section-small lg:text-section-large">
							{headline}
						</h1>
					</div>
				) : null}
				{beforeControls}
				<div className="rounded-lg bg-[var(--surface-card)] p-4 shadow-[var(--catalog-controls-shadow-panel)] lg:p-5">
					<div className="flex flex-wrap items-end justify-between gap-3">
						<p className="text-heading-small font-extrabold leading-tight-copy text-[var(--text-primary)] md:text-section-small">
							Найдено: <span className="tabular-nums">{resultLabel}</span>
						</p>
					</div>
					<nav
						className="mt-6 hidden gap-2 overflow-x-auto pb-1 lg:flex"
						aria-label="Типы недвижимости"
					>
						{tabs.map((tab) => (
							<Link
								key={tab.id}
								href={tab.href}
								ariaCurrent={tab.active ? "page" : undefined}
								className={`shrink-0 rounded-md border px-4 py-2 text-body font-bold transition ${tab.active ? "border-[var(--surface-dark)] bg-[var(--surface-dark)] text-white" : "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)]"}`}
							>
								{tab.label}
							</Link>
						))}
					</nav>
					{mobileControls}
					<div className="hidden lg:block">{desktopFilter}</div>
					{activeFilters.length || clearHref ? (
						<div className="mt-4 flex flex-wrap items-center gap-2">
							{activeFilters.length ? (
								<span className="text-label font-bold uppercase tracking-caps text-[var(--text-muted)]">
									Выбрано
								</span>
							) : null}
							{activeFilters.map((item) => (
								<span
									key={item}
									className="rounded-md border border-[var(--border)] bg-[var(--surface-card-soft)] px-3 py-1.5 text-body text-[var(--text-secondary)]"
								>
									{item}
								</span>
							))}
							{clearHref ? (
								<Link
									href={clearHref}
									scroll={false}
									className="inline-flex min-h-10 items-center gap-1 rounded-md px-2 py-1 text-body font-bold text-[var(--accent)]"
								>
									<X className="size-4" aria-hidden />
									Очистить
								</Link>
							) : null}
						</div>
					) : null}
				</div>
				<div className="mt-6 flex flex-wrap items-center justify-between gap-3">
					<p className="text-body font-medium tabular-nums text-[var(--text-secondary)]">
						Показаны {shownCount} из {total}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						{sorting}
						{views}
					</div>
				</div>
				{children}
			</div>
		</section>
	);
}

export function CatalogSortTabsView({
	items,
	linkRenderer: Link,
}: {
	items: CatalogSortViewDto[];
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<nav
			className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-1"
			aria-label="Сортировка"
		>
			{items.map((item) => (
				<Link
					key={item.id}
					href={item.href}
					ariaCurrent={item.active ? "page" : undefined}
					className={`rounded-md px-3 py-2 text-body font-bold transition ${item.active ? "bg-[var(--surface-dark)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--accent)]"}`}
				>
					{item.label}
				</Link>
			))}
		</nav>
	);
}

export function CatalogViewSwitchView({
	items,
	linkRenderer: Link,
}: {
	items: CatalogViewOptionDto[];
	linkRenderer: SiteLinkRenderer;
}) {
	const icons = { grid: Grid2X2, list: List, map: MapIcon };
	return (
		<nav
			className="flex rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-1"
			aria-label="Вид каталога"
		>
			{items.map((item) => {
				const Icon = icons[item.id];
				return (
					<Link
						key={item.id}
						href={item.href}
						ariaCurrent={item.active ? "page" : undefined}
						className={`inline-flex min-h-9 items-center gap-1 rounded-md px-3 text-body font-bold transition ${item.active ? "bg-[var(--surface-dark)] text-white" : "text-[var(--text-secondary)] hover:text-[var(--accent)]"}`}
					>
						<Icon className="size-4" aria-hidden />
						{item.label}
					</Link>
				);
			})}
		</nav>
	);
}

export function CatalogEmptyStateView({
	message,
	contactHref = "/kontakty",
	linkRenderer: Link,
}: {
	message: string;
	contactHref?: string;
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<div className="mt-4 rounded-lg border border-dashed border-[var(--border)] bg-[var(--surface-card)] p-7 text-body leading-step-copy text-[var(--text-secondary)]">
			{message}
			<div>
				<Link
					href={contactHref}
					className="mt-4 inline-block font-bold text-[var(--accent)]"
				>
					Попросить ручной подбор
				</Link>
			</div>
		</div>
	);
}

export function CatalogLoadMoreView({
	variant,
	loading,
	error,
	hasMore,
	onLoadMore,
	pages,
	linkRenderer: Link,
}: {
	variant: CatalogViewDto;
	loading: boolean;
	error: string | null;
	hasMore: boolean;
	onLoadMore: () => void;
	pages: CatalogPaginationItemDto[];
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<>
			{hasMore ? (
				<div
					className={
						variant === "list"
							? "flex justify-center py-8"
							: "col-span-full mt-4 flex justify-center"
					}
				>
					<div className="flex flex-col items-center text-center">
						<Button
							variant="plain"
							type="button"
							onClick={onLoadMore}
							disabled={loading}
							className="group inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[var(--surface-dark)] px-7 text-body font-extrabold text-white shadow-[var(--catalog-controls-shadow-action)] transition hover:-translate-y-0.5 hover:bg-[var(--accent)] hover:shadow-[var(--catalog-controls-shadow-action-hover)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:min-w-55"
						>
							{loading ? (
								<>
									<Loader2 className="animate-spin" aria-hidden />
									Загружаем...
								</>
							) : (
								<>
									Показать ещё
									<ArrowDown
										className="transition group-hover:translate-y-0.5"
										aria-hidden
									/>
								</>
							)}
						</Button>
						{error ? (
							<p className="mt-3 text-body font-semibold text-[var(--accent)]">
								{error}
							</p>
						) : null}
					</div>
				</div>
			) : null}
			{pages.length ? (
				<nav
					className="col-span-full mt-6 flex flex-wrap justify-center gap-2"
					aria-label="Страницы каталога"
				>
					{pages.map((item) =>
						item.href ? (
							<Link
								key={item.key}
								href={item.href}
								ariaCurrent={item.current ? "page" : undefined}
								className={`grid min-h-11 place-items-center rounded-lg border px-3 text-body font-bold ${item.current ? "border-[var(--surface-dark)] bg-[var(--surface-dark)] text-white" : "border-[var(--catalog-controls-border-pagination)] bg-[var(--surface-card)] text-[var(--surface-dark)]"}`}
							>
								{item.label}
							</Link>
						) : (
							<span
								key={item.key}
								className="grid min-h-11 min-w-11 place-items-center text-body text-[var(--catalog-controls-content-pagination)]"
							>
								{item.label}
							</span>
						),
					)}
				</nav>
			) : null}
		</>
	);
}

export function CatalogSearchFieldView({
	name = "q",
	defaultValue,
	placeholder,
}: {
	name?: string;
	defaultValue?: string;
	placeholder: string;
}) {
	return (
		<label className="flex min-h-12 items-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3">
			<Search className="size-5 text-[var(--text-muted)]" aria-hidden />
			<span className="sr-only">Поиск по каталогу</span>
			<Input
				variant="plain"
				name={name}
				defaultValue={defaultValue ?? ""}
				placeholder={placeholder}
				className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-[var(--text-muted)]"
			/>
		</label>
	);
}

export function CatalogRangePairView({
	from,
	to,
	label,
	fromValue,
	toValue,
}: {
	from: string;
	to: string;
	label: string;
	fromValue?: number;
	toValue?: number;
}) {
	return (
		<div className="grid min-h-12 grid-cols-2 overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface-card)]">
			<label className="border-r border-[var(--border)] px-3 py-1 text-caption font-bold uppercase tracking-overline-compact text-[var(--text-muted)]">
				{label} от
				<Input
					variant="catalogRange"
					name={from}
					type="number"
					min="0"
					defaultValue={fromValue ?? ""}
				/>
			</label>
			<label className="px-3 py-1 text-caption font-bold uppercase tracking-overline-compact text-[var(--text-muted)]">
				до
				<Input
					variant="catalogRange"
					name={to}
					type="number"
					min="0"
					defaultValue={toValue ?? ""}
				/>
			</label>
		</div>
	);
}

export function CatalogSelectView({
	name,
	value,
	options,
	title,
}: {
	name: string;
	value?: string;
	options: Array<{ value: string | number; label: string }>;
	title: string;
}) {
	return (
		<label className="min-h-12 rounded-lg border border-[var(--border)] bg-[var(--surface-card)] px-3 py-1 text-caption font-bold uppercase tracking-overline-compact text-[var(--text-muted)]">
			{title}
			<Select
				variant="native"
				name={name}
				defaultValue={value ?? ""}
				className="block w-full bg-transparent pt-0.5 text-body font-semibold normal-case tracking-body text-[var(--text-primary)] outline-none"
			>
				<option value="">Любой</option>
				{options.map((item) => (
					<option key={item.value} value={item.value}>
						{item.label}
					</option>
				))}
			</Select>
		</label>
	);
}

export function CatalogAdvancedFilterView({
	children,
}: {
	children: ReactNode;
}) {
	return (
		<details className="mt-3 rounded-lg border border-[var(--border)] bg-[var(--surface-card-soft)]">
			<summary className="flex min-h-12 cursor-pointer items-center gap-2 px-4 text-body font-bold text-[var(--text-primary)]">
				<SlidersHorizontal
					className="size-4 text-[var(--accent)]"
					aria-hidden
				/>
				Все фильтры
			</summary>
			<div className="grid gap-3 border-t border-[var(--border)] p-4 md:grid-cols-2 xl:grid-cols-4">
				{children}
			</div>
		</details>
	);
}

export type { CatalogFacetsDto, CatalogQueryDto };
