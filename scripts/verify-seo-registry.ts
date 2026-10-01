import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
	assertSeoRegistry,
	deriveSeoTier,
	formatRussianPlural,
	type SeoRegistryRow,
} from "../src/core/seo/registry.ts";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { assertProjectSeoTemplateClaimsAreSourced } from "../src/project/seo/claim-guard.ts";
import { projectSeoClaimSourcesInput } from "../src/project/seo/claim-sources.ts";
import {
	projectDistrictRouteRegistry,
	projectSeoRegistrySeed,
} from "../src/project/seo/registry-seed.ts";
import { projectSeoTemplatesInput } from "../src/project/seo/template-inputs.ts";
import {
	isFreshPriceCheckedAt,
	projectHomeSeoTemplateKey,
	projectSeoActiveCategoriesList,
	projectSeoCategoryForms,
	projectSeoTemplateKeys,
	renderProjectSeoTemplate,
} from "../src/project/seo/templates.ts";
import {
	activeProjectGeoCategorySurfaces,
	siteProfile,
} from "../src/project/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	districtRegistryFromBootstrap,
	parseDistrictRegistryCsv,
	validateRegistryCsv,
} from "./seo-registry.ts";

const grammar = createProjectUrlGrammar(
	siteProfile,
	projectDistrictRouteRegistry,
);
const now = new Date(`${siteProfile.seoTiers.snapshotDate}T12:00:00.000Z`);
const csvSource = readFileSync("docs/seo/SEO_REGISTRY_SEED.csv", "utf8");
const csvRows = validateRegistryCsv(csvSource);
assert.deepEqual(csvRows, projectSeoRegistrySeed);
const generatedSource = readFileSync(
	"src/project/seo/registry-seed.ts",
	"utf8",
);
assert.doesNotMatch(
	generatedSource,
	/fixture\/route-registries|siteProfileFixtures/,
);
assert.match(generatedSource, /siteProfile/);

const [csvHeader, homeCsvRow] = csvSource.split(/\r?\n/);
assert.ok(csvHeader && homeCsvRow);
const homeRegistryRow = projectSeoRegistrySeed.find(
	(row) => row.pageKey.kind === "home",
);
assert.ok(homeRegistryRow);

function replaceRequired(
	source: string,
	before: string,
	after: string,
): string {
	assert.ok(source.includes(before), `Expected CSV fixture token: ${before}`);
	return source.replace(before, after);
}

for (const [name, profile] of Object.entries(siteProfileFixtures)) {
	const registry = fixtureDistrictRouteRegistryFor(profile);
	const fixtureTier = deriveSeoTier(null, profile.seoTiers);
	const fixtureMinimumObjects =
		fixtureTier === "NONE" ? 0 : profile.seoTiers.minInventory[fixtureTier];
	const fixtureMetricRow = replaceRequired(
		homeCsvRow,
		`,${siteProfile.seoTiers.metric},`,
		`,${profile.seoTiers.metric},`,
	);
	const fixtureHomeRow = replaceRequired(
		fixtureMetricRow,
		`,${homeRegistryRow.tier},${homeRegistryRow.minimumObjects},`,
		`,${fixtureTier},${fixtureMinimumObjects},`,
	);
	const [profileRow] = validateRegistryCsv(
		`${csvHeader}\n${fixtureHomeRow}\n`,
		profile,
		registry,
	);
	assert.ok(profileRow);
	const profileGrammar = createProjectUrlGrammar(
		profile,
		fixtureDistrictRouteRegistryFor(profile),
	);
	assert.doesNotThrow(
		() =>
			assertSeoRegistry({
				rows: [{ ...profileRow, targetPhrases: [`${name} home intent`] }],
				buildUrl: profileGrammar.buildUrl,
				now,
			}),
		`${name} CSV fixture`,
	);
}

