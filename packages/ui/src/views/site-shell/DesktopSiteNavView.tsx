import {
	ArrowRight,
	Building2,
	ChevronDown,
	Home,
	Store,
	TreePine,
} from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "../../components/ui/button";
import type { SiteLinkRenderer } from "../../lib/adapters";
import type { SiteHeaderNavItemDto } from "../site-shell/site-header.types";

type DesktopSiteNavViewProps = {
	items: readonly SiteHeaderNavItemDto[];
	pathname: string;
	compact: boolean;
	openLabel: string | null;
	stickyLabel: string | null;
	linkRenderer: SiteLinkRenderer;
	onOpen: (label: string) => void;
	onClose: (label?: string) => void;
	onToggle: (label: string) => void;
	onNavigate: () => void;
};

export function DesktopSiteNavView({
	items,
	pathname,
	compact,
	openLabel,
	stickyLabel,
	linkRenderer,
	onOpen,
	onClose,
	onToggle,
	onNavigate,
}: DesktopSiteNavViewProps) {
	return (
		<nav
			className="flex w-full items-center justify-center gap-12 xl:gap-14"
			aria-label="Основная навигация"
		>
			{items.map((item) => (
				<DesktopNavItemView
					key={item.label}
					item={item}
					active={isItemActive(pathname, item)}
					isOpen={openLabel === item.label}
					sticky={stickyLabel === item.label}
					compact={compact}
					linkRenderer={linkRenderer}
					onOpen={() => onOpen(item.label)}
					onClose={() => onClose(item.label)}
					onToggle={() => onToggle(item.label)}
					onNavigate={onNavigate}
				/>
			))}
		</nav>
	);
}

function DesktopNavItemView({
	item,
	active,
	isOpen,
	sticky,
	compact,
	linkRenderer,
	onOpen,
	onClose,
	onToggle,
	onNavigate,
}: {
	item: SiteHeaderNavItemDto;
	active: boolean;
	isOpen: boolean;
	sticky: boolean;
	compact: boolean;
	linkRenderer: SiteLinkRenderer;
	onOpen: () => void;
	onClose: () => void;
	onToggle: () => void;
	onNavigate: () => void;
}) {
	if (!item.children?.length) {
		return (
			<SmartLink
				item={item}
				linkRenderer={linkRenderer}
				onNavigate={onNavigate}
				className={`inline-flex min-h-10 items-center px-3 text-support font-semibold transition ${
					active
						? "bg-[var(--background)] text-[var(--accent)]"
						: "text-[var(--text-primary)] hover:bg-[var(--background)] hover:text-[var(--accent)]"
				} ${compact ? "px-2.5" : ""} rounded-md`}
			>
				{item.label}
			</SmartLink>
		);
	}

	const panelId = `desktop-nav-panel-${toSlug(item.label)}`;
	const hasMegaMenu = Boolean(item.megaSections?.length);
	const panelPositionClass = hasMegaMenu
		? "fixed left-1/2 top-[118px] w-[min(1040px,calc(100vw-48px))] -translate-x-1/2"
		: "absolute left-0 top-[calc(100%+12px)] w-92";

	return (
		// biome-ignore lint/a11y/noStaticElementInteractions: wrapper coordinates hover and focus state for interactive descendants.
		<div
			className="relative"
			data-dropdown-root
			data-open={isOpen}
			data-dropdown-sticky={sticky}
			onPointerEnter={onOpen}
			onPointerLeave={onClose}
			onFocus={onOpen}
			onBlur={(event) => {
				if (event.currentTarget.contains(event.relatedTarget as Node | null))
					return;
				onClose();
			}}
		>
			<div
				className={`inline-flex min-h-10 items-center rounded-md transition ${active || isOpen ? "bg-[var(--background)] text-[var(--accent)]" : "text-[var(--text-primary)] hover:bg-[var(--background)] hover:text-[var(--accent)]"}`}
			>
				<SmartLink
					item={item}
					linkRenderer={linkRenderer}
					onNavigate={onNavigate}
					className={`inline-flex min-h-10 items-center pl-3 pr-1 text-support font-semibold ${compact ? "pl-2.5" : ""}`}
				>
					{item.label}
				</SmartLink>
				<Button
					variant="plain"
					type="button"
					aria-expanded={isOpen}
					aria-controls={panelId}
					aria-label={`Открыть подразделы: ${item.label}`}
					className="inline-flex items-center justify-center outline-none transition focus-visible:ring-2 focus-visible:ring-[var(--accent)]/30"
					onClick={onToggle}
				>
					<ChevronDown
						className={`size-4 transition ${isOpen ? "rotate-180" : ""}`}
						aria-hidden
					/>
				</Button>
			</div>

			<div className="absolute left-0 top-full h-4 w-full" aria-hidden />

			<div
				className={`${panelPositionClass} transition duration-150 ${isOpen ? "visible translate-y-0 opacity-100" : "invisible -translate-y-1 pointer-events-none opacity-0"}`}
				onPointerEnter={onOpen}
			>
				<div
					id={panelId}
					className="rounded-lg border border-[var(--border)] bg-[var(--surface-card)] py-2 shadow-[var(--desktop-site-nav-shadow-primary)]"
				>
					{item.megaSections?.length ? (
						<div className="p-3">
							<div className="mb-3 flex items-center justify-center rounded-sm border border-[var(--border)] bg-[var(--background)] p-3 text-center text-[var(--text-primary)]">
								<SmartLink
									item={item}
									linkRenderer={linkRenderer}
									onNavigate={onNavigate}
									className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-body font-semibold transition hover:bg-[var(--surface-card)] hover:text-[var(--accent)]"
								>
									<span>
										{item.label === "Недвижимость"
											? "Вся недвижимость"
											: item.label}
									</span>
									<ArrowRight
										className="size-4 text-[var(--accent)]"
										aria-hidden
									/>
								</SmartLink>
							</div>
							<div className="grid gap-3 lg:grid-cols-4">
								{item.megaSections.map((section) => (
									<section
										key={section.title}
										className="rounded-sm border border-[var(--border)] bg-[var(--surface-card)] p-3"
									>
										<SmartLink
											item={section}
											linkRenderer={linkRenderer}
											onNavigate={onNavigate}
											className="group block rounded-compact px-2 py-2 text-[var(--text-primary)] transition hover:bg-[var(--background)] hover:text-[var(--accent)]"
										>
											<span className="flex items-center justify-between gap-3 text-body font-semibold">
												<span className="flex min-w-0 items-center gap-2">
													<MegaSectionIcon title={section.title} />
													<span>{section.title}</span>
												</span>
												<ArrowRight
													className="size-4 shrink-0 text-[var(--accent)] opacity-70 transition group-hover:translate-x-0.5 group-hover:opacity-100"
													aria-hidden
												/>
											</span>
											{section.description ? (
												<span className="mt-1 block text-label leading-step-body text-[var(--text-muted)]">
													{section.description}
												</span>
											) : null}
										</SmartLink>
										<div className="mt-2 grid gap-0.5">
											{section.links.map((link) => (
												<SmartLink
													key={`${section.title}-${link.label}`}
													item={link}
													linkRenderer={linkRenderer}
													onNavigate={onNavigate}
													className="block rounded-compact px-2 py-1.5 text-label font-semibold leading-step-body text-[var(--text-secondary)] transition hover:bg-[var(--background)] hover:text-[var(--accent)]"
												>
													{link.label}
												</SmartLink>
											))}
										</div>
									</section>
								))}
							</div>
						</div>
					) : item.showOverviewLink !== false ? (
						<SmartLink
							item={item}
							linkRenderer={linkRenderer}
							onNavigate={onNavigate}
							className="mx-2 block rounded-sm border-b border-[var(--surface-muted)] px-3 py-3 text-[var(--text-primary)] transition hover:bg-[var(--background)] hover:text-[var(--accent)]"
						>
							<span className="block text-body font-extrabold">
								{item.label}
							</span>
							{item.description ? (
								<span className="mt-1 block text-label leading-step-body text-[var(--text-muted)]">
									{item.description}
								</span>
							) : null}
						</SmartLink>
					) : null}

					{!hasMegaMenu ? (
						<div className="grid">
							{item.children.map((child) => (
								<SmartLink
									key={`${item.label}-${child.label}`}
									item={child}
									linkRenderer={linkRenderer}
									onNavigate={onNavigate}
									className="group mx-2 grid rounded-sm px-3 py-3 text-[var(--text-primary)] transition hover:bg-[var(--background)] hover:text-[var(--accent)]"
								>
									<span className="flex items-center justify-between gap-4 text-body font-bold">
										{child.label}
										<ChevronDown
											className="size-4 -rotate-90 text-[var(--accent)] opacity-0 transition group-hover:opacity-100"
											aria-hidden
										/>
									</span>
									{child.description ? (
										<span className="mt-1 text-label leading-step-body text-[var(--text-muted)]">
											{child.description}
										</span>
									) : null}
								</SmartLink>
							))}
						</div>
					) : null}
				</div>
			</div>
		</div>
	);
}

