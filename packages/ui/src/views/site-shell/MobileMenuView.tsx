"use client";

import { ChevronRight, X } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { Button } from "../../components/ui/button";
import { Sheet, SheetContent } from "../../components/ui/sheet";
import type { SiteLinkRenderer } from "../../lib/adapters";
import { CitySwitcherView } from "../site-shell/CitySwitcherView";
import { PhoneRevealView } from "../site-shell/PhoneRevealView";
import type {
	SiteCityOptionViewDto,
	SiteMobileMenuActionDto,
	SiteNavLinkDto,
} from "../site-shell/site-header.types";

type MobileMenuViewProps = {
	open: boolean;
	brandSlot: ReactNode;
	compareSlot: ReactNode;
	favoritesSlot: ReactNode;
	propertyLinks: readonly SiteNavLinkDto[];
	actions: readonly SiteMobileMenuActionDto[];
	cityOptions: readonly SiteCityOptionViewDto[];
	phone?: string | null;
	phoneHref?: string | null;
	cityOpen: boolean;
	phoneVisible: boolean;
	linkRenderer: SiteLinkRenderer;
	onToggleCity: () => void;
	onCloseCity: () => void;
	onRevealPhone: () => void;
	onClose: () => void;
	onAction: (
		action: Extract<SiteMobileMenuActionDto, { kind: "action" }>,
	) => void;
};

export function MobileMenuView({
	open,
	brandSlot,
	compareSlot,
	favoritesSlot,
	propertyLinks,
	actions,
	cityOptions,
	phone,
	phoneHref,
	cityOpen,
	phoneVisible,
	linkRenderer,
	onToggleCity,
	onCloseCity,
	onRevealPhone,
	onClose,
	onAction,
}: MobileMenuViewProps) {
	const panelRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!open) return;
		const frame = window.requestAnimationFrame(() => {
			panelRef.current?.scrollTo({ top: 0 });
		});
		return () => window.cancelAnimationFrame(frame);
	}, [open]);

	return (
		<Sheet
			open={open}
			onOpenChange={(nextOpen) => {
				if (!nextOpen) onClose();
			}}
		>
			<SheetContent
				side="right"
				showClose={false}
				className="z-[60] h-dvh max-h-dvh w-screen max-w-none gap-0 overflow-hidden rounded-none border-l-0 bg-[var(--surface-card-soft)] p-0 lg:hidden"
			>
				<div
					id="site-mobile-menu"
					role="dialog"
					aria-modal="true"
					aria-label="Мобильное меню"
					className="flex h-dvh max-h-dvh flex-col bg-[var(--surface-card-soft)]"
				>
					<div className="shrink-0 border-b border-[var(--mobile-menu-border-primary)] bg-[var(--surface-card)] px-4 pb-2.5 pt-[max(0.65rem,env(safe-area-inset-top,0px))]">
						<div className="mx-auto flex h-14 w-full max-w-lg items-center justify-between gap-3">
							<div className="flex shrink-0 items-center">{brandSlot}</div>
							<Button
								variant="plain"
								type="button"
								aria-label="Закрыть меню"
								className="inline-flex shrink-0 items-center justify-center rounded-md border border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-primary)] transition hover:border-[var(--accent)] hover:text-[var(--accent)]"
								onClick={onClose}
							>
								<X className="" strokeWidth={1.75} aria-hidden />
							</Button>
						</div>
					</div>

					<div
						ref={panelRef}
						className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-4 pt-3.5 [scrollbar-gutter:stable]"
					>
						<div className="mx-auto flex w-full max-w-lg flex-col gap-2.5 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]">
							<div className="grid grid-cols-2 gap-2">
								<CitySwitcherView
									variant="mobile"
									open={cityOpen}
									options={cityOptions}
									linkRenderer={linkRenderer}
									onToggle={onToggleCity}
									onClose={onCloseCity}
								/>
								<PhoneRevealView
									variant="mobile"
									phone={phone}
									phoneHref={phoneHref}
									visible={phoneVisible}
									analyticsContext="mobile_menu"
									onReveal={onRevealPhone}
								/>
							</div>

							<div className="grid grid-cols-2 gap-2">
								{compareSlot}
								{favoritesSlot}
							</div>

							<MobileLinkGroup
								links={propertyLinks}
								linkRenderer={linkRenderer}
								onNavigate={onClose}
							/>
							<MobileActionGroup
								actions={actions}
								linkRenderer={linkRenderer}
								onNavigate={onClose}
								onAction={onAction}
							/>
						</div>
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}

