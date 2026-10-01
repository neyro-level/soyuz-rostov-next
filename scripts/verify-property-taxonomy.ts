import assert from "node:assert/strict";
import {
	assertCategoryFieldOwnership,
	buildPropertySemanticSlug,
	normalizeLandArea,
	propertyCategorySurface,
} from "../src/core/property/taxonomy.ts";

assert.deepEqual(propertyCategorySurface, {
	apartment: "kvartiry",
	house: "doma",
	land: "uchastki",
	commercial: "kommercheskaya-nedvizhimost",
	room: "komnaty",
	garage: "garazhi",
});
assert.deepEqual(normalizeLandArea(1000, "m2"), { status: "ok", plotAreaSotka: 10 });
assert.deepEqual(normalizeLandArea(2, "hectare"), { status: "ok", plotAreaSotka: 200 });
assert.deepEqual(normalizeLandArea(12.5, "sotka"), { status: "ok", plotAreaSotka: 12.5 });
assert.deepEqual(normalizeLandArea(500), { status: "review", reason: "missing_unit" });
assert.throws(() => assertCategoryFieldOwnership({ category: "apartment", plotAreaSotka: 8 }));
assert.doesNotThrow(() => assertCategoryFieldOwnership({ category: "land", plotAreaSotka: 8 }));
assert.doesNotThrow(() => assertCategoryFieldOwnership({ category: "apartment", communications: { gas: false } }));

const semantic = buildPropertySemanticSlug({
	category: "apartment",
	rooms: 2,
	locality: "Rostov",
	street: "Sadovaya",
});
assert.equal(semantic, "2-komnatnaya-rostov-sadovaya");
assert.equal(semantic.includes("price"), false);

console.log("verify:property-taxonomy: ok");
