import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../../payload.config.ts";
import { systemOverrideAccess } from "../../src/core/data-access/system/overrides.ts";
import { runPropertyGeoBackfill } from "../../src/core/data-access/system/property-geo-backfill.ts";
import { defineSiteProfile } from "../../src/core/profile/index.ts";
import {
	countInventory,
	getGeoBySlug,
	getListing,
	getNearby,
	getPropertyByPublicUrlId,
} from "../../src/project/data-access/public/geo-catalog.ts";
import { requirePayloadRuntime } from "../../src/project/env.ts";
import { siteProfile } from "../../src/project/site-profile.ts";
import { createProjectUrlGrammar } from "../../src/project/url-grammar.ts";

requirePayloadRuntime();
const payload = await getPayload({ config });
const access = systemOverrideAccess("system-job");
const suffix = Date.now().toString(36);
const brandName = "Integration Realty";

const feedSource = await payload.create({
	collection: "feed-sources",
	data: {
		code: `geo-backfill-${suffix}`,
		title: "Geo backfill fixture",
		parser: "yrl",
		market: "secondary",
		feedUrlRef: "GEO_BACKFILL_FIXTURE_URL",
		enabled: false,
		refreshIntervalMinutes: 1440,
		safetyThresholdPercent: 30,
		maxDeactivationsPerRun: 50,
	},
	...access,
});
const run = await payload.create({
	collection: "import-runs",
	data: {
		feedSource: feedSource.id,
		status: "running",
		jobId: "property-geo-backfill-v1",
		queuedAt: "2026-09-24T15:00:00.000Z",
		startedAt: "2026-09-24T15:00:00.000Z",
	},
	...access,
});
const genericRun = await payload.create({
	collection: "import-runs",
	data: {
		feedSource: feedSource.id,
		status: "running",
		queuedAt: "2026-09-24T14:59:00.000Z",
	},
	...access,
});
await assert.rejects(
	() =>
		runPropertyGeoBackfill({
			payload,
			importRunId: genericRun.id,
			apply: true,
		}),
	/dedicated property-geo-backfill-v1/i,
);

const createProperty = (input: {
	externalId: string;
	slug: string;
	locality: string;
	district: string;
	market?: "secondary" | "newbuild";
	rooms?: number;
}) =>
	payload.create({
		collection: "properties",
		data: {
			feedSource: feedSource.id,
			externalId: input.externalId,
			origin: "feed",
			status: "active",
			slug: input.slug,
			market: input.market ?? "secondary",
			category: "apartment",
			dealType: "sale",
			region: "Приморье",
			locality: input.locality,
			district: input.district,
			rooms: input.rooms,
			title: `Geo fixture ${input.externalId}`,
		},
		...access,
	});

const matched = await createProperty({
	externalId: `matched-${suffix}`,
	slug: `geo-matched-${suffix}`,
	locality: "Приморск",
	district: "Северный",
	rooms: 2,
});
const newbuild = await createProperty({
	externalId: `newbuild-${suffix}`,
	slug: `geo-newbuild-${suffix}`,
	locality: "Приморск",
	district: "Северный",
	market: "newbuild",
	rooms: 1,
});
const unknown = await createProperty({
	externalId: `unknown-${suffix}`,
	slug: `geo-unknown-${suffix}`,
	locality: "Приморск",
	district: "Неизвестный район",
});
const scopedSynonym = await createProperty({
	externalId: `scoped-${suffix}`,
	slug: `geo-scoped-${suffix}`,
	locality: "Заречный",
	district: "Центр",
});

const first = await runPropertyGeoBackfill({
	payload,
	importRunId: run.id,
	apply: true,
	batchSize: 2,
});
assert.equal(first.processed, 4);
assert.equal(first.updated, 4);
assert.equal(first.createdIssues, 1);

