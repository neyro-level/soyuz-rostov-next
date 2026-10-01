import { ArrowUpRight, ChevronDown } from "lucide-react";
import {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from "../../components/ui/accordion";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { Card } from "../../components/ui/card";
import type { LegalDocumentDTO } from "../../view-models/content";
import type { SiteLinkRenderer } from "../../lib/adapters";

type LegalHubViewProps = {
	documents: readonly LegalDocumentDTO[];
	linkRenderer: SiteLinkRenderer;
	homeHref: string;
};

export function LegalHubView({
	documents,
	linkRenderer: LinkRenderer,
	homeHref,
}: LegalHubViewProps) {
	return (
		<main className="min-h-[var(--viewport-content-below-header)] bg-[var(--legal-hub-surface-primary)] px-4 py-8 text-[var(--legal-hub-content-primary)] sm:px-6 md:py-14 lg:py-16">
			<Card className="mx-auto max-w-285 overflow-hidden rounded-lg border-[var(--legal-hub-border-primary)] bg-[var(--surface-card)] px-5 py-7 shadow-[var(--legal-hub-shadow-primary)] sm:px-7 sm:py-9 md:px-10 md:py-11">
				<Breadcrumb className="mb-5 text-[var(--text-muted)]">
					<BreadcrumbList className="flex-nowrap gap-x-2 overflow-x-auto py-0.5 text-body leading-step-body">
						<BreadcrumbItem>
							<BreadcrumbLink
								asChild
								className="shrink-0 whitespace-nowrap font-medium leading-step-body transition hover:text-[var(--accent)]"
							>
								<LinkRenderer href={homeHref}>Главная</LinkRenderer>
							</BreadcrumbLink>
						</BreadcrumbItem>
						<BreadcrumbSeparator className="size-3.5 shrink-0 self-center text-[var(--legal-hub-content-secondary)]" />
						<BreadcrumbItem>
							<BreadcrumbPage className="min-w-0 truncate font-semibold leading-step-body text-[var(--text-primary)]">
								Правовая информация
							</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<h1 className="text-section-prominent font-semibold leading-tight-copy text-[var(--legal-hub-content-tertiary)] md:text-display-base">
					Правовая информация
				</h1>

				<Accordion
					type="multiple"
					className="mt-8 border-t border-[var(--legal-hub-border-secondary)] md:mt-10"
				>
					{documents.map((document) => (
						<AccordionItem
							key={document.id}
							value={document.slug}
							className="group border-[var(--legal-hub-border-secondary)]"
						>
							<AccordionTrigger
								className="min-h-18 py-5 text-body-compact font-medium leading-step-copy text-[var(--legal-hub-content-subtle)] hover:text-[var(--legal-hub-content-subtle)] md:min-h-20.5 md:py-6 md:text-body-large"
								trailing={
									<span className="flex size-9 shrink-0 items-center justify-center rounded-lg text-[var(--legal-hub-content-muted)] transition group-hover:bg-[var(--legal-hub-surface-secondary)] group-hover:text-[var(--accent)]">
										<ChevronDown
											className="size-[18px] transition duration-200 group-data-[state=open]/accordion:rotate-180"
											aria-hidden
										/>
									</span>
								}
							>
								{document.shortTitle}
							</AccordionTrigger>
							<AccordionContent
								forceMount
								className="pb-7 pr-0 md:pb-8 md:pr-16"
							>
								<p className="max-w-190 text-body font-normal leading-step-copy text-[var(--legal-hub-content-strong)] md:text-body-compact">
									{document.description}
								</p>
								<div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
									<LinkRenderer
										href={`/${document.slug}`}
										className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[var(--legal-hub-surface-tertiary)] px-4 text-body font-semibold text-white transition hover:bg-[var(--legal-hub-surface-subtle)]"
									>
										Открыть документ
										<ArrowUpRight className="size-4" aria-hidden />
									</LinkRenderer>
									<span className="text-label font-normal text-[var(--legal-hub-content-inverse)]">
										Редакция от {document.updatedAt}
									</span>
								</div>
							</AccordionContent>
						</AccordionItem>
					))}
				</Accordion>
			</Card>
		</main>
	);
}
