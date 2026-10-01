import { Card } from "../../components/ui/card";
import type { CorporateRelatedServiceDTO } from "../../view-models/content";
import type { SiteLinkRenderer } from "../../lib/adapters";

export function CorporateRelatedServicesView({
	links,
	linkRenderer: LinkRenderer,
}: {
	links: readonly CorporateRelatedServiceDTO[];
	linkRenderer: SiteLinkRenderer;
}) {
	if (!links.length) return null;
	return (
		<section
			className="bg-[var(--surface-card)] py-10 lg:py-14"
			aria-labelledby="related-services-title"
		>
			<div className="mx-auto max-w-site-frame px-5">
				<h2
					id="related-services-title"
					className="text-section-title font-extrabold leading-section-title text-[var(--text-primary)]"
				>
					Связанные юридические услуги
				</h2>
				<div className="mt-6 grid gap-4 md:grid-cols-2">
					{links.map((link) => (
						<Card
							key={link.href}
							className="rounded-lg border-[var(--border)] bg-[var(--surface-card-soft)] p-0 shadow-none transition hover:border-[var(--border)] hover:bg-[var(--accent-soft)]"
						>
							<LinkRenderer href={link.href} className="group block p-5">
								<span className="block text-body-emphasis font-extrabold leading-card text-[var(--text-primary)] transition group-hover:text-[var(--accent)]">
									{link.label}
								</span>
								<span className="mt-3 block text-body leading-body text-[var(--text-secondary)]">
									{link.description}
								</span>
							</LinkRenderer>
						</Card>
					))}
				</div>
			</div>
		</section>
	);
}