const [matchedAfter, unknownAfter, scopedAfter] = await Promise.all([
	payload.findByID({
		collection: "properties",
		id: matched.id,
		depth: 0,
		...access,
	}),
	payload.findByID({
		collection: "properties",
		id: unknown.id,
		depth: 0,
		...access,
	}),
	payload.findByID({
		collection: "properties",
		id: scopedSynonym.id,
		depth: 0,
		...access,
	}),
]);
assert.ok(
	matchedAfter.regionRef && matchedAfter.cityRef && matchedAfter.districtRef,
);
assert.equal(unknownAfter.status, "active");
assert.equal(unknownAfter.districtRef, null);
assert.equal(unknownAfter.needsReview, true);
assert.ok(scopedAfter.cityRef && scopedAfter.districtRef);
assert.notEqual(String(scopedAfter.cityRef), String(matchedAfter.cityRef));

const issues = await payload.find({
	collection: "import-issues",
	where: { importRun: { equals: run.id } },
	pagination: false,
	depth: 0,
	...access,
});
assert.equal(issues.totalDocs, 1);
assert.equal(issues.docs[0]?.code, "GEO_DISTRICT_UNRECOGNIZED");
assert.ok(!issues.docs[0]?.messageRedacted.includes("Неизвестный"));

const second = await runPropertyGeoBackfill({
	payload,
	importRunId: run.id,
	apply: true,
	batchSize: 2,
});
assert.equal(second.processed, 4);
assert.equal(second.updated, 0);
assert.equal(second.unchanged, 4);
assert.equal(second.createdIssues, 0);

for (const property of [matchedAfter, newbuild, unknownAfter, scopedAfter]) {
	await payload.update({
		collection: "properties",
		id: property.id,
		data: { publishedAt: "2026-09-24T16:00:00.000Z" },
		...access,
	});
}

let observedQueries = 0;
const observedPayload = new Proxy(payload, {
	get(target, property, receiver) {
		const value = Reflect.get(target, property, receiver);
		if (
			(property === "find" || property === "count") &&
			typeof value === "function"
		) {
			return (...args: unknown[]) => {
				observedQueries += 1;
				return Reflect.apply(value, target, args);
			};
		}
		return typeof value === "function" ? value.bind(target) : value;
	},
});

observedQueries = 0;
const primorskListing = await getListing(
	observedPayload,
	{
		geo: "primorsk",
		surface: "kvartiry",
	},
	brandName,
);
assert.ok(primorskListing, "primary geo listing must resolve");
assert.ok(
	primorskListing.subLinks.some(
		(link) => link.href === "/primorsk/kvartiry/vtorichka/",
	),
	"approved vtorichka facet must be exposed as a clean SSR link",
);
assert.ok(
	primorskListing.items.some(
		(item) =>
			item.kind === "property" && item.item.id === String(matchedAfter.id),
	),
	"primary geo property must be present in its listing",
);
assert.ok(
	!primorskListing.items.some(
		(item) =>
			item.kind === "property" && item.item.id === String(scopedAfter.id),
	),
	"secondary geo property must not pollute the primary geo listing",
);
assert.ok(
	observedQueries <= 3,
	"listing plus same-agglomeration nearby query budget must not grow per item",
);

const pageTwoListing = await getListing(
	observedPayload,
	{
		geo: "primorsk",
		surface: "kvartiry",
		page: 2,
		query: { limit: 1 },
	},
	brandName,
);
assert.ok(pageTwoListing, "catalog page 2 must resolve when inventory exists");
assert.equal(pageTwoListing.pagination.page, 2);
const pageTwoProperty = pageTwoListing.items.find(
	(item) => item.kind === "property",
);
assert.ok(pageTwoProperty, "catalog page 2 must expose an SSR entity link");
assert.equal(
	(
		await getPropertyByPublicUrlId(
			observedPayload,
			pageTwoProperty.item.publicUrlId,
		)
	)?.href,
	pageTwoProperty.item.href,
	"catalog page 2 entity link must resolve to the same public entity",
);

