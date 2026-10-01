import assert from "node:assert/strict";
import type { EntityPageLifecycleState } from "../src/core/lifecycle/entity-lifecycle.ts";
import {
	decidePage,
	type PageKey,
	type ResolverPageResult,
} from "../src/core/routing/index.ts";
import {
	type ContentGateInput,
	evaluateContentGate,
} from "../src/core/seo/content-gate.ts";
import type { SeoRegistryRow } from "../src/core/seo/registry.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import {
	collectPassingDeveloperIds,
	mergeDeveloperCards,
	publishedDeveloperGeoSlugs,
} from "../src/project/routing/developer-surface.ts";
import { projectSeoRegistrySeed } from "../src/project/seo/registry-seed.ts";

const now = new Date("2026-09-24T12:00:00.000Z");
const activeLifecycle: EntityPageLifecycleState = {
	kind: "active",
	statusCode: 200,
};
const override = {
	actor: "owner",
	reason: "Reviewed exception",
	requestedAt: "2026-09-24T10:00:00.000Z",
};
const registryFixture = projectSeoRegistrySeed[1];
assert.ok(registryFixture);
const approvedRegistry: SeoRegistryRow = {
	...registryFixture,
	synthetic: false,
	status: "approved",
	defaultRobots: "index,follow",
	source: "wordstat",
	value: 100,
	minimumObjects: 5,
	tier: "P1",
};

function approvedRow(index: number): SeoRegistryRow {
	const row = projectSeoRegistrySeed[index];
	assert.ok(row);
	return {
		...row,
		synthetic: false,
		status: "approved",
		defaultRobots: "index,follow",
		source: "wordstat",
		value: 100,
		minimumObjects: 5,
		tier: "P1",
	};
}

function resolved(pageKey: PageKey, canonicalPath: string): ResolverPageResult {
	return {
		kind: "page",
		pageKey,
		canonicalPath,
		profileStatus: "ACTIVE",
		lifecycle: "active",
		market: pageKey.kind === "property" ? "secondary" : null,
		dataTier: pageKey.kind === "development" ? "A" : null,
		inventory: 1,
	};
}

const common = {
	url: approvedRegistry.url,
	canonical: approvedRegistry.url,
	profileStatus: "ACTIVE" as const,
};

const passingCases: readonly ContentGateInput[] = [
	{
		...common,
		kind: "listing",
		registry: approvedRegistry,
		inventory: 12,
		intro: "Полезное описание каталога. ".repeat(30),
		ssrLinkCount: 3,
	},
	{
		...common,
		kind: "secondary",
		lifecycle: activeLifecycle,
		priceMinor: 7_000_000_00,
		area: 54,
		category: "apartment",
		rooms: 2,
		district: null,
		rawDistrictRef: "legacy:district-17",
		ownedPhotoCount: 3,
		description: "Квартира с проверенным описанием.",
	},
	{
		...common,
		kind: "development",
		lifecycle: activeLifecycle,
		dataTier: "A",
		developerPresent: true,
		cityPresent: true,
		addressPresent: true,
		coordinatesPresent: true,
		classPresent: true,
		completionOrDeadlinePresent: true,
		salesStatusPresent: true,
		completed: false,
		description: "Описание жилого комплекса. ".repeat(70),
		descriptionSource: "official-developer",
		descriptionCheckedAt: "2026-09-20T00:00:00.000Z",
		validMediaCount: 8,
		validLayoutCount: 1,
		progressPresent: true,
		validPriceRows: [
			{
				checkedAt: "2026-09-20T00:00:00.000Z",
				source: "official-developer",
			},
			{
				checkedAt: "2026-09-21T00:00:00.000Z",
				source: "official-developer",
			},
		],
	},
	{
		...common,
		kind: "developerGeo",
		developersWithPassingDevelopment: 5,
		registry: approvedRegistry,
		intro: "Проверенное описание страницы застройщиков. ".repeat(20),
	},
	{
		...common,
		kind: "developer",
		lifecycle: activeLifecycle,
		hasPassingDevelopment: true,
		description: "Проверенное описание застройщика. ".repeat(20),
		descriptionSource: "official-company-profile",
		descriptionCheckedAt: "2026-09-20T00:00:00.000Z",
	},
];
const passingListing = passingCases[0] as Extract<
	ContentGateInput,
	{ kind: "listing" }
