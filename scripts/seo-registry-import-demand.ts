import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
	closeSync,
	existsSync,
	fsyncSync,
	openSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteProfile } from "../src/core/profile/index.ts";
import { deriveSeoTier } from "../src/core/seo/registry.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import type { ProjectDistrictRouteRegistry } from "../src/project/url-grammar.ts";
import {
	loadProjectDistrictRegistry,
	parseCsv,
	parseRegistryCsv,
	validateRegistryCsv,
} from "./seo-registry.ts";
import {
	renderSeoRegistryCsv,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

const demandColumns = ["url", "phrase", "value", "snapshotDate"] as const;

type DemandRow = {
	url: string;
	phrase: string;
	value: number;
	snapshotDate: string;
};

export function parseDemandCsv(input: string): DemandRow[] {
	const [header, ...body] = parseCsv(input);
	assert.deepEqual(
		header,
		demandColumns,
		"Demand CSV columns or order differ from url,phrase,value,snapshotDate",
	);
	if (body.length === 0)
		throw new Error("Demand CSV must contain at least one row.");
	const urls = new Set<string>();
	return body.map((values, index) => {
		if (values.length !== demandColumns.length) {
			throw new Error(`Demand CSV row ${index + 2} must have 4 columns.`);
		}
		const [rawUrl, rawPhrase, rawValue, rawSnapshotDate] = values;
		const url = rawUrl.trim();
		const phrase = rawPhrase.trim().replace(/\s+/g, " ");
		const snapshotDate = rawSnapshotDate.trim();
		if (!url.startsWith("/") || !url.endsWith("/")) {
			throw new Error(`Demand CSV row ${index + 2} has invalid canonical URL.`);
		}
		if (urls.has(url)) throw new Error(`Duplicate demand URL: ${url}`);
		urls.add(url);
		if (!phrase)
			throw new Error(`Demand CSV row ${index + 2} has blank phrase.`);
		if (!/^\d+$/.test(rawValue.trim())) {
			throw new Error(
				`Demand CSV row ${index + 2} value must be a non-negative integer.`,
			);
		}
		const value = Number(rawValue);
		if (!Number.isSafeInteger(value)) {
			throw new Error(
				`Demand CSV row ${index + 2} value is outside the safe integer range.`,
			);
		}
		if (!/^\d{4}-\d{2}-\d{2}$/.test(snapshotDate)) {
			throw new Error(
				`Demand CSV row ${index + 2} snapshotDate must use YYYY-MM-DD.`,
			);
		}
		return { url, phrase, value, snapshotDate };
	});
}

export function applyDemandSnapshot(
	registrySource: string,
	demandSource: string,
	profile: SiteProfile = siteProfile,
	districtRegistry: ProjectDistrictRouteRegistry = loadProjectDistrictRegistry(
		profile,
	),
): string {
	const rows = parseRegistryCsv(registrySource, profile);
	const demandRows = parseDemandCsv(demandSource);
	const snapshotDates = new Set(demandRows.map((row) => row.snapshotDate));
	if (snapshotDates.size !== 1) {
		throw new Error("Demand CSV must contain exactly one snapshotDate.");
	}
	const rowByUrl = new Map(rows.map((row) => [row.url, row]));
	for (const demand of demandRows) {
		if (!rowByUrl.has(demand.url)) {
			throw new Error(`Demand CSV has unknown registry URL: ${demand.url}`);
		}
	}

	const demandByUrl = new Map(demandRows.map((row) => [row.url, row]));
	const updated = rows.map((row) => {
		const demand = demandByUrl.get(row.url);
		if (!demand) return row;
		const tier = deriveSeoTier(demand.value, profile.seoTiers);
		return {
			...row,
			targetPhrases: [demand.phrase],
			value: demand.value,
			source: profile.seoTiers.metric,
			snapshotDate: demand.snapshotDate,
			synthetic: false,
			tier,
			minimumObjects: tier === "NONE" ? 0 : profile.seoTiers.minInventory[tier],
		};
	});
	const output = renderSeoRegistryCsv(seoRegistryColumns, updated);
	validateRegistryCsv(output, profile, districtRegistry);
	return output;
}

function atomicWrite(path: string, content: string): void {
	const temporary = resolve(dirname(path), `.${randomUUID()}.demand.tmp`);
	let handle: number | undefined;
	try {
		handle = openSync(temporary, "wx");
		writeFileSync(handle, content, "utf8");
		fsyncSync(handle);
		closeSync(handle);
		handle = undefined;
		renameSync(temporary, path);
	} finally {
		if (handle !== undefined) closeSync(handle);
		if (existsSync(temporary)) rmSync(temporary, { force: true });
	}
}

export function importDemandFile(
	registryPath: string,
	demandPath: string,
	profile: SiteProfile = siteProfile,
	districtRegistry: ProjectDistrictRouteRegistry = loadProjectDistrictRegistry(
		profile,
	),
): { changed: boolean; rows: number } {
	const before = readFileSync(registryPath, "utf8");
	const demand = readFileSync(demandPath, "utf8");
	const output = applyDemandSnapshot(before, demand, profile, districtRegistry);
	if (output === before)
		return { changed: false, rows: parseDemandCsv(demand).length };
	atomicWrite(registryPath, output);
	return { changed: true, rows: parseDemandCsv(demand).length };
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const fileArgument = process.argv.find((value) =>
		value.startsWith("--file="),
	);
	if (!fileArgument)
		throw new Error("Usage: seo:registry:import-demand --file=<csv>");
	const demandPath = resolve(fileArgument.slice("--file=".length));
	const registryPath = resolve("docs/seo/SEO_REGISTRY_SEED.csv");
	const result = importDemandFile(registryPath, demandPath);
	console.log(
		`seo:registry:import-demand ${result.changed ? "updated" : "no-op"} (${result.rows} rows)`,
	);
}
