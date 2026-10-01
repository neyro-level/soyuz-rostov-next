import type {
	CityDTO,
	DeveloperDetailsDTO,
	DevelopmentDetailsDTO,
	DistrictDTO,
	GeoHubDTO,
	ListingPageDTO,
	PageKeyDTO,
	PageLinkDTO,
	RegionDTO,
	SeoMetaDTO,
} from "@ams/realtbase-contracts";
import {
	createSafeNavigationBuilder,
	type NavigationCandidate,
} from "../core/navigation/index.ts";
import type { ContentGateDecision } from "../core/seo/content-gate.ts";
import { starterFixtureDataset } from "../project/fixture-data/starter-dataset.ts";
import { createProjectUrlGrammar } from "../project/url-grammar.ts";
import { fixtureProperties } from "./provider.ts";
import { fixtureDistrictRouteRegistry } from "./route-registries.ts";
import { siteProfileFixtures } from "./site-profile.ts";

const grammar = createProjectUrlGrammar(
	siteProfileFixtures.multiGeo,
	fixtureDistrictRouteRegistry,
);
const navigation = createSafeNavigationBuilder({
	profile: siteProfileFixtures.multiGeo,
	grammar,
});

function href(pageKey: PageKeyDTO): string {
	return grammar.buildUrl(pageKey);
}

function gate(
	pageKey: PageKeyDTO,
	indexing: "index" | "noindex" = "index",
): ContentGateDecision {
	return {
		statusCode: 200,
		indexing,
		following: "follow",
		canonical: href(pageKey),
		includeInSitemap: indexing === "index",
		reasons: indexing === "index" ? [] : ["fixture_noindex"],
	};
}

function candidate(
	pageKey: PageKeyDTO,
	label: string,
	count?: number,
	indexing: "index" | "noindex" = "index",
): NavigationCandidate {
	return { pageKey, label, count, gate: gate(pageKey, indexing) };
}

function links(
	candidates: readonly NavigationCandidate[],
): readonly PageLinkDTO[] {
	return navigation.links(candidates);
}

function link(pageKey: PageKeyDTO, label: string, count?: number): PageLinkDTO {
	const result = links([candidate(pageKey, label, count)])[0];
	if (!result) throw new Error(`Fixture link is not safe: ${label}`);
	return result;
}

function seo(
	title: string,
	description: string,
	pageKey: PageKeyDTO,
): SeoMetaDTO {
	return {
		title,
		description,
		canonicalPath: href(pageKey),
		indexing: "noindex",
		following: "follow",
	};
}

const canonicalCity = starterFixtureDataset.cities[0];
const canonicalDistrict = canonicalCity.districts[0];
const canonicalDeveloper = starterFixtureDataset.developers[0];
const canonicalDevelopment = starterFixtureDataset.developments[0];

export const fixtureRegion = {
	id: "region-fixture-1",
	slug: starterFixtureDataset.region.slug,
	name: starterFixtureDataset.region.title,
	shortName: starterFixtureDataset.region.shortName,
} satisfies RegionDTO;

export const fixtureCity = {
	id: "city-fixture-1",
	slug: canonicalCity.slug,
	name: canonicalCity.title,
	nameGenitive: canonicalCity.morphology.genitive,
	nameLocative: canonicalCity.morphology.prepositional,
	preposition: "в",
	type: "city",
	region: fixtureRegion,
	coordinates: { latitude: 43.1, longitude: 131.9 },
} satisfies CityDTO;

export const fixtureDistrict = {
	id: "district-fixture-1",
	slug: canonicalDistrict.slug,
	name: canonicalDistrict.title,
	type: "microdistrict",
	citySlug: fixtureCity.slug,
	nameLocative: canonicalDistrict.morphology.prepositional,
	preposition: "в",
} satisfies DistrictDTO;

const developerKey = {
	kind: "developer",
	slug: canonicalDeveloper.slug,
} as const;

export const fixtureDeveloper = {
	id: "developer-fixture-1",
	slug: canonicalDeveloper.slug,
	pageKey: developerKey,
	href: href(developerKey),
	name: canonicalDeveloper.name,
	developmentsCount: 1,
	geoNames: [fixtureCity.name],
	description: `Синтетическое описание ${canonicalDeveloper.name}.`,
	breadcrumbs: {
		...navigation.breadcrumbs({
			ancestors: [
				candidate({ kind: "home" }, "Главная"),
				candidate({ kind: "developerRoot" }, "Застройщики"),
			],
			currentLabel: canonicalDeveloper.name,
		}),
	},
	seo: seo(
		canonicalDeveloper.name,
		"Демонстрационная карточка застройщика.",
		developerKey,
	),
} satisfies DeveloperDetailsDTO;

const developmentKey = {
	kind: "development",
	developmentKind: "residential_complex",
	slug: canonicalDevelopment.slug,
} as const;