const duplicateCsv = `${csvSource.trimEnd()}\n${csvSource.split(/\r?\n/)[1]}\n`;
assert.throws(
	() => validateRegistryCsv('"unterminated'),
	/unterminated quoted field/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			csvSource.replace("pageKey,url,canonical", "url,pageKey,canonical"),
		),
	/columns or order differ/,
);
assert.throws(
	() => validateRegistryCsv(duplicateCsv),
	/Duplicate SEO URL|Duplicate SEO intent/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			replaceRequired(
				csvSource,
				`,${siteProfile.seoTiers.metric},,fallback_no_data,`,
				`,${siteProfile.seoTiers.metric},1,fallback_no_data,`,
			),
		),
	/must keep value null/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			replaceRequired(
				csvSource,
				`,draft,true,${homeRegistryRow.release},${homeRegistryRow.contentGateRule}`,
				`,unknown,true,${homeRegistryRow.release},${homeRegistryRow.contentGateRule}`,
			),
		),
	/Unsupported SEO registry status/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			csvSource.replace(',"noindex,follow",home', ",unknown,home"),
		),
	/Unsupported SEO robots directive/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			replaceRequired(
				csvSource,
				`,${homeRegistryRow.release},${homeRegistryRow.contentGateRule}`,
				`,${homeRegistryRow.release},unknown`,
			),
		),
	/Unsupported contentGateRule/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			replaceRequired(
				csvSource,
				`,${siteProfile.seoTiers.metric},`,
				",wordstat,",
			),
		),
	/differs from SiteProfile metric/,
);
assert.throws(
	() =>
		validateRegistryCsv(
			replaceRequired(
				csvSource,
				`,${homeRegistryRow.synthetic},${homeRegistryRow.tier},${homeRegistryRow.minimumObjects},`,
				`,${homeRegistryRow.synthetic},${homeRegistryRow.tier === "P1" ? "P2" : "P1"},${homeRegistryRow.minimumObjects},`,
			),
		),
	/differs from derived tier/,
);
assert.throws(
	() =>
		parseDistrictRegistryCsv(
			"geo,category,district\nunknown,kvartiry,central",
			siteProfile,
		),
	/unknown geo/,
);
assert.deepEqual(
	districtRegistryFromBootstrap(
		{
			geos: [
				{
					slug: siteProfile.primaryGeo,
					districts: [{ slug: "bootstrap-district" }],
				},
			],
		},
		siteProfile,
	)[siteProfile.primaryGeo]?.kvartiry,
	["bootstrap-district"],
);
assert.equal(
	deriveSeoTier(null, siteProfile.seoTiers),
	siteProfile.seoTiers.unmeasuredPolicy,
);
assert.equal(
	deriveSeoTier(siteProfile.seoTiers.bands.P1, siteProfile.seoTiers),
	"P1",
);
assert.equal(
	deriveSeoTier(siteProfile.seoTiers.bands.P2, siteProfile.seoTiers),
	"P2",
);
const wordstatProfile = {
	...siteProfile,
	seoTiers: { ...siteProfile.seoTiers, metric: "wordstat" as const },
};
assert.equal(
	validateRegistryCsv(
		`${csvHeader}\n${replaceRequired(homeCsvRow, `,${siteProfile.seoTiers.metric},`, ",wordstat,")}\n`,
		wordstatProfile,
		projectDistrictRouteRegistry,
	)[0]?.metric,
	"wordstat",
);

