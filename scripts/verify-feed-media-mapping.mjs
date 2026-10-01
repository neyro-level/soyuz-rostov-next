import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	mirrorFeedImages,
	normalizeYrlOffer,
} from "../src/core/ingest/index.ts";
import { resolvePropertyGeoBackfill } from "../src/core/geo/property-backfill.ts";

const hosts = new Set(["img.allowed.example"]);
const rawBase = {
	externalId: "mapped-1",
	title: "Mapped",
	category: "квартира",
	type: "продажа",
	marketFromXml: "вторичный рынок",
	pictures: ["https://img.allowed.example/1.jpg"],
};
const mapped = normalizeYrlOffer(rawBase, hosts);
assert.equal(mapped.ok, true);
assert.equal(mapped.offer.category, "apartment");
assert.equal(mapped.offer.dealType, "sale");
assert.equal(mapped.offer.marketHint, "secondary");

for (const patch of [
	{ category: "неизвестный объект" },
	{ type: "обмен" },
	{ marketFromXml: "марсианский рынок" },
	{ propertyType: "неизвестный подтип" },
]) {
	const rejected = normalizeYrlOffer({ ...rawBase, ...patch }, hosts);
	assert.equal(
		rejected.ok,
		false,
		"unknown taxonomy must not produce a publishable offer",
	);
	assert.ok(rejected.issues.some((issue) => issue.severity === "error"));
}
const unsafe = normalizeYrlOffer(
	{ ...rawBase, pictures: ["http://127.0.0.1/private.jpg"] },
	hosts,
);
assert.equal(unsafe.ok, true);
assert.equal(unsafe.offer.images.length, 0);
assert.ok(
	unsafe.issues.some((issue) => issue.code === "feed.image_host_disallowed"),
);

const geo = resolvePropertyGeoBackfill({
	property: { locality: "Город А", district: "Центр" },
	regions: [{ id: "r", slug: "region", title: "Регион" }],
	cities: [
		{ id: "a", slug: "city-a", title: "Город А", regionId: "r" },
		{ id: "b", slug: "city-b", title: "Город Б", regionId: "r" },
	],
	districts: [
		{
			id: "da",
			slug: "district-a",
			title: "Район А",
			cityId: "a",
			synonyms: ["Центр"],
		},
		{
			id: "db",
			slug: "district-b",
			title: "Район Б",
			cityId: "b",
			synonyms: ["Центр"],
		},
	],
});
assert.equal(geo.cityRef, "a");
assert.equal(
	geo.districtRef,
	"da",
	"district synonyms must be scoped to the resolved city",
);

if (!mapped.ok) throw new Error("mapped fixture must be valid");
const offer = {
	...mapped.offer,
	images: Array.from({ length: 5 }, (_, index) => ({
		url: `https://img.allowed.example/${index}.jpg`,
		host: "img.allowed.example",
	})),
};
let active = 0;
let maxActive = 0;
const attempts = new Map();
const mirrored = await mirrorFeedImages({
	offer,
	maxImages: 4,
	concurrency: 2,
	retries: 1,
	persist: async (_image, index) => {
		active += 1;
		maxActive = Math.max(maxActive, active);
		await new Promise((resolve) => setTimeout(resolve, 5));
		active -= 1;
		attempts.set(index, (attempts.get(index) ?? 0) + 1);
		if (index === 1 && attempts.get(index) === 1) throw new Error("transient");
		if (index === 3) throw new Error("permanent");
		return { id: String(index + 10), sourceUrl: offer.images[index].url };
	},
});
assert.ok(maxActive <= 2);
assert.equal(attempts.get(1), 2);
assert.equal(attempts.get(3), 2);
assert.equal(mirrored.images.length, 3);
assert.ok(mirrored.images.every((image) => image.kind === "managed"));
assert.equal(
	mirrored.issues.length,
	2,
	"permanent failure and max-image truncation are journaled",
);

const mirrorSource = readFileSync(
	"src/project/ingest/payload-media-mirror.ts",
	"utf8",
);
for (const required of [
	"sourceUrl",
	"sourceHost",
	"sourceRights",
	"sourceSha256",
	"sourceFeed",
	"mirroredAt",
	"safeOutboundFetch",
]) {
	assert.ok(
		mirrorSource.includes(required),
		`media mirror must preserve ${required}`,
	);
}

console.log("verify-feed-media-mapping: ok");
