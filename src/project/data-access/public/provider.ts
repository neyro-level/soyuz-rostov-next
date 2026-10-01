import "server-only";

import { propertyCategorySurface } from "@/core/property/taxonomy";
import {
	decidePage as decideResolvedPage,
	resolveRouteDecision,
} from "@/core/routing";
import { geoCatalogContractFixtures } from "@/fixture/geo-catalog";
import { fixtureNap } from "@/fixture/site-settings";
import { projectConfig } from "@/project/project.config";
import {
	type PublicUrlEntry,
	staticPublicUrlEntries,
} from "@/project/seo/site";
import { siteProfile } from "@/project/site-profile";
import { createProjectUrlGrammar } from "@/project/url-grammar";
import { findPublicCatalogProperties } from "./catalog";
import {
	toHomePageDTO,
	toMarketingPageDTO,
	toPropertyListDTO,
	toShellDTO,
} from "./dto";
import { getGeoBySlug } from "./geo-catalog";
import { findPublicNap } from "./nap";
import { fallbackPublicPage, findPublicPage, findPublicPages } from "./pages";
import { getOptionalPublicGatewayPayload } from "./payload";
import {
	countPublicSitemapPages,
	countPublicSitemapProperties,
	listPublicSitemapPagesPage,
	listPublicSitemapPropertiesPage,
} from "./payload-reads";

const urlsPerShard = projectConfig.sitemapUrlsPerShard;
const queryPageSize = projectConfig.sitemapQueryPageSize;
const urlGrammar = createProjectUrlGrammar(siteProfile);

function indexableStaticEntries(): PublicUrlEntry[] {
	return staticPublicUrlEntries.filter((entry) => entry.indexable);
}

async function listRange<T>(
	readPage: (input: { limit: number; offset: number }) => Promise<readonly T[]>,
	offset: number,
	limit: number,
): Promise<T[]> {
	const items: T[] = [];
	while (items.length < limit) {
		const batch = await readPage({
			offset: offset + items.length,
			limit: Math.min(queryPageSize, limit - items.length),
		});
		if (!batch.length) break;
		items.push(...batch);
	}
	return items;
}

export async function getPublicShell() {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		return toShellDTO([], fixtureNap);
	}
	const nap = await findPublicNap(payload);
	const [pages, geoCities] = await Promise.all([
		findPublicPages(payload, nap.brandName),
		Promise.all(
			Object.keys(siteProfile.geos).map((geo) => getGeoBySlug(payload, geo)),
		),
	]);
	return toShellDTO(
		pages,
		nap,
		geoCities.filter((city): city is NonNullable<typeof city> => city != null),
	);
}

export async function getPublicSitemapTotals() {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		const staticCount = indexableStaticEntries().length;
		return {
			staticCount,
			pages: 0,
			properties: 0,
			total: staticCount,
		};
	}
	const staticCount = indexableStaticEntries().length;
	const [pages, properties] = await Promise.all([
		countPublicSitemapPages(payload),
		countPublicSitemapProperties(payload),
	]);
	return {
		staticCount,
		pages,
		properties,
		total: staticCount + pages + properties,
	};
}

export async function getPublicSitemapShardCount() {
	const totals = await getPublicSitemapTotals();
	return Math.max(1, Math.ceil(totals.total / urlsPerShard));
}

