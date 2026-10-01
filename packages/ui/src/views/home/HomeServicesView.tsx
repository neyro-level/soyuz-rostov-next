"use client";

import type { ReactNode } from "react";
import { useSiteOverlay } from "../../components/shared/site-overlay-context";
import { Button } from "../../components/ui/button";
import type { SiteLinkRenderer } from "../../lib/adapters";

export type HomeServiceItemViewDto = {
	title: string;
	icon: ReactNode;
	href?: string;
	onClick?: () => void;
	modal?: {
		title?: string;
		subtitle?: string;
		source: string;
		formType: string;
		submitLabel?: string;
	};
};

type HomeServicesViewProps = {
	brand: string;
	items: HomeServiceItemViewDto[];
	linkRenderer: SiteLinkRenderer;
	overlay?: ReactNode;
};

export function HomeServicesView({
	brand,
	items,
	linkRenderer: LinkRenderer,
	overlay,
}: HomeServicesViewProps) {
	const { openRequest } = useSiteOverlay();
	return (
		<section
			id="section-home-services"
			className="home-services"
			aria-label={`Сервисы агентства «${brand}»`}
		>
			<div className="home-shell">
				<div className="home-services__panel">
					<div className="home-services__grid">
						{items.map((item) => {
							const content = (
								<>
									<span className="home-services__icon" aria-hidden>
										{item.icon}
									</span>
									<span className="home-services__title">{item.title}</span>
								</>
							);
							if (item.href)
								return (
									<Button
										key={item.title}
										asChild
										variant="ghost"
										className="home-services__item"
									>
										<LinkRenderer href={item.href}>{content}</LinkRenderer>
									</Button>
								);
							return (
								<Button
									key={item.title}
									type="button"
									variant="ghost"
									className="home-services__item"
									onClick={item.onClick ?? (() => openRequest(item.modal))}
								>
									{content}
								</Button>
							);
						})}
					</div>
				</div>
			</div>
			{overlay}
		</section>
	);
}
