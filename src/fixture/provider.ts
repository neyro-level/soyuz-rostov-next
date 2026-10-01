import type {
	HomePageDTO,
	LeadFormContext,
	MarketingPageDTO,
	PageSEOContract,
	PropertyCardDTO,
	PropertyDetailsDTO,
	PropertyFilterDTO,
	PropertyListDTO,
	SiteFooterDTO,
	SiteHeaderDTO,
} from "@ams/realtbase-contracts";
import { siteConfig } from "../project/site.config.ts";
import { siteProfile } from "../project/site-profile.ts";
import { createProjectUrlGrammar } from "../project/url-grammar.ts";
import { fixtureNap } from "./site-settings.ts";

const brandName = fixtureNap.brandName;
const urlGrammar = createProjectUrlGrammar(siteProfile);
const logo = {
	kind: "managed" as const,
	src: "/fixture/logo.svg",
	alt: brandName,
	width: 160,
	height: 40,
};

const navigation = [
	{ label: "Недвижимость", href: "/kvartiry/" },
	{ label: "Услуги", href: "/uslugi/" },
	{ label: "Ипотека", href: "/ipoteka/" },
	{ label: "О компании", href: "/o-kompanii/" },
	{ label: "Контакты", href: "/kontakty/" },
] as const;

export const fixtureHeader: SiteHeaderDTO = {
	brandName,
	homeHref: "/",
	logo,
	navigation,
	phone: { label: "+7 (000) 000-00-00", href: "tel:+70000000000" },
	primaryAction: { label: "Подобрать объект", href: "/kvartiry/" },
};

export const fixtureFooter: SiteFooterDTO = {
	brandName,
	logo,
	groups: [
		{ title: "Недвижимость", links: navigation.slice(0, 3) },
		{
			title: "Услуги",
			links: [
				{ label: "Продать", href: "/prodat/" },
				{ label: "Сдать", href: "/sdat/" },
			],
		},
		{ title: "Компания", links: navigation.slice(3) },
	],
	contacts: [
		{ label: "+7 (000) 000-00-00", href: "tel:+70000000000" },
		{ label: "hello@example.test", href: "mailto:hello@example.test" },
	],
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
	copyright: `© ${brandName}`,
};

const propertySeed = [
	{
		id: "fixture-property-1",
		publicUrlId: 1001,
		slug: "svetlaya-kvartira-v-centre",
		title: "Светлая квартира в центре",
		price: 890_000_000,
		address: "Демо-город, Центральный район",
		summary: [
			{ key: "rooms" as const, label: "Комнаты", value: "2" },
			{ key: "area" as const, label: "Площадь", value: "58,4 м²" },
			{ key: "floor" as const, label: "Этаж", value: "5 из 12" },
		],
	},
	{
		id: "fixture-property-2",
		publicUrlId: 1002,
		slug: "semeinaya-kvartira-s-vidom",
		title: "Семейная квартира с видом",
		price: 1_240_000_000,
		address: "Демо-город, Новый квартал",
		summary: [
			{ key: "rooms" as const, label: "Комнаты", value: "3" },
			{ key: "area" as const, label: "Площадь", value: "82 м²" },
			{ key: "floor" as const, label: "Этаж", value: "9 из 16" },
		],
	},
	{
		id: "fixture-property-3",
		publicUrlId: 1003,
		slug: "kvartira-dlya-spokoinoi-zhizni",
		title: "Квартира для спокойной жизни",
		price: 675_000_000,
		address: "Демо-город, Парковый район",
		summary: [
			{ key: "rooms" as const, label: "Комнаты", value: "1" },
			{ key: "area" as const, label: "Площадь", value: "41 м²" },
			{ key: "floor" as const, label: "Этаж", value: "3 из 9" },
		],
	},
] as const;

export const fixtureProperties: readonly PropertyCardDTO[] = propertySeed.map(
	(item) => ({
		pageKey: {
			kind: "property",
			category: "kvartiry",
			semantic: item.slug,
			publicUrlId: item.publicUrlId,
		},
		id: item.id,
		slug: item.slug,
		publicUrlId: item.publicUrlId,
		href: urlGrammar.buildUrl({
			kind: "property",
			category: "kvartiry",
			semantic: item.slug,
			publicUrlId: item.publicUrlId,
		}),
		title: item.title,
		category: "apartment",
		dealType: "sale",
		price: {
			priceMinor: item.price,
			currency: siteConfig.currency,
			period: "total",
			label: new Intl.NumberFormat(siteConfig.locale, {
				style: "currency",
				currency: siteConfig.currency,
				maximumFractionDigits: 0,
			}).format(item.price / 100),
		},
		address: item.address,
		city: "Демо-город",
		district: item.address.split(", ")[1],
		primaryMedia: null,
		summary: item.summary,
		badges: [],
		categoryDetails: {
			category: "apartment",
			rooms: Number(item.summary[0]?.value),
		},
	}),
);