assertSeoRegistry({
	rows: projectSeoRegistrySeed,
	buildUrl: grammar.buildUrl,
	now,
});
const seededTemplateKeys = new Set(
	projectSeoRegistrySeed.map((row) => row.templateKey),
);
assertProjectSeoTemplateClaimsAreSourced(
	projectSeoTemplatesInput,
	projectSeoClaimSourcesInput,
);
assert.throws(
	() =>
		assertProjectSeoTemplateClaimsAreSourced(
			{ home: { title: "Лучший выбор", h1: "Выбор", description: "" } },
			{},
		),
	/SEO template claim requires a sourced project decision: best/,
);
assert.doesNotThrow(() =>
	assertProjectSeoTemplateClaimsAreSourced(
		{ home: { title: "Лучший выбор", h1: "Выбор", description: "" } },
		{ best: { decision: "docs/claims/award-2026.md" } },
	),
);
assert.ok(
	[...seededTemplateKeys].every((key) =>
		(projectSeoTemplateKeys as readonly string[]).includes(key),
	),
);
assert.ok(seededTemplateKeys.has("homeSingleGeo"));
assert.ok(!seededTemplateKeys.has("homeMultiGeo"));
assert.ok(
	projectSeoRegistrySeed.every(
		(row) =>
			row.source === "fallback_no_data" &&
			row.value === null &&
			row.status === "draft" &&
			row.defaultRobots === "noindex,follow",
	),
);

const withoutOptionals = renderProjectSeoTemplate("property", {
	brand: "AMS Realty",
	entityName: "Квартира",
});
assert.equal(withoutOptionals.h1, "Квартира");
assert.equal(withoutOptionals.description, "Квартира");
assert.ok(!withoutOptionals.description.includes("undefined"));
assert.ok(!withoutOptionals.description.includes("—"));

const stalePrice = renderProjectSeoTemplate("developmentNormal", {
	brand: "AMS Realty",
	entityName: "ЖК «Тест»",
	freshPrice: { label: "от 1 млн ₽", fresh: false },
});
assert.equal(stalePrice.description, "ЖК «Тест»");

const unapproved = renderProjectSeoTemplate("categoryGeo", {
	brand: "AMS Realty",
	category: projectSeoCategoryForms("kvartiry"),
	city: {
		approved: false,
		nominative: "Тестоград",
		genitive: "Тестограда",
		prepositional: "Тестограде",
		preposition: "в",
	},
});
assert.equal(unapproved.morphologyApproved, false);

const facetSnapshot = renderProjectSeoTemplate("categoryGeoFacet", {
	brand: "AMS Realty",
	category: projectSeoCategoryForms("kvartiry"),
	city: {
		approved: true,
		nominative: "Ростов-на-Дону",
		genitive: "Ростова-на-Дону",
		prepositional: "Ростове-на-Дону",
		preposition: "в",
	},
	facet: "Вторичные",
});
assert.equal(facetSnapshot.h1, "Вторичные квартиры в Ростове-на-Дону");

const geoHubSnapshot = renderProjectSeoTemplate("geoHub", {
	brand: "AMS Realty",
	activeCategoriesList: projectSeoActiveCategoriesList([
		"kvartiry",
		"novostroyki",
	]),
	city: {
		approved: true,
		nominative: "Ростов-на-Дону",
		genitive: "Ростова-на-Дону",
		prepositional: "Ростове-на-Дону",
		preposition: "в",
	},
	inventory: 21,
});
assert.equal(
	geoHubSnapshot.description,
	"квартиры и новостройки в Ростове-на-Дону — 21 объект.",
);
assert.throws(
	() => projectSeoActiveCategoriesList([]),
	/Geo hub SEO requires at least one active category/,
);
const localCategoryProfile = structuredClone(siteProfile);
for (const category of Object.keys(
	localCategoryProfile.categoryStatus,
) as (keyof typeof localCategoryProfile.categoryStatus)[]) {
	localCategoryProfile.categoryStatus[category] = "PREPARED_OFF";
	localCategoryProfile.geoCategoryStatus[siteProfile.primaryGeo][category] =
		"PREPARED_OFF";
}
localCategoryProfile.categoryStatus.kvartiry = "ACTIVE";
localCategoryProfile.categoryStatus.doma = "ACTIVE";
localCategoryProfile.categoryStatus.novostroyki = "ACTIVE";
localCategoryProfile.geoCategoryStatus[siteProfile.primaryGeo].kvartiry =
	"ACTIVE";
localCategoryProfile.geoCategoryStatus[siteProfile.primaryGeo].doma =
	"PREPARED_OFF";
