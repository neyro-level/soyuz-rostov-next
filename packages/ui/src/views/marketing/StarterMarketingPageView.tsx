import type { MarketingPageDTO } from "@ams/realtbase-contracts";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Container, Section } from "../../components/ui/layout";
import { LeadFormView } from "../starter/LeadFormView";

function Breadcrumbs({ items }: MarketingPageDTO["breadcrumbs"]) {
	return (
		<nav
			aria-label="Хлебные крошки"
			className="mb-6 flex flex-wrap gap-2 text-caption text-content-default"
		>
			{items.map((item, index) => (
				<span key={`${item.href ?? "current"}-${item.label}`}>
					{index ? <span aria-hidden> / </span> : null}
					{item.href ? (
						<a href={item.href} className="hover:text-action-primary">
							{item.label}
						</a>
					) : (
						item.label
					)}
				</span>
			))}
		</nav>
	);
}

export function MarketingPageView({ page }: { page: MarketingPageDTO }) {
	return (
		<>
			<Section
				space="hero"
				className="border-b border-border bg-surface-raised"
			>
				<Container size="narrow">
					<Breadcrumbs items={page.breadcrumbs.items} />
					<p className="text-label font-bold uppercase tracking-wide-role text-action-primary">
						{page.eyebrow}
					</p>
					<h1 className="mt-4 text-display font-extrabold leading-display-tight tracking-display">
						{page.title}
					</h1>
					<p className="mt-5 max-w-3xl text-body-large leading-step-relaxed text-content-default">
						{page.lead}
					</p>
				</Container>
			</Section>
			<Section>
				<Container size="narrow" className="grid gap-6 md:grid-cols-2">
					{page.sections.map((section) => (
						<Card key={section.title} elevation="raised">
							<CardHeader>
								<CardTitle>{section.title}</CardTitle>
								<CardDescription>{section.text}</CardDescription>
							</CardHeader>
							{section.items?.length ? (
								<CardContent>
									<ul className="grid gap-2 text-body text-content-default">
										{section.items.map((item) => (
											<li key={item}>— {item}</li>
										))}
									</ul>
								</CardContent>
							) : null}
						</Card>
					))}
					{page.leadContext ? (
						<div className="md:col-span-2">
							<LeadFormView context={page.leadContext} />
						</div>
					) : null}
				</Container>
			</Section>
		</>
	);
}
