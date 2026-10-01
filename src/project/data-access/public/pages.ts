import "server-only";

import type { PageSEOContract } from "@ams/realtbase-contracts";
import type { Payload } from "payload";
import { publicGatewayPolicy } from "./policy";

export type PublicPageRecord = {
	slug: string;
	title: string;
	updatedAt: string;
	seo: PageSEOContract;
};

function pageSeo(
	slug: string,
	title: string,
	brandName: string,
	description?: string | null,
	noindex?: boolean | null,
): PageSEOContract {
	const canonicalPath = slug === "home" ? "/" : `/${slug}/`;
	const seoTitle = title.includes(brandName)
		? title
		: `${title} — ${brandName}`;

	return {
		title: seoTitle,
		description: description || "Недвижимость и услуги агентства.",
		canonicalPath,
		indexing: noindex ? "noindex" : "index",
		following: "follow",
	};
}

export function fallbackPublicPage(
	slug: string,
	brandName: string,
): PublicPageRecord {
	const title =
		slug === "home"
			? "Главная"
			: slug
					.split("-")
					.filter(Boolean)
					.map((part) => part.charAt(0).toUpperCase() + part.slice(1))
					.join(" ") || slug;

	return {
		slug,
		title,
		updatedAt: "1970-01-01T00:00:00.000Z",
		seo: pageSeo(slug, title, brandName),
	};
}

export async function findPublicPage(
	payload: Payload,
	slug: string,
	brandName: string,
): Promise<PublicPageRecord | null> {
	const result = await payload.find({
		collection: "pages",
		where: {
			and: [
				{ slug: { equals: slug } },
				{ status: { equals: "published" } },
				{ publishedAt: { exists: true } },
			],
		},
		depth: publicGatewayPolicy.depth,
		limit: 1,
		page: 1,
		select: {
			slug: true,
			title: true,
			updatedAt: true,
			seo: {
				title: true,
				description: true,
				noindex: true,
			},
		},
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});

	const page = result.docs[0];
	if (!page) return null;

	return {
		slug: page.slug,
		title: page.title,
		updatedAt: page.updatedAt,
		seo: pageSeo(
			page.slug,
			page.seo?.title || page.title,
			brandName,
			page.seo?.description,
			page.seo?.noindex,
		),
	};
}

export async function findPublicPages(
	payload: Payload,
	brandName: string,
): Promise<readonly PublicPageRecord[]> {
	const result = await payload.find({
		collection: "pages",
		where: {
			and: [
				{ status: { equals: "published" } },
				{ publishedAt: { exists: true } },
			],
		},
		depth: publicGatewayPolicy.depth,
		limit: 24,
		page: 1,
		sort: "slug",
		select: {
			slug: true,
			title: true,
			updatedAt: true,
			seo: {
				title: true,
				description: true,
				noindex: true,
			},
		},
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});

	return result.docs.map((page) => ({
		slug: page.slug,
		title: page.title,
		updatedAt: page.updatedAt,
		seo: pageSeo(
			page.slug,
			page.seo?.title || page.title,
			brandName,
			page.seo?.description,
			page.seo?.noindex,
		),
	}));
}

export async function findPublicSitemapPages(
	payload: Payload,
): Promise<readonly { slug: string; updatedAt: string }[]> {
	const result = await payload.find({
		collection: "pages",
		where: {
			and: [
				{ status: { equals: "published" } },
				{ publishedAt: { exists: true } },
			],
		},
		depth: 0,
		limit: 100,
		page: 1,
		sort: "slug",
		select: {
			slug: true,
			updatedAt: true,
			seo: {
				noindex: true,
			},
		},
		overrideAccess: publicGatewayPolicy.overrideAccess,
		context: publicGatewayPolicy.context,
	});

	return result.docs
		.filter((page) => !page.seo?.noindex)
		.map((page) => ({
			slug: page.slug,
			updatedAt: page.updatedAt,
		}));
}
