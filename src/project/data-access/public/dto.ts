import "server-only";

import type {
	CityDTO,
	HomePageDTO,
	MarketingPageDTO,
	NapDTO,
	PropertyCardDTO,
	PropertyCategoryDetailsDTO,
	PropertyDetailsDTO,
	PropertyFilterDTO,
	PropertyListDTO,
	SiteFooterDTO,
	SiteHeaderDTO,
} from "@ams/realtbase-contracts";
import { evaluateContentGate } from "@/core/seo/content-gate";
import { leadConsentContext } from "@/project/legal.config";
import {
	projectBreadcrumbs,
	projectGeoSwitcherOptions,
	projectMenuLinks,
} from "@/project/navigation";
import {
	projectHomeSeoTemplateKey,
	projectSeoMeta,
} from "@/project/seo/templates";
import { siteConfig } from "@/project/site.config";
import { siteProfile } from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";
import type {
	PublicCatalogFacetsResult,
	PublicCatalogProperty,
	PublicCatalogResult,
} from "./catalog";
import type { PublicPageRecord } from "./pages";

const urlGrammar = createProjectUrlGrammar(siteProfile);

const propertySurfaceByCategory = {
	apartment: "kvartiry",
	house: "doma",
	land: "uchastki",
	commercial: "kommercheskaya-nedvizhimost",
	room: "komnaty",
	garage: "garazhi",
} as const;
function rub(priceMinor: number) {
	return new Intl.NumberFormat(siteConfig.locale, {
		style: "currency",
		currency: siteConfig.currency,
		maximumFractionDigits: 0,
	}).format(priceMinor / 100);
}

function compact<T>(items: (T | null | undefined | false)[]): T[] {
	return items.filter(Boolean) as T[];
}

export type PublicPropertyLifecycle = {
	status: "active" | "archived";
	isArchived: boolean;
};

export type PublicPropertyDetailsDTO = PropertyDetailsDTO & {
	lifecycle: PublicPropertyLifecycle;
};

export function toPropertyCardDTO(
	property: PublicCatalogProperty,
): PropertyCardDTO {
	if (!property.publicUrlId) {
		throw new Error(`Published property ${property.id} has no publicUrlId.`);
	}
	const pageKey = {
		kind: "property" as const,
		category: propertySurfaceByCategory[property.category],
		semantic: property.slug,
		publicUrlId: property.publicUrlId,
	};
	const address =
		property.publicAddress ||
		[property.locality, property.district].filter(Boolean).join(", ") ||
		"Адрес уточняется";

	return {
		id: String(property.id),
		slug: property.slug,
		publicUrlId: property.publicUrlId,
		pageKey,
		href: urlGrammar.buildUrl(pageKey),
		title: property.title,
		category: property.category,
		dealType: property.dealType,
		price: property.priceMinor
			? {
					priceMinor: property.priceMinor,
					pricePerMeterMinor: property.pricePerMeterMinor ?? undefined,
					currency: property.currency ?? siteConfig.currency,
					period: property.dealType === "rent" ? "month" : "total",
					label: rub(property.priceMinor),
				}
			: null,
		address,
		city: property.locality || "Город не указан",
		district: property.district ?? undefined,
		primaryMedia: property.images?.find((image) => image.url)?.url
			? {
					kind: "external",
					src: property.images.find((image) => image.url)?.url ?? "",
					alt:
						property.images.find((image) => image.url)?.alt || property.title,
				}
			: null,
		summary: compact([
			property.rooms
				? {
						key: "rooms" as const,
						label: "Комнаты",
						value: String(property.rooms),
					}
				: null,
			property.totalArea
				? {
						key: "area" as const,
						label: "Площадь",
						value: `${property.totalArea} м²`,
					}
				: null,
			property.floor
				? {
						key: "floor" as const,
						label: "Этаж",
						value: property.floors
							? `${property.floor} из ${property.floors}`
							: String(property.floor),
					}
				: null,
		]),
		badges: [],
		categoryDetails: toPropertyCategoryDetails(property),
	};
}

function toPropertyCategoryDetails(
	property: PublicCatalogProperty,
): PropertyCategoryDetailsDTO {
	switch (property.category) {
		case "apartment":
		case "room":
			return {
				category: property.category,
				rooms: property.rooms ?? undefined,
				totalArea: property.totalArea ?? undefined,
				livingArea: property.livingArea ?? undefined,
				kitchenArea: property.kitchenArea ?? undefined,
				floor: property.floor ?? undefined,
				floors: property.floors ?? undefined,
			};
		case "house":
			return {
				category: "house",
				totalArea: property.totalArea ?? undefined,
				floors: property.floors ?? undefined,
			};
		case "land":
			return { category: "land" };
		case "commercial":
			return {
				category: "commercial",
				totalArea: property.totalArea ?? undefined,
				floor: property.floor ?? undefined,
			};
		case "garage":
			return {
				category: "garage",
				totalArea: property.totalArea ?? undefined,
			};
	}
}