function MobileLinkGroup({
	links,
	linkRenderer,
	onNavigate,
}: {
	links: readonly SiteNavLinkDto[];
	linkRenderer: SiteLinkRenderer;
	onNavigate: () => void;
}) {
	return (
		<nav
			aria-label="Типы недвижимости"
			className="overflow-hidden rounded-emphasis border border-[var(--mobile-menu-border-secondary)] bg-[var(--surface-card)]"
		>
			{links.map((link, index) => (
				<MobileRowLink
					key={link.href}
					href={link.href}
					label={link.label}
					external={link.external}
					linkRenderer={linkRenderer}
					onNavigate={onNavigate}
					bordered={index > 0}
				/>
			))}
		</nav>
	);
}

function MobileActionGroup({
	actions,
	linkRenderer,
	onNavigate,
	onAction,
}: {
	actions: readonly SiteMobileMenuActionDto[];
	linkRenderer: SiteLinkRenderer;
	onNavigate: () => void;
	onAction: (
		action: Extract<SiteMobileMenuActionDto, { kind: "action" }>,
	) => void;
}) {
	return (
		<nav
			aria-label="Сервисы и разделы"
			className="overflow-hidden rounded-emphasis border border-[var(--mobile-menu-border-secondary)] bg-[var(--surface-card)]"
		>
			{actions.map((action, index) => {
				if ("kind" in action && action.kind === "action") {
					return (
						<Button
							variant="plain"
							key={`${action.actionId}-${action.label}`}
							type="button"
							className={`flex min-h-11 w-full items-center justify-between gap-3 px-4 text-left text-support font-medium tracking-compact text-[var(--mobile-menu-content-primary)] transition hover:bg-[var(--surface-card-soft)] hover:text-[var(--accent)] ${index > 0 ? "border-t border-[var(--mobile-menu-border-tertiary)]" : ""}`}
							onClick={() => {
								onAction(action);
								onNavigate();
							}}
						>
							<span>{action.label}</span>
							<ChevronRight
								className="shrink-0 text-[var(--mobile-menu-content-secondary)]"
								strokeWidth={1.75}
								aria-hidden
							/>
						</Button>
					);
				}

				const linkAction = action as SiteNavLinkDto;

				return (
					<MobileRowLink
						key={`${linkAction.label}-${linkAction.href}`}
						href={linkAction.href}
						label={linkAction.label}
						external={linkAction.external}
						linkRenderer={linkRenderer}
						onNavigate={onNavigate}
						bordered={index > 0}
					/>
				);
			})}
		</nav>
	);
}

function MobileRowLink({
	href,
	label,
	external,
	linkRenderer: LinkRenderer,
	onNavigate,
	bordered,
}: {
	href: string;
	label: string;
	external?: boolean;
	linkRenderer: SiteLinkRenderer;
	onNavigate: () => void;
	bordered: boolean;
}) {
	const className = `flex min-h-11 items-center justify-between gap-3 px-4 text-support font-medium tracking-compact text-[var(--mobile-menu-content-primary)] transition hover:bg-[var(--surface-card-soft)] hover:text-[var(--accent)] ${bordered ? "border-t border-[var(--mobile-menu-border-tertiary)]" : ""}`;
	const content = (
		<>
			<span>{label}</span>
			<ChevronRight
				className="size-4 shrink-0 text-[var(--mobile-menu-content-secondary)]"
				strokeWidth={1.75}
				aria-hidden
			/>
		</>
	);

	if (external) {
		return (
			<a href={href} className={className} onClick={onNavigate}>
				{content}
			</a>
		);
	}

	return (
		<LinkRenderer href={href} className={className} onClick={onNavigate}>
			{content}
		</LinkRenderer>
	);
}