localCategoryProfile.geoCategoryStatus[siteProfile.primaryGeo].novostroyki =
	"ACTIVE";
assert.deepEqual(
	activeProjectGeoCategorySurfaces(
		localCategoryProfile,
		siteProfile.primaryGeo,
	),
	["kvartiry", "novostroyki"],
);

const singleGeoHomeSnapshot = renderProjectSeoTemplate("homeSingleGeo", {
	brand: "AMS Realty",
	city: {
		approved: true,
		nominative: "Ростов-на-Дону",
		genitive: "Ростова-на-Дону",
		prepositional: "Ростове-на-Дону",
		preposition: "в",
	},
});
assert.equal(
	singleGeoHomeSnapshot.title,
	"Недвижимость Ростова-на-Дону — AMS Realty",
);
assert.equal(projectHomeSeoTemplateKey("SINGLE_GEO"), "homeSingleGeo");

const multiGeoHomeSnapshot = renderProjectSeoTemplate("homeMultiGeo", {
	brand: "AMS Realty",
});
assert.equal(multiGeoHomeSnapshot.title, "Недвижимость — AMS Realty");
assert.doesNotMatch(
	`${multiGeoHomeSnapshot.title} ${multiGeoHomeSnapshot.h1} ${multiGeoHomeSnapshot.description}`,
	/Ростов-на-Дону/u,
);
assert.equal(projectHomeSeoTemplateKey("MULTI_GEO"), "homeMultiGeo");

const districtSnapshot = renderProjectSeoTemplate("categoryGeoDistrictMicro", {
	brand: "AMS Realty",
	category: projectSeoCategoryForms("kvartiry"),
	city: {
		approved: true,
		nominative: "Ростов-на-Дону",
		genitive: "Ростова-на-Дону",
		prepositional: "Ростове-на-Дону",
		preposition: "в",
	},
	district: {
		approved: true,
		nominative: "Северный",
		genitive: "Северного",
		prepositional: "Северном",
		preposition: "на",
	},
	districtType: "microdistrict",
	inventory: 22,
});
assert.equal(
	districtSnapshot.title,
	"Купить квартиру на Северном в Ростове-на-Дону — цены",
);
assert.equal(districtSnapshot.h1, "Квартиры на Северном");
assert.doesNotMatch(districtSnapshot.h1, /Ростов-на-Дону/u);
assert.equal(
	districtSnapshot.description,
	"Квартиры на Северном в Ростове-на-Дону — актуальные предложения. 22 объекта.",
);

const explicitAdminDistrictSnapshot = renderProjectSeoTemplate(
	"categoryGeoDistrictAdmin",
	{
		brand: "AMS Realty",
		category: projectSeoCategoryForms("kvartiry"),
		city: {
			approved: true,
			nominative: "Ростов-на-Дону",
			genitive: "Ростова-на-Дону",
			prepositional: "Ростове-на-Дону",
			preposition: "в",
		},
		district: {
			approved: true,
			nominative: "Ленинский",
			genitive: "Ленинского",
			prepositional: "Ленинском районе",
			preposition: "в",
		},
		districtType: "admin_district",
		districtAdjLocative: "Ленинском",
		districtAdjGenitive: "Ленинского",
	},
);
assert.equal(
	explicitAdminDistrictSnapshot.title,
	"Купить квартиру в Ленинском районе Ростова-на-Дону — цены",
);
assert.equal(explicitAdminDistrictSnapshot.morphologyApproved, true);

const rentalAdminDistrictSnapshot = renderProjectSeoTemplate(
	"categoryGeoDistrictAdmin",
	{
		brand: "AMS Realty",
		category: projectSeoCategoryForms("arenda"),
		city: {
			approved: true,
			nominative: "Ростов-на-Дону",
			genitive: "Ростова-на-Дону",
			prepositional: "Ростове-на-Дону",
			preposition: "в",
		},
		district: {
			approved: true,
			nominative: "Ленинский",
			genitive: "Ленинского",
			prepositional: "Ленинском районе",
			preposition: "в",
		},
		districtType: "admin_district",
		districtAdjLocative: "Ленинском",
		districtAdjGenitive: "Ленинского",
	},
);
assert.equal(
	rentalAdminDistrictSnapshot.title,
	"Снять объект в аренду в Ленинском районе Ростова-на-Дону — цены",
);