>;
const passingSecondary = passingCases[1] as Extract<
	ContentGateInput,
	{ kind: "secondary" }
>;
const passingDevelopment = passingCases[2] as Extract<
	ContentGateInput,
	{ kind: "development" }
>;

for (const [profileName, profile] of Object.entries(siteProfileFixtures)) {
	for (const input of passingCases) {
		const decision = evaluateContentGate(profile, input, now);
		assert.equal(decision.statusCode, 200, `${profileName}:${input.kind}`);
		assert.equal(decision.indexing, "index", `${profileName}:${input.kind}`);
		assert.equal(
			decision.includeInSitemap,
			true,
			`${profileName}:${input.kind}`,
		);
	}
}

const requiredDecisionCases = [
	{
		name: "district with one object",
		row: approvedRow(4),
		input(row: SeoRegistryRow): ContentGateInput {
			return {
				url: row.url,
				canonical: row.canonical,
				profileStatus: "ACTIVE",
				kind: "listing",
				registry: row,
				inventory: 1,
				intro: "Полезное описание каталога. ".repeat(30),
				ssrLinkCount: 1,
			};
		},
		reason: "listing_inventory_below_tier",
	},
	{
		name: "development tier C",
		row: approvedRow(7),
		input(row: SeoRegistryRow): ContentGateInput {
			return {
				...passingDevelopment,
				url: row.url,
				canonical: row.canonical,
				profileStatus: "ACTIVE",
				dataTier: "C",
			};
		},
		reason: "development_tier_c",
	},
	{
		name: "development A with stale prices",
		row: approvedRow(7),
		input(row: SeoRegistryRow): ContentGateInput {
			return {
				...passingDevelopment,
				url: row.url,
				canonical: row.canonical,
				profileStatus: "ACTIVE",
				validPriceRows: [
					{
						checkedAt: "2026-08-01T00:00:00.000Z",
						source: "official-developer",
					},
					{
						checkedAt: "2026-08-02T00:00:00.000Z",
						source: "official-developer",
					},
				],
			};
		},
		reason: "development_prices_below_tier",
	},
	{
		name: "secondary property with fewer than three owned photos",
		row: approvedRow(10),
		input(row: SeoRegistryRow): ContentGateInput {
			return {
				url: row.url,
				canonical: row.canonical,
				profileStatus: "ACTIVE",
				lifecycle: activeLifecycle,
				kind: "secondary",
				priceMinor: 7_000_000_00,
				area: 54,
				category: "apartment",
				rooms: 2,
				district: "Северный",
				rawDistrictRef: null,
				ownedPhotoCount: 2,
				description: "Проверенное описание объекта.",
			};
		},
		reason: "secondary_photos_missing",
	},
] as const;

for (const testCase of requiredDecisionCases) {
	const input = testCase.input(testCase.row);
	const page = decidePage(
		siteProfileFixtures.multiGeo,
		testCase.row.pageKey,
		resolved(testCase.row.pageKey, testCase.row.url),
		input,
		now,
	);
	assert.equal(page.statusCode, 200, `${testCase.name}: status`);
	assert.deepEqual(
		page.robots,
		{ indexing: "noindex", following: "follow" },
		testCase.name,
	);
	assert.equal(page.canonicalPath, testCase.row.url, testCase.name);
	assert.equal(page.inSitemap, false, testCase.name);
	assert.equal(page.indexNowEligible, false, testCase.name);
	assert.equal(page.visibleInMenu, false, testCase.name);
	assert.equal(page.visibleInInterlinks, false, testCase.name);
	assert.ok(page.gate.reasons.includes(testCase.reason), testCase.name);
}

