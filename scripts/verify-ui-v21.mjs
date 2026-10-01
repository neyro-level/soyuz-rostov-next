import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const listing = read("packages/ui/src/views/catalog/ListingView.tsx");
const development = read(
	"packages/ui/src/views/development/DevelopmentDetailsView.tsx",
);
const developmentPresentation = read(
	"packages/ui/src/views/development/development-presentation.ts",
);
const lead = read("packages/ui/src/views/starter/LeadFormView.tsx");
const analytics = read("packages/ui/src/views/shared/analytics-attributes.ts");
const runtimePage = read("src/app/(site)/[...segments]/page.tsx");
const design = read("docs/DESIGN.md");

assert.match(listing, /filterState\?\.hasFilters/);
assert.match(listing, /Сбросить фильтры/);
assert.match(listing, /role="status"/);
assert.match(listing, /aria-current="page"/);
assert.match(listing, /listing\.pagination\.previousPage/);
assert.match(listing, /listing\.pagination\.nextPage/);

assert.match(developmentPresentation, /45 \* 86_400_000/);
assert.match(
	developmentPresentation,
	/development\.salesStatus === "sales_finished"/,
);
assert.match(development, /Продажи в этом проекте завершены/);
for (const anchor of [
	"development-prices",
	"development-layouts",
	"development-progress",
	"development-faq",
]) {
	assert.match(development, new RegExp(`id="${anchor}"`));
	assert.match(development, new RegExp(`href="#${anchor}"`));
}

for (const event of [
	"listing_view",
	"development_view",
	"development_price_request_submit",
]) {
	assert.match(analytics, new RegExp(`"${event}"`));
}
for (const forbidden of ["phone", "email", "name", "message", "address"]) {
	assert.doesNotMatch(
		analytics,
		new RegExp(`data-analytics-${forbidden}`, "i"),
	);
}
assert.match(lead, /analyticsAttributes\(/);
assert.match(runtimePage, /filterState=/);
assert.match(runtimePage, /analytics=\{\{/);
assert.match(design, /Canonical UI Core v5 acceptance matrix/);

console.log(
	"verify:ui-v21 passed (filters, pagination, sales-ended, anchors, lead analytics without PII)",
);
