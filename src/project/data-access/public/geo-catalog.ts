import "server-only";

import type {
	CatalogSurfaceSlug,
	CityDTO,
	DeveloperCardDTO,
	DeveloperDetailsDTO,
	DevelopmentCardDTO,
	DevelopmentDetailsDTO,
	GeoHubDTO,
	ListingPageDTO,
	PageKeyDTO,
	PageLinkDTO,
	PropertyCardDTO,
	PropertyDetailsDTO,
} from "@ams/realtbase-contracts";
import type { Payload, Where } from "payload";
import { z } from "zod";
import {
	catalogSurfaceMarketMatrix,
	type Market,
	type SiteProfile,
} from "@/core/profile";
import type { UrlGrammar } from "@/core/routing";
import type { ContentGateInput } from "@/core/seo/content-gate";
import { validateHttpsExternalImageUrl } from "@/core/ingest/image-hosts";
import { getRuntimeClock } from "@/core/time/clock";
import {
	projectBreadcrumbs,
	projectNavigationLinks,
	projectObjectBreadcrumbs,
} from "@/project/navigation";
import type {
	City,
	Developer,
	Development,
	District,
	Media,
	Property,
	Region,
} from "@/project/payload-types";
import {
	allowedPropertyImageHosts,
	countPropertyGatePhotos,
} from "@/project/routing/property-gate-facts";
import {
	projectSeoCategoryForms,
	projectSeoActiveCategoriesList,
	projectSeoFacetLabel,
	projectSeoMeta,
	renderProjectSeoTemplate,
} from "@/project/seo/templates";
import {
	activeProjectGeoCategorySurfaces,
	siteProfile,
} from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";
import {
	isDevelopmentTierCPublicPassport,
	isFreshDevelopmentPrice,
} from "../../../core/developments/domain.ts";
import {
	type CatalogQueryInput,
	findPublicCatalogPropertiesByGeo,
	findPublicPropertyByPublicUrlId,
	publicPropertyPublicationWhere,
} from "./catalog";
import { toPropertyCardDTO, toPropertyDetailsDTO } from "./dto";
import { publicGatewayPolicy } from "./policy";

const slugSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const pageSchema = z.number().int().min(1).max(10_000).default(1);
const pageSizeSchema = z.number().int().min(1).max(48).default(24);
const urlGrammar = createProjectUrlGrammar(siteProfile);
const gatewayAccess = {
	overrideAccess: publicGatewayPolicy.overrideAccess,
	context: publicGatewayPolicy.context,
} as const;

const geoSelect = {
	slug: true,
	title: true,
	morphology: true,
	preposition: true,
	cityType: true,
	region: true,
	agglomerationOf: true,
	coordinates: true,
	status: true,
	publishedAt: true,
} as const;

const districtSelect = {
	slug: true,
	title: true,
	morphology: true,
	districtType: true,
	adjLocative: true,
	adjGenitive: true,
	locative: true,
	city: true,
	parent: true,
	preposition: true,
	status: true,
	publishedAt: true,
	categories: true,
} as const;

const developmentSelect = {
	name: true,
	slug: true,
	kind: true,
	city: true,
	district: true,
	developer: true,
	address: true,
	coordinates: true,
	completion: true,
	salesStatus: true,
	salesAvailability: true,
	completenessScore: true,
	priceByRooms: true,
	mediaItems: true,
	layouts: true,
	progress: true,
	descriptions: true,
	faq: true,
	status: true,
	publishedAt: true,
	contentPurgedAt: true,
} as const;

const developerSelect = {
	name: true,
	slug: true,
	legalName: true,
	logo: true,
	siteUrl: true,
	description: true,
	source: true,
	checkedAt: true,
	status: true,
	publishedAt: true,
	contentPurgedAt: true,
} as const;

export type PublicListingInput = {
	geo: string;
	surface: CatalogSurfaceSlug;
	district?: string;
	facet?: string;
	query?: CatalogQueryInput & {
		market?: Market;
		developer?: string;
		completionYear?: number;
	};
	page?: number;
};

export type PublicDevelopmentDetailsDTO = DevelopmentDetailsDTO & {
	faq: readonly { question: string; answer: string }[];
};

type DevelopmentGateInput = Extract<ContentGateInput, { kind: "development" }>;

export type PublicDevelopmentGateFacts = Pick<
	DevelopmentGateInput,
	| "developerPresent"
	| "cityPresent"
	| "addressPresent"
	| "coordinatesPresent"
	| "classPresent"
	| "completionOrDeadlinePresent"
	| "salesStatusPresent"
	| "completed"
	| "description"
	| "descriptionSource"
	| "descriptionCheckedAt"
	| "validPriceRows"
	| "validMediaCount"
	| "validLayoutCount"
	| "progressPresent"
	| "dataTier"
>;

function nonEmptyText(value: unknown): boolean {
	return typeof value === "string" && value.trim().length > 0;
}

function effectiveDevelopmentDescription(development: Development) {
	const description =
		development.descriptions?.find((item) => item.kind === "full") ??
		development.descriptions?.find((item) => item.kind === "short");
	const source = description?.source;
	const checkedAt = description?.checkedAt;
	return {
		text: description?.text ?? "",
		source:
			typeof source === "string" && source.trim().length > 0
				? source.trim()
				: null,
		checkedAt:
			typeof checkedAt === "string" && checkedAt.trim().length > 0
				? checkedAt
				: null,
	};
}

export function countDevelopmentGateMedia(
	items: Development["mediaItems"],
	allowedHosts = allowedPropertyImageHosts(),
): number {
	return (items ?? []).filter((item) => {
		if (
			!["hero", "gallery", "layout", "construction_progress"].includes(
				item.mediaType,
			) ||
			!nonEmptyText(item.rights) ||
			!nonEmptyText(item.source) ||
			!nonEmptyText(item.checkedAt)
		) {
			return false;
		}
		if (item.kind === "managed") {
			return isObjectRelation<Media>(item.media) && Boolean(item.media.url);
		}
		return (
			item.kind === "external" &&
			typeof item.externalUrl === "string" &&
			validateHttpsExternalImageUrl(item.externalUrl, allowedHosts).ok
		);
	}).length;
}

