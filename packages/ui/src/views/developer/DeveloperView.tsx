import type {
	DeveloperDetailsDTO,
	DevelopmentCardDTO,
} from "@ams/realtbase-contracts";
import { Container, Section, SectionHeader } from "../../components/ui/layout";
import { Button } from "../../components/ui/button";
import { BreadcrumbsView } from "../shared/BreadcrumbsView";
import { DevelopmentCardView } from "../development/DevelopmentCardView";

export function DeveloperView({
	developer,
	developments,
	total = developments.length,
	page = 1,
	totalPages = 1,
	pageHref,
}: {
	developer: DeveloperDetailsDTO;
	developments: readonly DevelopmentCardDTO[];
	total?: number;
	page?: number;
	totalPages?: number;
	pageHref?: (page: number) => string;
}) {
	return (
		<>
			<Section space="hero">
				<Container size="narrow">
					<BreadcrumbsView breadcrumbs={developer.breadcrumbs} />
					<h1 className="mt-6 text-display font-extrabold tracking-display">
						{developer.name}
					</h1>
					{developer.legalName ? (
						<p className="mt-3 text-label text-content-default">
							{developer.legalName}
						</p>
					) : null}
					{developer.description ? (
						<p className="mt-6 text-body-large text-content-default">
							{developer.description}
						</p>
					) : null}
					{developer.website ? (
						<a
							className="mt-6 inline-block font-semibold underline underline-offset-4"
							href={developer.website}
							rel="noreferrer"
						>
							Сайт застройщика
						</a>
					) : null}
				</Container>
			</Section>
			<Section
				className="bg-surface-subtle"
				aria-labelledby="developer-projects-title"
			>
				<Container>
					<SectionHeader
						titleId="developer-projects-title"
						title="Проекты застройщика"
						description={`Опубликовано: ${total}`}
					/>
					{developments.length ? (
						<div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
							{developments.map((development) => (
								<DevelopmentCardView
									key={development.id}
									development={development}
								/>
							))}
						</div>
					) : (
						<p className="mt-8 text-body-large text-content-default">
							Опубликованных проектов пока нет.
						</p>
					)}
					{totalPages > 1 ? (
						<nav
							aria-label="Страницы проектов застройщика"
							className="mt-8 flex items-center justify-center gap-3"
						>
							{page > 1 && pageHref ? (
								<Button asChild variant="outline">
									<a href={pageHref(page - 1)}>Назад</a>
								</Button>
							) : (
								<Button variant="outline" disabled>
									Назад
								</Button>
							)}
							<span aria-current="page">
								{page} из {totalPages}
							</span>
							{page < totalPages && pageHref ? (
								<Button asChild variant="outline">
									<a href={pageHref(page + 1)}>Вперёд</a>
								</Button>
							) : (
								<Button variant="outline" disabled>
									Вперёд
								</Button>
							)}
						</nav>
					) : null}
				</Container>
			</Section>
		</>
	);
}