export function toPropertyDetailsDTO(
	property: PublicCatalogProperty,
	related: readonly PublicCatalogProperty[],
): PublicPropertyDetailsDTO {
	const card = toPropertyCardDTO(property);

	return {
		...card,
		description: property.description || "Описание объекта уточняется.",
		lifecycle: {
			status: property.status,
			isArchived: property.status === "archived",
		},
		gallery:
			property.images
				?.filter((image) => image.url)
				.map((image) => ({
					kind: "external" as const,
					src: image.url ?? "",
					alt: image.alt || property.title,
				})) ?? [],
		characteristics: compact([
			property.totalArea
				? { label: "Общая площадь", value: `${property.totalArea} м²` }
				: null,
			property.livingArea
				? { label: "Жилая площадь", value: `${property.livingArea} м²` }
				: null,
			property.kitchenArea
				? { label: "Кухня", value: `${property.kitchenArea} м²` }
				: null,
			property.rooms
				? { label: "Комнаты", value: String(property.rooms) }
				: null,
			property.floor
				? {
						label: "Этаж",
						value: property.floors
							? `${property.floor} из ${property.floors}`
							: String(property.floor),
					}
				: null,
		]),
		location:
			typeof property.lat === "number" && typeof property.lng === "number"
				? { latitude: property.lat, longitude: property.lng }
				: undefined,
		related: related.map(toPropertyCardDTO),
	};
}

export function toPropertyListDTO(
	result: PublicCatalogResult,
): PropertyListDTO {
	return {
		items: result.items.map(toPropertyCardDTO),
		total: result.total,
		page: result.page,
		pageSize: result.pageSize,
		totalPages: result.totalPages,
		appliedFilters: result.applied,
	};
}

const categoryLabels = {
	apartment: "Квартиры",
	house: "Дома",
	land: "Участки",
	commercial: "Коммерческая",
	room: "Комнаты",
	garage: "Гаражи",
} as const;

const dealTypeLabels = {
	sale: "Продажа",
	rent: "Аренда",
} as const;

export function toPropertyFilterDTO(
	result: PublicCatalogResult,
	facets?: PublicCatalogFacetsResult,
): PropertyFilterDTO {
	const rooms = facets
		? [...facets.rooms.map((bucket) => bucket.value)].sort((a, b) => a - b)
		: [
				...new Set(
					result.items
						.map((item) => item.rooms)
						.filter((room): room is number => Boolean(room)),
				),
			].sort((a, b) => a - b);
	const categories = facets
		? facets.categories.map((bucket) => bucket.value)
		: [...new Set(result.items.map((item) => item.category))];
	const dealTypes = facets
		? facets.dealTypes.map((bucket) => bucket.value)
		: [...new Set(result.items.map((item) => item.dealType))];
	const cities = facets
		? facets.cities.map((bucket) => bucket.value)
		: [
				...new Set(
					result.items
						.map((item) => item.locality)
						.filter((city): city is string => Boolean(city)),
				),
			];
	const districts = facets
		? facets.districts.map((bucket) => bucket.value)
		: [
				...new Set(
					result.items
						.map((item) => item.district)
						.filter((district): district is string => Boolean(district)),
				),
			];
	const priceMinor = facets
		? facets.priceMinor
		: {
				min: (() => {
					const prices = result.items
						.map((item) => item.priceMinor)
						.filter((price): price is number => Boolean(price));
					return prices.length ? Math.min(...prices) : null;
				})(),
				max: (() => {
					const prices = result.items
						.map((item) => item.priceMinor)
						.filter((price): price is number => Boolean(price));
					return prices.length ? Math.max(...prices) : null;
				})(),
			};

	return {
		categories: categories.flatMap((category) => {
			const label = categoryLabels[category as keyof typeof categoryLabels];
			return label
				? [{ value: category as keyof typeof categoryLabels, label }]
				: [];
		}),
		dealTypes: dealTypes.flatMap((dealType) => {
			const label = dealTypeLabels[dealType as keyof typeof dealTypeLabels];
			return label
				? [{ value: dealType as keyof typeof dealTypeLabels, label }]
				: [];
		}),
		cities: cities.map((city) => ({ value: city, label: city })),
		districts: districts.map((district) => ({
			value: district,
			label: district,
		})),
		rooms,
		priceMinor,
		buildingTypes: [],
		renovations: [],
		landUseTypes: [],
		commercialTypes: [],
		commercialBuildingTypes: [],
		entranceTypes: [],
		applied: result.applied,
		total: result.total,
		resultLabel: `${result.total} ${result.total === 1 ? "объект" : "объектов"}`,
	};
}