function toDevelopmentGateFacts(
	development: Development,
): PublicDevelopmentGateFacts {
	const description = effectiveDevelopmentDescription(development);
	return {
		developerPresent: Boolean(relationId(development.developer)),
		cityPresent: Boolean(relationId(development.city)),
		addressPresent: nonEmptyText(development.address),
		coordinatesPresent:
			development.coordinates?.latitude != null &&
			development.coordinates.longitude != null,
		classPresent: nonEmptyText(development.class),
		completionOrDeadlinePresent:
			nonEmptyText(development.completion) ||
			nonEmptyText(development.deadline),
		salesStatusPresent:
			development.salesStatus === "on_sale" ||
			development.salesStatus === "sales_finished" ||
			development.salesStatus === "completed",
		completed: development.salesStatus === "completed",
		description: description.text,
		descriptionSource: description.source,
		descriptionCheckedAt: description.checkedAt,
		validPriceRows:
			development.priceByRooms?.flatMap((row) => {
				const { priceCheckedAt, source } = row;
				if (
					!Number.isFinite(row.priceFromMinor) ||
					row.priceFromMinor <= 0 ||
					typeof priceCheckedAt !== "string" ||
					priceCheckedAt.trim().length === 0 ||
					typeof source !== "string" ||
					source.trim().length === 0
				) {
					return [];
				}
				return [{ checkedAt: priceCheckedAt, source: source.trim() }];
			}) ?? [],
		validMediaCount: countDevelopmentGateMedia(development.mediaItems),
		validLayoutCount:
			development.layouts?.filter((layout) => nonEmptyText(layout.title))
				.length ?? 0,
		progressPresent: (development.progress?.length ?? 0) > 0,
		dataTier: development.dataTier,
	};
}

export async function getGeoBySlug(
	payload: Payload,
	slug: string,
	profile: SiteProfile = siteProfile,
): Promise<CityDTO | null> {
	const parsedSlug = slugSchema.parse(slug);
	if (!isRoutableGeo(parsedSlug, profile)) return null;
	const city = await findGeoRecord(payload, parsedSlug);
	return city ? toCityDTO(city) : null;
}

export async function getGeoHub(
	payload: Payload,
	slug: string,
	brandName: string,
	grammar: UrlGrammar = urlGrammar,
): Promise<GeoHubDTO | null> {
	const geo = slugSchema.parse(slug);
	if (!isRoutableGeo(geo)) return null;
	const city = await findGeoRecord(payload, geo);
	if (!city) return null;
	const [districts, nearby] = await Promise.all([
		findPublishedDistricts(payload, Number(city.id)),
		findNearbyCities(payload, city),
	]);
	const pageKey = { kind: "geoHub", geo } as const;
	const href = safeBuildUrl(pageKey, grammar);
	const geoSurfaces = activeProjectGeoCategorySurfaces(siteProfile, geo);
	const seoContext = {
		brand: brandName,
		city: cityMorphology(city),
		activeCategoriesList: projectSeoActiveCategoriesList(geoSurfaces),
	};
	const renderedSeo = renderProjectSeoTemplate("geoHub", seoContext);
	return {
		city: toCityDTO(city),
		title: renderedSeo.h1,
		intro: `Каталог объектов и проектов: ${city.title}.`,
		breadcrumbs: projectBreadcrumbs(
			[{ label: "Главная", pageKey: { kind: "home" } }],
			city.title,
			{ grammar },
		),
		seo: projectSeoMeta("geoHub", seoContext, href),
		categoryLinks: projectNavigationLinks(
			geoSurfaces.map((surface) => ({
				pageKey: { kind: "categoryGeo", geo, category: surface },
				label: surfaceLabel(surface),
			})),
			{ grammar },
		),
		districtLinks: projectNavigationLinks(
			districts
				.filter((district) => district.categories?.includes("kvartiry"))
				.map((district) => ({
					pageKey: {
						kind: "categoryGeoDistrict",
						geo,
						category: "kvartiry",
						district: district.slug,
					},
					label: district.title,
				})),
			{ grammar },
		),
		developerLink: projectNavigationLinks(
			[{ pageKey: { kind: "geoDevelopers", geo }, label: "Застройщики" }],
			{ grammar },
		)[0],
		nearby: projectNavigationLinks(
			nearby.map((item) => ({
				pageKey: { kind: "geoHub", geo: item.slug },
				label: item.title,
			})),
			{ grammar },
		),
	};
}

