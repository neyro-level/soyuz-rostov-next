import { z } from "zod";

export const profileStatuses = [
	"ACTIVE",
	"NOINDEX_AUTO",
	"PREPARED_OFF",
	"OUT",
] as const;
export const geoModes = ["SINGLE_GEO", "MULTI_GEO"] as const;
export const sitePresets = [
	"MIXED",
	"NEWBUILD_FIRST",
	"SECONDARY_FIRST",
] as const;
export const catalogSurfaceSlugs = [
	"kvartiry",
	"doma",
	"uchastki",
	"kommercheskaya-nedvizhimost",
	"komnaty",
	"garazhi",
	"arenda",
	"novostroyki",
	"kottedzhnye-poselki",
] as const;
export const catalogFilterKeys = [
	"rooms",
	"district",
	"price",
	"area",
	"market",
	"developer",
	"completionYear",
] as const;
export const markets = ["newbuild", "secondary"] as const;
export const seoTierMetrics = ["broad39", "wordstat", "searchDemand"] as const;
export const moduleStates = ["active", "prepared", "disabled"] as const;
export const staticRouteFrequencies = [
	"daily",
	"weekly",
	"monthly",
	"yearly",
] as const;

export type ProfileStatus = (typeof profileStatuses)[number];
export type GeoMode = (typeof geoModes)[number];
export type SitePreset = (typeof sitePresets)[number];
export type CatalogSurfaceSlug = (typeof catalogSurfaceSlugs)[number];
export type CatalogFilterKey = (typeof catalogFilterKeys)[number];
export type Market = (typeof markets)[number];
export type SeoTierMetric = (typeof seoTierMetrics)[number];
export type ModuleState = (typeof moduleStates)[number];
export type StaticRouteFrequency = (typeof staticRouteFrequencies)[number];

export const catalogSurfaceMarketMatrix = {
	kvartiry: ["secondary", "newbuild"],
	doma: ["secondary"],
	uchastki: ["secondary"],
	"kommercheskaya-nedvizhimost": ["secondary"],
	komnaty: ["secondary"],
	garazhi: ["secondary"],
	arenda: ["secondary"],
	novostroyki: ["newbuild"],
	"kottedzhnye-poselki": ["newbuild"],
} as const satisfies Record<CatalogSurfaceSlug, readonly Market[]>;

const statusSchema = z.enum(profileStatuses);
const geoSlugSchema = z
	.string()
	.min(1)
	.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Geo slug must be lowercase ASCII.");
const isoDateSchema = z.iso.date();
const staticPathSchema = z
	.string()
	.regex(
		/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?$/,
		"Static route must be an absolute lowercase ASCII path without a trailing slash.",
	)
	.transform((value) => value as `/${string}`);
const legacyDestinationPathSchema = z
	.string()
	.regex(
		/^\/(?:[a-z0-9]+(?:-[a-z0-9]+)*(?:\/[a-z0-9]+(?:-[a-z0-9]+)*)*)?\/?$/,
		"Legacy destination must be an absolute lowercase ASCII path.",
	)
	.transform((value) => value as `/${string}`);

const surfaceStatusSchema = z.strictObject(
	Object.fromEntries(
		catalogSurfaceSlugs.map((surface) => [surface, statusSchema]),
	) as Record<CatalogSurfaceSlug, typeof statusSchema>,
);
const marketStatusSchema = z.strictObject({
	newbuild: statusSchema,
	secondary: statusSchema,
});
const filterKeySchema = z.enum(catalogFilterKeys);
const filterKeysSchema = z.strictObject(
	Object.fromEntries(
		catalogSurfaceSlugs.map((surface) => [
			surface,
			z.array(filterKeySchema).max(catalogFilterKeys.length),
		]),
	) as unknown as Record<
		CatalogSurfaceSlug,
		z.ZodArray<typeof filterKeySchema>
	>,
);
const seoFacetValueSchema = z.union([
	z.string().min(1).max(120),
	z.number().finite(),
	z.boolean(),
	z
		.array(z.union([z.string().min(1).max(120), z.number().finite()]))
		.min(1)
		.max(20),
]);
const seoFacetSchema = z.strictObject({
	geo: geoSlugSchema,
	category: z.enum(catalogSurfaceSlugs),
	filter: z.strictObject({
		key: filterKeySchema,
		value: seoFacetValueSchema,
	}),
});

