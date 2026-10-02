import type {
	LeadFormContext,
	PropertyDetailsDTO,
} from "@ams/realtbase-contracts";
import {
	DeveloperView,
	DevelopmentDetailsView,
	GeoHubView,
	GeoSwitcherView,
	ListingView,
	PropertyPageView,
} from "@ams/realtbase-ui";
import {
	fixtureDeveloper,
	fixtureDevelopment,
	fixtureGeoHub,
	fixtureGeoSwitcherOptions,
	fixtureListing,
} from "./geo-catalog";
import { fixtureProperties } from "./provider";

export type P817FixtureScenario =
	| "listing"
	| "geo"
	| "development"
	| "developer"
	| "property";

const leadContext: LeadFormContext = {
	formKind: "general",
	sourcePage: fixtureDevelopment.href,
	consentVersion: "fixture-consent-v1",
	consentHref: "/soglasie-na-obrabotku-personalnyh-dannyh/",
	consentRequired: true,
};

const property = fixtureProperties[0];
if (!property) throw new Error("P8-17 fixture requires one property");
const propertyDetails: PropertyDetailsDTO = {
	...property,
	description:
		"Демонстрационный объект для проверки category-aware представления.",
	gallery: [],
	characteristics: property.summary.map(({ label, value }) => ({
		label,
		value,
	})),
	related: fixtureProperties.slice(1),
};

export function P817FixtureView({
	scenario,
}: {
	scenario: P817FixtureScenario;
}) {
	if (scenario === "geo") return <GeoHubView hub={fixtureGeoHub} />;
	if (scenario === "development")
		return (
			<DevelopmentDetailsView
				development={fixtureDevelopment}
				leadContext={leadContext}
				content={{
					layouts: [
						{
							name: "2-комнатная",
							area: "58 м²",
							priceLabel: "от 9 000 000 ₽",
						},
					],
					progress: {
						label: "Дом сдан",
						description: "Демонстрационный статус",
					},
					faq: [
						{
							question: "Как узнать наличие?",
							answer:
								"Отправьте запрос цены — специалист уточнит актуальные варианты.",
						},
					],
				}}
			/>
		);
	if (scenario === "developer")
		return (
			<DeveloperView
				developer={fixtureDeveloper}
				developments={[fixtureDevelopment]}
			/>
		);
	if (scenario === "property")
		return (
			<PropertyPageView
				property={{
					...propertyDetails,
					breadcrumbs: {
						items: [
							{ label: "Главная", href: "/" },
							{ label: "Квартиры", href: "/kvartiry/" },
							{ label: property.title },
						],
					},
				}}
				leadContext={{
					...leadContext,
					formKind: "property",
					sourcePage: property.href,
					property: {
						id: property.id,
						slug: property.slug,
						title: property.title,
					},
				}}
			/>
		);
	return (
		<>
			<div className="border-b border-border bg-surface-raised py-4">
				<div className="mx-auto max-w-[var(--container-site-max)] px-[var(--container-gutter-mobile)] md:px-[var(--container-gutter-tablet)] lg:px-[var(--container-gutter-desktop)]">
					<GeoSwitcherView
						mode="MULTI_GEO"
						activeGeo="primorsk"
						options={fixtureGeoSwitcherOptions}
					/>
				</div>
			</div>
			<ListingView
				listing={{
					...fixtureListing,
					items: [
						...fixtureListing.items,
						{ kind: "development", item: fixtureDevelopment },
						{ kind: "developer", item: fixtureDeveloper },
					],
				}}
			/>
		</>
	);
}
