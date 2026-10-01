import type { PageSEOContract } from "@ams/realtbase-contracts";
import {
	DevelopersListView,
	DeveloperView,
	DevelopmentDetailsView,
	GeoHubView,
	type ListingFilterControlKey,
	ListingView,
	PropertyPageView,
} from "@ams/realtbase-ui";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { toMetadata } from "@/core/seo/page-metadata";
import { projectCopy } from "@/project/copy";
import { getProjectIndexingPolicy } from "@/project/indexing-policy";
import { leadConsentContext } from "@/project/legal.config";
import { pageHref } from "@/project/routing/catalog-search-params";
import { resolveRuntimeRoute } from "@/project/routing/runtime-route";
import {
	buildBreadcrumbJsonLd,
	buildDevelopmentJsonLd,
	buildFaqJsonLd,
	buildPropertyJsonLd,
	JsonLdScript,
} from "@/project/seo/structured-data";
import { isFreshPriceCheckedAt, projectSeoMeta } from "@/project/seo/templates";
import { siteProfile } from "@/project/site-profile";

export const runtime = "nodejs";

const analyticsSurfaceByCategory = {
	kvartiry: "apartments",
	doma: "houses",
	uchastki: "plots",
	"kommercheskaya-nedvizhimost": "commercial",
	komnaty: "apartments",
	garazhi: "garages",
	arenda: "apartments",
	novostroyki: "new-buildings",
	"kottedzhnye-poselki": "houses",
} as const;

function pathname(segments: readonly string[]) {
	return `/${segments.join("/")}/`;
}

