import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { buildPublicEntityInvalidationTargets } from "../src/core/cache/entity-change-targets.ts";
import { executeInternalRevalidation } from "../src/core/cache/internal-route-executor.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	MAX_PERSISTENT_CACHE_KEYS_PER_ROUTE,
	publicGatewayCacheTags,
	publicGatewayRouteCacheIdentity,
} from "../src/project/routing/public-gateway-cache.ts";

const listingTags = publicGatewayCacheTags({
	kind: "categoryGeoDistrict",
	geo: "rostov-na-donu",
	category: "kvartiry",
	district: "leninskiy",
});
assert.deepEqual(listingTags, [
	"site",
	"registry",
	"properties",
	"developments",
	"developers",
	"geo:rostov-na-donu",
	"geo-surface:rostov-na-donu:kvartiry",
	"district:leninskiy",
]);
assert.ok(listingTags.length <= 8);

assert.deepEqual(
	publicGatewayCacheTags({
		kind: "property",
		category: "kvartiry",
		semantic: "demo",
		publicUrlId: 2001,
	}),
	["site", "registry", "properties", "property:2001"],
);

const catalogPageKey = {
	kind: "categoryGeo",
	geo: "primorsk",
	category: "kvartiry",
} as const;
for (const [fixtureName, profile] of Object.entries(siteProfileFixtures)) {
	const identity = publicGatewayRouteCacheIdentity(
		profile,
		catalogPageKey,
		"sort=priceAsc&page=2",
	);
	assert.ok(identity, `${fixtureName} must produce a bounded cache identity.`);
	assert.ok(
		identity.maxKeysPerRoute <= MAX_PERSISTENT_CACHE_KEYS_PER_ROUTE,
		`${fixtureName} exceeded the finite cache-key bound.`,
	);
	assert.deepEqual(identity.keyParts, ["page", "2", "sort", "priceAsc"]);

	const equivalent = publicGatewayRouteCacheIdentity(
		profile,
		catalogPageKey,
		"page=2&sort=priceAsc",
	);
	assert.deepEqual(equivalent, identity);
	assert.deepEqual(
		publicGatewayRouteCacheIdentity(profile, catalogPageKey, ""),
		publicGatewayRouteCacheIdentity(
			profile,
			catalogPageKey,
			"page=1&sort=recommended",
		),
	);
	assert.deepEqual(
		publicGatewayRouteCacheIdentity(
			profile,
			catalogPageKey,
			"page=2&sort=priceAsc&utm_source=yandex&yclid=123",
		),
		identity,
		"tracking parameters never create a distinct persistent cache identity",
	);
}

const profile = siteProfileFixtures.multiGeo;
assert.equal(
	publicGatewayRouteCacheIdentity(profile, catalogPageKey, "district=center"),
	null,
	"Enabled filters must bypass persistent cache because their values are not finite.",
);
assert.equal(
	publicGatewayRouteCacheIdentity(profile, catalogPageKey, "unknown=value"),
	null,
	"Arbitrary query input must never enter persistent cache identity.",
);
assert.equal(
	publicGatewayRouteCacheIdentity(profile, catalogPageKey, "developer=acme"),
	null,
	"A filter outside the category SiteProfile whitelist must be rejected.",
);
assert.equal(
	publicGatewayRouteCacheIdentity(profile, catalogPageKey, "page=10001"),
	null,
	"Out-of-bound pages must never enter persistent cache identity.",
);

const runtimeRoute = readFileSync("src/project/routing/runtime-route.ts", "utf8");
assert.match(
	runtimeRoute,
	/getCachedFilteredCatalogRoute\(filteredCatalogKey[\s\S]{0,240}resolveRuntimeRouteUncached/,
	"normalized functional catalog filters must use the bounded per-runtime cache",
);
assert.match(
	runtimeRoute,
	/if \(filteredCatalogKey\)[\s\S]{0,320}if \(!cacheIdentity\)/,
	"the filtered cache path must remain outside persistent Next cache",
);

const canonicalMoveTargets = buildPublicEntityInvalidationTargets({
	entityType: "development",
	doc: { slug: "new-slug" },
	previousDoc: { slug: "old-slug" },
});
assert.deepEqual(canonicalMoveTargets, [
	{ type: "tag", tag: "developments" },
	{ type: "tag", tag: "properties" },
	{ type: "tag", tag: "developers" },
	{ type: "tag", tag: "development:new-slug" },
	{ type: "tag", tag: "development:old-slug" },
]);

const accepted: unknown[] = [];
const result = await executeInternalRevalidation({
	expectedSecret: "test-secret",
	providedSecret: "test-secret",
	body: { targets: canonicalMoveTargets, reason: "test" },
	invalidate: async (targets) => {
		accepted.push(...targets);
	},
});
assert.equal(result.status, 200);
assert.deepEqual(accepted, canonicalMoveTargets);

console.log(
	`Public cache verified: ${listingTags.length} bounded listing tags; old/new canonical invalidation accepted once.`,
);
