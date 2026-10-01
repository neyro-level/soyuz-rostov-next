import type { DevelopmentCardDTO } from "@ams/realtbase-contracts";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
} from "../../components/ui/card";
import { StarterFeedImage } from "../../lib/starter-image";
import { MediaFallback } from "../starter/MediaFallback";

const availabilityLabels = {
	in_inventory: "Есть в продаже",
	confirmed: "Наличие подтверждено",
	none: "Нет предложений",
} as const;

export function DevelopmentCardView({
	development,
	headingLevel = "h3",
}: {
	development: DevelopmentCardDTO;
	headingLevel?: "h2" | "h3";
}) {
	const Heading = headingLevel;
	return (
		<Card elevation="raised" className="group overflow-hidden">
			<a
				href={development.href}
				className="relative block aspect-[3/2] bg-surface-subtle"
			>
				<span className="sr-only">Открыть проект: {development.name}</span>
				{development.primaryMedia?.src ? (
					<StarterFeedImage
						src={development.primaryMedia.src}
						alt={development.primaryMedia.alt || development.name}
						className="h-full w-full object-cover"
						sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
					/>
				) : (
					<MediaFallback className="absolute inset-0 grid place-items-center bg-surface-subtle" />
				)}
			</a>
			<CardHeader>
				<div className="flex flex-wrap gap-2">
					<Badge>
						{development.kind === "residential_complex"
							? "Жилой комплекс"
							: "Коттеджный посёлок"}
					</Badge>
					<Badge variant="outline">
						{availabilityLabels[development.salesAvailability]}
					</Badge>
				</div>
				<Heading className="text-lead font-semibold leading-tight-copy">
					<a
						href={development.href}
						className="group-hover:text-action-primary"
					>
						{development.name}
					</a>
				</Heading>
				<p className="text-body text-content-default">
					{development.address ?? development.cityName}
				</p>
			</CardHeader>
			<CardContent className="space-y-2">
				<p className="text-lead font-extrabold">
					{development.priceFrom?.label ?? "Цена по запросу"}
				</p>
				{development.completionLabel ? (
					<p className="text-label text-content-default">
						{development.completionLabel}
					</p>
				) : null}
				{development.developer ? (
					<p className="text-label">
						Застройщик:{" "}
						<a
							className="underline underline-offset-4"
							href={development.developer.href}
						>
							{development.developer.name}
						</a>
					</p>
				) : null}
			</CardContent>
			<CardFooter>
				<Button asChild variant="outline">
					<a href={development.href}>Подробнее</a>
				</Button>
			</CardFooter>
		</Card>
	);
}
