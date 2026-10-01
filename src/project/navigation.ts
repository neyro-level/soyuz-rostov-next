import type {
	BreadcrumbDTO,
	CityDTO,
	PageKeyDTO,
	PageLinkDTO,
	SiteNavItemDTO,
} from "@ams/realtbase-contracts";
import {
	createSafeNavigationBuilder,
	type NavigationCandidate,
} from "../core/navigation/index.ts";
import type { CatalogSurfaceSlug, SiteProfile } from "../core/profile/index.ts";
import type { PageKey, UrlGrammar } from "../core/routing/index.ts";
import type { ContentGateDecision } from "../core/seo/content-gate.ts";
import type { PublicPageRecord } from "./data-access/public/pages.ts";
import { projectSeoRegistrySeed } from "./seo/registry-seed.ts";
import { siteProfile } from "./site-profile.ts";
import { createProjectUrlGrammar } from "./url-grammar.ts";

type NavigationContext = { profile?: SiteProfile; grammar?: UrlGrammar };

function context(input: NavigationContext = {}) {
	const profile = input.profile ?? siteProfile;
	const grammar = input.grammar ?? createProjectUrlGrammar(profile);
	return {
		profile,
		grammar,
		navigation: createSafeNavigationBuilder({ profile, grammar }),
	};
}

const categoryLabels = {
	kvartiry: "Квартиры",
	doma: "Дома",
	uchastki: "Участки",
	"kommercheskaya-nedvizhimost": "Коммерческая недвижимость",
	komnaty: "Комнаты",
	garazhi: "Гаражи",
	arenda: "Аренда",
	novostroyki: "Новостройки",
	"kottedzhnye-poselki": "Коттеджные посёлки",
} as const;

type ObjectBreadcrumbInput = {
	category: CatalogSurfaceSlug;
	city?: { label: string; slug?: string };
	currentLabel: string;
};

const staticPageLabels: Readonly<Record<string, string>> = {
	"/uslugi/": "Услуги",
	"/ipoteka/": "Ипотека",
	"/o-kompanii/": "О компании",
	"/prodat/": "Продать",
	"/sdat/": "Сдать",
	"/kontakty/": "Контакты",
};

function passingGate(
	pageKey: PageKey,
	profile: SiteProfile,
	grammar: UrlGrammar,
): ContentGateDecision {
	if ("geo" in pageKey && !profile.geos[pageKey.geo]) {
		return {
			statusCode: 404,
			indexing: "noindex",
			following: "follow",
			canonical: "/",
			includeInSitemap: false,
			reasons: ["project_navigation_unknown_geo"],
		};
	}
	const canonical = grammar.buildUrl(pageKey);
	return {
		statusCode: 200,
		indexing: "index",
		following: "follow",
		canonical,
		includeInSitemap: true,
		reasons: ["project_navigation_candidate"],
	};
}

function candidate(
	pageKey: PageKeyDTO,
	label: string,
	profile: SiteProfile,
	grammar: UrlGrammar,
): NavigationCandidate {
	const key = pageKey as PageKey;
	return { pageKey: key, label, gate: passingGate(key, profile, grammar) };
}

export function projectNavigationLinks(
	items: readonly { pageKey: PageKeyDTO; label: string; count?: number }[],
	input: NavigationContext = {},
): readonly PageLinkDTO[] {
	const { navigation, profile, grammar } = context(input);
	return navigation.links(
		items.map((item) => ({
			...candidate(item.pageKey, item.label, profile, grammar),
			count: item.count,
		})),
	);
}

export function projectBreadcrumbs(
	ancestors: readonly { pageKey: PageKeyDTO; label: string }[],
	currentLabel: string,
	input: NavigationContext = {},
): BreadcrumbDTO {
	const { navigation, profile, grammar } = context(input);
	return navigation.breadcrumbs({
		ancestors: ancestors.map((item) =>
			candidate(item.pageKey, item.label, profile, grammar),
		),
		currentLabel,
	});
}

export function projectObjectBreadcrumbs(
	input: ObjectBreadcrumbInput,
	contextInput: NavigationContext = {},
): BreadcrumbDTO {
	const ancestors: { pageKey: PageKeyDTO; label: string }[] = [
		{ pageKey: { kind: "home" }, label: "Главная" },
		{
			pageKey: { kind: "categoryRoot", category: input.category },
			label: categoryLabels[input.category],
		},
	];
	if (input.city?.slug) {
		ancestors.push({
			pageKey: { kind: "geoHub", geo: input.city.slug },
			label: input.city.label,
		});
	}
	const breadcrumbs = projectBreadcrumbs(
		ancestors,
		input.currentLabel,
		contextInput,
	);
	if (!input.city || input.city.slug) return breadcrumbs;
	return {
		items: [
			...breadcrumbs.items.slice(0, -1),
			{ label: input.city.label },
			...breadcrumbs.items.slice(-1),
		],
	};
}

export function projectGeoSwitcherOptions(
	cities: readonly CityDTO[],
	input: NavigationContext = {},
): readonly PageLinkDTO[] {
	const profile = input.profile ?? siteProfile;
	if (profile.geoMode === "SINGLE_GEO") return [];
	return projectNavigationLinks(
		cities.map((city) => ({
			pageKey: { kind: "geoHub", geo: city.slug },
			label: city.name,
		})),
		input,
	);
}

export function projectMenuLinks(
	pages: readonly PublicPageRecord[],
	input: NavigationContext = {},
): readonly SiteNavItemDTO[] {
	const profile = input.profile ?? siteProfile;
	const pageTitle = new Map(
		pages.map((page) => [
			`/${page.slug.replace(/^\/+|\/+$/g, "")}/`,
			page.title,
		]),
	);
	const registeredCategoryRoots = new Set<string>(
		projectSeoRegistrySeed.flatMap((row) =>
			row.pageKey.kind === "categoryRoot" ? [row.pageKey.category] : [],
		),
	);
	const categories = Object.keys(profile.categoryStatus)
		.filter((category) => registeredCategoryRoots.has(category))
		.map((category) => ({
			pageKey: { kind: "categoryRoot", category } as PageKeyDTO,
			label: categoryLabels[category as keyof typeof categoryLabels],
		}));
	const staticPages = profile.staticRoutes
		.filter((route) => route.path !== "/" && route.indexable)
		.map((route) => {
			const path = `${route.path.replace(/\/$/, "")}/` as `/${string}/`;
			return {
				pageKey: { kind: "static", path } as PageKeyDTO,
				label:
					pageTitle.get(path) ??
					staticPageLabels[path] ??
					path.split("/").filter(Boolean).join(" "),
			};
		});
	return projectNavigationLinks([...categories, ...staticPages], input)
		.slice(0, 6)
		.map(({ label, href }) => ({ label, href }));
}