const developmentGateSchema = z.strictObject({
	priceRowsMin: z.int().nonnegative(),
	mediaMin: z.int().nonnegative(),
	layoutsMin: z.int().nonnegative(),
	descriptionMinChars: z.int().nonnegative(),
	progressRequired: z.boolean(),
});

const siteProfileInputSchema = z.strictObject({
	preset: z.enum(sitePresets),
	geoMode: z.enum(geoModes),
	primaryGeo: geoSlugSchema,
	geos: z.record(
		geoSlugSchema,
		z.strictObject({
			published: z.boolean(),
			hubStatus: statusSchema,
			agglomerationOf: geoSlugSchema.optional(),
		}),
	),
	categoryStatus: surfaceStatusSchema,
	marketCapability: marketStatusSchema,
	geoCategoryStatus: z.record(geoSlugSchema, surfaceStatusSchema),
	marketStatus: z.record(geoSlugSchema, marketStatusSchema),
	developersSurface: z.strictObject({
		root: statusSchema,
		byGeo: z.record(geoSlugSchema, statusSchema),
	}),
	searchConsole: z.strictObject({
		yandex: z.string().min(1).nullable(),
		google: z.string().min(1).nullable(),
	}),
	filterKeys: filterKeysSchema,
	seoFacets: z.record(geoSlugSchema, seoFacetSchema),
	seoTiers: z.strictObject({
		metric: z.enum(seoTierMetrics),
		snapshotDate: isoDateSchema,
		bands: z.strictObject({
			P1: z.number().nonnegative(),
			P2: z.number().nonnegative(),
			TEST: z.number().nonnegative(),
		}),
		minInventory: z.strictObject({
			P1: z.int().nonnegative(),
			P2: z.int().nonnegative(),
			TEST: z.int().nonnegative(),
		}),
		unmeasuredPolicy: z.enum(["NONE", "TEST"]),
	}),
	gate: z.strictObject({
		listingIntroMinChars: z.int().nonnegative(),
		propertyPhotosMin: z.int().nonnegative(),
		developmentA: developmentGateSchema,
		developmentB: developmentGateSchema,
		priceStaleDays: z.int().positive(),
		priceFailDays: z.int().positive(),
		developerGeoMin: z.int().nonnegative(),
		developerDescMinChars: z.int().nonnegative(),
	}),
	staticRoutes: z.array(
		z.strictObject({
			path: staticPathSchema,
			changeFrequency: z.enum(staticRouteFrequencies),
			priority: z.number().min(0).max(1),
			indexable: z.boolean(),
		}),
	),
	legacyRoutes: z.array(
		z.strictObject({
			from: staticPathSchema,
			to: legacyDestinationPathSchema,
			statusCode: z.literal(301),
		}),
	),
	legacyPatterns: z.array(
		z.strictObject({
			kind: z.literal("property"),
			from: z.literal("/obekty/{slug}"),
			statusCode: z.literal(301),
		}),
	),
	modules: z.record(
		geoSlugSchema,
		z.strictObject({
			state: z.enum(moduleStates),
			reservedRoots: z.array(geoSlugSchema).max(20),
		}),
	),
	entityPrefixes: z.strictObject({
		residentialComplex: z.literal("zhk-"),
		cottageVillage: z.literal("kp-"),
	}),
});

function routeCanExist(status: ProfileStatus): boolean {
	return status === "ACTIVE" || status === "NOINDEX_AUTO";
}

