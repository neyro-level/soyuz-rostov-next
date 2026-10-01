import { CalendarDays, Mail } from "lucide-react";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "../../components/ui/breadcrumb";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import { Separator } from "../../components/ui/separator";
import type { LegalDocumentDTO } from "../../view-models/content";
import type { SiteLinkRenderer } from "../../lib/adapters";

type LegalDocumentViewProps = {
	document: LegalDocumentDTO;
	legalName: string;
	email: string;
	linkRenderer: SiteLinkRenderer;
	homeHref: string;
	legalHubHref: string;
};

export function LegalDocumentView({
	document,
	legalName,
	email,
	linkRenderer: LinkRenderer,
	homeHref,
	legalHubHref,
}: LegalDocumentViewProps) {
	return (
		<main className="bg-[var(--legal-document-surface-primary)] text-[var(--legal-document-content-primary)]">
			<header className="border-b border-[var(--legal-document-border-primary)] bg-[var(--surface-card)]">
				<div className="mx-auto max-w-295 px-5 py-8 md:px-8 md:py-10">
					<Breadcrumb className="text-[var(--text-muted)]">
						<BreadcrumbList className="flex-nowrap gap-x-2 overflow-x-auto py-0.5 text-body leading-step-body">
							<BreadcrumbItem>
								<BreadcrumbLink
									asChild
									className="shrink-0 whitespace-nowrap font-medium leading-step-body transition hover:text-[var(--accent)]"
								>
									<LinkRenderer href={homeHref}>Главная</LinkRenderer>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="size-3.5 shrink-0 self-center text-[var(--legal-document-content-secondary)]" />
							<BreadcrumbItem>
								<BreadcrumbLink
									asChild
									className="shrink-0 whitespace-nowrap font-medium leading-step-body transition hover:text-[var(--accent)]"
								>
									<LinkRenderer href={legalHubHref}>Правовая информация</LinkRenderer>
								</BreadcrumbLink>
							</BreadcrumbItem>
							<BreadcrumbSeparator className="size-3.5 shrink-0 self-center text-[var(--legal-document-content-secondary)]" />
							<BreadcrumbItem>
								<BreadcrumbPage className="min-w-0 truncate font-semibold leading-step-body text-[var(--text-primary)]">
									{document.shortTitle}
								</BreadcrumbPage>
							</BreadcrumbItem>
						</BreadcrumbList>
					</Breadcrumb>
					<h1 className="mt-5 max-w-225 text-heading-large font-extrabold leading-heading-tight text-[var(--text-primary)] md:text-display-medium">
						{document.title}
					</h1>
					<p className="mt-4 max-w-190 text-body-compact leading-step-copy text-[var(--legal-document-content-tertiary)] md:text-body-large md:leading-step-relaxed">
						{document.description}
					</p>
					<div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-label font-semibold text-[var(--legal-document-content-subtle)]">
						<span className="inline-flex items-center gap-2">
							<CalendarDays className="size-4" aria-hidden />
							Редакция от {document.updatedAt}
						</span>
						<span>Версия {document.version}</span>
					</div>
				</div>
			</header>

			<div className="mx-auto grid max-w-295 gap-6 px-5 py-8 md:px-8 md:py-12 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
				<Card
					className="rounded-lg border-[var(--legal-document-border-primary)] bg-[var(--surface-card)] p-4 lg:sticky lg:top-[126px]"
					aria-label="Содержание документа"
				>
					<p className="px-2 pb-3 text-label font-extrabold uppercase text-[var(--legal-document-content-muted)]">
						Содержание
					</p>
					<nav className="grid gap-1">
						{document.sections.map((section, index) => (
							<a
								key={section.title}
								href={`#section-${index + 1}`}
								className="block rounded-md px-2 py-2 text-body leading-step-body text-[var(--legal-document-content-strong)] transition hover:bg-[var(--legal-document-surface-primary)] hover:text-[var(--accent)]"
							>
								{section.title}
							</a>
						))}
					</nav>
				</Card>

				<Card className="overflow-hidden rounded-lg border-[var(--legal-document-border-primary)] bg-[var(--surface-card)] px-5 md:px-8">
					{document.sections.map((section, index) => (
						<section
							id={`section-${index + 1}`}
							key={section.title}
							className="scroll-mt-32 pt-7 last:pb-7 md:pt-9 md:last:pb-9"
						>
							<h2 className="text-heading-small font-extrabold leading-tight-copy text-[var(--legal-document-content-inverse)] md:text-section-small">
								{section.title}
							</h2>
							{section.paragraphs?.length ? (
								<div className="mt-4 grid gap-3 text-body-compact leading-body-relaxed text-[var(--legal-document-content-strong)] md:text-body-large">
									{section.paragraphs.map((paragraph) => (
										<p key={paragraph}>{paragraph}</p>
									))}
								</div>
							) : null}
							{section.items?.length ? (
								<ul className="mt-4 grid gap-2.5 text-body-compact leading-content text-[var(--legal-document-content-strong)] md:text-body-large">
									{section.items.map((item) => (
										<li
											key={item}
											className="grid grid-cols-[8px_minmax(0,1fr)] gap-3"
										>
											<span
												className="mt-2.25 size-1.5 rounded-full bg-[var(--accent)]"
												aria-hidden
											/>
											<span>{item}</span>
										</li>
									))}
								</ul>
							) : null}
							{index < document.sections.length - 1 ? (
								<Separator className="mt-7 bg-[var(--legal-document-surface-secondary)] md:mt-9" />
							) : null}
						</section>
					))}
				</Card>
			</div>

			<section className="border-t border-[var(--legal-document-border-primary)] bg-[var(--surface-card)]">
				<div className="mx-auto flex max-w-295 flex-col gap-3 px-5 py-7 text-body text-[var(--legal-document-content-hover)] md:flex-row md:items-center md:justify-between md:px-8">
					<p>{legalName}</p>
					<Button asChild variant="link" className="min-h-11 gap-2 px-0">
						<a href={`mailto:${email}`}>
							<Mail aria-hidden />
							{email}
						</a>
					</Button>
				</div>
			</section>
		</main>
	);
}
