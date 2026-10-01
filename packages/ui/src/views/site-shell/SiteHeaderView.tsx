"use client"; // header refs, mobile menu, city switcher, phone reveal, dropdowns

import { Building2, Menu, SlidersHorizontal, X } from "lucide-react";
import type { ReactNode, RefObject } from "react";
import { Button } from "../../components/ui/button";
import { Container } from "../../components/ui/layout";
import type { SiteLinkRenderer } from "../../lib/adapters";
import { CitySwitcherView } from "../site-shell/CitySwitcherView";
import { DesktopSiteNavView } from "../site-shell/DesktopSiteNavView";
import { PhoneRevealView } from "../site-shell/PhoneRevealView";
import type {
	SiteCityOptionViewDto,
	SiteHeaderNavItemDto,
} from "../site-shell/site-header.types";

type SiteHeaderViewProps = {
	headerRef: RefObject<HTMLElement | null>;
	mobileButtonRef: RefObject<HTMLButtonElement | null>;
	pathname: string;
	contacts: { phone: string; phoneHref: string };
	desktopNav: SiteHeaderNavItemDto[];
	cityOptions: SiteCityOptionViewDto[];
	brand: ReactNode;
	brandLabel: string;
	mobileMenu: ReactNode;
	compareAction: ReactNode;
	favoritesAction: ReactNode;
	stickyCollectionAction: ReactNode;
	catalogHref: string;
	homeHref: string;
	contactHref: string;
	sellHref: string;
	docked: boolean;
	compactSticky: boolean;
	propertyObjectPage: boolean;
	sessionCollectionPage: boolean;
	mobileOpen: boolean;
	citySwitcherOpen: boolean;
	phoneVisible: boolean;
	openDesktop: string | null;
	stickyDesktop: string | null;
	linkRenderer: SiteLinkRenderer;
	onToggleMobile: () => void;
	onOpenFilters: () => void;
	onCloseMobile: () => void;
	onToggleCity: () => void;
	onCloseCity: () => void;
	onRevealPhone: () => void;
	onOpenDropdown: (label: string) => void;
	onCloseDropdown: (label?: string) => void;
	onToggleDropdown: (label: string) => void;
	onNavigate: () => void;
};

