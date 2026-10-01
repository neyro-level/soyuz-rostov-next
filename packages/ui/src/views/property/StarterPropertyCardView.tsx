import type { PropertyCardDTO } from "@ams/realtbase-contracts";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from "../../components/ui/card";
import { StarterFeedImage } from "../../lib/starter-image";
import { MediaFallback } from "../starter/MediaFallback";

export function StarterPropertyCard({
	property,
	headingLevel = "h3",
	priority = false,
}: {
	property: PropertyCardDTO;
	headingLevel?: "h2" | "h3";
	priority?: boolean;
}) {
	const heading = (
		<a href={property.href} className="group-hover:text-action-primary">
			{property.title}
		</a>
	);
	return (
		<Card
			elevation="raised"
			className="group overflow-hidden transition-transform hover:-translate-y-1"
		>
			<a
				href={property.href}
				className="relative block aspect-[3/2] bg-surface-subtle"
			>
				<span className="sr-only">Открыть объект: {property.title}</span>
				{property.primaryMedia?.src ? (
					<StarterFeedImage
						src={property.primaryMedia.src}
						alt={property.primaryMedia.alt || property.title}
						width={900}
						height={600}
						sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
						priority={priority}
						className="h-full w-full object-cover"
					/>
				) : (
					<MediaFallback className="absolute inset-0" />
				)}
			</a>
			<CardHeader>
				<div className="flex flex-wrap gap-2">
					{property.badges.map((badge) => (
						<Badge key={badge}>{badge}</Badge>
					))}
				</div>
				{headingLevel === "h2" ? (
					<h2 className="text-lead font-semibold leading-tight-copy">
						{heading}
					</h2>
				) : (
					<CardTitle>{heading}</CardTitle>
				)}
				<CardDescription>{property.address}</CardDescription>
			</CardHeader>
			<CardContent>
				<p className="text-lead font-extrabold">
					{property.price?.label ?? "Цена по запросу"}
				</p>
				<dl className="mt-4 grid grid-cols-2 gap-3 text-label">
					{property.summary.map((item) => (
						<div key={item.key}>
							<dt className="text-content-default">{item.label}</dt>
							<dd className="mt-1 font-semibold">{item.value}</dd>
						</div>
					))}
				</dl>
			</CardContent>
			<CardFooter>
				<Button asChild variant="outline">
					<a href={property.href}>Подробнее</a>
				</Button>
			</CardFooter>
		</Card>
	);
}
