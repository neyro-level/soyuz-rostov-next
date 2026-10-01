import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
	type SeoTierMetric,
	type SiteProfile,
	seoTierMetrics,
} from "../src/core/profile/index.ts";
import type { PageKey } from "../src/core/routing/url-grammar.ts";
import {
	assertSeoRegistry,
	deriveSeoTier,
	type SeoRegistryRow,
} from "../src/core/seo/registry.ts";
import {
	type ProjectSeoTemplateKey,
	projectSeoTemplateKeys,
} from "../src/project/seo/templates.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import type { ProjectDistrictRouteRegistry } from "../src/project/url-grammar.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	deterministicSeoRegistryValidationNow,
	renderSeoRegistryModule,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

const sourcePath = resolve("docs/seo/SEO_REGISTRY_SEED.csv");
const generatedPath = resolve("src/project/seo/registry-seed.ts");
const districtsPath = resolve("docs/seo/DISTRICTS.csv");
const bootstrapPath = resolve("docs/CLIENT_BOOTSTRAP.json");
const columns = seoRegistryColumns;

type CsvRow = Record<(typeof columns)[number], string>;
type GeneratedRow = SeoRegistryRow<ProjectSeoTemplateKey>;

const contentGateRules = new Set([
	"listing",
	"developerGeo",
	"development",
	"developer",
	"secondary",
	"newbuildLot",
]);

export function parseCsv(input: string): string[][] {
	const rows: string[][] = [];
	let row: string[] = [];
	let field = "";
	let quoted = false;
	for (let index = 0; index < input.length; index += 1) {
		const char = input[index];
		if (quoted) {
			if (char === '"' && input[index + 1] === '"') {
				field += '"';
				index += 1;
			} else if (char === '"') quoted = false;
			else field += char;
		} else if (char === '"') quoted = true;
		else if (char === ",") {
			row.push(field);
			field = "";
		} else if (char === "\n") {
			row.push(field.replace(/\r$/, ""));
			rows.push(row);
			row = [];
			field = "";
		} else field += char;
	}
	if (quoted) throw new Error("CSV has an unterminated quoted field.");
	if (field || row.length) {
		row.push(field);
		rows.push(row);
	}
	return rows.filter((item) => item.some((value) => value.length > 0));
}

function boolean(value: string, field: string): boolean {
	if (value === "true") return true;
	if (value === "false") return false;
	throw new Error(`${field} must be true or false.`);
}

export function parseDistrictRegistryCsv(
	input: string,
	profile: SiteProfile,
): ProjectDistrictRouteRegistry {
	const [header, ...body] = parseCsv(input);
	assert.deepEqual(
		header,
		["geo", "category", "district"],
		"District CSV columns or order differ from contract",
	);
	const registry: Record<string, Record<string, string[]>> = {};
	for (const [index, row] of body.entries()) {
		if (row.length !== 3)
			throw new Error(`District CSV row ${index + 2} must have 3 columns.`);
		const [geo, category, district] = row.map((value) => value.trim());
		if (!Object.hasOwn(profile.geos, geo)) {
			throw new Error(`District CSV row ${index + 2} has unknown geo: ${geo}.`);
		}
		if (!Object.hasOwn(profile.categoryStatus, category)) {
			throw new Error(
				`District CSV row ${index + 2} has unknown category: ${category}.`,
			);
		}
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(district)) {
			throw new Error(
				`District CSV row ${index + 2} has invalid district slug.`,
			);
		}
		registry[geo] ??= {};
		registry[geo][category] ??= [];
		if (registry[geo][category].includes(district)) {
			throw new Error(
				`District CSV row ${index + 2} duplicates ${geo}/${category}/${district}.`,
			);
		}
		registry[geo][category].push(district);
	}
	return registry;
}

export function loadProjectDistrictRegistry(
	profile: SiteProfile = siteProfile,
): ProjectDistrictRouteRegistry {
	if (existsSync(districtsPath)) {
		return parseDistrictRegistryCsv(
			readFileSync(districtsPath, "utf8"),
			profile,
		);
	}
	if (!existsSync(bootstrapPath)) {
		throw new Error(
			"SEO registry requires docs/seo/DISTRICTS.csv or docs/CLIENT_BOOTSTRAP.json.",
		);
	}
	const bootstrap = JSON.parse(readFileSync(bootstrapPath, "utf8"));
	return districtRegistryFromBootstrap(bootstrap, profile);
}

export function districtRegistryFromBootstrap(
	bootstrap: {
		geos?: Array<{
			slug: string;
			districts?: Array<{ slug: string }>;
		}>;
	},
	profile: SiteProfile,
): ProjectDistrictRouteRegistry {
	const rows = ["geo,category,district"];
	for (const geo of bootstrap.geos ?? []) {
		for (const district of geo.districts ?? []) {
			for (const [category, status] of Object.entries(
				profile.geoCategoryStatus[geo.slug] ?? {},
			)) {
				if (status !== "PREPARED_OFF") {
					rows.push(`${geo.slug},${category},${district.slug}`);
				}
			}
		}
	}
	return parseDistrictRegistryCsv(rows.join("\n"), profile);
}