export function SiteHeaderView(props: SiteHeaderViewProps) {
	const {
		headerRef,
		mobileButtonRef,
		pathname,
		contacts,
		desktopNav,
		cityOptions,
		brand,
		brandLabel,
		mobileMenu,
		compareAction,
		favoritesAction,
		stickyCollectionAction,
		catalogHref,
		homeHref,
		contactHref,
		sellHref,
		docked,
		compactSticky,
		propertyObjectPage,
		sessionCollectionPage,
		mobileOpen,
		citySwitcherOpen,
		phoneVisible,
		openDesktop,
		stickyDesktop,
		linkRenderer: LinkRenderer,
		onToggleMobile,
		onOpenFilters,
		onCloseMobile,
		onToggleCity,
		onCloseCity,
		onRevealPhone,
		onOpenDropdown,
		onCloseDropdown,
		onToggleDropdown,
		onNavigate,
	} = props;
	const headerClass = compactSticky
		? "fixed left-3 right-3 top-3 z-50 mx-auto h-13 max-w-site-frame-floating rounded-2xl border border-[var(--border)] bg-[var(--surface-card)]/96 shadow-[var(--site-header-shadow-primary)] backdrop-blur-xl transition-all duration-300 lg:h-26.5"
		: docked
			? "fixed left-3 right-3 top-3 z-50 mx-auto h-17 max-w-site-frame-floating rounded-floating-header border border-[var(--border)] bg-[var(--surface-card)]/96 shadow-[var(--site-header-shadow-secondary)] backdrop-blur-xl transition-all duration-300 lg:h-26.5"
			: "fixed left-0 right-0 top-0 z-50 h-17 border-b border-[var(--border)] bg-[var(--surface-card)]/92 shadow-[var(--site-header-shadow-tertiary)] backdrop-blur-xl transition-all duration-300 lg:h-26.5";
	const propertyObjectMobileHideClass =
		propertyObjectPage && docked
			? "max-lg:pointer-events-none max-lg:-translate-y-full max-lg:opacity-0"
			: "";
	return (
		<>
			<header
				ref={headerRef}
				id="site-header"
				data-state={docked ? "dock" : "top"}
				data-catalog-sticky={compactSticky ? "true" : "false"}
				data-overlay={mobileOpen ? "true" : "false"}
				className={`${propertyObjectMobileHideClass} ${headerClass}`}
			>
				<Container
					className={`mobile-safe-shell h-full transition-[padding] duration-300 ${compactSticky ? "px-3 lg:px-6 xl:px-8" : docked ? "px-5 lg:px-6 xl:px-8" : "px-5 lg:px-10 xl:px-12"}`}
				>
					{compactSticky ? (
						<div className="flex h-full items-center gap-3 lg:hidden">
							{sessionCollectionPage ? (
								<Button
									asChild
									variant="secondary"
									size="sm"
									className="min-h-9 flex-1 gap-1.5 rounded-lg bg-[var(--surface-muted)] px-3 text-label text-[var(--text-secondary)] hover:bg-[var(--border)] hover:text-[var(--accent)]"
								>
									<LinkRenderer href={catalogHref}>
										<Building2 className="shrink-0" aria-hidden />
										<span className="truncate">Вся недвижимость</span>
									</LinkRenderer>
								</Button>
							) : (
								stickyCollectionAction
							)}
							<Button
								type="button"
								variant="secondary"
								size="sm"
								onClick={onOpenFilters}
								className="min-h-9 flex-1 gap-1.5 rounded-lg bg-[var(--surface-muted)] px-3 text-label text-[var(--text-secondary)] hover:bg-[var(--border)]"
							>
								<SlidersHorizontal className="shrink-0" aria-hidden />
								Фильтры
							</Button>
						</div>
					) : null}
					<div className={compactSticky ? "hidden h-full lg:block" : "h-full"}>
						<div className="flex h-full items-center gap-3 lg:h-14 xl:gap-4">
							<LinkRenderer
								href={homeHref}
								ariaLabel={`${brandLabel} — на главную`}
								className="flex shrink-0 items-center"
								onClick={onCloseMobile}
							>
								{brand}
							</LinkRenderer>
							<div className="hidden items-center gap-2 text-body font-semibold text-[var(--text-secondary)] lg:flex xl:gap-3">
								<CitySwitcherView
									variant="desktop"
									open={citySwitcherOpen}
									options={cityOptions}
									linkRenderer={LinkRenderer}
									onToggle={onToggleCity}
									onClose={onCloseCity}
								/>
								<PhoneRevealView
									variant="desktop"
									phone={contacts.phone}
									phoneHref={contacts.phoneHref}
									visible={phoneVisible}
									analyticsContext="site_header"
									onReveal={onRevealPhone}
								/>
								<LinkRenderer
									href={contactHref}
									className="inline-flex min-h-10 items-center gap-2 rounded-md px-2.5 transition hover:bg-[var(--background)] hover:text-[var(--accent)]"
								>
									<Building2
										className="size-[18px] text-[var(--text-muted)]"
										aria-hidden
									/>
									Наши офисы
								</LinkRenderer>
							</div>
							<div className="ml-auto flex shrink-0 items-center justify-end gap-2">
								<div className="hidden items-center gap-1 lg:flex">
									{compareAction}
									{favoritesAction}
									<Button asChild className="ml-2 min-h-10 px-4 text-body">
										<LinkRenderer href={sellHref}>
											Продать квартиру
										</LinkRenderer>
									</Button>
								</div>
								<Button
									ref={mobileButtonRef}
									type="button"
									variant="outline"
									size="icon"
									aria-label={mobileOpen ? "Закрыть меню" : "Открыть меню"}
									aria-expanded={mobileOpen}
									aria-controls="site-mobile-menu"
									className="bg-[var(--surface-card)] text-[var(--foreground)] lg:hidden"
									onClick={onToggleMobile}
								>
									{mobileOpen ? (
										<X className="" aria-hidden />
									) : (
										<Menu className="" aria-hidden />
									)}
								</Button>
							</div>
						</div>
						<div className="hidden h-12.5 items-center border-t border-[var(--border)] lg:flex">
							<DesktopSiteNavView
								items={desktopNav}
								pathname={pathname}
								compact={docked}
								openLabel={openDesktop}
								stickyLabel={stickyDesktop}
								linkRenderer={LinkRenderer}
								onOpen={onOpenDropdown}
								onClose={onCloseDropdown}
								onToggle={onToggleDropdown}
								onNavigate={onNavigate}
							/>
						</div>
					</div>
				</Container>
			</header>
			{mobileMenu}
		</>
	);
}
