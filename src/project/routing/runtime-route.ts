import "server-only";

import type {
	BreadcrumbDTO,
	CityDTO,
	DeveloperCardDTO,
	DeveloperDetailsDTO,
	DevelopmentCardDTO,
	GeoHubDTO,
	ListingPageDTO,
	NapDTO,
	PropertyDetailsDTO,
	SeoMetaDTO,
} from "@ams/realtbase-contracts";
import { unstable_cache } from "next/cache";
import { cache } from "react";
import { resolveEntityPageLifecycle } from "@/core/lifecycle/entity-lifecycle";
import { separateTrackingQueryParams } from "@/core/seo/tracking-query-params";
import {
	createRouteResolver,
	decidePage as decideResolvedPage,
	type PageDecision,
	type PageKey,
	type ResolverDataPort,
	type ResolverPageRecord,
	type ResolverResult,
	resolveRouteDecision,
} from "@/core/routing";
import { geoCatalogContractFixtures } from "@/fixture/geo-catalog";
import { fixtureProperties, getFixtureProperty } from "@/fixture/provider";
import { createFixtureResolverDataPort } from "@/fixture/resolver";
import { fixtureDistrictRouteRegistryFor } from "@/fixture/route-registries";
import { fixtureNap } from "@/fixture/site-settings";
import { findPublicEntityLifecycle } from "@/project/data-access/public/entity-lifecycle";
import {
	countGeoInventory,
	countInventory,
	getDeveloper,
	getDeveloperRouteFacts,
	getDevelopment,
	getDevelopmentRouteFacts,
	getGeoBySlug,
	getGeoHub,
	getListing,
	getPropertyByPublicUrlId,
	getPropertyRouteFacts,
	listDevelopmentGateFactsForCities,
	listDeveloperDevelopments,
	listGeoDevelopers,
	type PublicDevelopmentGateFacts,
	type PublicDevelopmentDetailsDTO,
	type PublicDevelopmentGateFact,
} from "@/project/data-access/public/geo-catalog";
import { findPublicNap } from "@/project/data-access/public/nap";
import { getOptionalPublicGatewayPayload } from "@/project/data-access/public/payload";
import { findPublicRedirectByFromPath } from "@/project/data-access/public/payload-reads";
import { starterFixtureIdentity } from "@/project/fixture-data/starter-dataset";
import {
	projectBreadcrumbs,
	projectObjectBreadcrumbs,
} from "@/project/navigation";
import {
	type CatalogSearchParams,
	catalogCanonicalPath,
	catalogFilterKeysForQuery,
	parseCatalogSearchParams,
	parsePageSearchParams,
} from "@/project/routing/catalog-search-params";
import { decidePage } from "@/project/routing/content-gate";
import { getCachedDistrictRouteRegistry } from "@/project/routing/district-registry";
import {
	collectPassingDeveloperIds,
	mergeDeveloperCards,
	publishedDeveloperGeoSlugs,
} from "@/project/routing/developer-surface";
import {
	publicGatewayCacheTags,
	publicGatewayRouteCacheIdentity,
} from "@/project/routing/public-gateway-cache";
import { getCachedFilteredCatalogRoute } from "@/project/routing/filtered-catalog-cache";
import {
	projectSeoCategoryForms,
	projectSeoActiveCategoriesList,
	projectSeoMeta,
	renderProjectSeoTemplate,
} from "@/project/seo/templates";
import { siteConfig } from "@/project/site.config";
import {
	activeProjectGeoCategorySurfaces,
	siteProfile,
} from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";

export type RuntimeRouteData =
	| { kind: "geoHub"; value: GeoHubDTO }
	| {
			kind: "listing";
			value: ListingPageDTO;
			query?: CatalogSearchParams;
	  }
	| {
			kind: "developers";
			value: readonly DeveloperCardDTO[];
			breadcrumbs: BreadcrumbDTO;
			h1: string;
			intro: string;
			seo: SeoMetaDTO;
			developersWithPassingDevelopment: number;
	  }
	| {
			kind: "developer";
			value: DeveloperDetailsDTO;
			developments: readonly DevelopmentCardDTO[];
			pagination: { page: number; total: number; totalPages: number };
			hasPassingDevelopment: boolean;
			descriptionSource: string | null;
			descriptionCheckedAt: string | null;
	  }
	| {
			kind: "development";
			value: PublicDevelopmentDetailsDTO;
			geo: string;
			gateFacts: PublicDevelopmentGateFacts;
	  }
	| {
			kind: "property";
			value: PropertyDetailsDTO & { breadcrumbs: BreadcrumbDTO };
			geo?: string;
			seoCity: Parameters<typeof projectSeoMeta>[1]["city"] | null;
			districtRaw: string | null;
			gatePhotoCount: number;
			priceCheckedAt: string | null;
	  };