export const fixtureDevelopment = {
	id: "development-fixture-1",
	slug: canonicalDevelopment.slug,
	pageKey: developmentKey,
	href: href(developmentKey),
	name: canonicalDevelopment.name,
	kind: "residential_complex",
	cityName: fixtureCity.name,
	districtName: fixtureDistrict.name,
	address: canonicalDevelopment.address,
	developer: {
		id: fixtureDeveloper.id,
		name: fixtureDeveloper.name,
		pageKey: fixtureDeveloper.pageKey,
		href: fixtureDeveloper.href,
	},
	salesStatus: "on_sale",
	salesAvailability: "confirmed",
	completenessScore: 90,
	completionLabel: "Сдан",
	description: `Синтетическое описание ${canonicalDevelopment.name}.`,
	gallery: [],
	priceByRooms: [
		{
			roomsLabel: "Квартиры",
			priceFrom: {
				priceMinor: canonicalDevelopment.priceMinor,
				currency: "RUB",
				period: "total",
				label: "от 6 200 000 ₽",
			},
			priceCheckedAt: "2026-09-24T00:00:00.000Z",
		},
	],
	mediaItems: [],
	characteristics: [{ label: "Класс", value: "Комфорт" }],
	breadcrumbs: navigation.breadcrumbs({
		ancestors: [
			candidate({ kind: "home" }, "Главная"),
			candidate(
				{ kind: "categoryRoot", category: "novostroyki" },
				"Новостройки",
				undefined,
				"noindex",
			),
		],
		currentLabel: canonicalDevelopment.name,
	}),
	seo: seo(
		canonicalDevelopment.name,
		"Демонстрационная карточка жилого комплекса.",
		developmentKey,
	),
} satisfies DevelopmentDetailsDTO;

const geoHubKey = { kind: "geoHub", geo: fixtureCity.slug } as const;

export const fixtureGeoHub = {
	city: fixtureCity,
	title: "Недвижимость в Приморске",
	intro: "Демонстрационная географическая витрина каталога недвижимости.",
	breadcrumbs: navigation.breadcrumbs({
		ancestors: [candidate({ kind: "home" }, "Главная")],
		currentLabel: fixtureCity.name,
	}),
	seo: seo(
		"Недвижимость в Приморске",
		"Каталог недвижимости в Приморске.",
		geoHubKey,
	),
	categoryLinks: links([
		candidate(
			{ kind: "categoryGeo", geo: fixtureCity.slug, category: "kvartiry" },
			"Квартиры",
			3,
		),
	]),
	districtLinks: links([
		candidate(
			{
				kind: "categoryGeoDistrict",
				geo: fixtureCity.slug,
				category: "kvartiry",
				district: fixtureDistrict.slug,
			},
			fixtureDistrict.name,
			3,
			"noindex",
		),
	]),
	developerLink: link(
		{ kind: "geoDevelopers", geo: fixtureCity.slug },
		"Застройщики Приморска",
		1,
	),
	nearby: links([
		candidate(
			{ kind: "geoHub", geo: "zarechnyy" },
			"Заречный",
			undefined,
			"noindex",
		),
	]),
} satisfies GeoHubDTO;

const listingKey = {
	kind: "categoryGeo",
	geo: fixtureCity.slug,
	category: "kvartiry",
} as const;

export const fixtureListing = {
	pageKey: listingKey,
	href: href(listingKey),
	h1: "Квартиры в Приморске",
	intro:
		"Демонстрационная выдача квартир с проверяемой канонической навигацией.",
	items: fixtureProperties.map((item) => ({ kind: "property" as const, item })),
	total: fixtureProperties.length,
	pagination: { page: 1, pageSize: 12, totalPages: 1 },
	subLinks: links([
		candidate(
			{
				kind: "categoryGeoDistrict",
				geo: fixtureCity.slug,
				category: "kvartiry",
				district: fixtureDistrict.slug,
			},
			"Северный микрорайон",
			3,
			"noindex",
		),
	]),
	nearby: links([
		candidate(
			{ kind: "categoryGeo", geo: "zarechnyy", category: "kvartiry" },
			"Квартиры в Заречном",
			undefined,
			"noindex",
		),
	]),
	robots: { indexing: "noindex", following: "follow" },
	canonical: href(listingKey),
	breadcrumbs: fixtureGeoHub.breadcrumbs,
	seo: seo(
		"Квартиры в Приморске",
		"Демонстрационная выдача квартир в Приморске.",
		listingKey,
	),
} satisfies ListingPageDTO;

export const fixtureGeoSwitcherOptions = links([
	candidate({ kind: "geoHub", geo: "primorsk" }, "Приморск"),
	candidate(
		{ kind: "geoHub", geo: "zarechnyy" },
		"Заречный",
		undefined,
		"noindex",
	),
]);

export const geoCatalogContractFixtures = {
	region: fixtureRegion,
	city: fixtureCity,
	district: fixtureDistrict,
	geoHub: fixtureGeoHub,
	developer: fixtureDeveloper,
	development: fixtureDevelopment,
	listing: fixtureListing,
} as const;
