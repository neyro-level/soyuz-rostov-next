import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { geoCatalogContractFixtures } from "../src/fixture/geo-catalog.ts";
import { fixtureNap } from "../src/fixture/site-settings.ts";

process.env.NEXT_PUBLIC_SERVER_URL = "https://example.test";

const {
	buildBreadcrumbJsonLd,
	buildDevelopmentJsonLd,
	buildFaqJsonLd,
	buildOrganizationJsonLd,
} = await import("../src/project/seo/structured-data-builders.ts");

const settingsSource = readFileSync(
	"src/project/globals/SiteSettings.ts",
	"utf8",
);
for (const field of [
	"brandName",
	"legalName",
	"logo",
	"phone",
	"email",
	"address",
	"workingHours",
	"socialLinks",
	"requisites",
	"coordinates",
]) {
	assert.match(settingsSource, new RegExp(`name: ["']${field}["']`));
}
const siteConfigSource = readFileSync("src/project/site.config.ts", "utf8");
assert.equal(
	/brandName|legalName|phone|address|workingHours/.test(siteConfigSource),
	false,
);

assert.deepEqual(buildOrganizationJsonLd(fixtureNap), {
	"@context": "https://schema.org",
	"@type": "RealEstateAgent",
	name: fixtureNap.brandName,
	url: "https://example.test/",
	telephone: fixtureNap.phone.label,
	email: fixtureNap.email?.label,
	address: fixtureNap.address,
});

const breadcrumbItems = [
	{ label: "Главная", href: "/" },
	{ label: "Новостройки", href: "/novostroyki/" },
	{ label: "Жилой комплекс" },
];
const breadcrumbJsonLd = buildBreadcrumbJsonLd(
	breadcrumbItems,
	"/novostroyki/zhiloy-kompleks/",
);
assert.deepEqual(breadcrumbJsonLd, {
	"@context": "https://schema.org",
	"@type": "BreadcrumbList",
	itemListElement: [
		{
			"@type": "ListItem",
			position: 1,
			name: "Главная",
			item: "https://example.test/",
		},
		{
			"@type": "ListItem",
			position: 2,
			name: "Новостройки",
			item: "https://example.test/novostroyki/",
		},
		{
			"@type": "ListItem",
			position: 3,
			name: "Жилой комплекс",
			item: "https://example.test/novostroyki/zhiloy-kompleks/",
		},
	],
});
const jsonLdItems = breadcrumbJsonLd.itemListElement as Array<{
	name: string;
	item: string;
}>;
assert.deepEqual(
	jsonLdItems.map((item) => item.name),
	breadcrumbItems.map((item) => item.label),
	"HTML breadcrumb labels and JSON-LD names share one DTO",
);

const development = {
	...geoCatalogContractFixtures.development,
	priceByRooms: [
		{
			roomsLabel: "Студии",
			priceFrom: {
				priceMinor: 5_000_000_00,
				currency: "RUB" as const,
				period: "total" as const,
				label: "5 000 000 ₽",
			},
			lotsAvailable: 2,
			priceCheckedAt: "2026-09-20T00:00:00.000Z",
		},
		{
			roomsLabel: "Устаревшее",
			priceFrom: {
				priceMinor: 1_000_000_00,
				currency: "RUB" as const,
				period: "total" as const,
				label: "1 000 000 ₽",
			},
			lotsAvailable: 9,
			priceCheckedAt: "2026-01-01T00:00:00.000Z",
		},
	],
};
const developmentJsonLd = buildDevelopmentJsonLd(
	development,
	new Date("2026-09-26T00:00:00.000Z"),
);
assert.equal(developmentJsonLd["@type"], "ApartmentComplex");
assert.deepEqual(developmentJsonLd.offers, {
	"@type": "AggregateOffer",
	priceCurrency: "RUB",
	lowPrice: 5_000_000,
	highPrice: 5_000_000,
	offerCount: 2,
});
assert.equal(JSON.stringify(developmentJsonLd).includes("1000000"), false);

assert.equal(buildFaqJsonLd([]), null, "hidden/absent FAQ emits no JSON-LD");
assert.deepEqual(
	buildFaqJsonLd([{ question: "Когда сдача?", answer: "В срок." }]),
	{
		"@context": "https://schema.org",
		"@type": "FAQPage",
		mainEntity: [
			{
				"@type": "Question",
				name: "Когда сдача?",
				acceptedAnswer: { "@type": "Answer", text: "В срок." },
			},
		],
	},
);

console.log(
	"verify:structured-data passed (Site Settings NAP, breadcrumbs, fresh AggregateOffer, visible-only FAQ)",
);
