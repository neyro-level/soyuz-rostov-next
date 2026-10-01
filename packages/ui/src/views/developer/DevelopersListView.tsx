import type { BreadcrumbDTO, DeveloperCardDTO } from "@ams/realtbase-contracts";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Container, Section, SectionHeader } from "../../components/ui/layout";
import { StarterFeedImage } from "../../lib/starter-image";
import { BreadcrumbsView } from "../shared/BreadcrumbsView";

export function DevelopersListView({
	developers,
	title = "Застройщики",
	description,
	headingLevel = "h1",
	breadcrumbs,
}: {
	developers: readonly DeveloperCardDTO[];
	title?: string;
	description?: string;
	headingLevel?: "h1" | "h2";
	breadcrumbs?: BreadcrumbDTO;
}) {
	return (
		<Section aria-labelledby="developers-title">
			<Container>
				{breadcrumbs ? <BreadcrumbsView breadcrumbs={breadcrumbs} /> : null}
				{headingLevel === "h1" ? (
					<header className="max-w-3xl">
						<h1
							id="developers-title"
							className="text-display font-extrabold tracking-display"
						>
							{title}
						</h1>
						{description ? (
							<p className="mt-3 text-body-large text-content-default">
								{description}
							</p>
						) : null}
					</header>
				) : (
					<SectionHeader
						titleId="developers-title"
						title={title}
						description={description}
					/>
				)}
				{developers.length ? (
					<div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{developers.map((developer) => (
							<Card key={developer.id} elevation="raised">
								<CardHeader>
									{developer.logo?.src ? (
										<StarterFeedImage
											src={developer.logo.src}
											alt={developer.logo.alt || developer.name}
											className="mb-4 h-14 w-auto object-contain object-left"
										/>
									) : null}
									<CardTitle>
										<a
											className="hover:text-action-primary"
											href={developer.href}
										>
											{developer.name}
										</a>
									</CardTitle>
								</CardHeader>
								<CardContent>
									<p className="text-body text-content-default">
										Проектов: {developer.developmentsCount}
									</p>
									<p className="mt-2 text-label text-content-default">
										{developer.geoNames.join(", ")}
									</p>
								</CardContent>
								<CardFooter>
									<Button asChild variant="outline">
										<a href={developer.href}>Смотреть проекты</a>
									</Button>
								</CardFooter>
							</Card>
						))}
					</div>
				) : (
					<p className="mt-8 text-body-large text-content-default">
						Опубликованных застройщиков пока нет.
					</p>
				)}
			</Container>
		</Section>
	);
}
