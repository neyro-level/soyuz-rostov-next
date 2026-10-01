import assert from "node:assert/strict";
import { toIntakeFormKind } from "../packages/ui/src/views/starter/lead-form-kind.ts";
import {
	createAnalyticsTestSink,
	createNoopAnalyticsAdapter,
	parseAnalyticsEvent,
	trackAnalyticsEvent,
} from "../src/core/analytics/events.ts";
import { projectAnalytics } from "../src/project/analytics.ts";

assert.equal(toIntakeFormKind("development"), "development_price");
assert.equal(toIntakeFormKind("property"), "property_request");

const matrix = [
	{
		name: "geo_view",
		dimensions: { page: "/rostov-na-donu/", geo: "rostov-na-donu" },
	},
	{
		name: "listing_view",
		dimensions: {
			page: "/rostov-na-donu/kvartiry/",
			geo: "rostov-na-donu",
			surface: "apartments",
			market: "sale",
		},
	},
	{
		name: "district_view",
		dimensions: { page: "/rostov-na-donu/leninskiy/", geo: "rostov-na-donu" },
		entityKey: "leninskiy",
	},
	{
		name: "facet_view",
		dimensions: {
			page: "/rostov-na-donu/kvartiry/odnokomnatnye/",
			geo: "rostov-na-donu",
			surface: "apartments",
			market: "sale",
		},
		entityKey: "odnokomnatnye",
	},
	{
		name: "development_view",
		dimensions: { page: "/novostroyki/zhk-primer/", geo: "rostov-na-donu" },
		entityKey: "zhk-primer",
	},
	{
		name: "developer_view",
		dimensions: {
			page: "/zastroyschiki/developer-primer/",
			geo: "rostov-na-donu",
		},
		entityKey: "developer-primer",
	},
	{
		name: "development_price_request_submit",
		dimensions: {
			page: "/novostroyki/zhk-primer/",
			geo: "rostov-na-donu",
			surface: "new-buildings",
			market: "sale",
		},
		entityKey: "zhk-primer",
	},
	{
		name: "legal_cta_click",
		dimensions: { page: "/politika-konfidencialnosti/" },
	},
] as const;

const sink = createAnalyticsTestSink();
for (const event of matrix) await trackAnalyticsEvent(sink, event);
assert.equal(sink.events.length, matrix.length);

for (const payload of [
	{ ...matrix[1], phone: "+79161234567" },
	{
		...matrix[1],
		dimensions: { ...matrix[1].dimensions, email: "pii@example.test" },
	},
	{ ...matrix[1], fullName: "Иван Петров" },
	{ ...matrix[1], freeText: "Позвоните мне" },
]) {
	assert.throws(() => parseAnalyticsEvent(payload), /PII key|unrecognized/i);
}

assert.throws(
	() =>
		parseAnalyticsEvent({
			name: "listing_view",
			dimensions: { page: "/catalog/" },
		}),
	/invalid|expected/i,
);
assert.throws(
	() =>
		parseAnalyticsEvent({
			...matrix[1],
			dimensions: { ...matrix[1].dimensions, page: "/Иван/" },
		}),
	/invalid string/i,
);

await trackAnalyticsEvent(createNoopAnalyticsAdapter(), matrix[0]);
await trackAnalyticsEvent(projectAnalytics, matrix[0]);

const runtimePageSource = await import("node:fs").then(({ readFileSync }) =>
	readFileSync("src/app/(site)/[...segments]/page.tsx", "utf8"),
);
assert.match(runtimePageSource, /formKind:\s*"development"/);
assert.match(runtimePageSource, /geo:\s*result\.data\.geo/);
assert.doesNotMatch(
	runtimePageSource,
	/development_view[\s\S]{0,500}geo:\s*siteProfile\.primaryGeo/,
);

console.log("verify-lead-analytics: ok");