const profile = siteProfileFixtures.multiGeo;
assert.deepEqual(publishedDeveloperGeoSlugs(profile), [
	"primorsk",
	"zarechnyy",
]);
const developerCard = {
	id: "developer-1",
	slug: "developer-1",
	pageKey: { kind: "developer" as const, slug: "developer-1" },
	href: "/zastroyshchiki/developer-1/",
	name: "Developer One",
	developmentsCount: 1,
	geoNames: ["Приморск"],
};
assert.deepEqual(
	mergeDeveloperCards([
		[developerCard],
		[
			{
				...developerCard,
				developmentsCount: 2,
				geoNames: ["Заречный"],
			},
		],
	])[0],
	{
		...developerCard,
		developmentsCount: 3,
		geoNames: ["Приморск", "Заречный"],
	},
);
assert.deepEqual(
	[
		...collectPassingDeveloperIds([
			{ developerId: "primary-failed", indexing: "noindex" },
			{ developerId: "outside-primary-passed", indexing: "index" },
		]),
	],
	["outside-primary-passed"],
);
const weakDeveloperGeo = evaluateContentGate(
	profile,
	{
		...common,
		kind: "developerGeo",
		developersWithPassingDevelopment: profile.gate.developerGeoMin,
		registry: null,
		intro: "Коротко",
	},
	now,
);
assert.equal(weakDeveloperGeo.indexing, "noindex");
assert.ok(weakDeveloperGeo.reasons.includes("registry_metadata_not_approved"));
assert.ok(weakDeveloperGeo.reasons.includes("developer_geo_intro_too_short"));
const weakListing: ContentGateInput = {
	...common,
	kind: "listing",
	registry: null,
	inventory: 0,
	intro: "Коротко",
	ssrLinkCount: 0,
};
const weakDecision = evaluateContentGate(profile, weakListing, now);
assert.equal(weakDecision.statusCode, 200);
assert.equal(weakDecision.indexing, "noindex");
assert.equal(weakDecision.includeInSitemap, false);
assert.ok(weakDecision.reasons.includes("registry_metadata_not_approved"));

const overridden = evaluateContentGate(
	profile,
	{ ...weakListing, ownerOverride: override },
	now,
);
assert.equal(overridden.indexing, "index");
assert.equal(overridden.overrideAudit?.result, "applied");

const out = evaluateContentGate(
	profile,
	{ ...weakListing, profileStatus: "OUT", ownerOverride: override },
	now,
);
assert.equal(out.statusCode, 404);
assert.equal(out.overrideAudit?.result, "denied");

const preparedOff = evaluateContentGate(
	profile,
	{ ...weakListing, profileStatus: "PREPARED_OFF", ownerOverride: override },
	now,
);
assert.equal(preparedOff.statusCode, 404);

const autoNoindex = evaluateContentGate(
	profile,
	{
		...passingListing,
		profileStatus: "NOINDEX_AUTO",
		ownerOverride: override,
	},
	now,
);
assert.equal(autoNoindex.statusCode, 200);
assert.equal(autoNoindex.indexing, "noindex");
assert.equal(autoNoindex.overrideAudit?.result, "denied");

const noneTier = evaluateContentGate(
	profile,
	{
		...passingListing,
		registry: { ...approvedRegistry, tier: "NONE" },
	},
	now,
);
assert.equal(noneTier.statusCode, 200);
assert.equal(noneTier.indexing, "noindex");
assert.ok(noneTier.reasons.includes("registry_tier_none"));

