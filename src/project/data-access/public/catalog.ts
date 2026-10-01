import "server-only";

import type {
	PropertyCategory,
	PropertyDealType,
	PropertySort,
	PropertyView,
} from "@ams/realtbase-contracts";
import type { Payload, Where } from "payload";
import { z } from "zod";
import { sanitizeExplicitRedirectPath } from "@/core/seo/redirect-path";
import type { PropertiesSelect, Property } from "@/project/payload-types";
import {
	aggregatePublicCatalogFacets,
	findPublicPropertyLifecycleRow,
	findPublicRedirectByFromPath,
	listPublicSitemapPropertiesPage,
	publicRedirectDestinationIsChain,
} from "./payload-reads";
import { publicGatewayPolicy } from "./policy";

export const publicPropertySelect = {
	slug: true,
	status: true,
	publicUrlId: true,
	publishedAt: true,
	contentPurgedAt: true,
	market: true,
	category: true,
	dealType: true,
	priceMinor: true,
	currency: true,
	pricePerMeterMinor: true,
	rooms: true,
	totalArea: true,
	livingArea: true,
	kitchenArea: true,
	floor: true,
	floors: true,
	locality: true,
	district: true,
	publicAddress: true,
	lat: true,
	lng: true,
	title: true,
	description: true,
	images: {
		kind: true,
		url: true,
		alt: true,
		order: true,
	},
	updatedAt: true,
} satisfies PropertiesSelect<true>;

const propertyCategorySchema = z.enum([
	"apartment",
	"house",
	"land",
	"commercial",
	"room",
	"garage",
]);
const propertyDealTypeSchema = z.enum(["sale", "rent"]);
const propertySortSchema = z.enum([
	"recommended",
	"newest",
	"priceAsc",
	"priceDesc",
]);
const propertyViewSchema = z.enum(["grid", "list", "map"]);

const optionalPositiveInt = z.coerce.number().int().positive().optional();
const optionalNonNegativeNumber = z.coerce.number().nonnegative().optional();

export const catalogQuerySchema = z.object({
	page: z.coerce.number().int().positive().default(1),
	limit: z.coerce
		.number()
		.int()
		.min(1)
		.max(publicGatewayPolicy.maxLimit)
		.default(24),
	sort: propertySortSchema.default("recommended"),
	view: propertyViewSchema.default("grid"),
	query: z.string().trim().min(1).max(120).optional(),
	category: propertyCategorySchema.optional(),
	dealType: propertyDealTypeSchema.optional(),
	city: z.string().trim().min(1).max(80).optional(),
	district: z.string().trim().min(1).max(80).optional(),
	rooms: z.array(z.coerce.number().int().min(0).max(100)).max(8).optional(),
	priceFromMinor: optionalPositiveInt,
	priceToMinor: optionalPositiveInt,
	areaFrom: optionalNonNegativeNumber,
	areaTo: optionalNonNegativeNumber,
});

export type CatalogQueryInput = z.input<typeof catalogQuerySchema>;
export type CatalogQuery = z.output<typeof catalogQuerySchema>;

export type PublicCatalogProperty = Pick<
	Property,
	| "id"
	| "slug"
	| "status"
	| "publicUrlId"
	| "market"
	| "category"
	| "dealType"
	| "priceMinor"
	| "currency"
	| "pricePerMeterMinor"
	| "rooms"
	| "totalArea"
	| "livingArea"
	| "kitchenArea"
	| "floor"
	| "floors"
	| "locality"
	| "district"
	| "publicAddress"
	| "lat"
	| "lng"
	| "title"
	| "description"
	| "images"
	| "updatedAt"
>;

type PublicCatalogSelectedProperty = PublicCatalogProperty &
	Pick<Property, "status" | "publishedAt" | "contentPurgedAt">;

export type PublicPropertyLifecycleLookup =
	| { found: false }
	| {
			found: true;
			slug: string;
			publicUrlId: number;
			category: PropertyCategory;
			status: Property["status"];
			publishedAt?: string | null;
			contentPurgedAt?: string | null;
			explicitRedirectPath?: string | null;
	  };

export type PublicCatalogResult = {
	items: readonly PublicCatalogProperty[];
	total: number;
	page: number;
	pageSize: number;
	totalPages: number;
	applied: {
		query?: string;
		category?: PropertyCategory;
		dealType?: PropertyDealType;
		city?: string;
		district?: string;
		rooms?: readonly number[];
		priceFromMinor?: number;
		priceToMinor?: number;
		areaFrom?: number;
		areaTo?: number;
		sort: PropertySort;
		view: PropertyView;
	};
};

