export type PublicAnalyticsDimensions = {
	page: string;
	geo?: string;
	surface?:
		| "apartments"
		| "new-buildings"
		| "houses"
		| "plots"
		| "commercial"
		| "garages";
	market?: "sale" | "rent";
	entityKey?: string;
};

export function analyticsAttributes(
	event:
		| "listing_view"
		| "property_view"
		| "development_view"
		| "development_price_request_submit",
	dimensions?: PublicAnalyticsDimensions,
) {
	if (!dimensions) return {};
	return {
		"data-analytics-event": event,
		"data-analytics-page": dimensions.page,
		"data-analytics-geo": dimensions.geo,
		"data-analytics-surface": dimensions.surface,
		"data-analytics-market": dimensions.market,
		"data-analytics-entity": dimensions.entityKey,
	};
}
