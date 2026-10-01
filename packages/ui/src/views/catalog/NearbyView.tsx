import type { PageLinkDTO } from "@ams/realtbase-contracts";
import { Container, Section, SectionHeader } from "../../components/ui/layout";

export function NearbyView({ links }: { links: readonly PageLinkDTO[] }) {
	if (!links.length) return null;
	return (
		<Section
			aria-labelledby="nearby-title"
			className="bg-surface-subtle"
			space="md"
		>
			<Container>
				<SectionHeader titleId="nearby-title" title="Рядом" />
				<ul className="mt-6 flex flex-wrap gap-3">
					{links.map((link) => (
						<li key={link.href}>
							<a
								className="inline-flex min-h-11 items-center rounded-md border border-border bg-surface-raised px-4 font-semibold transition-colors hover:border-action-primary hover:text-action-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-action-primary"
								href={link.href}
							>
								{link.label}
								{link.count === undefined ? "" : ` (${link.count})`}
							</a>
						</li>
					))}
				</ul>
			</Container>
		</Section>
	);
}
