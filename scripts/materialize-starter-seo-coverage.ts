import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { SeoRegistryRow } from "../src/core/seo/registry.ts";
import { starterFixtureDataset } from "../src/project/fixture-data/starter-dataset.ts";
import {
	type ProjectSeoTemplateKey,
	projectSeoCategoryForms,
	renderProjectSeoTemplate,
} from "../src/project/seo/templates.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	loadProjectDistrictRegistry,
	validateRegistryCsv,
} from "./seo-registry.ts";
import { registryCoverage } from "./seo-registry-coverage.ts";
import {
	renderSeoRegistryCsv,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

const sourcePath = resolve("docs/seo/SEO_REGISTRY_SEED.csv");
const source = readFileSync(sourcePath, "utf8");
const districts = loadProjectDistrictRegistry(siteProfile);
const rows = validateRegistryCsv(source, siteProfile, districts);
const coverage = registryCoverage(siteProfile, districts, rows);
if (coverage.ineligible.length > 0) {
	throw new Error("Starter coverage materialization refuses ineligible rows.");
}
const grammar = createProjectUrlGrammar(siteProfile, districts);
const brandMatch = rows[0]?.title.match(/ — ([^—]+)$/);
if (!brandMatch?.[1])
	throw new Error("Starter registry brand cannot be resolved.");
const brand = brandMatch[1].trim();
const snapshotDate = rows
	.map((row) => row.snapshotDate)
	.sort()
	.at(-1);
const release = rows[0]?.release;
if (!snapshotDate || !release)
	throw new Error("Starter registry metadata is incomplete.");
const tier = siteProfile.seoTiers.unmeasuredPolicy;
const minimumObjects =
	tier === "NONE" ? 0 : siteProfile.seoTiers.minInventory[tier];

const additions: SeoRegistryRow<ProjectSeoTemplateKey>[] = coverage.missing.map(
	(entry) => {
		const pageKey = grammar.parseUrl(entry.url);
		if (
			!pageKey ||
			(pageKey.kind !== "categoryRoot" && pageKey.kind !== "categoryGeo")
		) {
			throw new Error(
				`Starter coverage row needs explicit materializer: ${entry.url}`,
			);
		}
		const category = projectSeoCategoryForms(pageKey.category);
		const cityFixture =
			pageKey.kind === "categoryGeo"
				? starterFixtureDataset.cities.find((city) => city.slug === pageKey.geo)
				: undefined;
		if (pageKey.kind === "categoryGeo" && !cityFixture) {
			throw new Error(`Starter fixture city is missing: ${pageKey.geo}`);
		}
		const city = cityFixture
			? {
					approved: cityFixture.morphologyApproved,
					nominative: cityFixture.morphology.nominative,
					genitive: cityFixture.morphology.genitive,
					prepositional: cityFixture.morphology.prepositional,
					preposition:
						(cityFixture.preposition as "v" | "na") === "na"
							? ("на" as const)
							: ("в" as const),
				}
			: undefined;
		const templateKey: "categoryRoot" | "categoryGeo" =
			pageKey.kind === "categoryRoot" ? "categoryRoot" : "categoryGeo";
		const rendered = renderProjectSeoTemplate(templateKey, {
			brand,
			category,
			city,
		});
		return {
			pageKey,
			url: entry.url,
			canonical: entry.url,
			entityRef:
				pageKey.kind === "categoryRoot"
					? `category:${pageKey.category}`
					: `geo:${pageKey.geo}/category:${pageKey.category}`,
			targetPhrases: [`starter coverage ${entry.url}`],
			metric: siteProfile.seoTiers.metric,
			value: null,
			source: "fallback_no_data" as const,
			snapshotDate,
			synthetic: true,
			tier,
			minimumObjects,
			defaultRobots: "noindex,follow" as const,
			templateKey,
			title: rendered.title,
			h1: rendered.h1,
			description: rendered.description,
			status: "draft" as const,
			morphologyApproved: rendered.morphologyApproved,
			release,
			contentGateRule: "listing",
		};
	},
);

const output = renderSeoRegistryCsv(seoRegistryColumns, [
	...rows,
	...additions,
]);
const validated = validateRegistryCsv(output, siteProfile, districts);
const finalCoverage = registryCoverage(siteProfile, districts, validated);
if (finalCoverage.status !== "PASS") {
	throw new Error(
		`Starter coverage materialization incomplete: ${JSON.stringify(finalCoverage)}`,
	);
}
writeFileSync(sourcePath, output, "utf8");
console.log(`starter SEO coverage materialized: ${additions.length} rows`);