type RuntimeRouteDecision =
	| Exclude<ResolverResult, { kind: "page" }>
	| PageDecision;

export type RuntimeRouteResolution = {
	decision: RuntimeRouteDecision;
	data?: RuntimeRouteData;
	nap?: NapDTO;
};

async function resolveFixtureRuntimeRoute(
	pathname: string,
	queryString: string,
): Promise<RuntimeRouteResolution> {
	const grammar = createProjectUrlGrammar(
		siteProfile,
		fixtureDistrictRouteRegistryFor(siteProfile),
	);
	const catalogRoot = { kind: "categoryRoot", category: "kvartiry" } as const;
	const geoListing = geoCatalogContractFixtures.listing.pageKey as PageKey;
	const pages: PageKey[] = [
		{ kind: "geoHub", geo: siteProfile.primaryGeo },
		catalogRoot,
		geoListing,
		{ kind: "geoDevelopers", geo: siteProfile.primaryGeo },
		{ kind: "developerRoot" },
		geoCatalogContractFixtures.developer.pageKey as PageKey,
		geoCatalogContractFixtures.development.pageKey as PageKey,
		...fixtureProperties.map((property) => property.pageKey as PageKey),
	];
	const port = createFixtureResolverDataPort({
		grammar,
		pages: pages.map((pageKey) => ({
			pageKey,
			inventory:
				pageKey.kind === "categoryRoot" ||
				pageKey.kind === "categoryGeo" ||
				pageKey.kind === "categoryGeoDistrict" ||
				pageKey.kind === "categoryGeoFacet"
					? geoCatalogContractFixtures.listing.total
					: 1,
			record: {
				lifecycle: "active",
				geo: "geo" in pageKey ? pageKey.geo : siteProfile.primaryGeo,
				market:
					pageKey.kind === "property"
						? "secondary"
						: pageKey.kind === "development"
							? "newbuild"
							: null,
				dataTier: pageKey.kind === "development" ? "B" : null,
			},
		})),
	});
	const decision = await createRouteResolver({
		profile: siteProfile,
		grammar,
		port,
	}).resolvePath(pathname);
	if (decision.kind !== "page") return { decision };
	const pageKey = decision.pageKey;
	const catalogQuery =
		pageKey.kind === "categoryRoot" ||
		pageKey.kind === "categoryGeo" ||
		pageKey.kind === "categoryGeoDistrict" ||
		pageKey.kind === "categoryGeoFacet"
			? parseCatalogSearchParams(queryString)
			: null;
	const developerQuery =
		pageKey.kind === "developer" ? parsePageSearchParams(queryString) : null;
	if (queryString && !catalogQuery && !developerQuery) {
		return { decision: { kind: "notFound", statusCode: 404 } };
	}
	const city = geoCatalogContractFixtures.geoHub.city;
	const cityMorphology = {
		approved: true,
		nominative: city.name,
		genitive: city.nameGenitive ?? city.name,
		prepositional: city.nameLocative ?? city.name,
		preposition: city.preposition ?? ("в" as const),
	};
	let data: RuntimeRouteData | undefined;
	if (pageKey.kind === "geoHub") {
		const context = {
			brand: fixtureNap.brandName,
			city: cityMorphology,
			activeCategoriesList: projectSeoActiveCategoriesList(
				activeProjectGeoCategorySurfaces(siteProfile, pageKey.geo),
			),
		};
		data = {
			kind: "geoHub",
			value: {
				...geoCatalogContractFixtures.geoHub,
				title: renderProjectSeoTemplate("geoHub", context).h1,
				seo: projectSeoMeta("geoHub", context, decision.canonicalPath),
			},
		};
	} else if (
		pageKey.kind === "categoryRoot" ||
		pageKey.kind === "categoryGeo"
	) {
		const context = {
			brand: fixtureNap.brandName,
			category: projectSeoCategoryForms(pageKey.category),
			city: cityMorphology,
			inventory: geoCatalogContractFixtures.listing.total,
		};
		const templateKey =
			pageKey.kind === "categoryRoot" ? "categoryRoot" : "categoryGeo";
		data = {
			kind: "listing",
			...(catalogQuery ? { query: catalogQuery } : {}),
			value: {
				...geoCatalogContractFixtures.listing,
				pageKey,
				href: decision.canonicalPath,
				canonical: decision.canonicalPath,
				h1: renderProjectSeoTemplate(templateKey, context).h1,
				seo: projectSeoMeta(templateKey, context, decision.canonicalPath),
			},
		};
	} else if (
		pageKey.kind === "developerRoot" ||
		pageKey.kind === "geoDevelopers"
	) {
		const templateKey =
			pageKey.kind === "developerRoot" ? "developerRoot" : "geoDevelopers";
		const context = {
			brand: fixtureNap.brandName,
			inventory: 1,
			...(pageKey.kind === "geoDevelopers"
				? {
						city: {
							approved: true,
							nominative: geoCatalogContractFixtures.city.name,
							genitive: geoCatalogContractFixtures.city.nameGenitive,
							prepositional: geoCatalogContractFixtures.city.nameLocative,
							preposition: geoCatalogContractFixtures.city.preposition,
						},
					}
				: {}),
		};
		const rendered = renderProjectSeoTemplate(templateKey, context);
		data = {
			kind: "developers",
			value: [geoCatalogContractFixtures.developer],
			breadcrumbs: projectBreadcrumbs(
				[{ pageKey: { kind: "home" }, label: "Главная" }],
				"Застройщики",
				{ grammar },
			),
			h1: rendered.h1,
			intro: rendered.description,
			seo: projectSeoMeta(templateKey, context, decision.canonicalPath),
			developersWithPassingDevelopment: 1,
		};
	} else if (pageKey.kind === "developer") {
		if (developerQuery && developerQuery.page > 1) {
			return { decision: { kind: "notFound", statusCode: 404 } };
		}
		data = {
			kind: "developer",
			value: geoCatalogContractFixtures.developer,
			developments: [geoCatalogContractFixtures.development],
			pagination: { page: 1, total: 1, totalPages: 1 },
			hasPassingDevelopment: true,
			descriptionSource: "fixture-owner-specification",
			descriptionCheckedAt: "2026-09-24T12:00:00.000Z",
		};
	} else if (pageKey.kind === "development") {
		data = {
			kind: "development",
			value: { ...geoCatalogContractFixtures.development, faq: [] },
			geo: siteProfile.primaryGeo,
			gateFacts: {
				developerPresent: true,
				cityPresent: true,
				addressPresent: true,
				coordinatesPresent: true,
				classPresent: true,
				completionOrDeadlinePresent: true,
				salesStatusPresent: true,
				completed: false,
				description: geoCatalogContractFixtures.development.description ?? "",
				descriptionSource: "fixture-owner-specification",
				descriptionCheckedAt: "2026-09-24T12:00:00.000Z",
				validPriceRows: geoCatalogContractFixtures.development.priceByRooms.map(
					({ priceCheckedAt }) => ({
						checkedAt: priceCheckedAt,
						source: "fixture-owner-specification",
					}),
				),
				validMediaCount: geoCatalogContractFixtures.development.gallery.length,
				validLayoutCount: 1,
				progressPresent: true,
				dataTier: "A",
			},
		};
	} else if (pageKey.kind === "property") {
		const property = fixtureProperties.find(
			(candidate) => candidate.publicUrlId === pageKey.publicUrlId,
		);
		const details = property ? await getFixtureProperty(property.slug) : null;
		if (details) {
			data = {
				kind: "property",
				value: {
					...details,
					breadcrumbs: projectObjectBreadcrumbs(
						{
							category: pageKey.category,
							city: { label: details.city, slug: siteProfile.primaryGeo },
							currentLabel: details.title,
						},
						{ grammar },
					),
				},
				geo: siteProfile.primaryGeo,
				seoCity: {
					approved: true,
					nominative: geoCatalogContractFixtures.city.name,
					genitive: geoCatalogContractFixtures.city.nameGenitive,
					prepositional: geoCatalogContractFixtures.city.nameLocative,
					preposition: geoCatalogContractFixtures.city.preposition,
				},
				districtRaw: details.district ?? null,
				gatePhotoCount: details.gallery.filter(
					(item) => item.kind === "managed",
				).length,
				priceCheckedAt: starterFixtureIdentity.snapshotAt,
			};
		}
	}
	if (!data) return { decision: { kind: "notFound", statusCode: 404 } };
	const resolution: RuntimeRouteResolution = {
		decision: decidePage(decision, data),
		data,
		nap: fixtureNap,
	};
	if (data.kind === "listing" && catalogQuery?.queryString) {
		const canonicalPath = catalogCanonicalPath(
			decision.canonicalPath,
			catalogQuery,
		);
		return {
			...resolution,
			data: queryListingData(data, canonicalPath),
			decision: queryPageDecision(
				resolution.decision as PageDecision,
				canonicalPath,
			),
		};
	}
	return resolution;
}

