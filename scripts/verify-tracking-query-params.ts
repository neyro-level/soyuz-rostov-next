import {
	cleanParamDirective,
	cleanParamValue,
	isTrackingQueryParam,
	trackingQueryParams,
} from "../src/core/seo/tracking-query-params.ts";

const expected = [
	"utm_source",
	"utm_medium",
	"utm_campaign",
	"utm_content",
	"utm_term",
	"utm_id",
	"utm_referrer",
	"utm_media",
	"utm_group",
	"utm_expid",
	"yclid",
	"ysclid",
	"yrclid",
	"gclid",
	"_openstat",
];

if (JSON.stringify(trackingQueryParams) !== JSON.stringify(expected)) {
	throw new Error(
		"Tracking parameter registry does not match the approved platform defaults.",
	);
}

if (isTrackingQueryParam("from")) {
	throw new Error('"from" must not be a platform-default tracking parameter.');
}

if (cleanParamDirective() !== `Clean-param: ${expected.join("&")}`) {
	throw new Error(
		"Clean-param directive must be generated from the canonical registry.",
	);
}

if (cleanParamValue() !== expected.join("&")) {
	throw new Error(
		"Clean-param value must be generated from the canonical registry.",
	);
}

console.log("Tracking query parameter registry verification passed.");