export const fixtureFilters: PropertyFilterDTO = {
	categories: [{ value: "apartment", label: "Квартиры" }],
	dealTypes: [{ value: "sale", label: "Продажа" }],
	cities: [{ value: "demo-city", label: "Демо-город" }],
	districts: [
		{ value: "central", label: "Центральный", parentValue: "demo-city" },
		{ value: "park", label: "Парковый", parentValue: "demo-city" },
	],
	rooms: [1, 2, 3],
	priceMinor: { min: 675_000_000, max: 1_240_000_000 },
	buildingTypes: [],
	renovations: [],
	landUseTypes: [],
	commercialTypes: [],
	commercialBuildingTypes: [],
	entranceTypes: [],
	applied: { sort: "recommended", view: "grid" },
	total: fixtureProperties.length,
	resultLabel: "3 объекта",
};

export const fixturePropertyList: PropertyListDTO = {
	items: fixtureProperties,
	total: fixtureProperties.length,
	page: 1,
	pageSize: 12,
	totalPages: 1,
	appliedFilters: fixtureFilters.applied,
};

const pageSeo = (
	title: string,
	description: string,
	canonicalPath: string,
): PageSEOContract => ({
	title: `${title} — ${brandName}`,
	description,
	canonicalPath:
		canonicalPath === "/" ? "/" : `${canonicalPath.replace(/\/+$/, "")}/`,
	indexing: "noindex",
	following: "nofollow",
});

const leadContext = (
	formKind: LeadFormContext["formKind"],
	sourcePage: string,
): LeadFormContext => ({
	formKind,
	sourcePage,
	consentVersion: "fixture-consent-v1",
	consentHref: "/soglasie-na-obrabotku-personalnyh-dannyh/",
	consentRequired: true,
});

export const fixtureHome: HomePageDTO = {
	slug: "home",
	eyebrow: "Недвижимость без лишней неопределённости",
	title: "Проверенная недвижимость в Демо-городе",
	lead: "Подбираем объекты по вашим критериям и сопровождаем путь до сделки.",
	seo: pageSeo(
		"Недвижимость",
		"Подбор недвижимости и сопровождение сделки.",
		"/",
	),
	breadcrumbs: { items: [{ label: "Главная" }] },
	sections: [
		{
			title: "Понятный процесс",
			text: "Сначала фиксируем задачу, затем сравниваем подходящие предложения.",
			items: [
				"Уточняем задачу и бюджет",
				"Проверяем документы",
				"Сопровождаем сделку",
			],
		},
	],
	leadContext: leadContext("general", "/"),
	featuredPropertyId: fixtureProperties[0]?.id ?? "",
	serviceLinks: [
		{
			label: "Купить",
			href: "/kvartiry/",
			description: "Квартиры из актуального каталога",
		},
		{
			label: "Продать",
			href: "/prodat/",
			description: "Оценка и план продажи",
		},
		{
			label: "Сдать",
			href: "/sdat/",
			description: "Поиск арендатора и сопровождение",
		},
		{
			label: "Ипотека",
			href: "/ipoteka/",
			description: "Подбор сценария финансирования",
		},
	],
};