for (const lifecycle of [
	{ kind: "missing", statusCode: 404 },
	{ kind: "archived", statusCode: 200, robots: "noindex" },
	{ kind: "redirect", statusCode: 301, destination: "/target/" },
	{ kind: "gone", statusCode: 410, robots: "noindex" },
] as const satisfies readonly EntityPageLifecycleState[]) {
	const decision = evaluateContentGate(
		profile,
		{
			...passingSecondary,
			lifecycle,
			ownerOverride: override,
		},
		now,
	);
	assert.equal(decision.statusCode, lifecycle.statusCode);
	assert.equal(decision.indexing, "noindex");
	assert.equal(decision.overrideAudit?.result, "denied");
}

const newbuild = evaluateContentGate(
	profile,
	{
		...common,
		kind: "newbuildLot",
		lifecycle: activeLifecycle,
		canonical: "/wrong/",
		ownerOverride: override,
	},
	now,
);
assert.equal(newbuild.indexing, "noindex");
assert.equal(newbuild.following, "follow");
assert.equal(newbuild.canonical, common.url);
assert.equal(newbuild.includeInSitemap, false);
assert.equal(newbuild.overrideAudit?.result, "denied");

const staleDevelopment = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		validPriceRows: [
			{
				checkedAt: "2026-07-25T00:00:00.000Z",
				source: "official-developer",
			},
		],
	},
	now,
);
assert.equal(staleDevelopment.visiblePriceRows, 0);
assert.equal(staleDevelopment.indexing, "noindex");
assert.equal(staleDevelopment.dataTier, "A");

const expiredDevelopment = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		validPriceRows: [
			{
				checkedAt: "2026-05-01T00:00:00.000Z",
				source: "official-developer",
			},
		],
	},
	now,
);
assert.ok(
	expiredDevelopment.reasons.includes("development_all_prices_expired"),
);
assert.equal(expiredDevelopment.dataTier, "A");

const tierC = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		dataTier: "C",
		ownerOverride: override,
	},
	now,
);
assert.equal(tierC.indexing, "noindex");

assert.equal(tierC.statusCode, 200);
assert.equal(tierC.following, "follow");
assert.equal(tierC.canonical, passingDevelopment.url);
assert.equal(tierC.includeInSitemap, false);
assert.equal(tierC.overrideAudit?.result, "denied");

const missingDevelopmentPassportCases: readonly {
	name: string;
	input: Extract<ContentGateInput, { kind: "development" }>;
}[] = [
	{
		name: "developer",
		input: { ...passingDevelopment, developerPresent: false },
	},
	{
		name: "city",
		input: { ...passingDevelopment, cityPresent: false },
	},
	{
		name: "address",
		input: { ...passingDevelopment, addressPresent: false },
	},
	{
		name: "coordinates",
		input: { ...passingDevelopment, coordinatesPresent: false },
	},
	{
		name: "class",
		input: { ...passingDevelopment, classPresent: false },
	},
	{
		name: "completion or deadline",
		input: { ...passingDevelopment, completionOrDeadlinePresent: false },
	},
	{
		name: "sales status",
		input: { ...passingDevelopment, salesStatusPresent: false },
	},
	{
		name: "description source",
		input: { ...passingDevelopment, descriptionSource: null },
	},
	{
		name: "description checkedAt",
		input: { ...passingDevelopment, descriptionCheckedAt: null },
	},
];

for (const testCase of missingDevelopmentPassportCases) {
	const decision = evaluateContentGate(profile, testCase.input, now);
	assert.equal(decision.statusCode, 200, testCase.name);
	assert.equal(decision.indexing, "noindex", testCase.name);
	assert.equal(decision.following, "follow", testCase.name);
	assert.equal(decision.canonical, passingDevelopment.url, testCase.name);
	assert.equal(decision.includeInSitemap, false, testCase.name);
}

