import type { GeoHubDTO } from "@ams/realtbase-contracts";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { Container, Section, SectionHeader } from "../../components/ui/layout";
import { StarterFeedImage } from "../../lib/starter-image";
import { BreadcrumbsView } from "../shared/BreadcrumbsView";
import { NearbyView } from "./NearbyView";

export function GeoHubView({ hub }: { hub: GeoHubDTO }) {
	return (
		<>
			<Section
				space="hero"
				className="border-b border-border bg-surface-raised"
			>
				<Container>
					<BreadcrumbsView breadcrumbs={hub.breadcrumbs} />
					<div className="mt-6 grid items-center gap-8 lg:grid-cols-2">
						<div>
							<p className="text-label font-bold uppercase tracking-wide-role text-action-primary">
								{hub.city.region.shortName ?? hub.city.region.name}
							</p>
							<h1 className="mt-4 text-display font-extrabold tracking-display">
								{hub.title}
							</h1>
							<p className="mt-4 max-w-2xl text-body-large text-content-default">
								{hub.intro}
							</p>
						</div>
						{hub.image?.src ? (
							<div className="aspect-[16/9] overflow-hidden rounded-[var(--radius-lg)]">
								<StarterFeedImage
									src={hub.image.src}
									alt={hub.image.alt || hub.title}
									className="h-full w-full object-cover"
									priority
								/>
							</div>
						) : null}
					</div>
				</Container>
			</Section>
			<Section aria-labelledby="geo-categories-title">
				<Container>
					<SectionHeader
						titleId="geo-categories-title"
						title="Выберите тип недвижимости"
					/>
					<div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
						{hub.categoryLinks.map((link) => (
							<Card key={link.href}>
								<CardHeader>
									<CardTitle>
										<a className="hover:text-action-primary" href={link.href}>
											{link.label}
										</a>
									</CardTitle>
								</CardHeader>
								<CardContent>
									{link.count === undefined ? (
										<p className="text-content-default">Смотреть предложения</p>
									) : (
										<p className="text-content-default">
											Объектов: {link.count}
										</p>
									)}
								</CardContent>
							</Card>
						))}
					</div>
				</Container>
			</Section>
			{hub.districtLinks.length ? (
				<Section
					className="bg-surface-subtle"
					aria-labelledby="geo-districts-title"
				>
					<Container>
						<SectionHeader titleId="geo-districts-title" title="Районы" />
						<ul className="mt-6 flex flex-wrap gap-3">
							{hub.districtLinks.map((link) => (
								<li key={link.href}>
									<Button asChild variant="outline">
										<a href={link.href}>
											{link.label}
											{link.count === undefined ? "" : ` · ${link.count}`}
										</a>
									</Button>
								</li>
							))}
						</ul>
					</Container>
				</Section>
			) : null}
			{hub.developerLink ? (
				<Section space="md">
					<Container>
						<Card elevation="raised">
							<CardHeader>
								<CardTitle>Новостройки и застройщики</CardTitle>
							</CardHeader>
							<CardContent>
								<Button asChild>
									<a href={hub.developerLink.href}>{hub.developerLink.label}</a>
								</Button>
							</CardContent>
						</Card>
					</Container>
				</Section>
			) : null}
			<NearbyView links={hub.nearby} />
		</>
	);
}
