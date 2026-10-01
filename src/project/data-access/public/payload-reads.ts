import "server-only";

import type { Payload, Where } from "payload";
import type { City, Property } from "@/project/payload-types";
import {
	allowedPropertyImageHosts,
	countPropertyGatePhotos,
} from "@/project/routing/property-gate-facts";
import { propertyLifecycleReadAccess } from "./access-mode.ts";
import { publicGatewayPolicy } from "./policy";

const access = {
	overrideAccess: publicGatewayPolicy.overrideAccess,
	context: publicGatewayPolicy.context,
	depth: 0,
} as const;

const publicPropertyPublicationWhere: Where = {
	and: [
		{ status: { equals: "active" } },
		{ publishedAt: { exists: true } },
		{ contentPurgedAt: { exists: false } },
	],
};

export type PublicCatalogFacetRow = {
	category?: string | null;
	dealType?: string | null;
	locality?: string | null;
	district?: string | null;
	rooms?: number | null;
	priceMinor?: number | null;
};

function bump(map: Map<string, number>, key: string) {
	if (!key) return;
	map.set(key, (map.get(key) ?? 0) + 1);
}

export async function readPublicCatalogFacetRows(
	payload: Payload,
	where: Where,
): Promise<readonly PublicCatalogFacetRow[]> {
	const result = await payload.find({
		collection: "properties",
		where,
		limit: 2000,
		pagination: false,
		select: {
			category: true,
			dealType: true,
			locality: true,
			district: true,
			rooms: true,
			priceMinor: true,
		},
		...access,
	});
	return result.docs as PublicCatalogFacetRow[];
}

export function aggregatePublicCatalogFacetRows(
	rows: readonly PublicCatalogFacetRow[],
) {
	const categories = new Map<string, number>();
	const dealTypes = new Map<string, number>();
	const cities = new Map<string, number>();
	const districts = new Map<string, number>();
	const rooms = new Map<number, number>();
	let total = 0;
	let priceMin: number | null = null;
	let priceMax: number | null = null;
	for (const doc of rows) {
		total += 1;
		if (doc.category) bump(categories, doc.category);
		if (doc.dealType) bump(dealTypes, doc.dealType);
		if (doc.locality) bump(cities, doc.locality);
		if (doc.district) bump(districts, doc.district);
		if (typeof doc.rooms === "number" && doc.rooms > 0) {
			rooms.set(doc.rooms, (rooms.get(doc.rooms) ?? 0) + 1);
		}
		if (typeof doc.priceMinor === "number") {
			priceMin =
				priceMin == null ? doc.priceMinor : Math.min(priceMin, doc.priceMinor);
			priceMax =
				priceMax == null ? doc.priceMinor : Math.max(priceMax, doc.priceMinor);
		}
	}

	const toBuckets = (map: Map<string, number>) =>
		[...map.entries()]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([value, count]) => ({ value, count }));

	return {
		total,
		priceMin,
		priceMax,
		categories: toBuckets(categories),
		dealTypes: toBuckets(dealTypes),
		cities: toBuckets(cities),
		districts: toBuckets(districts),
		rooms: [...rooms.entries()]
			.sort(([a], [b]) => a - b)
			.map(([value, count]) => ({ value, count })),
	};
}

export async function aggregatePublicCatalogFacets(
	payload: Payload,
	where: Where,
) {
	return aggregatePublicCatalogFacetRows(
		await readPublicCatalogFacetRows(payload, where),
	);
}

export async function countPublicSitemapProperties(
	payload: Payload,
): Promise<number> {
	const result = await payload.count({
		collection: "properties",
		where: publicPropertyPublicationWhere,
		...access,
	});
	return result.totalDocs;
}

export async function listPublicSitemapPropertiesPage(
	payload: Payload,
	input: { limit: number; offset: number },
): Promise<
	readonly {
		slug: string;
		publicUrlId: number;
		category: "apartment" | "house" | "land" | "commercial" | "room" | "garage";
		updatedAt: string;
		market: "newbuild" | "secondary";
		geo: string | null;
		priceMinor: number | null;
		area: number | null;
		rooms: number | null;
		district: string | null;
		gatePhotoCount: number;
		description: string;
	}[]