async function resolveEmptyClientRuntimeRoute(
	pathname: string,
	queryString: string,
): Promise<RuntimeRouteResolution> {
	if (queryString) return { decision: { kind: "notFound", statusCode: 404 } };
	const grammar = createProjectUrlGrammar(siteProfile);
	const port = createFixtureResolverDataPort({ grammar, pages: [] });
	const decision = await createRouteResolver({
		profile: siteProfile,
		grammar,
		port,
	}).resolvePath(pathname);
	return {
		decision:
			decision.kind === "page"
				? { kind: "notFound", statusCode: 404 }
				: decision,
	};
}

function queryPageDecision(
	decision: PageDecision,
	canonicalPath: string,
): PageDecision {
	return {
		...decision,
		canonicalPath,
		robots: { indexing: "noindex", following: "follow" },
		inSitemap: false,
		indexNowEligible: false,
		visibleInMenu: false,
		visibleInInterlinks: false,
		gate: {
			...decision.gate,
			canonical: canonicalPath,
			indexing: "noindex",
			following: "follow",
			includeInSitemap: false,
			reasons: [...decision.gate.reasons, "query_variant_noindex"],
		},
	};
}

function queryListingData(
	data: Extract<RuntimeRouteData, { kind: "listing" }>,
	canonicalPath: string,
): Extract<RuntimeRouteData, { kind: "listing" }> {
	return {
		...data,
		value: {
			...data.value,
			canonical: canonicalPath,
			robots: { indexing: "noindex", following: "follow" },
			seo: {
				...data.value.seo,
				canonicalPath,
				indexing: "noindex",
				following: "follow",
			},
		},
	};
}

