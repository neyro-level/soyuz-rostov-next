"use client";

import { ArrowRight } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";
import { RequestModalButton } from "../../components/shared/site-overlay-context";
import { Badge } from "../../components/ui/badge";
import { Button } from "../../components/ui/button";
import { Card } from "../../components/ui/card";
import type { SiteLinkRenderer } from "../../lib/adapters";

type InterestMode = "flat" | "country";
type CardSlot = { id: string; content: ReactNode };

type HomeInterestViewProps = {
	flatCards: CardSlot[];
	countryCards: CardSlot[];
	modeHrefs: Record<InterestMode, string>;
	chips: Array<{ label: string; href: string }>;
	linkRenderer: SiteLinkRenderer;
	scrollHint?: ReactNode;
	selectionCopy: Record<
		InterestMode,
		{
			title: ReactNode;
			subtitle: string;
			requestTitle: string;
			requestSubtitle: string;
			action: string;
		}
	>;
};

const MODE_LABELS: Record<InterestMode, string> = {
	flat: "Вторичная",
	country: "Загородная",
};

export function HomeInterestView({
	flatCards,
	countryCards,
	modeHrefs,
	chips,
	linkRenderer: LinkRenderer,
	scrollHint,
	selectionCopy,
}: HomeInterestViewProps) {
	const [mode, setMode] = useState<InterestMode>("flat");
	const visibleCards = useMemo(
		() => (mode === "flat" ? flatCards : countryCards).slice(0, 10),
		[countryCards, flatCards, mode],
	);
	const desktopPrimary = visibleCards.slice(0, 4);
	const desktopSecondary = visibleCards.slice(4, 7);
	return (
		<section
			id="section-home-interest"
			className="home-interest"
			aria-labelledby="home-interest-title"
		>
			<div className="home-shell">
				<div className="home-interest__head">
					<LinkRenderer
						href={modeHrefs[mode]}
						className="home-interest__title-link"
					>
						<h2 id="home-interest-title">Вас может заинтересовать</h2>
						<ArrowRight className="size-5" aria-hidden />
					</LinkRenderer>
					<div
						className="home-interest__tabs"
						role="tablist"
						aria-label="Подборки объектов"
					>
						{(Object.keys(MODE_LABELS) as InterestMode[]).map((item) => (
							<Button
								key={item}
								type="button"
								variant="ghost"
								role="tab"
								aria-selected={mode === item}
								className="home-interest__tab"
								onClick={() => setMode(item)}
							>
								{MODE_LABELS[item]}
							</Button>
						))}
					</div>
				</div>
				<nav className="home-interest__chips" aria-label="Быстрые подборки">
					{chips.map((chip) => (
						<Badge
							key={chip.label}
							asChild
							variant="secondary"
							className="home-interest__chip"
						>
							<LinkRenderer href={chip.href}>{chip.label}</LinkRenderer>
						</Badge>
					))}
				</nav>
				{visibleCards.length ? (
					<>
						<div className="home-carousel-shell">
							<div
								id="home-interest-track"
								className="home-interest__track home-interest__track--mobile"
							>
								<div className="home-interest__grid home-interest__grid--carousel">
									{visibleCards.map((card) => (
										<div key={card.id} className="home-snap-card">
											{card.content}
										</div>
									))}
								</div>
							</div>
							{scrollHint}
						</div>
						<div className="home-interest__grid home-interest__grid--desktop">
							{desktopPrimary.map((card) => (
								<div key={card.id}>{card.content}</div>
							))}
							<HomeInterestSelectionCard
								mode={mode}
								copy={selectionCopy[mode]}
							/>
							{desktopSecondary.map((card) => (
								<div key={card.id}>{card.content}</div>
							))}
						</div>
					</>
				) : (
					<div className="home-interest__empty">
						Сейчас подходящие объекты подбираются вручную. Оставьте заявку, и
						специалист агентства недвижимости соберет варианты под ваш запрос и
						бюджет.
					</div>
				)}
			</div>
		</section>
	);
}

function HomeInterestSelectionCard({
	mode,
	copy,
}: {
	mode: InterestMode;
	copy: HomeInterestViewProps["selectionCopy"][InterestMode];
}) {
	return (
		<Card className="home-interest__selection-card">
			<h3>{copy.title}</h3>
			<p>{copy.subtitle}</p>
			<RequestModalButton
				type="button"
				request={{
					title: copy.requestTitle,
					subtitle: copy.requestSubtitle,
					source: `home-interest:${mode}:selection-card`,
					formType: `home_interest_${mode}_selection`,
				}}
			>
				{copy.action}
			</RequestModalButton>
		</Card>
	);
}