> {
	const limit = Math.trunc(input.limit);
	const offset = Math.trunc(input.offset);
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error("sitemap page size must be a positive integer.");
	}
	if (!Number.isInteger(offset) || offset < 0) {
		throw new Error("sitemap offset must be a non-negative integer.");
	}

	const pageSize = Math.min(100, Math.max(limit, 1));
	const items: {
		slug: string;
		publicUrlId: number;
		category: "apartment" | "house" | "land" | "commercial" | "room" | "garage";
		updatedAt: string;
		market: "newbuild" | "secondary";
		geo: string | null;
		priceMinor: number | null;
		area: number | null;
		rooms: number | null;
		district: string | null;
		gatePhotoCount: number;
		description: string;
	}[] = [];
	let skipped = 0;
	for (let page = 1; items.length < limit && page <= 50; page += 1) {
		const result = await payload.find({
			collection: "properties",
			where: publicPropertyPublicationWhere,
			limit: pageSize,
			page,
			sort: "-updatedAt",
			select: {
				slug: true,
				publicUrlId: true,
				category: true,
				updatedAt: true,
				market: true,
				cityRef: true,
				priceMinor: true,
				totalArea: true,
				rooms: true,
				district: true,
				images: { kind: true, url: true, media: true },
				description: true,
			},
			...access,
			depth: 1,
		});
		if (!result.docs.length) break;
		for (const doc of result.docs as Property[]) {
			if (!doc.slug || !doc.publicUrlId || !doc.category) continue;
			if (skipped < offset) {
				skipped += 1;
				continue;
			}
			items.push({
				slug: doc.slug,
				publicUrlId: doc.publicUrlId,
				category: doc.category,
				updatedAt: doc.updatedAt,
				market: doc.market,
				geo:
					typeof doc.cityRef === "object" && doc.cityRef
						? (doc.cityRef as City).slug
						: null,
				priceMinor: doc.priceMinor ?? null,
				area: doc.totalArea ?? null,
				rooms: doc.rooms ?? null,
				district: doc.district?.trim() || null,
				gatePhotoCount: countPropertyGatePhotos(
					doc.images,
					allowedPropertyImageHosts(),
				),
				description: doc.description ?? "",
			});
			if (items.length >= limit) break;
		}
		if (result.docs.length < pageSize) break;
	}
	return items;
}

const publicPublishedPagesWhere: Where = {
	and: [{ status: { equals: "published" } }, { publishedAt: { exists: true } }],
};

function isIndexableSitemapPage(doc: {
	slug?: string | null;
	seo?: { noindex?: boolean | null } | null;
}): boolean {
	return Boolean(doc.slug) && doc.slug !== "home" && !doc.seo?.noindex;
}

export async function countPublicSitemapPages(
	payload: Payload,
): Promise<number> {
	const result = await payload.find({
		collection: "pages",
		where: publicPublishedPagesWhere,
		limit: 100,
		page: 1,
		select: {
			slug: true,
			seo: { noindex: true },
		},
		...access,
	});
	return result.docs.filter(isIndexableSitemapPage).length;
}

export async function listPublicSitemapPagesPage(
	payload: Payload,
	input: { limit: number; offset: number },
): Promise<readonly { slug: string; updatedAt: string }[]> {
	const limit = Math.trunc(input.limit);
	const offset = Math.trunc(input.offset);
	if (!Number.isInteger(limit) || limit < 1) {
		throw new Error("sitemap page size must be a positive integer.");
	}
	if (!Number.isInteger(offset) || offset < 0) {
		throw new Error("sitemap offset must be a non-negative integer.");
	}

	const result = await payload.find({
		collection: "pages",
		where: publicPublishedPagesWhere,
		limit: 100,
		page: 1,
		sort: "slug",
		select: {
			slug: true,
			updatedAt: true,
			seo: { noindex: true },
		},
		...access,
	});

	return result.docs
		.filter(isIndexableSitemapPage)
		.slice(offset, offset + limit)
		.map((page) => ({
			slug: page.slug as string,
			updatedAt: page.updatedAt,
		}));
}

export async function findPublicPropertyLifecycleRow(
	payload: Payload,
	slug: string,
): Promise<{
	slug: string;
	publicUrlId: number;
	category: "apartment" | "house" | "land" | "commercial" | "room" | "garage";
	status: "active" | "archived";
	publishedAt: string | null;
	contentPurgedAt: string | null;
} | null> {
	const result = await payload.find({
		collection: "properties",
		where: { slug: { equals: slug } },
		limit: 1,
		page: 1,
		select: {
			slug: true,
			publicUrlId: true,
			category: true,
			status: true,
			publishedAt: true,
			contentPurgedAt: true,
		},
		...propertyLifecycleReadAccess(),
		depth: 0,
	});
	const row = result.docs[0];
	if (!row?.slug || !row.publicUrlId || !row.category) return null;
	return {
		slug: row.slug,
		publicUrlId: row.publicUrlId,
		category: row.category,
		status: row.status === "archived" ? "archived" : "active",
		publishedAt: row.publishedAt ?? null,
		contentPurgedAt: row.contentPurgedAt ?? null,
	};
}

export async function findPublicRedirectByFromPath(
	payload: Payload,
	fromPath: string,
): Promise<{ from: string; to: string; statusCode: string } | null> {
	const result = await payload.find({
		collection: "redirects",
		where: { from: { equals: fromPath } },
		limit: 1,
		page: 1,
		select: {
			from: true,
			to: true,
			statusCode: true,
		},
		...access,
	});
	const row = result.docs[0];
	if (!row?.from || !row.to) return null;
	return {
		from: row.from,
		to: row.to,
		statusCode: String(row.statusCode ?? "301"),
	};
}

export async function publicRedirectDestinationIsChain(
	payload: Payload,
	destinationPath: string,
	sourcePath: string,
): Promise<boolean> {
	if (destinationPath === sourcePath) return true;
	const result = await payload.find({
		collection: "redirects",
		where: { from: { equals: destinationPath } },
		limit: 1,
		page: 1,
		select: { from: true },
		...access,
	});
	return result.docs.length > 0;
}