function entityType(pageKey: PageKey) {
	if (pageKey.kind === "property") return "property" as const;
	if (pageKey.kind === "development") return "development" as const;
	if (pageKey.kind === "developer") return "developer" as const;
	return null;
}

function lifecycleRecord(
	lifecycle: ReturnType<typeof resolveEntityPageLifecycle>,
	grammar: ReturnType<typeof createProjectUrlGrammar>,
	facts: Pick<ResolverPageRecord, "geo" | "market" | "dataTier"> = {
		geo: null,
		market: null,
		dataTier: null,
	},
	canonicalPageKey?: PageKey,
): ResolverPageRecord | null {
	switch (lifecycle.kind) {
		case "missing":
			return null;
		case "gone":
			return { lifecycle: "purged", canonicalPageKey, ...facts };
		case "redirect":
			return {
				lifecycle: "purged",
				canonicalPageKey,
				...facts,
				replacementPageKey:
					grammar.parseUrl(lifecycle.destination) ?? undefined,
			};
		case "archived":
			return { lifecycle: "archived", canonicalPageKey, ...facts };
		case "active":
			return { lifecycle: "active", canonicalPageKey, ...facts };
	}
}

function listingInput(
	pageKey: Extract<PageKey, { kind: `category${string}` }>,
) {
	return {
		geo: "geo" in pageKey ? pageKey.geo : siteProfile.primaryGeo,
		surface: pageKey.category,
		...(pageKey.kind === "categoryGeoDistrict"
			? { district: pageKey.district }
			: {}),
		...(pageKey.kind === "categoryGeoFacet" ? { facet: pageKey.facet } : {}),
	};
}

