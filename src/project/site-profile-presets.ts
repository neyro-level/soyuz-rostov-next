import {
	catalogSurfaceSlugs,
	isConfiguredRouteAvailable,
	type SitePreset,
	sitePresets,
	siteProfileSchema,
} from "../core/profile/index.ts";
import type { ProjectSiteProfileConfig } from "./site-profile.config.types.ts";
import { validateProjectLegacyRouteTargets } from "./url-grammar.ts";

export const presetCatalogSurfaces = catalogSurfaceSlugs;
export const supportedSitePresets = sitePresets;

const defaultFilterKeys: ProjectSiteProfileConfig["filterKeys"] = {
	kvartiry: ["rooms", "district", "price", "area", "market"],
	doma: ["district", "price", "area"],
	uchastki: ["district", "price", "area"],
	"kommercheskaya-nedvizhimost": ["district", "price", "area"],
	komnaty: ["rooms", "district", "price"],
	garazhi: ["district", "price"],
	arenda: ["rooms", "district", "price"],
	novostroyki: ["district", "developer", "completionYear"],
	"kottedzhnye-poselki": ["district", "developer"],
};

const defaultStaticRoutes: ProjectSiteProfileConfig["staticRoutes"] = [
	{ path: "/", changeFrequency: "daily", priority: 1, indexable: true },
	{
		path: "/uslugi",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{
		path: "/o-kompanii",
		changeFrequency: "monthly",
		priority: 0.6,
		indexable: true,
	},
	{
		path: "/ipoteka",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{
		path: "/prodat",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{ path: "/sdat", changeFrequency: "weekly", priority: 0.7, indexable: true },
	{
		path: "/kontakty",
		changeFrequency: "monthly",
		priority: 0.6,
		indexable: true,
	},
	{
		path: "/politika-konfidencialnosti",
		changeFrequency: "yearly",
		priority: 0.2,
		indexable: false,
	},
	{
		path: "/soglasie-na-obrabotku-personalnyh-dannyh",
		changeFrequency: "yearly",
		priority: 0.2,
		indexable: false,
	},
];

const defaultLegacyRoutes: ProjectSiteProfileConfig["legacyRoutes"] = [
	{ from: "/nedvizhimost", to: "/kvartiry/", statusCode: 301 },
];

const defaultLegacyPatterns: ProjectSiteProfileConfig["legacyPatterns"] = [
	{ kind: "property", from: "/obekty/{slug}", statusCode: 301 },
];

const defaultModules: ProjectSiteProfileConfig["modules"] = {
	novostroyki: { state: "prepared", reservedRoots: ["komplex"] },
	journal: { state: "disabled", reservedRoots: ["journal"] },
	agents: { state: "disabled", reservedRoots: ["sotrudniki"] },
};

function surfaceStatuses(
	preset: SitePreset,
): ProjectSiteProfileConfig["categoryStatus"] {
	return Object.fromEntries(
		catalogSurfaceSlugs.map((surface) => {
			if (preset === "NEWBUILD_FIRST") {
				return [
					surface,
					surface === "novostroyki" || surface === "kottedzhnye-poselki"
						? "ACTIVE"
						: "NOINDEX_AUTO",
				];
			}
			if (preset === "SECONDARY_FIRST") {
				return [
					surface,
					surface === "novostroyki" || surface === "kottedzhnye-poselki"
						? "PREPARED_OFF"
						: "ACTIVE",
				];
			}
			return [surface, "ACTIVE"];
		}),
	) as ProjectSiteProfileConfig["categoryStatus"];
}

function inactiveSurfaceStatuses(): ProjectSiteProfileConfig["categoryStatus"] {
	return Object.fromEntries(
		catalogSurfaceSlugs.map((surface) => [surface, "PREPARED_OFF"]),
	) as ProjectSiteProfileConfig["categoryStatus"];
}

type PresetOverrides = Partial<
	Pick<
		ProjectSiteProfileConfig,
		| "categoryStatus"
		| "marketCapability"
		| "geoCategoryStatus"
		| "marketStatus"
		| "developersSurface"
		| "searchConsole"
		| "seoFacets"
		| "filterKeys"
		| "seoTiers"
		| "gate"
		| "staticRoutes"
		| "legacyRoutes"
		| "legacyPatterns"
	>
>;

export type PresetSiteProfileInput = {
	projectKind: "starter-demo" | "client";
	preset: SitePreset;
	geoMode: ProjectSiteProfileConfig["geoMode"];
	primaryGeo: string;
	geos: ProjectSiteProfileConfig["geos"];
} & PresetOverrides;

export function createPresetSiteProfileConfig(
	input: PresetSiteProfileInput,
): ProjectSiteProfileConfig {
	if (input.projectKind === "client") {
		for (const field of ["seoFacets", "seoTiers", "staticRoutes"] as const) {
			if (input[field] === undefined) {
				throw new Error(`Client preset requires explicit ${field}.`);
			}
		}
	}
	const defaultCategoryStatus = surfaceStatuses(input.preset);
	const categoryStatus = input.categoryStatus ?? defaultCategoryStatus;
	const defaultMarketCapability = {
		newbuild: input.preset === "SECONDARY_FIRST" ? "PREPARED_OFF" : "ACTIVE",
		secondary: input.preset === "NEWBUILD_FIRST" ? "NOINDEX_AUTO" : "ACTIVE",
	} as const;
	const inactiveMarkets = {
		newbuild: "PREPARED_OFF",
		secondary: "PREPARED_OFF",
	} as const;
	const defaultGeoCategoryStatus = Object.fromEntries(
		Object.entries(input.geos).map(([geo, definition]) => [
			geo,
			isConfiguredRouteAvailable({ status: definition.hubStatus, inventory: 1 })
				? { ...defaultCategoryStatus }
				: inactiveSurfaceStatuses(),
		]),
	) as ProjectSiteProfileConfig["geoCategoryStatus"];
	const defaultMarketStatus = Object.fromEntries(
		Object.entries(input.geos).map(([geo, definition]) => [
			geo,
			isConfiguredRouteAvailable({ status: definition.hubStatus, inventory: 1 })
				? { ...defaultMarketCapability }
				: { ...inactiveMarkets },
		]),
	) as ProjectSiteProfileConfig["marketStatus"];
	const developersByGeo = Object.fromEntries(
		Object.entries(input.geos).map(([geo, definition]) => [
			geo,
			!isConfiguredRouteAvailable({
				status: definition.hubStatus,
				inventory: 1,
			})
				? "PREPARED_OFF"
				: input.preset === "SECONDARY_FIRST"
					? "NOINDEX_AUTO"
					: "ACTIVE",
		]),
	) as ProjectSiteProfileConfig["developersSurface"]["byGeo"];

	const profile = siteProfileSchema.parse({
		preset: input.preset,
		geoMode: input.geoMode,
		primaryGeo: input.primaryGeo,
		geos: input.geos,
		categoryStatus,
		marketCapability: input.marketCapability ?? defaultMarketCapability,
		geoCategoryStatus: {
			...defaultGeoCategoryStatus,
			...input.geoCategoryStatus,
		},
		marketStatus: { ...defaultMarketStatus, ...input.marketStatus },
		developersSurface: input.developersSurface ?? {
			root: input.preset === "SECONDARY_FIRST" ? "NOINDEX_AUTO" : "ACTIVE",
			byGeo: developersByGeo,
		},
		searchConsole: input.searchConsole ?? { yandex: null, google: null },
		filterKeys: input.filterKeys ?? defaultFilterKeys,
		seoFacets: input.seoFacets ?? {},
		seoTiers: input.seoTiers ?? {
			metric: "searchDemand",
			snapshotDate: "2026-09-24",
			bands: { P1: 100, P2: 50, TEST: 0 },
			minInventory: { P1: 5, P2: 5, TEST: 10 },
			unmeasuredPolicy: "TEST",
		},
		gate: input.gate ?? {
			listingIntroMinChars: 600,
			propertyPhotosMin: 3,
			developmentA: {
				priceRowsMin: 2,
				mediaMin: 8,
				layoutsMin: 1,
				descriptionMinChars: 1500,
				progressRequired: true,
			},
			developmentB: {
				priceRowsMin: 1,
				mediaMin: 3,
				layoutsMin: 0,
				descriptionMinChars: 600,
				progressRequired: false,
			},
			priceStaleDays: 45,
			priceFailDays: 120,
			developerGeoMin: 5,
			developerDescMinChars: 600,
		},
		staticRoutes:
			input.staticRoutes ??
			defaultStaticRoutes.filter(
				(route) => route.path !== "/sdat" || categoryStatus.arenda !== "OUT",
			),
		legacyRoutes: input.legacyRoutes ?? defaultLegacyRoutes,
		legacyPatterns: input.legacyPatterns ?? defaultLegacyPatterns,
		modules: defaultModules,
		entityPrefixes: { residentialComplex: "zhk-", cottageVillage: "kp-" },
	});
	validateProjectLegacyRouteTargets(profile);
	return profile;
}