export async function getListing(
	payload: Payload,
	input: PublicListingInput,
	brandName: string,
	grammar: UrlGrammar = urlGrammar,
	profile: SiteProfile = siteProfile,
): Promise<ListingPageDTO | null> {
	const parsed = z
		.object({
			geo: slugSchema,
			surface: z.enum([
				"kvartiry",
				"doma",
				"uchastki",
				"kommercheskaya-nedvizhimost",
				"komnaty",
				"garazhi",
				"arenda",
				"novostroyki",
				"kottedzhnye-poselki",
			]),
			district: slugSchema.optional(),
			facet: slugSchema.optional(),
			query: z.unknown().optional(),
			page: pageSchema.optional(),
		})
		.strict()
		.parse(input);
	if (!Object.hasOwn(profile.geos, parsed.geo)) return null;
	const city = await findGeoRecord(payload, parsed.geo);
	if (!city) return null;
	const query = (parsed.query as PublicListingInput["query"] | undefined) ?? {};
	const queryDistrict =
		typeof query.district === "string"
			? slugSchema.safeParse(query.district)
			: null;
	if (queryDistrict && !queryDistrict.success) return null;
	if (parsed.district && queryDistrict?.success) return null;
	const districtSlug = parsed.district ?? queryDistrict?.data;
	const district = districtSlug
		? await findDistrict(payload, Number(city.id), districtSlug, parsed.surface)
		: null;
	if (districtSlug && !district) return null;
	let markets = availableMarketsForSurface(profile, parsed.geo, parsed.surface);
	if (markets.length === 0) return null;
	if (query.market) {
		markets = markets.filter((market) => market === query.market);
		if (markets.length === 0) return null;
	}
	const facetResolution = parsed.facet
		? catalogQueryForSeoFacet(profile, parsed.geo, parsed.surface, parsed.facet)
		: { query: {} };
	if (parsed.facet && !facetResolution) return null;
	if (facetResolution?.market) {
		markets = markets.filter((market) => market === facetResolution.market);
		if (markets.length === 0) return null;
	}

	const pageKey: PageKeyDTO = parsed.district
		? {
				kind: "categoryGeoDistrict",
				geo: parsed.geo,
				category: parsed.surface,
				district: parsed.district,
			}
		: parsed.facet
			? {
					kind: "categoryGeoFacet",
					geo: parsed.geo,
					category: parsed.surface,
					facet: parsed.facet,
				}
			: { kind: "categoryGeo", geo: parsed.geo, category: parsed.surface };
	const href = safeBuildUrl(pageKey, grammar);
	const facetLinks = projectNavigationLinks(
		Object.entries(profile.seoFacets).flatMap(([facetSlug, facet]) =>
			facet.geo === parsed.geo && facet.category === parsed.surface
				? [
						{
							pageKey: {
								kind: "categoryGeoFacet",
								geo: parsed.geo,
								category: parsed.surface,
								facet: facetSlug,
							},
							label: projectSeoFacetLabel(facetSlug),
						},
					]
				: [],
		),
		{ profile, grammar },
	);
	const nearbyLinks = projectNavigationLinks(
		(await findNearbyCities(payload, city)).map((item) => ({
			pageKey: { kind: "geoHub", geo: item.slug },
			label: item.title,
		})),
		{ profile, grammar },
	);
	const page = parsed.page ?? 1;
	const pageSize = pageSizeSchema.parse(
		(parsed.query as { limit?: number } | undefined)?.limit ?? 24,
	);

	if (
		parsed.surface === "novostroyki" ||
		parsed.surface === "kottedzhnye-poselki"
	) {
		const result = await findDevelopments(payload, {
			cityId: Number(city.id),
			districtId: district ? Number(district.id) : undefined,
			kind:
				parsed.surface === "novostroyki"
					? "residential_complex"
					: "cottage_village",
			developerSlug: query.developer,
			completionYear: query.completionYear,
			page,
			limit: pageSize,
		});
		if (page > Math.max(1, result.totalPages)) return null;
		return listingDTO(
			pageKey,
			href,
			city,
			district,
			parsed.surface,
			(result.docs as Development[]).map(toDevelopmentCardDTO),
			result.totalDocs,
			page,
			pageSize,
			brandName,
			facetLinks,
			nearbyLinks,
		);
	}

	const propertyFilter = surfacePropertyFilter(parsed.surface);
	const {
		district: _queryDistrict,
		market: _queryMarket,
		developer: _queryDeveloper,
		completionYear: _queryCompletionYear,
		...catalogQuery
	} = query;
	const result = await findPublicCatalogPropertiesByGeo(
		payload,
		{
			...catalogQuery,
			...(facetResolution?.query ?? {}),
			page,
			limit: pageSize,
			...propertyFilter,
		},
		{
			cityId: Number(city.id),
			districtId: district ? Number(district.id) : undefined,
			markets,
		},
	);
	if (page > Math.max(1, result.totalPages)) return null;
	return listingDTO(
		pageKey,
		href,
		city,
		district,
		parsed.surface,
		result.items.map(toPropertyCardDTO),
		result.total,
		result.page,
		result.pageSize,
		brandName,
		facetLinks,
		nearbyLinks,
	);
}

export async function getPropertyByPublicUrlId(
	payload: Payload,
	publicUrlId: number,
): Promise<PropertyDetailsDTO | null> {
	const property = await findPublicPropertyByPublicUrlId(payload, publicUrlId);
	return property ? toPropertyDetailsDTO(property, []) : null;
}

export async function getPropertyRouteFacts(
	payload: Payload,
	publicUrlId: number,
): Promise<{
	market: Market;
	geo: string | null;
	seoCity: ReturnType<typeof cityMorphology> | null;
	districtRaw: string | null;
	gatePhotoCount: number;
	priceCheckedAt: string | null;
} | null> {
	const result = await payload.find({
		collection: "properties",
		where: { publicUrlId: { equals: publicUrlId } },
		depth: 1,
		limit: 1,
		page: 1,
		select: {
			market: true,
			cityRef: true,
			district: true,
			images: { kind: true, url: true, media: true },
			lastSeenAt: true,
		},
		...gatewayAccess,
	});
	const property = result.docs[0] as
		| Pick<
				Property,
				"market" | "cityRef" | "district" | "images" | "lastSeenAt"
		  >
		| undefined;
	if (!property) return null;
	return {
		market: property.market,
		geo: isObjectRelation<City>(property.cityRef)
			? property.cityRef.slug
			: null,
		seoCity: isObjectRelation<City>(property.cityRef)
			? cityMorphology(property.cityRef)
			: null,
		districtRaw: property.district?.trim() || null,
		gatePhotoCount: countPropertyGatePhotos(
			property.images,
			allowedPropertyImageHosts(),
		),
		priceCheckedAt: property.lastSeenAt?.trim() || null,
	};
}

export async function getDevelopment(
	payload: Payload,
	slug: string,
	brandName: string,
): Promise<PublicDevelopmentDetailsDTO | null> {
	const result = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ slug: { equals: slugSchema.parse(slug) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 1,
		page: 1,
		select: developmentSelect,
		...gatewayAccess,
	});
	const development = result.docs[0] as Development | undefined;
	if (!development || !isDevelopmentTierCPublicPassport(development)) return null;
	return toDevelopmentDetailsDTO(development, brandName);
}

export async function getDevelopmentRouteFacts(
	payload: Payload,
	slug: string,
): Promise<(PublicDevelopmentGateFacts & { geo: string }) | null> {
	const result = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ slug: { equals: slugSchema.parse(slug) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 1,
		page: 1,
		select: {
			city: true,
			developer: true,
			address: true,
			coordinates: true,
			class: true,
			completion: true,
			deadline: true,
			salesStatus: true,
			dataTier: true,
			descriptions: true,
			mediaItems: true,
			layouts: true,
			progress: true,
			priceByRooms: true,
		},
		...gatewayAccess,
	});
	const development = result.docs[0] as Development | undefined;
	if (!development) return null;
	const city = isObjectRelation<City>(development.city)
		? development.city
		: null;
	return city
		? {
				geo: city.slug,
				...toDevelopmentGateFacts(development),
			}
		: null;
}

