import assert from "node:assert/strict";
import {
	applyDerivedFieldsOnWrite,
	bankersRoundToInteger,
	calculatePropertyDerivedFields,
} from "../src/core/ingest/derived-fields.ts";
import { ingestNormalizedFeed } from "../src/core/ingest/index.ts";
import {
	applyPublishedSlugPolicy,
	collectChangedImportOwnedFields,
	mergeManualOverrides,
	returnFieldToFeed,
	shouldRecordManualOwnership,
} from "../src/core/ingest/manual-ownership.ts";
import {
	normalizeAreaM2,
	normalizePropertyNumericWrite,
	requireMoneyMinor,
} from "../src/core/ingest/numeric-invariants.ts";

assert.equal(
	shouldRecordManualOwnership({ userId: 1, source: "import" }),
	false,
);
assert.equal(
	shouldRecordManualOwnership({ userId: 1, source: "system" }),
	false,
);
assert.equal(shouldRecordManualOwnership({ userId: 1, source: "admin" }), true);
assert.equal(shouldRecordManualOwnership({ source: "admin" }), false);

const first = mergeManualOverrides([], ["title"], {
	nowIso: "2026-09-18T12:00:00.000Z",
	userId: 7,
});
assert.deepEqual(first, [
	{ field: "title", setAt: "2026-09-18T12:00:00.000Z", setBy: 7 },
]);
assert.equal(returnFieldToFeed(first, "title").length, 0);
assert.deepEqual(
	collectChangedImportOwnedFields({ title: "A" }, { title: "A" }),
	[],
);
assert.deepEqual(
	collectChangedImportOwnedFields({ title: "B" }, { title: "A" }),
	["title"],
);

assert.equal(
	applyPublishedSlugPolicy({
		nextSlug: "new-slug",
		originalSlug: "old-slug",
		publishedAt: "2026-09-01T00:00:00.000Z",
	}),
	"old-slug",
);

const derived = calculatePropertyDerivedFields({
	priceMinor: 10_000_000_00,
	totalArea: 50,
});
assert.equal(derived.pricePerMeterMinor, 20_000_000);
assert.equal(
	calculatePropertyDerivedFields({ priceMinor: null, totalArea: 50 })
		.pricePerMeterMinor,
	null,
);
assert.equal(
	calculatePropertyDerivedFields({ priceMinor: 10_000_000_00, totalArea: 0 })
		.pricePerMeterMinor,
	null,
);
assert.equal(
	calculatePropertyDerivedFields({ priceMinor: 10_000_000_00, totalArea: -1 })
		.pricePerMeterMinor,
	null,
);
assert.equal(bankersRoundToInteger(2.5), 2);
assert.equal(bankersRoundToInteger(3.5), 4);
assert.equal(requireMoneyMinor(123_45, "priceMinor"), 123_45);
assert.throws(() => requireMoneyMinor(123.45, "priceMinor"), /safe integer/);
assert.equal(normalizeAreaM2(12.34), 12.34);
assert.equal(normalizeAreaM2(100 * 0.09290304, "round"), 9.29);
assert.throws(() => normalizeAreaM2(12.345), /two decimal places/);
const numericWrite = {
	priceMinor: 123_45,
	pricePerMeterMinor: 10_00,
	totalArea: 12.34,
	livingArea: 10.2,
	kitchenArea: 2,
};
normalizePropertyNumericWrite(numericWrite);
assert.deepEqual(numericWrite, {
	priceMinor: 123_45,
	pricePerMeterMinor: 10_00,
	totalArea: 12.34,
	livingArea: 10.2,
	kitchenArea: 2,
});
assert.equal(
	calculatePropertyDerivedFields({ priceMinor: 5, totalArea: 2 })
		.pricePerMeterMinor,
	2,
);
assert.deepEqual(
	applyDerivedFieldsOnWrite({
		ingestOwned: true,
		priceMinor: 100,
		totalArea: 0,
	}),
	null,
);
assert.equal(
	applyDerivedFieldsOnWrite({
		origin: "manual",
		ingestOwned: false,
		priceMinor: 10_000_000_00,
		totalArea: 50,
	})?.pricePerMeterMinor,
	20_000_000,
);
assert.equal(
	applyDerivedFieldsOnWrite({
		origin: "manual",
		ingestOwned: false,
		priceMinor: null,
		totalArea: 50,
	})?.pricePerMeterMinor,
	null,
);
assert.equal(
	applyDerivedFieldsOnWrite({
		origin: "manual",
		ingestOwned: false,
		priceMinor: 10_000_000_00,
		totalArea: null,
	})?.pricePerMeterMinor,
	null,
);

const repository = {
	byId: new Map(),
	async findFeedProperty({ feedSourceId, externalId }) {
		return [...this.byId.values()].find(
			(row) => row.feedSource === feedSourceId && row.externalId === externalId,
		);
	},
	async createFeedProperty(data) {
		const record = { ...data, id: "p1", slug: data.slug, manualOverrides: [] };
		this.byId.set(record.id, record);
		return record;
	},
	async updateFeedProperty(id, data) {
		const next = { ...this.byId.get(id), ...data };
		this.byId.set(id, next);
		return next;
	},
	async createImportIssue() {},
	async touchLastSeenAt() {},
	async countMissingActive() {
		return 0;
	},
	async deactivateMissing() {
		return 0;
	},
};

const offer = {
	externalId: "ext-1",
	title: "Квартира",
	category: "квартира",
	dealType: "продажа",
	priceMinor: 12_000_000_00,
	currency: "RUB",
	images: [],
};
const context = {
	feedSourceId: "11",
	feedSourceCode: "a",
	importRunId: "1",
	market: "secondary",
	nowIso: "2026-09-18T12:00:00.000Z",
};

await ingestNormalizedFeed({ context, offers: [offer], repository });
await ingestNormalizedFeed({
	context: { ...context, importRunId: "2" },
	offers: [offer],
	repository,
});
assert.deepEqual(repository.byId.get("p1").manualOverrides, []);

console.log("verify-manual-ownership: ok");
