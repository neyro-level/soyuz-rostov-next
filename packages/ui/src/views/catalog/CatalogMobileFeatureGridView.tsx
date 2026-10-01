import {
	ArrowUpRight,
	BadgeCheck,
	Building2,
	House,
	Landmark,
	MapPinned,
	Scale,
	SearchCheck,
} from "lucide-react";

import type { SiteLinkRenderer } from "../../lib/adapters";

export type CatalogMobileFeatureIcon =
	| "apartment"
	| "home"
	| "land"
	| "new-building"
	| "selection"
	| "mortgage"
	| "legal"
	| "support";

export type CatalogMobileFeatureItem = {
	title: string;
	text: string;
	icon: CatalogMobileFeatureIcon;
	href?: string;
};

const ICONS = {
	apartment: Building2,
	home: House,
	land: MapPinned,
	"new-building": Building2,
	selection: SearchCheck,
	mortgage: Landmark,
	legal: Scale,
	support: BadgeCheck,
} as const;

export function CatalogMobileFeatureGridView({
	id,
	eyebrow,
	title,
	items,
	linkRenderer: LinkRenderer,
}: {
	id: string;
	eyebrow?: string;
	title: string;
	items: readonly CatalogMobileFeatureItem[];
	linkRenderer?: SiteLinkRenderer;
}) {
	return (
		<section
			className="bg-[var(--surface-card)] px-5 py-6 lg:hidden"
			aria-labelledby={id}
		>
			<div className="mx-auto max-w-site-frame">
				{eyebrow ? (
					<p className="text-overline font-extrabold uppercase tracking-overline text-[var(--accent)]">
						{eyebrow}
					</p>
				) : null}
				<h2
					id={id}
					className={`${eyebrow ? "mt-1" : ""} text-section-title font-extrabold leading-section-title text-[var(--text-primary)]`}
				>
					{title}
				</h2>
				<div className="mt-5 grid grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
					{items.map((item) => {
						const Icon = ICONS[item.icon];
						const content = (
							<>
								<span className="flex items-start justify-between gap-3">
									<span className="grid size-10 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
										<Icon className="size-5" strokeWidth={1.8} aria-hidden />
									</span>
									{item.href ? (
										<ArrowUpRight
											className="size-4 text-[var(--text-muted)] transition group-hover:text-[var(--accent)]"
											aria-hidden
										/>
									) : null}
								</span>
								<h3 className="mt-auto pt-5 text-support font-extrabold leading-card text-[var(--text-primary)]">
									{item.title}
								</h3>
								<p className="mt-2 text-caption font-medium leading-step-small text-[var(--text-secondary)]">
									{item.text}
								</p>
							</>
						);
						const className =
							"group flex min-h-40 flex-col rounded-lg border border-[var(--border)] bg-[var(--surface-card)] p-4 shadow-[var(--property-card-shadow-grid-rest)] transition active:scale-[0.985] md:min-h-44 md:p-5";

						return item.href && LinkRenderer ? (
							<LinkRenderer
								key={item.title}
								href={item.href}
								className={className}
								ariaLabel={`${item.title}: ${item.text}`}
							>
								{content}
							</LinkRenderer>
						) : (
							<article key={item.title} className={className}>
								{content}
							</article>
						);
					})}
				</div>
			</div>
		</section>
	);
}
