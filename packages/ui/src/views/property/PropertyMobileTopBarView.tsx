"use client";

import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import type { SiteLinkRenderer } from "../../lib/adapters";

export function PropertyMobileTopBarView({
	backHref,
	price,
	title,
	docked,
	compareAction,
	favoriteAction,
	linkRenderer: LinkRenderer,
}: {
	backHref: string;
	price: string;
	title: string;
	docked: boolean;
	compareAction: ReactNode;
	favoriteAction: ReactNode;
	linkRenderer: SiteLinkRenderer;
}) {
	return (
		<div
			className={`sticky top-0 z-40 transition-all duration-200 lg:hidden ${docked ? "border-b border-[var(--border)] bg-[var(--surface-card)]/96 shadow-[var(--property-mobile-top-bar-shadow-panel)] backdrop-blur-xl" : ""}`}
		>
			<div className="mx-auto grid min-h-11 max-w-site-frame grid-cols-[36px_minmax(0,1fr)_80px] items-center gap-2 px-2.5 py-1.5 text-[var(--text-secondary)] sm:px-3">
				<LinkRenderer
					href={backHref}
					ariaLabel="Вернуться в каталог"
					className="inline-flex size-9 items-center justify-center rounded-md text-[var(--text-primary)] transition hover:text-[var(--accent)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
				>
					<ArrowLeft className="size-5" aria-hidden />
				</LinkRenderer>
				<div className="min-w-0">
					<p className="truncate text-support font-bold leading-support-pixel tabular-nums text-[var(--text-primary)] sm:text-body-fluid sm:leading-body-fluid-pixel">
						{price}
					</p>
					<p className="truncate text-label font-medium leading-label text-[var(--text-muted)] sm:text-support-dense sm:leading-support-pixel">
						{title}
					</p>
				</div>
				<div className="flex items-center justify-end gap-1">
					{compareAction}
					{favoriteAction}
				</div>
			</div>
		</div>
	);
}
