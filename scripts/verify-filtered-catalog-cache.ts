import assert from "node:assert/strict";
import {
	clearFilteredCatalogCacheForTest,
	FILTERED_CATALOG_CACHE_MAX_ENTRY_BYTES,
	FILTERED_CATALOG_CACHE_MAX_ENTRIES,
	FILTERED_CATALOG_CACHE_MAX_TOTAL_BYTES,
	getCachedFilteredCatalogRoute,
	getFilteredCatalogCacheStats,
} from "../src/project/routing/filtered-catalog-cache.ts";

clearFilteredCatalogCacheForTest();
let loads = 0;
const duplicate = await Promise.all(
	Array.from({ length: 12 }, () =>
		getCachedFilteredCatalogRoute("/primorsk/kvartiry/?rooms=2", async () => {
			loads += 1;
			return { items: Array.from({ length: 24 }, (_, index) => ({ id: index })) };
		}),
	),
);
assert.equal(loads, 1, "concurrent normalized requests must deduplicate");
assert.equal(duplicate.length, 12);

for (let index = 0; index < 1_000; index += 1) {
	await getCachedFilteredCatalogRoute(
		`/primorsk/kvartiry/?priceFrom=${index + 1}`,
		async () => ({ items: [{ id: index, label: "bounded public listing" }] }),
	);
}

const stats = getFilteredCatalogCacheStats();
assert.ok(
	stats.entries <= FILTERED_CATALOG_CACHE_MAX_ENTRIES,
	"filtered cache must evict before its entry ceiling",
);
assert.ok(
	stats.bytes <= FILTERED_CATALOG_CACHE_MAX_TOTAL_BYTES,
	"filtered cache must stay under its byte ceiling",
);

clearFilteredCatalogCacheForTest();
await getCachedFilteredCatalogRoute("/primorsk/kvartiry/?rooms=9", async () => ({
	body: "x".repeat(FILTERED_CATALOG_CACHE_MAX_ENTRY_BYTES + 1),
}));
assert.deepEqual(
	getFilteredCatalogCacheStats(),
	{ entries: 0, bytes: 0 },
	"an oversized result must not occupy the bounded cache",
);

console.log(
	`filtered catalog cache verified: ${stats.entries} entries, ${stats.bytes} bytes after 1000 normalized filter keys`,
);