type CanonicalRouteProps = {
	params: Promise<{ segments: string[] }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function queryString(input: Record<string, string | string[] | undefined>) {
	const params = new URLSearchParams();
	for (const key of Object.keys(input).sort()) {
		const value = input[key];
		for (const item of Array.isArray(value)
			? value
			: value === undefined
				? []
				: [value]) {
			params.append(key, item);
		}
	}
	return params.toString();
}

function routeSeo(
	data: NonNullable<Awaited<ReturnType<typeof resolveRuntimeRoute>>["data"]>,
	brandName: string,
): PageSEOContract {
	if (data.kind === "developers") {
		return data.seo;
	}
	if (data.kind === "property") {
		return projectSeoMeta(
			"property",
			{
				brand: brandName,
				entityName: data.value.title,
				city: data.seoCity ?? undefined,
				freshPrice: data.value.price
					? {
							label: data.value.price.label,
							fresh: isFreshPriceCheckedAt(
								data.priceCheckedAt,
								siteProfile.gate.priceStaleDays,
							),
						}
					: undefined,
			},
			data.value.href,
		);
	}
	return data.value.seo;
}

export async function generateMetadata({
	params,
	searchParams,
}: CanonicalRouteProps): Promise<Metadata> {
	const [{ segments }, query] = await Promise.all([params, searchParams]);
	const result = await resolveRuntimeRoute(
		pathname(segments),
		queryString(query),
	);
	if (result.decision.kind !== "page" || !result.data || !result.nap) {
		return {};
	}
	const seo = routeSeo(result.data, result.nap.brandName);
	return toMetadata({
		...seo,
		canonicalPath: result.decision.canonicalPath,
		indexing: result.decision.robots.indexing,
		following: result.decision.robots.following,
	}, { globalIndexingPolicy: getProjectIndexingPolicy() });
}

export default async function CanonicalRuntimePage({
	params,
	searchParams,
}: CanonicalRouteProps) {
	const [{ segments }, query] = await Promise.all([params, searchParams]);
	const routePath = pathname(segments);
	const result = await resolveRuntimeRoute(routePath, queryString(query));
	if (result.decision.kind === "redirect") {
		permanentRedirect(result.decision.destinationPath);
	}
	if (result.decision.kind !== "page" || !result.data) notFound();
	const canonicalPath = result.decision.canonicalPath;
	const breadcrumb = (items: { label: string; href?: string }[]) => (
		<JsonLdScript data={buildBreadcrumbJsonLd(items, canonicalPath)} />
	);

	switch (result.data.kind) {
		case "geoHub":
			return (
				<>
					{breadcrumb([...result.data.value.breadcrumbs.items])}
					<GeoHubView hub={result.data.value} />
				</>
			);
		case "listing": {
			const listing = result.data;
			const listingQuery = listing.query;
			if (!("category" in listing.value.pageKey)) notFound();
			const listingCategory = listing.value.pageKey.category;
			return (
				<>
					{breadcrumb([...listing.value.breadcrumbs.items])}
					<ListingView
						listing={listing.value}
						filterState={
							listingQuery?.hasFilters
								? {
										hasFilters: true,
										clearHref: routePath,
										summary: projectCopy.catalog.filteredSummary,
									}
								: undefined
						}
						filterControls={{
							action: routePath,
							keys: siteProfile.filterKeys[
								listingCategory
							] as readonly ListingFilterControlKey[],
							values: listingQuery ?? {},
						}}
						analytics={{
							page: routePath,
							geo:
								"geo" in listing.value.pageKey
									? listing.value.pageKey.geo
									: siteProfile.primaryGeo,
							surface: analyticsSurfaceByCategory[listingCategory],
							market: listingCategory === "arenda" ? "rent" : "sale",
						}}
						pageHref={
							listingQuery
								? (page) => pageHref(routePath, listingQuery, page)
								: undefined
						}
					/>
				</>
			);
		}
		case "developers":
			return (
				<>
					{breadcrumb([...result.data.breadcrumbs.items])}
					<DevelopersListView
						developers={result.data.value}
						title={result.data.h1}
						description={result.data.intro}
						breadcrumbs={result.data.breadcrumbs}
					/>
				</>
			);
		case "developer": {
			const developer = result.data.value;
			return (
				<>
					{breadcrumb([...developer.breadcrumbs.items])}
					<DeveloperView
						developer={developer}
						developments={result.data.developments}
						total={result.data.pagination.total}
						page={result.data.pagination.page}
						totalPages={result.data.pagination.totalPages}
						pageHref={(page) =>
							page <= 1 ? routePath : `${routePath}?page=${page}`
						}
					/>
				</>
			);
		}
		case "development": {
			const development = result.data.value;
			const faq = buildFaqJsonLd(development.faq);
			return (
				<>
					{breadcrumb([...development.breadcrumbs.items])}
					<JsonLdScript data={buildDevelopmentJsonLd(development)} />
					{faq ? <JsonLdScript data={faq} /> : null}
					<DevelopmentDetailsView
						development={development}
						content={{ faq: development.faq }}
						analytics={{
							page: development.href,
							geo: result.data.geo,
							surface: "new-buildings",
							market: "sale",
							entityKey: development.slug,
						}}
						leadContext={{
							formKind: "development",
							sourcePage: development.href,
							...leadConsentContext(),
						}}
					/>
				</>
			);
		}
		case "property": {
			return (
				<>
					{breadcrumb([...result.data.value.breadcrumbs.items])}
					<JsonLdScript data={buildPropertyJsonLd(result.data.value)} />
					<PropertyPageView
						property={result.data.value}
						analytics={{
							page: result.data.value.href,
							geo: result.data.geo,
							surface:
								analyticsSurfaceByCategory[
									result.data.value.pageKey.kind === "property"
										? result.data.value.pageKey.category
										: "kvartiry"
								],
							market: result.data.value.dealType,
							entityKey: result.data.value.slug,
						}}
						leadContext={{
							formKind: "property",
							sourcePage: result.data.value.href,
							property: {
								id: result.data.value.id,
								slug: result.data.value.slug,
								title: result.data.value.title,
							},
							...leadConsentContext(),
						}}
					/>
				</>
			);
		}
	}
}
