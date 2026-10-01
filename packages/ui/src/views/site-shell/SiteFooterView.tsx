"use client";

import { Phone } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "../../components/ui/button";
import type {
	PublicContactViewDto,
	SiteFooterColumnViewDto,
	SiteFooterMetaViewDto,
	SiteNavLinkViewDto,
	SiteSocialLinkViewDto,
} from "../../view-models/site-shell";
import type { SiteLinkRenderer } from "../../lib/adapters";

type SiteFooterViewProps = {
	brand: ReactNode;
	brandLabel: string;
	contacts: PublicContactViewDto;
	columns: SiteFooterColumnViewDto[];
	legalLinks: SiteNavLinkViewDto[];
	meta: SiteFooterMetaViewDto;
	socials: SiteSocialLinkViewDto[];
	linkRenderer: SiteLinkRenderer;
	homeHref: string;
};

export function SiteFooterView({
	brand,
	brandLabel,
	contacts,
	columns,
	legalLinks,
	meta,
	socials,
	linkRenderer: LinkRenderer,
	homeHref,
}: SiteFooterViewProps) {
	return (
		<footer id="site-footer" className="site-footer" role="contentinfo">
			<div className="site-footer__shell">
				<div className="site-footer__brand">
					<LinkRenderer
						href={homeHref}
						ariaLabel={`${brandLabel} — на главную`}
						className="site-footer__brand-mark"
					>
						{brand}
					</LinkRenderer>
				</div>

				<div className="site-footer__grid">
					{columns.map((column) => (
						<nav key={column.title} aria-label={column.title}>
							<p className="site-footer__column-title">{column.title}</p>
							<div className="site-footer__nav">
								{column.links.map((link) => (
									<LinkRenderer
										key={`${column.title}-${link.label}`}
										href={link.href}
										target={link.external ? "_blank" : undefined}
										rel={link.external ? "noreferrer" : link.rel}
										className="site-footer__link"
									>
										{link.label}
									</LinkRenderer>
								))}
							</div>
						</nav>
					))}
				</div>

				<div className="site-footer__contact-row">
					<FooterPhoneReveal
						phone={contacts.phone}
						phoneHref={contacts.phoneHref}
					/>

					{socials.length ? (
						<nav className="site-footer__socials" aria-label="Социальные сети">
							{socials.map((item) => (
								<a
									key={item.label}
									href={item.href}
									target="_blank"
									rel="noreferrer"
									className="site-footer__social"
									aria-label={item.label}
									title={item.label}
								>
									<SocialIcon label={item.label} />
								</a>
							))}
						</nav>
					) : null}
				</div>

				<div className="site-footer__bottom">
					<div className="site-footer__legal-meta">
						<p>{meta.copyright}</p>
						{meta.registry ? <p>{meta.registry}</p> : null}
					</div>

					<div className="site-footer__bottom-right">
						<div className="site-footer__legal">
							{legalLinks.map((link) => (
								<LinkRenderer
									key={link.label}
									href={link.href}
									target={link.external ? "_blank" : undefined}
									rel={link.external ? "noreferrer" : link.rel}
								>
									{link.label}
								</LinkRenderer>
							))}
						</div>
					</div>
				</div>
			</div>
		</footer>
	);
}

function FooterPhoneReveal({
	phone,
	phoneHref,
}: {
	phone: string;
	phoneHref: string;
}) {
	const [visible, setVisible] = useState(false);

	if (!phone || !phoneHref) return null;

	if (visible) {
		return (
			<a
				href={phoneHref}
				className="site-footer__phone site-footer__phone--revealed tabular-nums"
				data-analytics-context="site_footer"
			>
				<Phone className="site-footer__phone-icon" aria-hidden />
				<span>{phone}</span>
			</a>
		);
	}

	return (
		<Button
			variant="plain"
			type="button"
			className="site-footer__phone site-footer__phone--hidden tabular-nums"
			data-analytics-event="phone_reveal"
			data-analytics-context="site_footer"
			onClick={() => setVisible(true)}
		>
			<Phone className="site-footer__phone-icon" aria-hidden />
			<span>+7...Показать</span>
		</Button>
	);
}

function SocialIcon({ label }: { label: string }) {
	if (label.toLowerCase() === "telegram") {
		return (
			<svg viewBox="0 0 24 24" className="site-footer__social-icon" aria-hidden>
				<path
					fill="currentColor"
					d="M21.8 4.3 3.7 11.3c-1.2.5-1.2 1.2-.2 1.5l4.6 1.4 1.8 5.4c.2.7.4.9 1 .9.6 0 .9-.3 1.2-.6l2.7-2.6 4.5 3.3c.8.4 1.4.2 1.6-.8l2.9-13.7c.3-1.2-.4-1.7-1.4-1.2Zm-3.3 3.4-8.5 7.7-.4 3.4-1.6-5.2 10.5-5.9Z"
				/>
			</svg>
		);
	}

	if (label.toLowerCase() === "max") {
		return (
			<svg viewBox="0 0 24 24" className="site-footer__social-icon" aria-hidden>
				<path
					fill="currentColor"
					d="M4.2 18.2V5.8h3.2l4.6 8.9h.1l4.6-8.9h3.2v12.4h-2.7V10.1h-.1l-3.8 7.4h-2.5L7 10.1H6.9v8.1H4.2Z"
				/>
			</svg>
		);
	}

	return (
		<svg viewBox="0 0 24 24" className="site-footer__social-icon" aria-hidden>
			<path
				fill="currentColor"
				d="M12.7 17.5h1.4s.4 0 .6-.3c.2-.2.2-.6.2-.6s0-1.9 1-2.2c1-.3 2.2 1.8 3.5 2.6.9.6 1.7.5 1.7.5l3.4-.1s1.8-.1.9-1.5c-.1-.1-.5-1-2.6-2.8-2.2-2-1.9-1.6.8-5 1.6-2 2.3-3.2 2.1-3.7-.2-.5-1.4-.3-1.4-.3l-3.8.1s-.3 0-.5.1c-.2.1-.3.4-.3.4s-.6 1.6-1.4 3c-1.7 2.9-2.4 3-2.7 2.8-.6-.4-.5-1.5-.5-2.3 0-2.5.4-3.6-.7-3.8-.4-.1-.6-.1-1.6-.1-1.2 0-2.2 0-2.8.3-.4.2-.7.6-.5.7.2.1.7.1.9.6.3.7.3 2.2.3 2.2s.2 2.5-.4 2.8c-.4.2-1-.1-2.3-2.9-.7-1.5-1.2-3.1-1.2-3.1s-.1-.3-.3-.5c-.2-.2-.5-.3-.5-.3l-3.6.1s-.5 0-.7.3c-.2.2 0 .6 0 .6s2.8 6.6 6 9.9c2.9 3 5.3 2.8 5.3 2.8Z"
			/>
		</svg>
	);
}