export async function getDeveloperRouteFacts(
	payload: Payload,
	slug: string,
): Promise<{
	descriptionSource: string | null;
	descriptionCheckedAt: string | null;
} | null> {
	const developerResult = await payload.find({
		collection: "developers",
		where: {
			and: [
				{ slug: { equals: slugSchema.parse(slug) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 0,
		limit: 1,
		page: 1,
		select: { source: true, checkedAt: true },
		...gatewayAccess,
	});
	const developer = developerResult.docs[0] as
		| Pick<Developer, "id" | "source" | "checkedAt">
		| undefined;
	if (!developer) return null;
	return {
		descriptionSource: developer.source || null,
		descriptionCheckedAt: developer.checkedAt || null,
	};
}

export async function listDevelopments(
	payload: Payload,
	input: {
		geo: string;
		kind?: Development["kind"];
		page?: number;
		limit?: number;
	},
): Promise<readonly DevelopmentCardDTO[]> {
	const geo = slugSchema.parse(input.geo);
	const city = await findGeoRecord(payload, geo);
	if (!city) return [];
	const result = await findDevelopments(payload, {
		cityId: Number(city.id),
		kind: input.kind,
		page: pageSchema.parse(input.page ?? 1),
		limit: pageSizeSchema.parse(input.limit ?? 24),
	});
	return (result.docs as Development[]).map(toDevelopmentCardDTO);
}

export type PublicDevelopmentPage = {
	items: readonly DevelopmentCardDTO[];
	total: number;
	page: number;
	totalPages: number;
};

export async function listDeveloperDevelopments(
	payload: Payload,
	input: { developerId: number; page?: number; limit?: number },
): Promise<PublicDevelopmentPage> {
	const page = pageSchema.parse(input.page ?? 1);
	const limit = pageSizeSchema.parse(input.limit ?? 24);
	const result = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ developer: { equals: input.developerId } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit,
		page,
		sort: "name",
		select: developmentSelect,
		...gatewayAccess,
	});
	return {
		items: (result.docs as Development[]).map(toDevelopmentCardDTO),
		total: result.totalDocs,
		page: result.page ?? page,
		totalPages: result.totalPages,
	};
}

export async function listAllDevelopments(
	payload: Payload,
	input: { geo: string; developerId?: number },
): Promise<readonly DevelopmentCardDTO[]> {
	if (input.developerId) {
		const first = await listDeveloperDevelopments(payload, {
			developerId: input.developerId,
			page: 1,
			limit: 48,
		});
		const items = [...first.items];
		for (let page = 2; page <= first.totalPages; page += 1) {
			items.push(
				...(
					await listDeveloperDevelopments(payload, {
						developerId: input.developerId,
						page,
						limit: 48,
					})
				).items,
			);
		}
		return items;
	}
	const geo = slugSchema.parse(input.geo);
	const city = await findGeoRecord(payload, geo);
	if (!city) return [];
	const first = await findDevelopments(payload, {
		cityId: Number(city.id),
		page: 1,
		limit: 48,
	});
	const rows = [...(first.docs as Development[])];
	for (let page = 2; page <= first.totalPages; page += 1) {
		const result = await findDevelopments(payload, {
			cityId: Number(city.id),
			page,
			limit: 48,
		});
		rows.push(...(result.docs as Development[]));
	}
	return rows.map(toDevelopmentCardDTO);
}

export type PublicDevelopmentGateFact = {
	developerId: string;
	cityId: string;
	slug: string;
	developmentKind: "residential_complex" | "cottage_village";
} & PublicDevelopmentGateFacts;

export async function listDevelopmentGateFactsForCities(
	payload: Payload,
	cityIds: readonly number[],
): Promise<readonly PublicDevelopmentGateFact[]> {
	if (cityIds.length === 0) return [];
	const result = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ city: { in: [...new Set(cityIds)] } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 2_000,
		page: 1,
		select: {
			slug: true,
			kind: true,
			city: true,
			developer: true,
			address: true,
			coordinates: true,
			class: true,
			completion: true,
			deadline: true,
			salesStatus: true,
			dataTier: true,
			descriptions: true,
			mediaItems: true,
			layouts: true,
			progress: true,
			priceByRooms: true,
		},
		...gatewayAccess,
	});
	if (result.totalPages > 1) {
		throw new Error(
			"Development Gate facts exceed the bounded 2000-row public read budget.",
		);
	}
	return (result.docs as Development[]).flatMap((development) => {
		const developerId = isObjectRelation<Developer>(development.developer)
			? String(development.developer.id)
			: String(development.developer);
		const cityId = isObjectRelation<City>(development.city)
			? String(development.city.id)
			: String(development.city);
		if (!developerId || !cityId) return [];
		return [
			{
				developerId,
				cityId,
				slug: development.slug,
				developmentKind: development.kind,
				...toDevelopmentGateFacts(development),
			},
		];
	});
}

