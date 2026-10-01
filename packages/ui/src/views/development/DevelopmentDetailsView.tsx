import type {
	DevelopmentDetailsDTO,
	LeadFormContext,
} from "@ams/realtbase-contracts";
import { Badge } from "../../components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Container, Section, SectionHeader } from "../../components/ui/layout";
import { StarterPropertyMediaGallery } from "../property/StarterPropertyMediaGallery";
import {
	analyticsAttributes,
	type PublicAnalyticsDimensions,
} from "../shared/analytics-attributes";
import { BreadcrumbsView } from "../shared/BreadcrumbsView";
import {
	developmentPricesForPresentation,
	developmentSalesEnded,
} from "./development-presentation";
import { PriceRequestFormView } from "./PriceRequestFormView";

export type DevelopmentPresentationContent = {
	layouts?: readonly { name: string; area: string; priceLabel?: string }[];
	progress?: { label: string; description?: string; checkedAt?: string };
	faq?: readonly { question: string; answer: string }[];
};

export function DevelopmentDetailsView({
	development,
	leadContext,
	content = {},
	analytics,
	priceReferenceDate,
}: {
	development: DevelopmentDetailsDTO;
	leadContext: LeadFormContext;
	content?: DevelopmentPresentationContent;
	analytics?: PublicAnalyticsDimensions;
	priceReferenceDate?: string;
}) {
	const salesEnded = developmentSalesEnded(development);
	const prices = developmentPricesForPresentation(
		development,
		priceReferenceDate ?? Date.now(),
	);
	return (
		<div {...analyticsAttributes("development_view", analytics)}>
			<Section space="hero">
				<Container>
					<BreadcrumbsView breadcrumbs={development.breadcrumbs} />
					<nav aria-label="Разделы проекта" className="mt-6">
						<ul className="flex flex-wrap gap-3">
							<li>
								<a
									className="font-medium underline underline-offset-4"
									href="#development-prices"
								>
									Цены
								</a>
							</li>
							{content.layouts?.length ? (
								<li>
									<a
										className="font-medium underline underline-offset-4"
										href="#development-layouts"
									>
										Планировки
									</a>
								</li>
							) : null}
							{content.progress ? (
								<li>
									<a
										className="font-medium underline underline-offset-4"
										href="#development-progress"
									>
										Ход строительства
									</a>
								</li>
							) : null}
							{content.faq?.length ? (
								<li>
									<a
										className="font-medium underline underline-offset-4"
										href="#development-faq"
									>
										Вопросы и ответы
									</a>
								</li>
							) : null}
						</ul>
					</nav>
					<div className="mt-6 grid gap-8 lg:grid-cols-[1.4fr_0.6fr]">
						<div>
							<div className="relative aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)] bg-surface-subtle">
								<StarterPropertyMediaGallery
									images={development.gallery}
									title={development.name}
								/>
							</div>
							<h1 className="mt-8 text-display-small font-extrabold leading-heading">
								{development.name}
							</h1>
							<p className="mt-3 text-body-large text-content-default">
								{development.address ?? development.cityName}
							</p>
							{salesEnded ? (
								<p
									className="mt-4 rounded-md border border-border bg-surface-subtle p-4 font-semibold"
									role="status"
								>
									Продажи в этом проекте завершены.
								</p>
							) : null}
							{development.description ? (
								<p className="mt-6 text-body-large text-content-default">
									{development.description}
								</p>
							) : null}
						</div>
						<aside id="development-prices" aria-label="Цены и наличие">
							<Card elevation="raised">
								<CardHeader>
									<h2 className="text-lead font-semibold leading-tight-copy">
										Предложения
									</h2>
								</CardHeader>
								<CardContent className="space-y-4">
									{prices.length ? (
										prices.map((row) => (
											<div
												key={`${row.roomsLabel}-${row.priceCheckedAt}`}
												className="border-b border-border pb-3"
											>
												<p className="text-label text-content-default">
													{row.roomsLabel}
												</p>
												<p className="mt-1 font-semibold">
													{row.priceFrom.label}
												</p>
											</div>
										))
									) : (
										<p className="text-body text-content-default">
											Актуальную стоимость уточнит специалист.
										</p>
									)}
									{development.completionLabel ? (
										<Badge variant="outline">
											{development.completionLabel}
										</Badge>
									) : null}
								</CardContent>
							</Card>
						</aside>
					</div>
				</Container>
			</Section>
			<Section
				className="bg-surface-subtle"
				aria-labelledby="development-details-title"
			>
				<Container>
					<SectionHeader
						titleId="development-details-title"
						title="О проекте"
					/>
					<dl className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{development.characteristics.map((item) => (
							<div
								key={item.label}
								className="rounded-md bg-surface-raised p-4"
							>
								<dt className="text-label text-content-default">
									{item.label}
								</dt>
								<dd className="mt-1 font-semibold">{item.value}</dd>
							</div>
						))}
					</dl>
				</Container>
			</Section>
			{content.layouts?.length ? (
				<Section
					id="development-layouts"
					aria-labelledby="development-layouts-title"
				>
					<Container>
						<SectionHeader
							titleId="development-layouts-title"
							title="Планировки"
						/>
						<div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
							{content.layouts.map((layout) => (
								<Card key={`${layout.name}-${layout.area}`}>
									<CardHeader>
										<CardTitle>{layout.name}</CardTitle>
									</CardHeader>
									<CardContent>
										<p>{layout.area}</p>
										{layout.priceLabel ? (
											<p className="mt-2 font-semibold">{layout.priceLabel}</p>
										) : null}
									</CardContent>
								</Card>
							))}
						</div>
					</Container>
				</Section>
			) : null}
			{content.progress ? (
				<Section
					id="development-progress"
					className="bg-surface-subtle"
					aria-labelledby="development-progress-title"
				>
					<Container>
						<SectionHeader
							titleId="development-progress-title"
							title="Ход строительства"
							description={content.progress.description}
						/>
						<p className="mt-6 font-semibold">{content.progress.label}</p>
						{content.progress.checkedAt ? (
							<p className="mt-2 text-label text-content-default">
								Проверено: {content.progress.checkedAt}
							</p>
						) : null}
					</Container>
				</Section>
			) : null}
			{content.faq?.length ? (
				<Section id="development-faq" aria-labelledby="development-faq-title">
					<Container size="narrow">
						<SectionHeader
							titleId="development-faq-title"
							title="Вопросы и ответы"
						/>
						<div className="mt-6 divide-y divide-border">
							{content.faq.map((item) => (
								<details key={item.question} className="py-4">
									<summary className="cursor-pointer font-semibold">
										{item.question}
									</summary>
									<p className="mt-3 text-content-default">{item.answer}</p>
								</details>
							))}
						</div>
					</Container>
				</Section>
			) : null}
			<Section className="bg-surface-subtle">
				<Container size="narrow">
					<PriceRequestFormView
						leadContext={leadContext}
						developmentSlug={development.slug}
						geo={analytics?.geo}
						analytics={analytics}
					/>
				</Container>
			</Section>
		</div>
	);
}