function SmartLink({
	item,
	children,
	className,
	linkRenderer: LinkRenderer,
	onNavigate,
}: {
	item: { href?: string; external?: boolean; rel?: string };
	children: ReactNode;
	className: string;
	linkRenderer: SiteLinkRenderer;
	onNavigate?: () => void;
}) {
	if (item.external) {
		return (
			<a
				href={item.href}
				target="_blank"
				rel={item.rel ?? "noreferrer"}
				className={className}
				onClick={onNavigate}
			>
				{children}
			</a>
		);
	}

	return (
		<LinkRenderer
			href={item.href ?? "/"}
			className={className}
			onClick={onNavigate}
		>
			{children}
		</LinkRenderer>
	);
}

function MegaSectionIcon({ title }: { title: string }) {
	const className = "size-4 shrink-0 text-[var(--accent)]";
	if (title === "Новостройки")
		return <Building2 className={className} aria-hidden />;
	if (title === "Квартиры") return <Home className={className} aria-hidden />;
	if (title === "Загородная")
		return <TreePine className={className} aria-hidden />;
	if (title === "Коммерческая")
		return <Store className={className} aria-hidden />;
	return <Building2 className={className} aria-hidden />;
}

function isItemActive(pathname: string, item: SiteHeaderNavItemDto) {
	if (item.matchPrefixes?.some((prefix) => pathname.startsWith(prefix)))
		return true;
	if (item.href && !item.external) {
		if (item.href === "/") return pathname === "/";
		if (pathname.startsWith(item.href)) return true;
	}
	return (
		item.children?.some(
			(child) =>
				!child.external && pathname.startsWith(child.href.split("?")[0]),
		) ?? false
	);
}

function toSlug(value: string) {
	return value.toLowerCase().replace(/\s+/g, "-");
}