export type PublicCatalogFacetsResult = {
	source: "payload-aggregate";
	total: number;
	categories: readonly { value: PropertyCategory; count: number }[];
	dealTypes: readonly { value: PropertyDealType; count: number }[];
	cities: readonly { value: string; count: number }[];
	districts: readonly { value: string; count: number }[];
	rooms: readonly { value: number; count: number }[];
	priceMinor: {
		min: number | null;
		max: number | null;
	};
};

export const publicPropertyPublicationWhere: Where = {
	and: [
		{ status: { equals: "active" } },
		{ publishedAt: { exists: true } },
		{ contentPurgedAt: { exists: false } },
	],
};

export const publicPropertyRetainedArchivedWhere: Where = {
	and: [
		{ status: { equals: "archived" } },
		{ publishedAt: { exists: true } },
		{ contentPurgedAt: { exists: false } },
	],
};

export const publicPropertyDetailsWhere: Where = {
	or: [publicPropertyPublicationWhere, publicPropertyRetainedArchivedWhere],
};

function buildCatalogWhere(
	query: CatalogQuery,
	scope?: {
		cityId: number;
		districtId?: number;
		markets?: readonly Property["market"][];
	},
): Where {
	const and: Where[] = [publicPropertyPublicationWhere];
	if (scope) and.push({ cityRef: { equals: scope.cityId } });
	if (scope?.districtId)
		and.push({ districtRef: { equals: scope.districtId } });
	if (scope?.markets?.length) and.push({ market: { in: [...scope.markets] } });

	if (query.query) {
		and.push({
			or: [
				{ title: { contains: query.query } },
				{ publicAddress: { contains: query.query } },
				{ locality: { contains: query.query } },
				{ district: { contains: query.query } },
			],
		});
	}

	if (query.category) and.push({ category: { equals: query.category } });
	if (query.dealType) and.push({ dealType: { equals: query.dealType } });
	if (query.city) and.push({ locality: { equals: query.city } });
	if (query.district) and.push({ district: { equals: query.district } });
	if (query.rooms?.length) and.push({ rooms: { in: query.rooms } });
	if (query.priceFromMinor)
		and.push({ priceMinor: { greater_than_equal: query.priceFromMinor } });
	if (query.priceToMinor)
		and.push({ priceMinor: { less_than_equal: query.priceToMinor } });
	if (query.areaFrom)
		and.push({ totalArea: { greater_than_equal: query.areaFrom } });
	if (query.areaTo) and.push({ totalArea: { less_than_equal: query.areaTo } });

	return { and };
}

function sortForCatalog(sort: PropertySort): string {
	switch (sort) {
		case "newest":
			return "-publishedAt";
		case "priceAsc":
			return "priceMinor";
		case "priceDesc":
			return "-priceMinor";
		default:
			return "-publishedAt";
	}
}

export function toPublicCatalogProperty(
	property: PublicCatalogSelectedProperty,
): PublicCatalogProperty {
	return {
		id: property.id,
		slug: property.slug,
		publicUrlId: property.publicUrlId,
		status: property.status,
		market: property.market,
		category: property.category,
		dealType: property.dealType,
		priceMinor: property.priceMinor,
		currency: property.currency,
		pricePerMeterMinor: property.pricePerMeterMinor,
		rooms: property.rooms,
		totalArea: property.totalArea,
		livingArea: property.livingArea,
		kitchenArea: property.kitchenArea,
		floor: property.floor,
		floors: property.floors,
		locality: property.locality,
		district: property.district,
		publicAddress: property.publicAddress,
		lat: property.lat,
		lng: property.lng,
		title: property.title,
		description: property.description,
		updatedAt: property.updatedAt,
		images:
			property.images?.map((image) => ({
				kind: image.kind,
				url: image.url,
				alt: image.alt,
				order: image.order,
				id: image.id,
			})) ?? null,
	};
}

export async function findPublicSitemapProperties(
	payload: Payload,
	input: { limit: number; offset: number } = { limit: 500, offset: 0 },
): Promise<readonly Pick<PublicCatalogProperty, "slug" | "updatedAt">[]> {
	return listPublicSitemapPropertiesPage(payload, input);
}

export async function findPublicCatalogProperties(
	payload: Payload,
	input: CatalogQueryInput,
): Promise<PublicCatalogResult> {
	const query = catalogQuerySchema.parse(input);
	const where = buildCatalogWhere(query);

	const result = await payload.find({
		collection: "properties",
		where,
		depth: publicGatewayPolicy.depth,
		limit: query.limit,
		page: query.page,
		sort: sortForCatalog(query.sort),
		select: publicPropertySelect,
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});

	return {
		items: result.docs.map((property) =>
			toPublicCatalogProperty(property as PublicCatalogSelectedProperty),
		),
		total: result.totalDocs,
		page: result.page ?? query.page,
		pageSize: result.limit,
		totalPages: result.totalPages,
		applied: {
			query: query.query,
			category: query.category,
			dealType: query.dealType,
			city: query.city,
			district: query.district,
			rooms: query.rooms,
			priceFromMinor: query.priceFromMinor,
			priceToMinor: query.priceToMinor,
			areaFrom: query.areaFrom,
			areaTo: query.areaTo,
			sort: query.sort,
			view: query.view,
		},
	};
}

