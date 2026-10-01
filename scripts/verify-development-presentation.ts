import assert from "node:assert/strict";
import type { DevelopmentDetailsDTO } from "@ams/realtbase-contracts";
import {
	DEVELOPMENT_PRICE_FRESHNESS_MS,
	developmentPricesForPresentation,
	developmentSalesEnded,
} from "../packages/ui/src/views/development/development-presentation.ts";

const reference = Date.parse("2026-09-26T00:00:00.000Z");
const development = {
	id: "development-1",
	slug: "development-1",
	pageKey: {
		kind: "development",
		developmentKind: "residential_complex",
		slug: "development-1",
	},
	href: "/novostroyki/zhk-development-1/",
	name: "ЖК Проверочный",
	kind: "residential_complex",
	cityName: "Приморск",
	salesStatus: "on_sale",
	salesAvailability: "confirmed",
	completenessScore: 100,
	gallery: [],
	priceByRooms: [
		{
			roomsLabel: "Свежая цена",
			priceFrom: {
				priceMinor: 5_000_000_00,
				currency: "RUB",
				period: "total",
				label: "5 000 000 ₽",
			},
			priceCheckedAt: new Date(
				reference - DEVELOPMENT_PRICE_FRESHNESS_MS,
			).toISOString(),
		},
		{
			roomsLabel: "Устаревшая цена",
			priceFrom: {
				priceMinor: 4_000_000_00,
				currency: "RUB",
				period: "total",
				label: "4 000 000 ₽",
			},
			priceCheckedAt: new Date(
				reference - DEVELOPMENT_PRICE_FRESHNESS_MS - 1,
			).toISOString(),
		},
	],
	mediaItems: [],
	characteristics: [],
	breadcrumbs: { items: [{ label: "Главная", href: "/" }] },
	seo: {
		title: "ЖК Проверочный",
		description: "Проверочный проект",
		canonicalPath: "/novostroyki/zhk-development-1/",
		indexing: "noindex",
		following: "follow",
	},
} satisfies DevelopmentDetailsDTO;

assert.equal(developmentSalesEnded(development), false);
assert.deepEqual(
	developmentPricesForPresentation(development, reference).map(
		(row) => row.roomsLabel,
	),
	["Свежая цена"],
);

const salesEnded = {
	...development,
	salesStatus: "sales_finished" as const,
	salesAvailability: "none" as const,
};
assert.equal(developmentSalesEnded(salesEnded), true);
assert.deepEqual(developmentPricesForPresentation(salesEnded, reference), []);
assert.deepEqual(
	developmentPricesForPresentation(development, "invalid-date"),
	[],
);

console.log(
	"verify:development-presentation passed (fresh boundary, stale price, sales finished)",
);