export async function getDeveloper(
	payload: Payload,
	slug: string,
	brandName: string,
): Promise<DeveloperDetailsDTO | null> {
	const result = await payload.find({
		collection: "developers",
		where: {
			and: [
				{ slug: { equals: slugSchema.parse(slug) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 1,
		page: 1,
		select: developerSelect,
		...gatewayAccess,
	});
	const developer = result.docs[0] as Developer | undefined;
	if (!developer) return null;
	const firstDevelopmentPage = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ developer: { equals: Number(developer.id) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 48,
		page: 1,
		select: { city: true },
		...gatewayAccess,
	});
	const developments = [...(firstDevelopmentPage.docs as Development[])];
	for (let page = 2; page <= firstDevelopmentPage.totalPages; page += 1) {
		const next = await payload.find({
			collection: "developments",
			where: {
				and: [
					{ developer: { equals: Number(developer.id) } },
					{ status: { equals: "published" } },
				],
			},
			depth: 1,
			limit: 48,
			page,
			select: { city: true },
			...gatewayAccess,
		});
		developments.push(...(next.docs as Development[]));
	}
	return toDeveloperDetailsDTO(
		developer,
		developments,
		brandName,
		firstDevelopmentPage.totalDocs,
	);
}

export async function listGeoDevelopers(
	payload: Payload,
	geo: string,
): Promise<readonly DeveloperCardDTO[]> {
	const parsedGeo = slugSchema.parse(geo);
	const city = await findGeoRecord(payload, parsedGeo);
	if (!city) return [];
	const firstPage = await payload.find({
		collection: "developments",
		where: {
			and: [
				{ city: { equals: Number(city.id) } },
				{ status: { equals: "published" } },
			],
		},
		depth: 1,
		limit: 48,
		page: 1,
		select: { developer: true, city: true },
		...gatewayAccess,
	});
	const developments = [...(firstPage.docs as Development[])];
	for (let page = 2; page <= firstPage.totalPages; page += 1) {
		const next = await payload.find({
			collection: "developments",
			where: {
				and: [
					{ city: { equals: Number(city.id) } },
					{ status: { equals: "published" } },
				],
			},
			depth: 1,
			limit: 48,
			page,
			select: { developer: true, city: true },
			...gatewayAccess,
		});
		developments.push(...(next.docs as Development[]));
	}
	const groups = new Map<
		number,
		{ developer: Developer; developments: Development[] }
	>();
	for (const development of developments) {
		if (!isObjectRelation<Developer>(development.developer)) continue;
		const id = Number(development.developer.id);
		const group = groups.get(id) ?? {
			developer: development.developer,
			developments: [],
		};
		group.developments.push(development);
		groups.set(id, group);
	}
	return [...groups.values()].map(({ developer, developments: rows }) =>
		toDeveloperCardDTO(developer, rows),
	);
}

export async function getNearby(
	payload: Payload,
	geo: string,
	profile: SiteProfile = siteProfile,
): Promise<readonly PageLinkDTO[]> {
	const parsedGeo = slugSchema.parse(geo);
	if (!isRoutableGeo(parsedGeo, profile)) return [];
	const city = await findGeoRecord(payload, parsedGeo);
	if (!city) return [];
	const nearby = await findNearbyCities(payload, city);
	return projectNavigationLinks(
		nearby.map((item) => ({
			pageKey: { kind: "geoHub", geo: item.slug },
			label: item.title,
		})),
	);
}

export async function countInventory(
	payload: Payload,
	input: {
		geo: string;
		surface: CatalogSurfaceSlug;
		district?: string;
		facet?: string;
	},
	profile: SiteProfile = siteProfile,
): Promise<number> {
	const geo = slugSchema.parse(input.geo);
	const city = await findGeoRecord(payload, geo);
	if (!city) return 0;
	const district = input.district
		? await findDistrict(
				payload,
				Number(city.id),
				slugSchema.parse(input.district),
				input.surface,
			)
		: null;
	if (input.district && !district) return 0;
	let markets = availableMarketsForSurface(profile, geo, input.surface);
	if (markets.length === 0) return 0;
	const facetResolution = input.facet
		? catalogQueryForSeoFacet(profile, geo, input.surface, input.facet)
		: { query: {} };
	if (input.facet && !facetResolution) return 0;
	if (facetResolution?.market) {
		markets = markets.filter((market) => market === facetResolution.market);
		if (markets.length === 0) return 0;
	}
	if (
		input.surface === "novostroyki" ||
		input.surface === "kottedzhnye-poselki"
	) {
		if (!markets.includes("newbuild") || input.facet) return 0;
		const and: Where[] = [
			{ city: { equals: Number(city.id) } },
			{ status: { equals: "published" } },
			{
				kind: {
					equals:
						input.surface === "novostroyki"
							? "residential_complex"
							: "cottage_village",
				},
			},
		];
		if (district) and.push({ district: { equals: Number(district.id) } });
		const result = await payload.count({
			collection: "developments",
			where: { and },
			...gatewayAccess,
		});
		return result.totalDocs;
	}
	const filter = surfacePropertyFilter(input.surface);
	const result = await findPublicCatalogPropertiesByGeo(
		payload,
		{ ...filter, ...(facetResolution?.query ?? {}), page: 1, limit: 1 },
		{
			cityId: Number(city.id),
			districtId: district ? Number(district.id) : undefined,
			markets,
		},
	);
	return result.total;
}

export async function countGeoInventory(
	payload: Payload,
	geo: string,
	profile: SiteProfile = siteProfile,
): Promise<number> {
	const city = await findGeoRecord(payload, slugSchema.parse(geo));
	if (!city) return 0;
	const activeSurfacesForGeo = activeSurfaces(profile).filter((surface) => {
		const status = profile.geoCategoryStatus[geo]?.[surface];
		return status === "ACTIVE" || status === "NOINDEX_AUTO";
	});
	const markets = [
		...new Set(
			activeSurfacesForGeo.flatMap((surface) =>
				availableMarketsForSurface(profile, geo, surface),
			),
		),
	];
	const propertyCount = markets.length
		? await payload.count({
				collection: "properties",
				where: {
					and: [
						publicPropertyPublicationWhere,
						{ cityRef: { equals: Number(city.id) } },
						{ market: { in: markets } },
					],
				},
				...gatewayAccess,
			})
		: { totalDocs: 0 };
	const developmentCount = markets.includes("newbuild")
		? await payload.count({
				collection: "developments",
				where: {
					and: [
						{ city: { equals: Number(city.id) } },
						{ status: { equals: "published" } },
					],
				},
				...gatewayAccess,
			})
		: { totalDocs: 0 };
	return propertyCount.totalDocs + developmentCount.totalDocs;
}

async function findGeoRecord(
	payload: Payload,
	slug: string,
): Promise<City | null> {
	const result = await payload.find({
		collection: "cities",
		where: { slug: { equals: slug } },
		depth: 1,
		limit: 1,
		page: 1,
		select: geoSelect,
		...gatewayAccess,
	});
	return (result.docs[0] as City | undefined) ?? null;
}

async function findPublishedDistricts(
	payload: Payload,
	cityId: number,
): Promise<District[]> {
	const result = await payload.find({
		collection: "districts",
		where: {
			and: [
				{ city: { equals: cityId } },
				{ status: { equals: "published" } },
			],
		},
		depth: 0,
		limit: 48,
		page: 1,
		sort: "sortOrder",
		select: districtSelect,
		...gatewayAccess,
	});
	return result.docs as District[];
}

async function findDistrict(
	payload: Payload,
	cityId: number,
	slug: string,
	category?: CatalogSurfaceSlug,
): Promise<District | null> {
	const result = await payload.find({
		collection: "districts",
		where: {
			and: [
				{ city: { equals: cityId } },
				{ slug: { equals: slug } },
				{ status: { equals: "published" } },
			],
		},
		depth: 0,
		limit: 1,
		page: 1,
		select: districtSelect,
		...gatewayAccess,
	});
	const district = (result.docs[0] as District | undefined) ?? null;
	if (district && category && !district.categories?.includes(category)) {
		return null;
	}
	return district;
}

async function findNearbyCities(payload: Payload, city: City): Promise<City[]> {
	const primaryId = isObjectRelation<City>(city.agglomerationOf)
		? Number(city.agglomerationOf.id)
		: typeof city.agglomerationOf === "number"
			? city.agglomerationOf
			: Number(city.id);
	const result = await payload.find({
		collection: "cities",
		where: {
			or: [
				{ id: { equals: primaryId } },
				{ agglomerationOf: { equals: primaryId } },
			],
		},
		depth: 1,
		limit: 24,
		page: 1,
		sort: "sortOrder",
		select: geoSelect,
		...gatewayAccess,
	});
	return (result.docs as City[]).filter(
		(item) =>
			Number(item.id) !== Number(city.id) &&
			Object.hasOwn(siteProfile.geos, item.slug),
	);
}

async function findDevelopments(
	payload: Payload,
	input: {
		cityId: number;
		districtId?: number;
		kind?: Development["kind"];
		developerSlug?: string;
		completionYear?: number;
		page: number;
		limit: number;
	},
) {
	const and: Where[] = [
		{ city: { equals: input.cityId } },
		{ status: { equals: "published" } },
	];
	if (input.districtId) and.push({ district: { equals: input.districtId } });
	if (input.kind) and.push({ kind: { equals: input.kind } });
	if (input.developerSlug) {
		and.push({
			"developer.slug": { equals: slugSchema.parse(input.developerSlug) },
		});
	}
	if (input.completionYear) {
		and.push({
			deadline: {
				greater_than_equal: `${input.completionYear}-01-01T00:00:00.000Z`,
				less_than: `${input.completionYear + 1}-01-01T00:00:00.000Z`,
			},
		});
	}
	return payload.find({
		collection: "developments",
		where: { and },
		depth: 1,
		limit: input.limit,
		page: input.page,
		sort: "name",
		select: developmentSelect,
		...gatewayAccess,
	});
}

function toCityDTO(city: City): CityDTO {
	const region = isObjectRelation<Region>(city.region) ? city.region : null;
	if (!region)
		throw new Error(`Public city ${city.id} requires selected region.`);
	return {
		id: String(city.id),
		slug: city.slug,
		name: city.title,
		nameGenitive: city.morphology.genitive,
		nameLocative: city.morphology.prepositional,
		preposition:
			city.preposition === "na" ? "на" : city.preposition === "vo" ? "во" : "в",
		type:
			city.cityType === "city"
				? "city"
				: city.cityType === "urban_settlement"
					? "town"
					: "settlement",
		region: {
			id: String(region.id),
			slug: region.slug,
			name: region.title,
			shortName: region.shortName,
		},
		agglomerationOf: relationId(city.agglomerationOf),
		coordinates:
			city.coordinates?.latitude != null && city.coordinates.longitude != null
				? {
						latitude: city.coordinates.latitude,
						longitude: city.coordinates.longitude,
					}
				: undefined,
	};
}

function toDevelopmentCardDTO(development: Development): DevelopmentCardDTO {
	const city = objectRelation<City>(development.city, "city", development.id);
	const district = isObjectRelation<District>(development.district)
		? development.district
		: undefined;
	const developer = isObjectRelation<Developer>(development.developer)
		? development.developer
		: undefined;
	const pageKey = {
		kind: "development",
		developmentKind: development.kind,
		slug: development.slug,
	} as const;
	const price = minimumFreshPrice(development);
	return {
		id: String(development.id),
		slug: development.slug,
		pageKey,
		href: safeBuildUrl(pageKey),
		name: development.name,
		kind: development.kind,
		cityName: city.title,
		districtName: district?.title,
		address: development.address ?? undefined,
		developer: developer
			? {
					id: String(developer.id),
					name: developer.name,
					pageKey: { kind: "developer", slug: developer.slug },
					href: safeBuildUrl({ kind: "developer", slug: developer.slug }),
				}
			: undefined,
		primaryMedia: primaryDevelopmentMedia(development),
		priceFrom: price
			? {
					priceMinor: price.priceFromMinor,
					currency: "RUB",
					period: "total",
					label: rub(price.priceFromMinor),
				}
			: undefined,
		salesStatus: development.salesStatus,
		salesAvailability: development.salesAvailability,
		completenessScore: development.completenessScore,
		completionLabel: development.completion ?? undefined,
	};
}

function toDevelopmentDetailsDTO(
	development: Development,
	brandName: string,
): PublicDevelopmentDetailsDTO {
	const card = toDevelopmentCardDTO(development);
	const city = objectRelation<City>(development.city, "city", development.id);
	const price = minimumFreshPrice(development);
	const seoContext = {
		brand: brandName,
		entityName: development.name,
		city: cityMorphology(city),
		freshPrice: price
			? {
					label: rub(price.priceFromMinor),
					fresh: true,
				}
			: undefined,
	};
	return {
		...card,
		description:
			development.descriptions?.find((item) => item.kind === "full")?.text ??
			development.descriptions?.find((item) => item.kind === "short")?.text ??
			undefined,
		gallery:
			development.mediaItems?.flatMap((item) =>
				["hero", "gallery", "layout", "construction_progress"].includes(
					item.mediaType,
				) &&
				isObjectRelation<Media>(item.media) &&
				item.media.url
					? [
							{
								kind: "managed" as const,
								src: item.media.url,
								alt: item.media.alt,
							},
						]
					: [],
			) ?? [],
		coordinates:
			development.coordinates?.latitude != null &&
			development.coordinates.longitude != null
				? {
						latitude: development.coordinates.latitude,
						longitude: development.coordinates.longitude,
					}
				: undefined,
		priceByRooms: freshDevelopmentPrices(development).map((row) => ({
			roomsLabel: row.roomsLabel,
			priceFrom: {
				priceMinor: row.priceFromMinor,
				currency: "RUB" as const,
				period: "total" as const,
				label: rub(row.priceFromMinor),
			},
			priceTo:
				row.priceToMinor != null
					? {
							priceMinor: row.priceToMinor,
							currency: "RUB" as const,
							period: "total" as const,
							label: rub(row.priceToMinor),
						}
					: undefined,
			lotsAvailable: row.lotsAvailable ?? undefined,
			priceCheckedAt: row.priceCheckedAt,
		})),
		mediaItems:
			development.mediaItems?.flatMap((item) =>
				isObjectRelation<Media>(item.media) && item.media.url
					? [
							{
								media: {
									kind: "managed" as const,
									src: item.media.url,
									alt: item.media.alt,
								},
								mediaType: item.mediaType,
								capturedAt: item.capturedAt ?? undefined,
							},
						]
					: [],
			) ?? [],
		faq:
			development.faq?.map((item) => ({
				question: item.question,
				answer: item.answer,
			})) ?? [],
		characteristics: [
			development.completion
				? { label: "Срок", value: development.completion }
				: null,
			{
				label: "Готовность данных",
				value: `${development.completenessScore}%`,
			},
		].filter((item): item is { label: string; value: string } => item != null),
		breadcrumbs: projectObjectBreadcrumbs({
			category:
				development.kind === "cottage_village"
					? "kottedzhnye-poselki"
					: "novostroyki",
			city: { label: city.title, slug: city.slug },
			currentLabel: development.name,
		}),
		seo: projectSeoMeta("developmentNormal", seoContext, card.href),
	};
}

function toDeveloperCardDTO(
	developer: Developer,
	developments: readonly Development[],
): DeveloperCardDTO {
	const pageKey = { kind: "developer", slug: developer.slug } as const;
	return {
		id: String(developer.id),
		slug: developer.slug,
		pageKey,
		href: safeBuildUrl(pageKey),
		name: developer.name,
		logo:
			isObjectRelation<Media>(developer.logo) && developer.logo.url
				? { kind: "managed", src: developer.logo.url, alt: developer.logo.alt }
				: undefined,
		developmentsCount: developments.length,
		geoNames: [
			...new Set(
				developments.flatMap((item) =>
					isObjectRelation<City>(item.city) ? [item.city.title] : [],
				),
			),
		],
	};
}

function toDeveloperDetailsDTO(
	developer: Developer,
	developments: readonly Development[],
	brandName: string,
	developmentsCount = developments.length,
): DeveloperDetailsDTO {
	const card = {
		...toDeveloperCardDTO(developer, developments),
		developmentsCount,
	};
	return {
		...card,
		legalName: developer.legalName ?? undefined,
		description: developer.description ?? undefined,
		website: developer.siteUrl ?? undefined,
		breadcrumbs: projectBreadcrumbs(
			[
				{ label: "Главная", pageKey: { kind: "home" } },
				{ label: "Застройщики", pageKey: { kind: "developerRoot" } },
			],
			developer.name,
		),
		seo: projectSeoMeta(
			"developer",
			{
				brand: brandName,
				entityName: developer.name,
				inventory: developmentsCount,
			},
			card.href,
		),
	};
}

function listingDTO(
	pageKey: PageKeyDTO,
	href: string,
	city: City,
	district: District | null,
	surface: CatalogSurfaceSlug,
	items: readonly (PropertyCardDTO | DevelopmentCardDTO)[],
	total: number,
	page: number,
	pageSize: number,
	brandName: string,
	subLinks: readonly PageLinkDTO[] = [],
	nearby: readonly PageLinkDTO[] = [],
): ListingPageDTO {
	const totalPages = Math.ceil(total / pageSize);
	const templateKey =
		pageKey.kind === "categoryGeoDistrict"
			? district?.districtType === "microdistrict"
				? "categoryGeoDistrictMicro"
				: "categoryGeoDistrictAdmin"
			: pageKey.kind === "categoryGeoFacet"
				? "categoryGeoFacet"
				: "categoryGeo";
	const seoContext = {
		brand: brandName,
		category: projectSeoCategoryForms(surface),
		city: cityMorphology(city),
		district: district ? districtMorphology(district) : undefined,
		districtType: district?.districtType,
		districtAdjLocative: district?.adjLocative ?? undefined,
		districtAdjGenitive: district?.adjGenitive ?? undefined,
		facet:
			pageKey.kind === "categoryGeoFacet"
				? projectSeoFacetLabel(pageKey.facet)
				: undefined,
		inventory: total,
	};
	const renderedSeo = renderProjectSeoTemplate(templateKey, seoContext);
	return {
		pageKey,
		href,
		h1: renderedSeo.h1,
		intro: `Актуальные предложения: ${city.title}.`,
		items: items.map(
			(item) =>
				({
					kind:
						"category" in item
							? ("property" as const)
							: ("development" as const),
					item,
				}) as ListingPageDTO["items"][number],
		),
		total,
		pagination: {
			page,
			pageSize,
			totalPages,
			previousPage: page > 1 ? page - 1 : undefined,
			nextPage: page < totalPages ? page + 1 : undefined,
		},
		subLinks,
		nearby,
		robots: { indexing: "noindex", following: "follow" },
		canonical: href,
		breadcrumbs: projectBreadcrumbs(
			[
				{ label: "Главная", pageKey: { kind: "home" } },
				{
					label: city.title,
					pageKey: {
						kind: "geoHub",
						geo:
							pageKey.kind === "categoryRoot"
								? siteProfile.primaryGeo
								: "geo" in pageKey
									? pageKey.geo
									: siteProfile.primaryGeo,
					},
				},
			],
			surfaceLabel(surface),
		),
		seo: projectSeoMeta(templateKey, seoContext, href),
	};
}

function availableMarketsForSurface(
	profile: SiteProfile,
	geo: string,
	surface: CatalogSurfaceSlug,
): Market[] {
	return catalogSurfaceMarketMatrix[surface].filter((market) => {
		const capability = profile.marketCapability[market];
		const geoStatus = profile.marketStatus[geo]?.[market];
		return (
			(capability === "ACTIVE" || capability === "NOINDEX_AUTO") &&
			(geoStatus === "ACTIVE" || geoStatus === "NOINDEX_AUTO")
		);
	});
}

function catalogQueryForSeoFacet(
	profile: SiteProfile,
	geo: string,
	surface: CatalogSurfaceSlug,
	slug: string,
): { query: Partial<CatalogQueryInput>; market?: Market } | null {
	const facet = profile.seoFacets[slug];
	if (!facet || facet.geo !== geo || facet.category !== surface) return null;
	if (facet.filter.key === "rooms" && Array.isArray(facet.filter.value)) {
		const rooms = facet.filter.value.filter(
			(value): value is number =>
				typeof value === "number" && Number.isSafeInteger(value) && value >= 0,
		);
		return rooms.length === facet.filter.value.length && rooms.length > 0
			? { query: { rooms } }
			: null;
	}
	if (
		facet.filter.key === "market" &&
		(facet.filter.value === "secondary" || facet.filter.value === "newbuild")
	) {
		return { query: {}, market: facet.filter.value };
	}
	return null;
}

function surfacePropertyFilter(
	surface: CatalogSurfaceSlug,
): Pick<CatalogQueryInput, "category" | "dealType"> {
	if (surface === "arenda") return { dealType: "rent" };
	const categoryBySurface: Partial<
		Record<CatalogSurfaceSlug, CatalogQueryInput["category"]>
	> = {
		kvartiry: "apartment",
		doma: "house",
		uchastki: "land",
		"kommercheskaya-nedvizhimost": "commercial",
		komnaty: "room",
		garazhi: "garage",
	};
	const category = categoryBySurface[surface];
	return category ? { category, dealType: "sale" } : {};
}

function activeSurfaces(profile: SiteProfile): CatalogSurfaceSlug[] {
	return Object.entries(profile.categoryStatus).flatMap(([surface, status]) =>
		status === "PREPARED_OFF" ? [] : [surface as CatalogSurfaceSlug],
	);
}

function isRoutableGeo(
	slug: string,
	profile: SiteProfile = siteProfile,
): boolean {
	return Object.hasOwn(profile.geos, slug);
}

function surfaceLabel(surface: CatalogSurfaceSlug): string {
	return (
		{
			kvartiry: "Квартиры",
			doma: "Дома",
			uchastki: "Участки",
			"kommercheskaya-nedvizhimost": "Коммерческая недвижимость",
			komnaty: "Комнаты",
			garazhi: "Гаражи",
			arenda: "Аренда",
			novostroyki: "Новостройки",
			"kottedzhnye-poselki": "Коттеджные посёлки",
		} as const
	)[surface];
}

function safeBuildUrl(
	pageKey: PageKeyDTO,
	grammar: UrlGrammar = urlGrammar,
): string {
	return grammar.buildUrl(pageKey as Parameters<typeof grammar.buildUrl>[0]);
}

function cityMorphology(city: City) {
	return {
		approved: city.morphologyApproved,
		nominative: city.morphology.nominative,
		genitive: city.morphology.genitive,
		prepositional: city.morphology.prepositional,
		preposition:
			city.preposition === "na"
				? ("на" as const)
				: city.preposition === "vo"
					? ("во" as const)
					: ("в" as const),
	};
}

function districtMorphology(district: District) {
	return {
		approved: district.morphologyApproved,
		nominative: district.morphology.nominative,
		genitive: district.morphology.genitive,
		prepositional:
			district.districtType === "microdistrict"
				? (district.locative ?? "")
				: district.morphology.prepositional,
		preposition:
			district.preposition === "na"
				? ("на" as const)
				: district.preposition === "vo"
					? ("во" as const)
					: ("в" as const),
	};
}

function isObjectRelation<T extends { id: unknown }>(
	value: unknown,
): value is T {
	return Boolean(value && typeof value === "object" && "id" in value);
}

function objectRelation<T extends { id: unknown }>(
	value: unknown,
	label: string,
	owner: unknown,
): T {
	if (!isObjectRelation<T>(value))
		throw new Error(`Public ${label} relation was not selected for ${owner}.`);
	return value;
}

function relationId(value: unknown): string | undefined {
	if (isObjectRelation<{ id: unknown }>(value)) return String(value.id);
	return typeof value === "number" || typeof value === "string"
		? String(value)
		: undefined;
}

function freshDevelopmentPrices(development: Development) {
	const referenceDate = getRuntimeClock().now();
	return (development.priceByRooms ?? []).filter((row) =>
		isFreshDevelopmentPrice(row.priceCheckedAt, referenceDate),
	);
}

function minimumFreshPrice(development: Development) {
	return freshDevelopmentPrices(development).reduce<
		NonNullable<Development["priceByRooms"]>[number] | undefined
	>(
		(minimum, row) =>
			!minimum || row.priceFromMinor < minimum.priceFromMinor ? row : minimum,
		undefined,
	);
}

function primaryDevelopmentMedia(development: Development) {
	const media =
		development.mediaItems?.find(
			(item) =>
				item.mediaType === "hero" &&
				isObjectRelation<Media>(item.media) &&
				item.media.url,
		)?.media ??
		development.mediaItems?.find(
			(item) =>
				item.mediaType === "gallery" &&
				isObjectRelation<Media>(item.media) &&
				item.media.url,
		)?.media;
	return isObjectRelation<Media>(media) && media.url
		? { kind: "managed" as const, src: media.url, alt: media.alt }
		: undefined;
}

function rub(priceMinor: number): string {
	return new Intl.NumberFormat("ru-RU", {
		style: "currency",
		currency: "RUB",
		maximumFractionDigits: 0,
	}).format(priceMinor / 100);
}