export function parseRegistryCsv(
	input: string,
	profile: SiteProfile = siteProfile,
): GeneratedRow[] {
	const [header, ...body] = parseCsv(input);
	assert.deepEqual(
		header,
		columns,
		"SEO CSV columns or order differ from contract",
	);
	return body.map((values, index) => {
		if (values.length !== columns.length)
			throw new Error(`CSV row ${index + 2} has ${values.length} columns.`);
		const raw = Object.fromEntries(
			columns.map((column, offset) => [column, values[offset]]),
		) as CsvRow;
		const pageKey = JSON.parse(raw.pageKey) as PageKey;
		const templateKey = raw.templateKey as ProjectSeoTemplateKey;
		if (!(projectSeoTemplateKeys as readonly string[]).includes(templateKey))
			throw new Error(`Unknown templateKey: ${raw.templateKey}`);
		if (!raw.release || !raw.contentGateRule)
			throw new Error(
				`CSV row ${index + 2} requires release and contentGateRule.`,
			);
		if (raw.release !== raw.release.trim())
			throw new Error(
				`CSV row ${index + 2} release must not contain surrounding whitespace.`,
			);
		if (!(seoTierMetrics as readonly string[]).includes(raw.metric))
			throw new Error(`Unsupported metric: ${raw.metric}.`);
		const metric = raw.metric as SeoTierMetric;
		if (metric !== profile.seoTiers.metric)
			throw new Error(
				`CSV metric ${metric} differs from SiteProfile metric ${profile.seoTiers.metric}.`,
			);
		if (!contentGateRules.has(raw.contentGateRule))
			throw new Error(`Unsupported contentGateRule: ${raw.contentGateRule}.`);
		const value = raw.value === "" ? null : Number(raw.value);
		const tier = deriveSeoTier(value, profile.seoTiers);
		if (raw.tier !== tier)
			throw new Error(
				`CSV tier ${raw.tier} differs from derived tier ${tier} at row ${index + 2}.`,
			);
		const minimumObjects =
			tier === "NONE" ? 0 : profile.seoTiers.minInventory[tier];
		if (Number(raw.minimumObjects) !== minimumObjects)
			throw new Error(
				`CSV minimumObjects differs from SiteProfile for ${tier} at row ${index + 2}.`,
			);
		return {
			pageKey,
			url: raw.url,
			canonical: raw.canonical,
			entityRef: raw.entityRef || null,
			targetPhrases: raw.targetPhrases
				.split("|")
				.map((value) => value.trim())
				.filter(Boolean),
			metric,
			value,
			source: raw.source as GeneratedRow["source"],
			snapshotDate: raw.snapshotDate,
			synthetic: boolean(raw.synthetic, "synthetic"),
			tier,
			minimumObjects,
			defaultRobots: raw.defaultRobots as GeneratedRow["defaultRobots"],
			templateKey,
			title: raw.title,
			h1: raw.h1,
			description: raw.description,
			status: raw.status as GeneratedRow["status"],
			morphologyApproved: boolean(raw.morphologyApproved, "morphologyApproved"),
			release: raw.release,
			contentGateRule: raw.contentGateRule,
		};
	});
}

export function validateRegistryCsv(
	input: string,
	profile: SiteProfile = siteProfile,
	districtRegistry: ProjectDistrictRouteRegistry = loadProjectDistrictRegistry(
		profile,
	),
): GeneratedRow[] {
	const rows = parseRegistryCsv(input, profile);
	const grammar = createProjectUrlGrammar(profile, districtRegistry);
	const validationNow = process.env.SEO_REGISTRY_VALIDATION_NOW
		? new Date(process.env.SEO_REGISTRY_VALIDATION_NOW)
		: new Date();
	if (Number.isNaN(validationNow.getTime())) {
		throw new Error(
			"SEO_REGISTRY_VALIDATION_NOW must be a valid ISO timestamp.",
		);
	}
	assertSeoRegistry({
		rows,
		buildUrl: grammar.buildUrl,
		now: validationNow,
	});
	return rows;
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const districtRegistry = loadProjectDistrictRegistry(siteProfile);
	const rows = validateRegistryCsv(
		readFileSync(sourcePath, "utf8"),
		siteProfile,
		districtRegistry,
	);
	const output = renderSeoRegistryModule(
		rows,
		districtRegistry,
		deterministicSeoRegistryValidationNow(rows),
	);
	if (process.argv.includes("--check")) {
		assert.equal(
			readFileSync(generatedPath, "utf8").replaceAll("\r\n", "\n"),
			output,
			"Generated SEO registry is stale. Run pnpm seo:registry:generate.",
		);
		console.log(`seo:registry:check PASS (${rows.length} rows)`);
	} else {
		writeFileSync(generatedPath, output, "utf8");
		console.log(`seo:registry:generate wrote ${rows.length} rows`);
	}
}
