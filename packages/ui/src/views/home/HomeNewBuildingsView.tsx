import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { Section } from "../../components/ui/layout";
import type { SiteLinkRenderer } from "../../lib/adapters";

type HomeNewBuildingsViewProps = {
	titleHref: string;
	cards: Array<{ id: string; content: ReactNode }>;
	desktopSelection: ReactNode;
	mobileSelection: ReactNode;
	scrollHint?: ReactNode;
	linkRenderer: SiteLinkRenderer;
	cityGenitive: string;
};

export function HomeNewBuildingsView({
	titleHref,
	cards,
	desktopSelection,
	mobileSelection,
	scrollHint,
	linkRenderer: LinkRenderer,
	cityGenitive,
}: HomeNewBuildingsViewProps) {
	return (
		<Section
			id="section-home-new-buildings"
			className="home-new-buildings py-0"
			aria-labelledby="home-new-buildings-title"
		>
			<div className="home-shell">
				<div className="home-new-buildings__head">
					<LinkRenderer
						href={titleHref}
						className="home-new-buildings__title-link"
					>
						<h2 id="home-new-buildings-title">Новостройки {cityGenitive}</h2>
						<ArrowRight className="size-5" aria-hidden />
					</LinkRenderer>
				</div>
				<div className="home-carousel-shell">
					<div
						id="home-new-buildings-track"
						className="home-new-buildings__track"
					>
						<div className="home-new-buildings__grid">
							{cards.map((card) => (
								<div key={card.id} className="home-snap-card">
									{card.content}
								</div>
							))}
							<div className="home-new-buildings__selection home-new-buildings__selection--desktop">
								{desktopSelection}
							</div>
						</div>
					</div>
					{scrollHint}
				</div>
				<div className="home-new-buildings__selection home-new-buildings__selection--mobile">
					{mobileSelection}
				</div>
			</div>
		</Section>
	);
}