export function toShellDTO(
	pages: readonly PublicPageRecord[],
	nap: NapDTO,
	geoCities: readonly CityDTO[] = [],
) {
	const links = projectMenuLinks(pages);
	const geoOptions = projectGeoSwitcherOptions(geoCities);
	const shellBrandName = nap.brandName;
	const shellLogo = nap.logo ?? {
		kind: "managed" as const,
		src: "/fixture/logo.svg",
		alt: nap.brandName,
		width: 160,
		height: 40,
	};
	const phone = nap.phone;

	const header: SiteHeaderDTO = {
		brandName: shellBrandName,
		homeHref: "/",
		logo: shellLogo,
		navigation: links,
		phone,
		primaryAction: links[0]
			? { label: "Подобрать объект", href: links[0].href }
			: undefined,
	};

	const footer: SiteFooterDTO = {
		brandName: shellBrandName,
		logo: shellLogo,
		groups: [{ title: "Разделы", links }],
		contacts: compact([
			phone,
			nap.email,
			nap.address ? { label: nap.address, href: "/kontakty/" } : null,
			...nap.socialLinks,
		]),
		legalLinks: [
			{
				label: "Политика конфиденциальности",
				href: "/politika-konfidencialnosti/",
			},
			{
				label: "Согласие на обработку данных",
				href: "/soglasie-na-obrabotku-personalnyh-dannyh/",
			},
		],
		copyright: `© ${shellBrandName}`,
	};

	return {
		header,
		footer,
		geoSwitcher: {
			mode: siteProfile.geoMode,
			activeGeo: siteProfile.primaryGeo,
			options: geoOptions,
		},
	} as const;
}

export function toHomePageDTO(
	page: PublicPageRecord | null,
	brandName: string,
	city: CityDTO,
): HomePageDTO {
	const gate = evaluateContentGate(siteProfile, {
		kind: "static",
		url: "/",
		canonical: "/",
		profileStatus: siteProfile.staticRoutes.some(
			(route) => route.path === "/" && route.indexable,
		)
			? "ACTIVE"
			: "NOINDEX_AUTO",
	});
	const seo = projectSeoMeta(
		projectHomeSeoTemplateKey(siteProfile.geoMode),
		{
			brand: brandName,
			city: {
				approved: true,
				nominative: city.name,
				genitive: city.nameGenitive,
				prepositional: city.nameLocative,
				preposition: city.preposition,
			},
		},
		"/",
	);
	return {
		slug: "home",
		eyebrow: `Агентство недвижимости ${city.nameGenitive}`,
		title: page?.title || `${brandName} — недвижимость с понятным планом сделки`,
		lead:
			page?.seo.description ||
			"Помогаем выбрать квартиру, новостройку или сценарий продажи в Ростове-на-Дону: фиксируем задачу, проверяем варианты и ведём к безопасной сделке.",
		seo: {
			...seo,
			indexing: gate.indexing,
			following: gate.following,
		},
		breadcrumbs: projectBreadcrumbs([], "Главная"),
		sections: [
			{
				title: "Понятный процесс",
				text: "Сначала фиксируем задачу и ограничения, затем сравниваем подходящие маршруты: новостройка, вторичка, ипотека или продажа текущего объекта.",
				items: [
					"Фиксируем задачу, бюджет и сроки",
					"Проверяем объект, документы и условия сделки",
					"Сопровождаем переговоры и безопасное оформление",
				],
			},
		],
		leadContext: {
			formKind: "general",
			sourcePage: "/",
			...leadConsentContext(),
		},
		featuredPropertyId: "",
		serviceLinks: [
			{
				label: "Новостройки",
				href: "/rostov-na-donu/novostroyki/",
				description: "ЖК и квартиры от застройщиков Ростова-на-Дону",
			},
			{
				label: "Квартиры",
				href: "/rostov-na-donu/kvartiry/",
				description: "Вторичка и другие активные предложения каталога",
			},
			{
				label: "Застройщики",
				href: "/rostov-na-donu/zastroyshchiki/",
				description: "Раздел с застройщиками и их проектами",
			},
			{
				label: "Ипотека",
				href: "/ipoteka/",
				description: "Подбор программы под выбранный объект",
			},
			{
				label: "Продать",
				href: "/prodat/",
				description: "Оценка, подготовка и сопровождение продажи",
			},
		],
	};
}

export function toMarketingPageDTO(page: PublicPageRecord): MarketingPageDTO {
	return {
		slug: page.slug,
		eyebrow: "Страница",
		title: page.title,
		lead: page.seo.description,
		seo: page.seo,
		breadcrumbs: projectBreadcrumbs(
			[{ label: "Главная", pageKey: { kind: "home" } }],
			page.title,
		),
		sections: [],
		leadContext: {
			formKind: "general",
			sourcePage: page.seo.canonicalPath,
			...leadConsentContext(),
		},
	};
}
