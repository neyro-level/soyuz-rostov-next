import { renderDiscoveryRobots } from "../../core/seo/discovery-feeds.ts";
import { cleanParamValue } from "../../core/seo/tracking-query-params.ts";
import { getProjectIndexingPolicy } from "../../project/indexing-policy.ts";
import { getSiteUrl } from "../../project/seo/site.ts";

export const revalidate = 3600;

export async function GET() {
	const indexingEnabled = getProjectIndexingPolicy() === "public";
	return new Response(
		renderDiscoveryRobots({
			publicOrigin: getSiteUrl(),
			indexingEnabled,
			cleanParam: indexingEnabled ? cleanParamValue() : undefined,
		}),
		{
			headers: {
				"content-type": "text/plain; charset=utf-8",
				"cache-control": "public, max-age=0, s-maxage=3600",
			},
		},
	);
}