const tierB = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		dataTier: "B",
		description: "Проверенное описание жилого комплекса для публичной карточки. ".repeat(
			12,
		),
		validPriceRows: [
			{
				checkedAt: "2026-09-20T00:00:00.000Z",
				source: "official-developer",
			},
		],
		validMediaCount: 3,
		validLayoutCount: 0,
		progressPresent: false,
	},
	now,
);
assert.equal(tierB.statusCode, 200);
assert.equal(tierB.indexing, "index");
assert.equal(tierB.following, "follow");
assert.equal(tierB.includeInSitemap, true);
assert.equal(tierB.dataTier, "B");
assert.equal(tierB.visiblePriceRows, 1);
assert.equal(tierB.reasons.includes("development_layouts_below_tier"), false);
assert.equal(tierB.reasons.includes("development_progress_missing"), false);

const tierBShortDescription = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		dataTier: "B",
		description: "Короткое описание.",
		validPriceRows: [
			{
				checkedAt: "2026-09-20T00:00:00.000Z",
				source: "official-developer",
			},
		],
		validMediaCount: 3,
		validLayoutCount: 0,
		progressPresent: false,
	},
	now,
);
assert.equal(tierBShortDescription.indexing, "noindex");
assert.ok(
	tierBShortDescription.reasons.includes("development_description_below_tier"),
);

const tierBStalePrice = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		dataTier: "B",
		description: "Проверенное описание жилого комплекса для публичной карточки. ".repeat(
			12,
		),
		validPriceRows: [
			{
				checkedAt: "2026-08-01T00:00:00.000Z",
				source: "official-developer",
			},
		],
		validMediaCount: 3,
		validLayoutCount: 0,
		progressPresent: false,
	},
	now,
);
assert.equal(tierBStalePrice.indexing, "noindex");
assert.equal(tierBStalePrice.visiblePriceRows, 0);
assert.ok(tierBStalePrice.reasons.includes("development_prices_below_tier"));

const developmentWithoutDescriptionSource = evaluateContentGate(
	profile,
	{ ...passingDevelopment, descriptionSource: null },
	now,
);
assert.equal(developmentWithoutDescriptionSource.indexing, "noindex");
assert.ok(
	developmentWithoutDescriptionSource.reasons.includes(
		"development_description_not_sourced",
	),
);

const developmentWithoutDescriptionCheckedAt = evaluateContentGate(
	profile,
	{ ...passingDevelopment, descriptionCheckedAt: null },
	now,
);
assert.equal(developmentWithoutDescriptionCheckedAt.indexing, "noindex");
assert.ok(
	developmentWithoutDescriptionCheckedAt.reasons.includes(
		"development_description_not_sourced",
	),
);

const developmentWithUnprovenancedPrice = evaluateContentGate(
	profile,
	{
		...passingDevelopment,
		validPriceRows: [
			{ checkedAt: "2026-09-20T00:00:00.000Z", source: "" },
			{ checkedAt: "2026-09-21T00:00:00.000Z", source: "" },
		],
	},
	now,
);
assert.equal(developmentWithUnprovenancedPrice.indexing, "noindex");
assert.equal(developmentWithUnprovenancedPrice.visiblePriceRows, 0);
assert.ok(
	developmentWithUnprovenancedPrice.reasons.includes(
		"development_prices_not_sourced",
	),
);
assert.ok(
	developmentWithUnprovenancedPrice.reasons.includes(
		"development_prices_below_tier",
	),
);

assert.throws(
	() =>
		evaluateContentGate(
			profile,
			{ ...weakListing, ownerOverride: { ...override, reason: "" } },
			now,
		),
	/actor and reason/,
);
assert.throws(
	() =>
		evaluateContentGate(
			profile,
			{
				...passingDevelopment,
				validPriceRows: [
					{
						checkedAt: "2026-09-25T00:00:00.000Z",
						source: "official-developer",
					},
				],
			},
			now,
		),
	/future/,
);

console.log(
	"verify:content-gate passed (five profiles + listing/property/development/developer/override matrix)",
);
