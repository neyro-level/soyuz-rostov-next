import assert from "node:assert/strict";
import {
	assertDevelopmentKindFields,
	assertDevelopmentMediaItems,
	assertDevelopmentSlug,
	assertPublishedDevelopmentSlugImmutable,
	buildDevelopmentSemanticSlug,
	computeDevelopmentCompletenessScore,
	developmentUrlSlug,
	isDevelopmentTierCPublicPassport,
	isFreshDevelopmentPrice,
} from "../src/core/developments/domain.ts";

assert.doesNotThrow(() =>
	assertDevelopmentKindFields({
		kind: "residential_complex",
		layouts: [{ title: "1 room" }],
	}),
);
assert.doesNotThrow(() =>
	assertDevelopmentKindFields({
		kind: "cottage_village",
		communications: { gas: true },
	}),
);
assert.throws(
	() =>
		assertDevelopmentKindFields({
			kind: "residential_complex",
			plotsCount: 10,
		}),
	/kind=residential_complex/,
);
assert.throws(
	() =>
		assertDevelopmentKindFields({
			kind: "cottage_village",
			progress: [{ percent: 20 }],
		}),
	/kind=cottage_village/,
);
assert.equal(assertDevelopmentSlug("solnechnyy"), "solnechnyy");
assert.throws(
	() => assertDevelopmentSlug("zhk-solnechnyy"),
	/without the URL prefix/,
);
assert.equal(
	developmentUrlSlug("residential_complex", "solnechnyy"),
	"zhk-solnechnyy",
);
assert.equal(developmentUrlSlug("cottage_village", "bereg"), "kp-bereg");
assert.equal(
	buildDevelopmentSemanticSlug({
		base: "solnechnyy",
		citySlug: "rostov",
		hasRealCollision: false,
	}),
	"solnechnyy",
);
assert.equal(
	buildDevelopmentSemanticSlug({
		base: "solnechnyy",
		citySlug: "rostov",
		hasRealCollision: true,
	}),
	"solnechnyy-rostov",
);

const referenceDate = new Date("2026-09-25T12:00:00.000Z");
assert.equal(
	isFreshDevelopmentPrice("2026-08-11T12:00:00.000Z", referenceDate),
	true,
);
assert.equal(
	isFreshDevelopmentPrice("2026-08-11T11:59:59.999Z", referenceDate),
	false,
);
assert.equal(
	isFreshDevelopmentPrice("2026-09-25T12:00:00.001Z", referenceDate),
	false,
);
assert.equal(isFreshDevelopmentPrice("not-a-date", referenceDate), false);

const tierCPublicPassport = {
	id: 1,
	slug: "solnechnyy",
	kind: "residential_complex" as const,
	name: "ЖК Солнечный",
	city: { id: 2, slug: "primorsk", title: "Приморск" },
	salesStatus: "on_sale" as const,
	salesAvailability: "confirmed" as const,
};
assert.equal(isDevelopmentTierCPublicPassport(tierCPublicPassport), true);
assert.equal(
	isDevelopmentTierCPublicPassport({ ...tierCPublicPassport, developer: null }),
	true,
);
assert.equal(
	isDevelopmentTierCPublicPassport({ ...tierCPublicPassport, name: "" }),
	false,
);
assert.equal(
	isDevelopmentTierCPublicPassport({ ...tierCPublicPassport, city: null }),
	false,
);
assert.equal(
	isDevelopmentTierCPublicPassport({
		...tierCPublicPassport,
		salesAvailability: "unknown",
	}),
	false,
);

assert.equal(
	computeDevelopmentCompletenessScore({
		name: "Солнечный",
		slug: "solnechnyy",
		kind: "residential_complex",
		region: 1,
		city: 2,
		districtRaw: "Центральный",
		developer: 3,
		address: "ул. Примерная, 1",
		salesStatus: "on_sale",
		salesAvailability: "confirmed",
		priceByRooms: [{ roomsLabel: "1-комнатные", priceFromMinor: 5_000_000_00 }],
		mediaItems: [{ media: 4, mediaType: "hero" }],
		descriptions: [{ kind: "short", text: "Описание" }],
		completion: "IV квартал 2027",
	}),
	100,
);
assert.equal(
	computeDevelopmentCompletenessScore({
		name: "Солнечный",
		slug: "solnechnyy",
		kind: "residential_complex",
		region: 1,
		city: 2,
	}),
	20,
);

assert.doesNotThrow(() =>
	assertDevelopmentMediaItems([
		{
			kind: "managed",
			media: 1,
			mediaType: "construction_progress",
			capturedAt: "2026-09-25T12:00:00.000Z",
		},
	]),
);
assert.throws(
	() => assertDevelopmentMediaItems([{ mediaType: "construction_progress" }]),
	/must be managed or external/,
);
assert.throws(
	() =>
		assertDevelopmentMediaItems([
			{
				kind: "managed",
				media: 1,
				mediaType: "gallery",
				capturedAt: "invalid",
			},
		]),
	/must be ISO 8601/,
);
assert.doesNotThrow(() =>
	assertPublishedDevelopmentSlugImmutable({
		nextSlug: "solnechnyy",
		originalSlug: "solnechnyy",
		originalPublishedAt: "2026-09-25T12:00:00.000Z",
	}),
);
assert.throws(
	() =>
		assertPublishedDevelopmentSlugImmutable({
			nextSlug: "novyy-slug",
			originalSlug: "solnechnyy",
			originalPublishedAt: "2026-09-25T12:00:00.000Z",
		}),
	/immutable/,
);

console.log("verify:developments: ok");