const marketingPages = [
	{
		slug: "uslugi",
		eyebrow: "Услуги",
		title: "Помогаем решить задачу с недвижимостью",
		lead: "Подбор, продажа, аренда и сопровождение сделки в одном понятном процессе.",
		sections: [
			{
				title: "Покупка",
				text: "Собираем требования и показываем подходящие варианты.",
			},
			{
				title: "Продажа",
				text: "Готовим объект, позиционирование и переговорный план.",
			},
			{
				title: "Аренда",
				text: "Помогаем найти арендатора и зафиксировать условия.",
			},
		],
	},
	{
		slug: "o-kompanii",
		eyebrow: "О компании",
		title: "Ответственность за результат на каждом этапе",
		lead: "Строим работу вокруг интересов клиента, прозрачных решений и проверяемых документов.",
		sections: [
			{
				title: "Наш принцип",
				text: "Не торопим с решением и объясняем последствия каждого шага.",
			},
			{
				title: "Наш процесс",
				text: "У задачи есть ответственный специалист, план и контрольные точки.",
			},
		],
	},
	{
		slug: "ipoteka",
		eyebrow: "Ипотека",
		title: "Ипотечный сценарий под вашу задачу",
		lead: "Сравниваем условия и заранее проверяем, подходит ли объект под выбранную программу.",
		sections: [
			{
				title: "С чего начинаем",
				text: "Фиксируем бюджет, первый взнос и комфортный платёж.",
			},
			{
				title: "Что проверяем",
				text: "Условия банка, требования к заёмщику и ограничения по объекту.",
			},
		],
		formKind: "mortgage" as const,
	},
	{
		slug: "prodat",
		eyebrow: "Продажа недвижимости",
		title: "Продать объект спокойно и по понятному плану",
		lead: "Оценим ситуацию, подготовим позиционирование и возьмём на себя коммуникации.",
		sections: [
			{
				title: "Подготовка",
				text: "Проверяем документы и определяем сильные стороны объекта.",
			},
			{
				title: "Продвижение",
				text: "Готовим материалы и выводим предложение на рынок.",
			},
			{
				title: "Сделка",
				text: "Организуем показы, переговоры и безопасные расчёты.",
			},
		],
		formKind: "sell" as const,
	},
	{
		slug: "sdat",
		eyebrow: "Аренда",
		title: "Сдать недвижимость надёжному арендатору",
		lead: "Поможем определить условия, провести показы и оформить договорённости.",
		sections: [
			{
				title: "Условия",
				text: "Фиксируем требования, стоимость и правила использования объекта.",
			},
			{
				title: "Отбор",
				text: "Проводим показы и собираем необходимую информацию.",
			},
			{
				title: "Договор",
				text: "Закрепляем условия и порядок передачи объекта.",
			},
		],
		formKind: "rent" as const,
	},
	{
		slug: "kontakty",
		eyebrow: "Контакты",
		title: "Обсудим вашу задачу",
		lead: "Fixture-контакты не используются для реальных обращений и будут заменены в проекте клиента.",
		sections: [
			{ title: "Телефон", text: "+7 (000) 000-00-00" },
			{ title: "Электронная почта", text: "hello@example.test" },
			{ title: "Адрес", text: "Демо-город, демонстрационный адрес" },
		],
	},
] as const;

export const fixtureMarketingPages: readonly MarketingPageDTO[] =
	marketingPages.map((page) => ({
		slug: page.slug,
		eyebrow: page.eyebrow,
		title: page.title,
		lead: page.lead,
		seo: pageSeo(page.title, page.lead, `/${page.slug}`),
		breadcrumbs: {
			items: [{ label: "Главная", href: "/" }, { label: page.eyebrow }],
		},
		sections: page.sections,
		leadContext:
			"formKind" in page
				? leadContext(page.formKind, `/${page.slug}`)
				: undefined,
	}));

export const fixtureLegalPages: readonly MarketingPageDTO[] = [
	{
		slug: "politika-konfidencialnosti",
		eyebrow: "Правовая информация",
		title: "Политика конфиденциальности",
		lead: "Демонстрационная структура документа. Юридический текст утверждается владельцем проекта.",
		seo: pageSeo(
			"Политика конфиденциальности",
			"Правила обработки информации.",
			"/politika-konfidencialnosti",
		),
		breadcrumbs: {
			items: [
				{ label: "Главная", href: "/" },
				{ label: "Политика конфиденциальности" },
			],
		},
		sections: [
			{
				title: "Общие положения",
				text: "TODO: заменить на утверждённую редакцию до production.",
			},
			{
				title: "Обращения",
				text: "Контакт для обращений задаётся в конфигурации проекта.",
			},
		],
	},
	{
		slug: "soglasie-na-obrabotku-personalnyh-dannyh",
		eyebrow: "Правовая информация",
		title: "Согласие на обработку персональных данных",
		lead: "Fixture-версия показывает обязательный маршрут и связь формы с версией согласия.",
		seo: pageSeo(
			"Согласие на обработку данных",
			"Условия обработки персональных данных.",
			"/soglasie-na-obrabotku-personalnyh-dannyh",
		),
		breadcrumbs: {
			items: [
				{ label: "Главная", href: "/" },
				{ label: "Согласие на обработку данных" },
			],
		},
		sections: [
			{ title: "Версия", text: "fixture-consent-v1" },
			{
				title: "Условия",
				text: "TODO: заменить на утверждённую редакцию до production.",
			},
		],
	},
];

export async function getFixtureShell() {
	return { header: fixtureHeader, footer: fixtureFooter } as const;
}

export async function getFixtureCatalog() {
	return { list: fixturePropertyList, filters: fixtureFilters } as const;
}

export async function getFixtureProperty(
	slug: string,
): Promise<PropertyDetailsDTO | null> {
	const property = fixtureProperties.find((item) => item.slug === slug);
	if (!property) return null;
	return {
		...property,
		description:
			"Демонстрационный объект. Все характеристики получены из fixture provider без Payload.",
		gallery: [],
		characteristics: property.summary.map(({ label, value }) => ({
			label,
			value,
		})),
		related: fixtureProperties
			.filter((item) => item.id !== property.id)
			.slice(0, 2),
	};
}

export async function getFixtureMarketingPage(slug: string) {
	return (
		[...fixtureMarketingPages, ...fixtureLegalPages].find(
			(page) => page.slug === slug,
		) ?? null
	);
}