const rentalMicrodistrictSnapshot = renderProjectSeoTemplate(
	"categoryGeoDistrictMicro",
	{
		brand: "AMS Realty",
		category: projectSeoCategoryForms("arenda"),
		city: {
			approved: true,
			nominative: "Ростов-на-Дону",
			genitive: "Ростова-на-Дону",
			prepositional: "Ростове-на-Дону",
			preposition: "в",
		},
		district: {
			approved: true,
			nominative: "Северный",
			genitive: "Северного",
			prepositional: "Северном",
			preposition: "на",
		},
		districtType: "microdistrict",
	},
);
assert.equal(
	rentalMicrodistrictSnapshot.title,
	"Снять объект в аренду на Северном в Ростове-на-Дону — цены",
);
for (const rendered of [
	rentalAdminDistrictSnapshot,
	rentalMicrodistrictSnapshot,
]) {
	assert.doesNotMatch(
		`${rendered.title} ${rendered.h1} ${rendered.description}`,
		/Купить/u,
	);
}

assert.throws(
	() =>
		renderProjectSeoTemplate("categoryGeoDistrictAdmin", {
			brand: "AMS Realty",
			category: projectSeoCategoryForms("kvartiry"),
			city: {
				approved: true,
				nominative: "Ростов-на-Дону",
				genitive: "Ростова-на-Дону",
				prepositional: "Ростове-на-Дону",
				preposition: "в",
			},
			district: {
				approved: true,
				nominative: "Ленинский",
				genitive: "Ленинского",
				prepositional: "Ленинском районе",
				preposition: "в",
			},
			districtType: "admin_district",
		}),
	/SEO template requires districtAdjLocative/,
);
const registryDistrictSnapshot = renderProjectSeoTemplate(
	"categoryGeoDistrictMicro",
	{
		brand: "AMS Realty",
		category: projectSeoCategoryForms("kvartiry"),
		city: {
			approved: true,
			nominative: "Приморск",
			genitive: "Приморска",
			prepositional: "Приморске",
			preposition: "в",
		},
		district: {
			approved: true,
			nominative: "Северный",
			genitive: "Северного",
			prepositional: "Северном",
			preposition: "на",
		},
		districtType: "microdistrict",
		inventory: 12,
	},
);
const materializedDistrict = registryDistrictSnapshot;
function assertMaterializedMetadata(
	row: Pick<SeoRegistryRow, "title" | "h1" | "description">,
	rendered: Pick<SeoRegistryRow, "title" | "h1" | "description">,
): void {
	assert.deepEqual(
		{ title: row.title, h1: row.h1, description: row.description },
		{
			title: rendered.title,
			h1: rendered.h1,
			description: rendered.description,
		},
		"Materialized SEO registry metadata differs from runtime rendering.",
	);
}
assertMaterializedMetadata(materializedDistrict, registryDistrictSnapshot);
for (const field of ["title", "h1", "description"] as const) {
	assert.throws(
		() =>
			assertMaterializedMetadata(
				{
					...materializedDistrict,
					[field]: `${materializedDistrict[field]} drift`,
				},
				registryDistrictSnapshot,
			),
		/Materialized SEO registry metadata differs/,
	);
}
const adminDistrictSnapshot = renderProjectSeoTemplate(
	"categoryGeoDistrictAdmin",
	{
		brand: "AMS Realty",
		category: projectSeoCategoryForms("kvartiry"),
		city: {
			approved: true,
			nominative: "Ростов-на-Дону",
			genitive: "Ростова-на-Дону",
			prepositional: "Ростове-на-Дону",
			preposition: "в",
		},
		district: {
			approved: true,
			nominative: "Ленинский район",
			genitive: "Ленинского района",
			prepositional: "Ленинском районе",
			preposition: "в",
		},
		districtType: "admin_district",
		districtAdjLocative: "Ленинском",
		districtAdjGenitive: "Ленинского",
		inventory: 9,
	},
);
assert.equal(
	adminDistrictSnapshot.title,
	"Купить квартиру в Ленинском районе Ростова-на-Дону — цены",
);
assert.equal(
	adminDistrictSnapshot.h1,
	"Квартиры в Ленинском районе Ростова-на-Дону",
);
assert.equal(isFreshPriceCheckedAt("2026-09-01T12:00:00.000Z", 45, now), true);
assert.equal(isFreshPriceCheckedAt("2026-07-01T12:00:00.000Z", 45, now), false);
assert.equal(isFreshPriceCheckedAt("invalid", 45, now), false);
assert.deepEqual(
	[1, 2, 5, 11, 21, 24].map((value) =>
		formatRussianPlural(value, ["объект", "объекта", "объектов"]),
	),
	[
		"1 объект",
		"2 объекта",
		"5 объектов",
		"11 объектов",
		"21 объект",
		"24 объекта",
	],
);