async function resolveRuntimeRouteUncached(
		pathname: string,
		queryString = "",
): Promise<RuntimeRouteResolution> {
		const payload = await getOptionalPublicGatewayPayload();
		if (!payload) {
			return (siteConfig.projectKind as "starter-demo" | "client") === "client"
				? resolveEmptyClientRuntimeRoute(pathname, queryString)
				: resolveFixtureRuntimeRoute(pathname, queryString);
		}
		const publicPayload = payload;
		const nap = await findPublicNap(publicPayload);
		const brandName = nap.brandName;

		const grammar = createProjectUrlGrammar(
			siteProfile,
			await getCachedDistrictRouteRegistry(),
		);
		const data = new Map<string, RuntimeRouteData>();
		const inventory = new Map<string, number>();
		const keyOf = (pageKey: PageKey) => grammar.buildUrl(pageKey);
		function passingDevelopmentDeveloperIds(
			facts: readonly PublicDevelopmentGateFact[],
			geoByCityId: ReadonlyMap<string, string>,
		): Set<string> {
			const decisions = facts.map((fact) => {
				const geo = geoByCityId.get(fact.cityId) ?? null;
				const pageKey: PageKey = {
					kind: "development",
					developmentKind: fact.developmentKind,
					slug: fact.slug,
				};
				const canonicalPath = grammar.buildUrl(pageKey);
				const record = {
					lifecycle: "active" as const,
					geo,
					market: "newbuild" as const,
					dataTier: fact.dataTier,
				};
				const route = resolveRouteDecision(siteProfile, pageKey, record, 1);
				if (!route.available) {
					return { developerId: fact.developerId, indexing: "noindex" as const };
				}
				const decision = decideResolvedPage(
					siteProfile,
					pageKey,
					{
						kind: "page",
						pageKey,
						canonicalPath,
						profileStatus: route.profileStatus,
						lifecycle: "active",
						market: "newbuild",
						dataTier: fact.dataTier,
						inventory: 1,
					},
					{
						kind: "development",
						url: canonicalPath,
						canonical: canonicalPath,
						profileStatus: route.profileStatus,
						...fact,
					},
				);
				return {
					developerId: fact.developerId,
					indexing: decision.robots.indexing,
				};
			});
			return collectPassingDeveloperIds(decisions);
		}

		const port: ResolverDataPort = {
			async findRedirect(path) {
				const redirect = await findPublicRedirectByFromPath(payload, path);
				return redirect?.statusCode === "301"
					? { destinationPath: redirect.to, statusCode: 301 }
					: null;
			},
			async countInventory(pageKey) {
				const key = keyOf(pageKey);
				const known = inventory.get(key);
				if (known !== undefined) return known;
				if (
					pageKey.kind === "categoryRoot" ||
					pageKey.kind === "categoryGeo" ||
					pageKey.kind === "categoryGeoDistrict" ||
					pageKey.kind === "categoryGeoFacet"
				) {
					const input = listingInput(pageKey);
					return countInventory(payload, {
						geo: input.geo,
						surface: input.surface,
						...(input.district ? { district: input.district } : {}),
						...(input.facet ? { facet: input.facet } : {}),
					});
				}
				return inventory.get(key) ?? 0;
			},
			async lookupPage(pageKey) {
				const key = keyOf(pageKey);
				if (pageKey.kind === "home" || pageKey.kind === "static") {
					if (queryString) return null;
					inventory.set(key, 0);
					return {
						lifecycle: "active",
						geo: null,
						market: null,
						dataTier: null,
					};
				}
				if (pageKey.kind === "geoHub") {
					if (queryString) return null;
					const hub = await getGeoHub(payload, pageKey.geo, brandName, grammar);
					if (!hub) return null;
					data.set(key, { kind: "geoHub", value: hub });
					inventory.set(key, await countGeoInventory(payload, pageKey.geo));
					return {
						lifecycle: "active",
						geo: pageKey.geo,
						market: null,
						dataTier: null,
					};
				}
				if (
					pageKey.kind === "categoryRoot" ||
					pageKey.kind === "categoryGeo" ||
					pageKey.kind === "categoryGeoDistrict" ||
					pageKey.kind === "categoryGeoFacet"
				) {
					const catalogQuery = parseCatalogSearchParams(queryString);
					if (!catalogQuery) return null;
					const enabledFilters = siteProfile.filterKeys[pageKey.category];
					if (
						catalogFilterKeysForQuery(catalogQuery).some(
							(filter) => !enabledFilters.includes(filter),
						)
					)
						return null;
					const listing = await getListing(
						payload,
						{
							...listingInput(pageKey),
							page: catalogQuery.page,
							query: {
								sort: catalogQuery.sort,
								...(catalogQuery.priceFromMinor
									? { priceFromMinor: catalogQuery.priceFromMinor }
									: {}),
								...(catalogQuery.priceToMinor
									? { priceToMinor: catalogQuery.priceToMinor }
									: {}),
								...(catalogQuery.rooms
									? { rooms: [...catalogQuery.rooms] }
									: {}),
								...(catalogQuery.district
									? { district: catalogQuery.district }
									: {}),
								...(catalogQuery.areaFrom
									? { areaFrom: catalogQuery.areaFrom }
									: {}),
								...(catalogQuery.areaTo
									? { areaTo: catalogQuery.areaTo }
									: {}),
								...(catalogQuery.market
									? { market: catalogQuery.market }
									: {}),
								...(catalogQuery.developer
									? { developer: catalogQuery.developer }
									: {}),
								...(catalogQuery.completionYear
									? { completionYear: catalogQuery.completionYear }
									: {}),
							},
						},
						brandName,
						grammar,
						siteProfile,
					);
					if (!listing) return null;
					data.set(key, {
						kind: "listing",
						value: { ...listing, pageKey, href: key },
						query: catalogQuery,
					});
					inventory.set(key, listing.total);
					return {
						lifecycle: "active",
						geo: listingInput(pageKey).geo,
						market: null,
						dataTier: null,
					};
				}
				if (
					pageKey.kind === "geoDevelopers" ||
					pageKey.kind === "developerRoot"
				) {
					if (queryString) return null;
					const configuredGeos =
						pageKey.kind === "geoDevelopers"
							? [pageKey.geo]
							: publishedDeveloperGeoSlugs(siteProfile);
					const publishedCities = (
						await Promise.all(
							configuredGeos.map((slug) => getGeoBySlug(payload, slug)),
						)
					).filter((city): city is CityDTO => city !== null);
					if (publishedCities.length === 0) return null;
					const bundles = await Promise.all(
						publishedCities.map(async (city) => ({
							city,
							developers: await listGeoDevelopers(payload, city.slug),
						})),
					);
					const developers = mergeDeveloperCards(
						bundles.map((bundle) => bundle.developers),
					);
					const developmentFacts = await listDevelopmentGateFactsForCities(
						payload,
						publishedCities.map((city) => Number(city.id)),
					);
					const passingDeveloperIds = passingDevelopmentDeveloperIds(
						developmentFacts,
						new Map(publishedCities.map((city) => [String(city.id), city.slug])),
					);
					const templateKey =
						pageKey.kind === "developerRoot"
							? "developerRoot"
							: "geoDevelopers";
					const activeCity =
						pageKey.kind === "geoDevelopers" ? publishedCities[0] : null;
					const context = {
						brand: brandName,
						inventory: developers.length,
						...(activeCity
							? {
									city: {
										approved: true,
										nominative: activeCity.name,
										genitive: activeCity.nameGenitive,
										prepositional: activeCity.nameLocative,
										preposition: activeCity.preposition,
									},
								}
							: {}),
					};
					const rendered = renderProjectSeoTemplate(templateKey, context);
					data.set(key, {
						kind: "developers",
						value: developers,
						breadcrumbs: projectBreadcrumbs(
							[{ pageKey: { kind: "home" }, label: "Главная" }],
							"Застройщики",
							{ grammar },
						),
						h1: rendered.h1,
						intro: rendered.description,
						seo: projectSeoMeta(templateKey, context, key),
						developersWithPassingDevelopment: passingDeveloperIds.size,
					});
					inventory.set(key, developers.length);
					return {
						lifecycle: "active",
						geo: pageKey.kind === "geoDevelopers" ? pageKey.geo : null,
						market: null,
						dataTier: null,
					};
				}

				const type = entityType(pageKey);
				if (!type) return null;
				const requestedCanonicalPath = grammar.buildUrl(pageKey);
				const lifecycle = resolveEntityPageLifecycle(
					await findPublicEntityLifecycle({
						payload,
						entityType: type,
						...(pageKey.kind === "property"
							? { publicUrlId: pageKey.publicUrlId }
							: { slug: pageKey.slug }),
						canonicalPath: requestedCanonicalPath,
					}),
				);
				if (lifecycle.kind === "missing") return null;
				if (lifecycle.kind === "gone" || lifecycle.kind === "redirect") {
					return lifecycleRecord(lifecycle, grammar);
				}

				let routeData: RuntimeRouteData;
				let canonicalPageKey: PageKey;
				let facts: Pick<ResolverPageRecord, "geo" | "market" | "dataTier">;
				if (pageKey.kind === "property") {
					if (queryString) return null;
					const [property, propertyFacts] = await Promise.all([
						getPropertyByPublicUrlId(payload, pageKey.publicUrlId),
						getPropertyRouteFacts(payload, pageKey.publicUrlId),
					]);
					if (!property || !propertyFacts) return null;
					canonicalPageKey = property.pageKey as PageKey;
					routeData = {
						kind: "property",
						value: {
							...property,
							breadcrumbs: projectObjectBreadcrumbs(
								{
									category: pageKey.category,
									city: {
										label: property.city,
										...(propertyFacts.geo ? { slug: propertyFacts.geo } : {}),
									},
									currentLabel: property.title,
								},
								{ grammar },
							),
						},
						...(propertyFacts.geo ? { geo: propertyFacts.geo } : {}),
						seoCity: propertyFacts.seoCity,
						districtRaw: propertyFacts.districtRaw,
						gatePhotoCount: propertyFacts.gatePhotoCount,
						priceCheckedAt: propertyFacts.priceCheckedAt,
					};
					facts = { ...propertyFacts, dataTier: null };
				} else if (pageKey.kind === "development") {
					if (queryString) return null;
					const [development, developmentFacts] = await Promise.all([
						getDevelopment(payload, pageKey.slug, brandName),
						getDevelopmentRouteFacts(payload, pageKey.slug),
					]);
					if (!development || !developmentFacts) return null;
					canonicalPageKey = development.pageKey as PageKey;
					routeData = {
						kind: "development",
						value: development,
						geo: developmentFacts.geo,
						gateFacts: developmentFacts,
					};
					facts = {
						geo: developmentFacts.geo,
						market: "newbuild",
						dataTier: developmentFacts.dataTier,
					};
				} else {
					const developerQuery = parsePageSearchParams(queryString);
					if (!developerQuery) return null;
					const [developer, developerFacts] = await Promise.all([
						getDeveloper(payload, pageKey.slug, brandName),
						getDeveloperRouteFacts(payload, pageKey.slug),
					]);
					if (!developer || !developerFacts) return null;
					const [developmentPage, developerCities] = await Promise.all([
						listDeveloperDevelopments(payload, {
							developerId: Number(developer.id),
							page: developerQuery.page,
							limit: 24,
						}),
						Promise.all(
							publishedDeveloperGeoSlugs(siteProfile).map((slug) =>
								getGeoBySlug(payload, slug),
							),
						),
					]);
					if (developerQuery.page > Math.max(1, developmentPage.totalPages))
						return null;
					const publishedDeveloperCities = developerCities.filter(
						(city): city is CityDTO => city !== null,
					);
					const developerGateFacts = await listDevelopmentGateFactsForCities(
						payload,
						publishedDeveloperCities.map((city) => Number(city.id)),
					);
					const passingDeveloperIds = passingDevelopmentDeveloperIds(
						developerGateFacts.filter(
							(fact) => fact.developerId === developer.id,
						),
						new Map(
							publishedDeveloperCities.map((city) => [
								String(city.id),
								city.slug,
							]),
						),
					);
					canonicalPageKey = developer.pageKey as PageKey;
					routeData = {
						kind: "developer",
						value: developer,
						developments: developmentPage.items,
						pagination: {
							page: developmentPage.page,
							total: developmentPage.total,
							totalPages: developmentPage.totalPages,
						},
						hasPassingDevelopment: passingDeveloperIds.has(developer.id),
						descriptionSource: developerFacts.descriptionSource,
						descriptionCheckedAt: developerFacts.descriptionCheckedAt,
					};
					facts = { geo: null, market: null, dataTier: null };
				}
				inventory.set(
					key,
					routeData.kind === "developer"
						? routeData.value.developmentsCount
						: 1,
				);
				const record = lifecycleRecord(
					lifecycle,
					grammar,
					facts,
					canonicalPageKey,
				);
				if (record) data.set(key, routeData);
				return record;
			},
		};

		const decision = await createRouteResolver({
			profile: siteProfile,
			grammar,
			port,
		}).resolvePath(pathname);
		if (decision.kind !== "page") return { decision };
		const routeData = data.get(decision.canonicalPath);
		if (!routeData) {
			return { decision: { kind: "notFound", statusCode: 404 } };
		}
		const resolution: RuntimeRouteResolution = {
			decision: decidePage(decision, routeData),
			data: routeData,
			nap,
		};
		const queryVariant =
			routeData.kind === "listing"
				? routeData.query
				: routeData.kind === "developer"
					? parsePageSearchParams(queryString)
					: null;
		const canonicalPath = queryVariant?.queryString
			? routeData.kind === "listing" && routeData.query
				? catalogCanonicalPath(decision.canonicalPath, routeData.query)
				: `${decision.canonicalPath}?${queryVariant.queryString}`
			: null;
		return canonicalPath
			? {
					...resolution,
					...(routeData.kind === "listing"
						? { data: queryListingData(routeData, canonicalPath) }
						: {}),
					decision: queryPageDecision(
						resolution.decision as PageDecision,
						canonicalPath,
					),
				}
			: resolution;
	}

