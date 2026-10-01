import { MarketingPageView } from "@ams/realtbase-ui";
import { notFound } from "next/navigation";
import { toMetadata } from "@/core/seo/page-metadata";
import { getPublicMarketingPage } from "@/project/data-access/public";
import { getProjectIndexingPolicy } from "@/project/indexing-policy";

export async function MarketingRoute({ slug }: { slug: string }) {
	const page = await getPublicMarketingPage(slug);
	if (!page) notFound();
	return <MarketingPageView page={page} />;
}

export async function generateMarketingMetadata(slug: string) {
	const page = await getPublicMarketingPage(slug);
	return page
		? toMetadata(page.seo, { globalIndexingPolicy: getProjectIndexingPolicy() })
		: {};
}