const base = projectSeoRegistrySeed[0];
assert.ok(base);
function rejects(row: SeoRegistryRow, pattern: RegExp): void {
	assert.throws(
		() => assertSeoRegistry({ rows: [row], buildUrl: grammar.buildUrl, now }),
		pattern,
	);
}

rejects({ ...base, url: "/wrong/" }, /differs from buildUrl/);
rejects({ ...base, canonical: "/wrong/" }, /canonical differs/);
rejects({ ...base, snapshotDate: "2026-02-30" }, /date is invalid/);
const futureSnapshotDate = new Date(now);
futureSnapshotDate.setUTCDate(futureSnapshotDate.getUTCDate() + 1);
rejects(
	{ ...base, snapshotDate: futureSnapshotDate.toISOString().slice(0, 10) },
	/future/,
);
rejects({ ...base, value: 0 }, /must keep value null/);
rejects({ ...base, source: "wordstat", value: null }, /non-negative value/);
rejects(
	{ ...base, source: "unknown" as SeoRegistryRow["source"] },
	/Unsupported SEO evidence source/,
);
rejects(
	{ ...base, tier: "P3" as SeoRegistryRow["tier"] },
	/Unsupported SEO tier/,
);
assert.doesNotThrow(() =>
	assertSeoRegistry({
		rows: [{ ...base, tier: "NONE" }],
		buildUrl: grammar.buildUrl,
		now,
	}),
);
rejects(
	{ ...base, morphologyApproved: false, defaultRobots: "index,follow" },
	/Unapproved morphology/,
);
rejects(
	{ ...base, synthetic: true, status: "approved" },
	/Synthetic SEO row cannot be approved/,
);

const second = projectSeoRegistrySeed[1];
assert.ok(second);
assert.throws(
	() =>
		assertSeoRegistry({
			rows: [base, { ...second, targetPhrases: base.targetPhrases }],
			buildUrl: grammar.buildUrl,
			now,
		}),
	/Duplicate SEO intent/,
);
assert.throws(
	() =>
		assertSeoRegistry({
			rows: [base, { ...second, url: base.url }],
			buildUrl: grammar.buildUrl,
			now,
		}),
	/differs from buildUrl|Duplicate SEO URL/,
);
assert.throws(
	() =>
		assertSeoRegistry({
			rows: [base, { ...second, canonical: base.canonical }],
			buildUrl: grammar.buildUrl,
			now,
		}),
	/canonical differs|Duplicate SEO canonical/,
);

console.log(
	"verify:seo-registry passed (source/date/value, URL/canonical/intent, morphology and optional fragments)",
);
