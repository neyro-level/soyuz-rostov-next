import assert from "node:assert/strict";
import { resolvePropertyGeoBackfill } from "../src/core/geo/property-backfill.ts";

const regions = [
	{
		id: "1",
		slug: "primorskiy-kray",
		title: "Приморский край",
		shortName: "Приморье",
		status: "published" as const,
	},
];
const cities = [
	{
		id: "10",
		slug: "primorsk",
		title: "Приморск",
		regionId: "1",
		morphologyApproved: true,
		status: "published" as const,
	},
	{
		id: "11",
		slug: "zarechnyy",
		title: "Заречный",
		regionId: "1",
		morphologyApproved: true,
		status: "published" as const,
	},
];
const districts = [
	{
		id: "20",
		slug: "severnyy",
		title: "Северный район",
		cityId: "10",
		synonyms: ["Северный"],
		morphologyApproved: true,
		status: "published" as const,
	},
	{
		id: "21",
		slug: "severnyy",
		title: "Северный район",
		cityId: "11",
		synonyms: ["Северный"],
		morphologyApproved: true,
		status: "published" as const,
	},
];

const matched = resolvePropertyGeoBackfill({
	property: { region: "ПРИМОРЬЕ", locality: "Приморск", district: "Северный" },
	regions,
	cities,
	districts,
});
assert.deepEqual(matched, {
	regionRef: "1",
	cityRef: "10",
	districtRef: "20",
	issues: [],
});

const unknownDistrict = resolvePropertyGeoBackfill({
	property: {
		region: "Приморский край",
		locality: "Приморск",
		district: "Неизвестный",
	},
	regions,
	cities,
	districts,
});
assert.equal(unknownDistrict.districtRef, null);
assert.equal(unknownDistrict.issues[0]?.code, "GEO_DISTRICT_UNRECOGNIZED");
assert.ok(!unknownDistrict.issues[0]?.messageRedacted.includes("Неизвестный"));

const ambiguousCity = resolvePropertyGeoBackfill({
	property: { locality: "Одинаковый", district: "Северный" },
	regions,
	cities: [
		...cities,
		{
			id: "12",
			slug: "one",
			title: "Одинаковый",
			regionId: "1",
			status: "published",
		},
		{
			id: "13",
			slug: "two",
			title: "Одинаковый",
			regionId: "1",
			status: "published",
		},
	],
	districts,
});
assert.equal(ambiguousCity.cityRef, null);
assert.deepEqual(
	ambiguousCity.issues.map((item) => item.code),
	["GEO_CITY_AMBIGUOUS", "GEO_DISTRICT_CITY_REQUIRED"],
);

const inferredRegion = resolvePropertyGeoBackfill({
	property: { locality: "Заречный" },
	regions,
	cities,
	districts,
});
assert.equal(inferredRegion.cityRef, "11");
assert.equal(inferredRegion.regionRef, "1");

console.log("verify:property-geo-backfill passed");