export async function findPublicCatalogPropertiesByGeo(
	payload: Payload,
	input: CatalogQueryInput,
	scope: {
		cityId: number;
		districtId?: number;
		markets?: readonly Property["market"][];
	},
): Promise<PublicCatalogResult> {
	const query = catalogQuerySchema.parse(input);
	const result = await payload.find({
		collection: "properties",
		where: buildCatalogWhere(query, scope),
		depth: publicGatewayPolicy.depth,
		limit: query.limit,
		page: query.page,
		sort: sortForCatalog(query.sort),
		select: publicPropertySelect,
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});
	return {
		items: result.docs.map((property) =>
			toPublicCatalogProperty(property as PublicCatalogSelectedProperty),
		),
		total: result.totalDocs,
		page: result.page ?? query.page,
		pageSize: result.limit,
		totalPages: result.totalPages,
		applied: {
			query: query.query,
			category: query.category,
			dealType: query.dealType,
			rooms: query.rooms,
			priceFromMinor: query.priceFromMinor,
			priceToMinor: query.priceToMinor,
			areaFrom: query.areaFrom,
			areaTo: query.areaTo,
			sort: query.sort,
			view: query.view,
		},
	};
}

export async function findPublicPropertyByPublicUrlId(
	payload: Payload,
	publicUrlId: number,
): Promise<PublicCatalogProperty | null> {
	if (!Number.isSafeInteger(publicUrlId) || publicUrlId <= 0) return null;
	const result = await payload.find({
		collection: "properties",
		where: {
			and: [
				publicPropertyDetailsWhere,
				{ publicUrlId: { equals: publicUrlId } },
			],
		},
		depth: 0,
		limit: 1,
		page: 1,
		select: publicPropertySelect,
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});
	const property = result.docs[0];
	return property
		? toPublicCatalogProperty(property as PublicCatalogSelectedProperty)
		: null;
}

export async function findPublicPropertyBySlug(payload: Payload, slug: string) {
	const result = await payload.find({
		collection: "properties",
		where: {
			and: [publicPropertyDetailsWhere, { slug: { equals: slug } }],
		},
		depth: publicGatewayPolicy.depth,
		limit: 1,
		page: 1,
		select: publicPropertySelect,
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});

	const property = result.docs[0];
	if (!property) return null;

	return toPublicCatalogProperty(property as PublicCatalogSelectedProperty);
}

export async function findPublicPropertyLifecycleBySlug(
	payload: Payload,
	slug: string,
): Promise<PublicPropertyLifecycleLookup> {
	const property = await findPublicPropertyLifecycleRow(payload, slug);
	if (!property) return { found: false };

	const fromPath = `/obekty/${slug}`;
	const redirect = await findPublicRedirectByFromPath(payload, fromPath);
	const destination = sanitizeExplicitRedirectPath(redirect?.to);
	const chained =
		destination != null &&
		(await publicRedirectDestinationIsChain(payload, destination, fromPath));

	return {
		found: true,
		slug: property.slug,
		publicUrlId: property.publicUrlId,
		category: property.category,
		status: property.status,
		publishedAt: property.publishedAt,
		contentPurgedAt: property.contentPurgedAt,
		explicitRedirectPath: chained ? null : destination,
	};
}

export async function findPublicCatalogFacets(
	payload: Payload,
	input: CatalogQueryInput,
): Promise<PublicCatalogFacetsResult> {
	const query = catalogQuerySchema.parse(input);
	const where = buildCatalogWhere(query);
	const aggregate = await aggregatePublicCatalogFacets(payload, where);
	const categories = aggregate.categories.flatMap((bucket) => {
		const parsed = propertyCategorySchema.safeParse(bucket.value);
		return parsed.success ? [{ value: parsed.data, count: bucket.count }] : [];
	});
	const dealTypes = aggregate.dealTypes.flatMap((bucket) => {
		const parsed = propertyDealTypeSchema.safeParse(bucket.value);
		return parsed.success ? [{ value: parsed.data, count: bucket.count }] : [];
	});

	return {
		source: "payload-aggregate",
		total: aggregate.total,
		categories,
		dealTypes,
		cities: aggregate.cities,
		districts: aggregate.districts,
		rooms: aggregate.rooms,
		priceMinor: {
			min: aggregate.priceMin,
			max: aggregate.priceMax,
		},
	};
}