const facetListing = await getListing(
	observedPayload,
	{
		geo: "primorsk",
		surface: "kvartiry",
		facet: "dvukhkomnatnye",
	},
	brandName,
);
assert.ok(facetListing, "configured SEO facet must resolve");
assert.deepEqual(
	facetListing.items
		.filter((item) => item.kind === "property")
		.map((item) => item.item.id),
	[String(matchedAfter.id)],
	"SEO facet must affect both result rows and total",
);
assert.equal(facetListing.total, 1);

const secondaryFacetListing = await getListing(
	observedPayload,
	{
		geo: "primorsk",
		surface: "kvartiry",
		facet: "vtorichka",
	},
	brandName,
);
assert.ok(secondaryFacetListing, "secondary market SEO facet must resolve");
assert.ok(
	!secondaryFacetListing.items.some(
		(item) => item.kind === "property" && item.item.id === String(newbuild.id),
	),
	"vtorichka facet must exclude newbuild properties",
);
assert.equal(
	await countInventory(observedPayload, {
		geo: "primorsk",
		surface: "kvartiry",
		facet: "vtorichka",
	}),
	secondaryFacetListing.total,
	"vtorichka inventory count must use the same secondary market filter",
);

const secondaryOnlyInput = structuredClone(siteProfile);
secondaryOnlyInput.marketStatus.primorsk.newbuild = "OUT";
const secondaryOnlyProfile = defineSiteProfile(secondaryOnlyInput);
const secondaryOnlyGrammar = createProjectUrlGrammar(secondaryOnlyProfile);
const secondaryOnlyListing = await getListing(
	observedPayload,
	{ geo: "primorsk", surface: "kvartiry" },
	brandName,
	secondaryOnlyGrammar,
	secondaryOnlyProfile,
);
assert.ok(secondaryOnlyListing);
assert.ok(
	!secondaryOnlyListing.items.some(
		(item) => item.kind === "property" && item.item.id === String(newbuild.id),
	),
	"geo marketStatus=OUT must remove newbuild rows",
);
assert.equal(
	await countInventory(
		observedPayload,
		{ geo: "primorsk", surface: "kvartiry" },
		secondaryOnlyProfile,
	),
	secondaryOnlyListing.total,
	"market-scoped result and inventory counts must agree",
);

const secondaryPublicUrlId = scopedAfter.publicUrlId;
assert.equal(typeof secondaryPublicUrlId, "number");
observedQueries = 0;
assert.equal(
	(
		await getPropertyByPublicUrlId(
			observedPayload,
			secondaryPublicUrlId as number,
		)
	)?.id,
	String(scopedAfter.id),
	"secondary geo property must remain directly reachable by immutable public URL id",
);
assert.equal(
	observedQueries,
	1,
	"property details lookup must use one bounded query",
);

observedQueries = 0;
assert.equal(
	(await getGeoBySlug(observedPayload, "zarechnyy"))?.slug,
	"zarechnyy",
);
assert.equal(observedQueries, 1, "geo lookup must use one bounded query");

observedQueries = 0;
assert.deepEqual(
	await getNearby(observedPayload, "primorsk"),
	[],
	"single-geo profile must not expose a non-routable agglomeration city",
);
assert.ok(
	observedQueries <= 2,
	"nearby lookup must stay within its fixed budget",
);

observedQueries = 0;
assert.ok(
	(await countInventory(observedPayload, {
		geo: "primorsk",
		surface: "kvartiry",
	})) >= 2,
);
assert.ok(observedQueries <= 2, "inventory count must use a bounded aggregate");

await assert.rejects(
	() =>
		getListing(
			observedPayload,
			{
				surface: "kvartiry",
			} as never,
			brandName,
		),
	/geo|invalid_type/i,
	"listing must never infer a default city",
);

await payload.destroy();
console.log("property geo integration suites: ok");