async function resolveRuntimeRoutePersisted(
	pathname: string,
	queryString = "",
): Promise<RuntimeRouteResolution> {
	const functionalQueryString =
		separateTrackingQueryParams(queryString).functionalQueryString;
	const grammar = createProjectUrlGrammar(
		siteProfile,
		await getCachedDistrictRouteRegistry(),
	);
	const pageKey = grammar.parseUrl(pathname);
	const cacheIdentity = publicGatewayRouteCacheIdentity(
		siteProfile,
		pageKey,
		functionalQueryString,
	);
	const catalogQuery =
		pageKey?.kind === "categoryRoot" ||
		pageKey?.kind === "categoryGeo" ||
		pageKey?.kind === "categoryGeoDistrict" ||
		pageKey?.kind === "categoryGeoFacet"
			? parseCatalogSearchParams(functionalQueryString)
			: null;
	const filteredCatalogKey =
		catalogQuery &&
		catalogFilterKeysForQuery(catalogQuery).length > 0 &&
		pageKey
			? `filtered-catalog:${grammar.buildUrl(pageKey)}?${catalogQuery.queryString}`
			: null;
	if (filteredCatalogKey) {
		return getCachedFilteredCatalogRoute(filteredCatalogKey, () =>
			resolveRuntimeRouteUncached(pathname, functionalQueryString),
		);
	}
	if (!cacheIdentity) {
		return resolveRuntimeRouteUncached(pathname, functionalQueryString);
	}
	const cached = unstable_cache(
		() => resolveRuntimeRouteUncached(pathname, functionalQueryString),
		["public-gateway-route", pathname, ...cacheIdentity.keyParts],
		{
			tags: publicGatewayCacheTags(pageKey),
			revalidate: 3600,
		},
	);
	return cached();
}

export const resolveRuntimeRoute = cache(resolveRuntimeRoutePersisted);