export async function getPublicSitemapShard(
	id: number,
): Promise<PublicUrlEntry[]> {
	if (!Number.isInteger(id) || id < 0) return [];
	const payload = await getOptionalPublicGatewayPayload();
	const staticEntries = indexableStaticEntries();
	if (!payload) {
		const start = id * urlsPerShard;
		return start >= staticEntries.length
			? []
			: staticEntries.slice(start, start + urlsPerShard);
	}
	const totals = await getPublicSitemapTotals();
	const start = id * urlsPerShard;
	if (start >= totals.total) return [];
	let remaining = urlsPerShard;
	let cursor = start;
	const entries: PublicUrlEntry[] = [];

	if (cursor < staticEntries.length && remaining > 0) {
		const slice = staticEntries.slice(cursor, cursor + remaining);
		entries.push(...slice);
		remaining -= slice.length;
		cursor += slice.length;
	}

	const pagesStart = staticEntries.length;
	if (cursor >= pagesStart && remaining > 0) {
		const pageOffset = cursor - pagesStart;
		if (pageOffset < totals.pages) {
			const pages = await listRange(
				(input) => listPublicSitemapPagesPage(payload, input),
				pageOffset,
				remaining,
			);
			entries.push(
				...pages.map((page) => ({
					group: "static" as const,
					path: `/${page.slug}`,
					lastModified: page.updatedAt,
					changeFrequency: "weekly" as const,
					priority: 0.6,
					indexable: true,
				})),
			);
			remaining -= pages.length;
			cursor += pages.length;
		} else {
			cursor = pagesStart + totals.pages;
		}
	}

	const propertiesStart = staticEntries.length + totals.pages;
	if (cursor >= propertiesStart && remaining > 0) {
		const propertyOffset = cursor - propertiesStart;
		const properties = await listRange(
			(input) => listPublicSitemapPropertiesPage(payload, input),
			propertyOffset,
			remaining,
		);
		entries.push(
			...properties.map((property) => {
				const pageKey = {
					kind: "property" as const,
					category: propertyCategorySurface[property.category],
					semantic: property.slug,
					publicUrlId: property.publicUrlId,
				};
				const path = urlGrammar.buildUrl(pageKey);
				const record = {
					lifecycle: "active" as const,
					geo: property.geo,
					market: property.market,
					dataTier: null,
				};
				const route = resolveRouteDecision(siteProfile, pageKey, record, 1);
				const gate = route.available
					? decideResolvedPage(
							siteProfile,
							pageKey,
							{
								kind: "page",
								pageKey,
								canonicalPath: path,
								profileStatus: route.profileStatus,
								lifecycle: "active",
								market: property.market,
								dataTier: null,
								inventory: 1,
							},
							property.market === "newbuild"
								? {
										kind: "newbuildLot",
										url: path,
										canonical: path,
										profileStatus: route.profileStatus,
									}
								: {
										kind: "secondary",
										url: path,
										canonical: path,
										profileStatus: route.profileStatus,
										priceMinor: property.priceMinor,
										area: property.area,
										category: property.category,
										rooms: property.rooms,
										district: property.district,
										rawDistrictRef: property.district,
										ownedPhotoCount: property.gatePhotoCount,
										description: property.description,
									},
						).gate
					: {
							statusCode: 404 as const,
							indexing: "noindex" as const,
							following: "follow" as const,
							canonical: path,
							includeInSitemap: false,
						};
				return {
					group: "properties" as const,
					path,
					lastModified: property.updatedAt,
					changeFrequency: "daily" as const,
					priority: 0.8,
					indexable: true,
					gate,
				};
			}),
		);
	}

	return entries;
}

export async function getPublicSitemapEntries() {
	const count = await getPublicSitemapShardCount();
	const shards = await Promise.all(
		Array.from({ length: count }, (_, id) => getPublicSitemapShard(id)),
	);
	return shards.flat();
}

export async function getPublicHomePage() {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		return {
			page: toHomePageDTO(
				null,
				fixtureNap.brandName,
				geoCatalogContractFixtures.city,
			),
			featured: null,
			nap: fixtureNap,
		} as const;
	}
	const nap = await findPublicNap(payload);
	const [page, catalog, city] = await Promise.all([
		findPublicPage(payload, "home", nap.brandName),
		findPublicCatalogProperties(payload, { limit: 1, page: 1 }),
		getGeoBySlug(payload, siteProfile.primaryGeo),
	]);
	const home = toHomePageDTO(
		page,
		nap.brandName,
		city ?? geoCatalogContractFixtures.city,
	);
	const featured = catalog.items[0];

	return {
		page: {
			...home,
			featuredPropertyId: featured ? String(featured.id) : "",
		},
		featured: featured ? toPropertyListDTO(catalog).items[0] : null,
		nap,
	} as const;
}

export async function getPublicMarketingPage(slug: string) {
	const payload = await getOptionalPublicGatewayPayload();
	if (!payload) {
		return toMarketingPageDTO(fallbackPublicPage(slug, fixtureNap.brandName));
	}
	const nap = await findPublicNap(payload);
	const page = await findPublicPage(payload, slug, nap.brandName);
	return page ? toMarketingPageDTO(page) : null;
}