export const siteProfileSchema = siteProfileInputSchema.superRefine(
	(profile, context) => {
		const geoSlugs = Object.keys(profile.geos);
		if (!profile.geos[profile.primaryGeo]) {
			context.addIssue({
				code: "custom",
				path: ["primaryGeo"],
				message: "primaryGeo must exist in geos.",
			});
		} else if (!profile.geos[profile.primaryGeo].published) {
			context.addIssue({
				code: "custom",
				path: ["primaryGeo"],
				message: "primaryGeo must be published.",
			});
		}
		const routableGeoSlugs = geoSlugs.filter((geo) => {
			const definition = profile.geos[geo];
			return definition.published && routeCanExist(definition.hubStatus);
		});
		if (
			profile.geos[profile.primaryGeo] &&
			!routeCanExist(profile.geos[profile.primaryGeo].hubStatus)
		) {
			context.addIssue({
				code: "custom",
				path: ["geos", profile.primaryGeo, "hubStatus"],
				message: "primaryGeo must have a routable hubStatus.",
			});
		}
		if (
			profile.geoMode === "SINGLE_GEO" &&
			(routableGeoSlugs.length !== 1 ||
				routableGeoSlugs[0] !== profile.primaryGeo)
		) {
			context.addIssue({
				code: "custom",
				path: ["geos"],
				message:
					"SINGLE_GEO requires exactly one routable hub and it must be primaryGeo.",
			});
		}
		if (profile.geoMode === "MULTI_GEO" && geoSlugs.length < 2) {
			context.addIssue({
				code: "custom",
				path: ["geos"],
				message: "MULTI_GEO requires at least two configured geos.",
			});
		}

		for (const geo of geoSlugs) {
			const geoDefinition = profile.geos[geo];
			if (geoDefinition.agglomerationOf === geo) {
				context.addIssue({
					code: "custom",
					path: ["geos", geo, "agglomerationOf"],
					message: "A geo cannot aggregate into itself.",
				});
			} else if (
				geoDefinition.agglomerationOf &&
				!profile.geos[geoDefinition.agglomerationOf]
			) {
				context.addIssue({
					code: "custom",
					path: ["geos", geo, "agglomerationOf"],
					message: "agglomerationOf must reference a configured geo.",
				});
			}
			const geoCategories = profile.geoCategoryStatus[geo];
			const geoMarkets = profile.marketStatus[geo];
			const geoDevelopers = profile.developersSurface.byGeo[geo];
			if (!geoCategories || !geoMarkets || !geoDevelopers) {
				context.addIssue({
					code: "custom",
					path: ["geos", geo],
					message: "Every geo needs category, market and developer statuses.",
				});
				continue;
			}
			for (const surface of catalogSurfaceSlugs) {
				if (
					routeCanExist(geoCategories[surface]) &&
					!routeCanExist(profile.categoryStatus[surface])
				) {
					context.addIssue({
						code: "custom",
						path: ["geoCategoryStatus", geo, surface],
						message:
							"A geo surface cannot be enabled when its platform surface is disabled.",
					});
				}
			}
			for (const market of markets) {
				if (
					routeCanExist(geoMarkets[market]) &&
					!routeCanExist(profile.marketCapability[market])
				) {
					context.addIssue({
						code: "custom",
						path: ["marketStatus", geo, market],
						message:
							"A geo market cannot be enabled when its platform market is disabled.",
					});
				}
			}
			if (
				routeCanExist(geoDevelopers) &&
				!routeCanExist(profile.developersSurface.root)
			) {
				context.addIssue({
					code: "custom",
					path: ["developersSurface", "byGeo", geo],
					message:
						"A geo developer surface cannot be enabled when its root is disabled.",
				});
			}
		}

		for (const matrixName of ["geoCategoryStatus", "marketStatus"] as const) {
			for (const geo of Object.keys(profile[matrixName])) {
				if (!profile.geos[geo]) {
					context.addIssue({
						code: "custom",
						path: [matrixName, geo],
						message: "Status matrices cannot contain an unknown geo.",
					});
				}
			}
		}
		for (const geo of Object.keys(profile.developersSurface.byGeo)) {
			if (!profile.geos[geo]) {
				context.addIssue({
					code: "custom",
					path: ["developersSurface", "byGeo", geo],
					message: "Developer statuses cannot contain an unknown geo.",
				});
			}
		}
		for (const [slug, facet] of Object.entries(profile.seoFacets)) {
			if (!profile.geos[facet.geo]) {
				context.addIssue({
					code: "custom",
					path: ["seoFacets", slug, "geo"],
					message: "SEO facet must reference a configured geo.",
				});
			}
			if (!profile.filterKeys[facet.category].includes(facet.filter.key)) {
				context.addIssue({
					code: "custom",
					path: ["seoFacets", slug, "filter", "key"],
					message: "SEO facet filter key must be enabled for its category.",
				});
			}
		}

		if (
			!(
				profile.seoTiers.bands.P1 > profile.seoTiers.bands.P2 &&
				profile.seoTiers.bands.P2 > profile.seoTiers.bands.TEST
			)
		) {
			context.addIssue({
				code: "custom",
				path: ["seoTiers", "bands"],
				message: "SEO tier bands must descend from P1 to P2 to TEST.",
			});
		}

		const staticPaths = profile.staticRoutes.map((route) => route.path);
		if (new Set(staticPaths).size !== staticPaths.length) {
			context.addIssue({
				code: "custom",
				path: ["staticRoutes"],
				message: "Static route paths must be unique.",
			});
		}
		const legacySources = profile.legacyRoutes.map((route) => route.from);
		if (new Set(legacySources).size !== legacySources.length) {
			context.addIssue({
				code: "custom",
				path: ["legacyRoutes"],
				message: "Legacy route sources must be unique.",
			});
		}
		const legacyPatternSources = profile.legacyPatterns.map(
			(pattern) => pattern.from,
		);
		if (new Set(legacyPatternSources).size !== legacyPatternSources.length) {
			context.addIssue({
				code: "custom",
				path: ["legacyPatterns"],
				message: "Legacy pattern sources must be unique.",
			});
		}
		const indexableStaticRoots = new Map(
			profile.staticRoutes
				.filter((route) => route.indexable)
				.map((route, index) => [
					route.path.split("/").filter(Boolean)[0],
					index,
				]),
		);
		for (const [index, route] of profile.legacyRoutes.entries()) {
			const legacyRoot = route.from.split("/").filter(Boolean)[0];
			if (indexableStaticRoots.has(legacyRoot)) {
				context.addIssue({
					code: "custom",
					path: ["legacyRoutes", index, "from"],
					message:
						"Legacy route root cannot collide with an indexable static route.",
				});
			}
		}
		for (const [index, pattern] of profile.legacyPatterns.entries()) {
			const legacyRoot = pattern.from.split("/").filter(Boolean)[0];
			if (indexableStaticRoots.has(legacyRoot)) {
				context.addIssue({
					code: "custom",
					path: ["legacyPatterns", index, "from"],
					message:
						"Legacy pattern root cannot collide with an indexable static route.",
				});
			}
		}
		const sdatIndex = profile.staticRoutes.findIndex(
			(route) => route.path === "/sdat",
		);
		if (profile.categoryStatus.arenda === "OUT" && sdatIndex >= 0) {
			context.addIssue({
				code: "custom",
				path: ["staticRoutes", sdatIndex, "path"],
				message: "/sdat must be absent when arenda is OUT.",
			});
		}
		for (const [index, route] of profile.legacyRoutes.entries()) {
			if (route.from === route.to || `${route.from}/` === route.to) {
				context.addIssue({
					code: "custom",
					path: ["legacyRoutes", index, "to"],
					message: "Legacy route destination must differ from its source.",
				});
			}
			const normalizedDestination = (
				route.to === "/" ? route.to : route.to.replace(/\/$/, "")
			) as `/${string}`;
			if (legacySources.includes(normalizedDestination)) {
				context.addIssue({
					code: "custom",
					path: ["legacyRoutes", index, "to"],
					message: "Legacy redirects must be direct and cannot form chains.",
				});
			}
		}
		const moduleRoots = Object.values(profile.modules).flatMap(
			(module) => module.reservedRoots,
		);
		if (new Set(moduleRoots).size !== moduleRoots.length) {
			context.addIssue({
				code: "custom",
				path: ["modules"],
				message: "Module reserved roots must be globally unique.",
			});
		}
		if (profile.gate.priceFailDays <= profile.gate.priceStaleDays) {
			context.addIssue({
				code: "custom",
				path: ["gate", "priceFailDays"],
				message: "priceFailDays must be greater than priceStaleDays.",
			});
		}
	},
);

export type SiteProfileInput = z.input<typeof siteProfileInputSchema>;
export type SiteProfile = z.output<typeof siteProfileSchema>;

export function defineSiteProfile(input: SiteProfileInput): SiteProfile {
	return siteProfileSchema.parse(input);
}

export function isConfiguredRouteAvailable(input: {
	status: ProfileStatus;
	inventory: number;
}): boolean {
	if (input.status === "ACTIVE") return true;
	if (input.status === "NOINDEX_AUTO") return input.inventory >= 1;
	return false;
}

export function getGeoHubStatus(
	profile: SiteProfile,
	geo: string,
): ProfileStatus {
	return profile.geos[geo]?.hubStatus ?? "PREPARED_OFF";
}

export function isGeoHubAvailable(input: {
	published: boolean;
	hubStatus: ProfileStatus;
	inventory: number;
}): boolean {
	return (
		input.published &&
		isConfiguredRouteAvailable({
			status: input.hubStatus,
			inventory: input.inventory,
		})
	);
}
