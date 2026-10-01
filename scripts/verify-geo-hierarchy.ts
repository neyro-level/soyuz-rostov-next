import assert from "node:assert/strict";
import {
	assertAgglomerationGraph,
	assertCanonicalGeoSlug,
	assertGeoMorphology,
	assertPublishedGeoSlugImmutable,
	assertSlugOutsideNamespace,
	normalizeGeoPublication,
} from "../src/core/geo/hierarchy.ts";
import {
	assertDistrictMorphologyForms,
	reservedDistrictSlugs,
	reservedGeoRootSlugs,
} from "../src/project/geo/collection-guards.ts";
import { geoHierarchyFixtures } from "../src/project/geo/fixtures.ts";

assert.equal(assertCanonicalGeoSlug("primorsk", "City"), "primorsk");
for (const slug of ["Приморск", "Primorsk", "primorsk_1", "-primorsk"])
	assert.throws(() => assertCanonicalGeoSlug(slug, "City"));

assert.deepEqual(
	assertGeoMorphology({
		nominative: " Приморск ",
		genitive: " Приморска ",
		prepositional: " Приморске ",
	}),
	{
		nominative: "Приморск",
		genitive: "Приморска",
		prepositional: "Приморске",
	},
);
assert.throws(() =>
	assertGeoMorphology({ nominative: "Приморск", genitive: "" }),
);

assert.throws(() =>
	assertSlugOutsideNamespace("novostroyki", reservedGeoRootSlugs, "City"),
);
assert.throws(() =>
	assertSlugOutsideNamespace("api", reservedDistrictSlugs, "District"),
);

assert.doesNotThrow(() =>
	assertPublishedGeoSlugImmutable({
		nextSlug: "new-draft-slug",
		originalSlug: "old-draft-slug",
		originalStatus: "draft",
	}),
);
assert.throws(() =>
	assertPublishedGeoSlugImmutable({
		nextSlug: "new-published-slug",
		originalSlug: "old-published-slug",
		originalStatus: "published",
		originalPublishedAt: "2026-09-24T00:00:00.000Z",
	}),
);
assert.deepEqual(
	normalizeGeoPublication({
		status: "published",
		publishedAt: null,
		nowIso: "2026-09-24T00:00:00.000Z",
	}),
	{ status: "published", publishedAt: "2026-09-24T00:00:00.000Z" },
);

assert.doesNotThrow(() =>
	assertAgglomerationGraph([
		{ id: "1", regionId: "10", agglomerationOfId: null },
		{ id: "2", regionId: "10", agglomerationOfId: "1" },
	]),
);
assert.throws(() =>
	assertAgglomerationGraph([
		{ id: "1", regionId: "10", agglomerationOfId: "2" },
		{ id: "2", regionId: "10", agglomerationOfId: "1" },
	]),
);
assert.throws(() =>
	assertAgglomerationGraph([
		{ id: "1", regionId: "10", agglomerationOfId: null },
		{ id: "2", regionId: "20", agglomerationOfId: "1" },
	]),
);

assert.equal(geoHierarchyFixtures.cities.length, 2);
assert.equal(
	new Set(geoHierarchyFixtures.cities.map((city) => city.slug)).size,
	2,
);
const allDistrictFixtures = [
	...geoHierarchyFixtures.cities[0].districts,
	...geoHierarchyFixtures.cities[1].districts,
];
assert.equal(allDistrictFixtures.length, 4);
const northern = allDistrictFixtures.find(
	(district) => district.slug === "severnyy",
);
assert.equal(northern?.districtType, "microdistrict");
assert.equal(northern?.parent, null);
assert.equal(northern?.preposition, "na");
assert.equal(northern?.locative, "Северном районе");
assert.doesNotThrow(() =>
	assertDistrictMorphologyForms({
		districtType: "admin_district",
		adjLocative: "Ленинском",
		adjGenitive: "Ленинского",
	}),
);
assert.throws(() =>
	assertDistrictMorphologyForms({ districtType: "admin_district" }),
);
assert.doesNotThrow(() =>
	assertDistrictMorphologyForms({
		districtType: "microdistrict",
		locative: "Северном",
		preposition: "na",
	}),
);
assert.throws(() =>
	assertDistrictMorphologyForms({
		districtType: "microdistrict",
		locative: "Северном",
		preposition: "na",
		adjLocative: "Северном",
	}),
);
const child = allDistrictFixtures.find(
	(district) => district.slug === "solnechnyy",
);
assert.equal(child?.parent, "yuzhnyy");

console.log("verify:geo-hierarchy passed");
