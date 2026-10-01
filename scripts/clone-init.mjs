import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { basename, dirname, extname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
	catalogSurfaces,
	clonePresets,
	siteProfileConfigForPreset,
	validateCloneBrand,
} from "./clone-preset.mjs";

const defaultProfile = "REALTY_BASE_CLIENT_V1";
const states = ["ACTIVE", "NOINDEX_AUTO", "PREPARED_OFF", "OUT"];
const marketKeys = ["newbuild", "secondary"];
const staticRoutes = [
	{ path: "/", changeFrequency: "daily", priority: 1, indexable: true },
	{
		path: "/uslugi",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{
		path: "/o-kompanii",
		changeFrequency: "monthly",
		priority: 0.6,
		indexable: true,
	},
	{
		path: "/ipoteka",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{
		path: "/prodat",
		changeFrequency: "weekly",
		priority: 0.7,
		indexable: true,
	},
	{ path: "/sdat", changeFrequency: "weekly", priority: 0.7, indexable: true },
	{
		path: "/kontakty",
		changeFrequency: "monthly",
		priority: 0.6,
		indexable: true,
	},
	{
		path: "/politika-konfidencialnosti",
		changeFrequency: "yearly",
		priority: 0.2,
		indexable: false,
	},
	{
		path: "/soglasie-na-obrabotku-personalnyh-dannyh",
		changeFrequency: "yearly",
		priority: 0.2,
		indexable: false,
	},
];
const appliedDefaults = [
	"$.clientReadiness.archiveRetentionDays",
	"$.clientReadiness.automaticBackup",
	"$.clientReadiness.database",
	"$.clientReadiness.deploymentTarget",
	"$.clientReadiness.externalMonitoring",
	"$.clientReadiness.feedImageSource",
	"$.clientReadiness.jobsActiveRuntimeCount",
	"$.clientReadiness.leadRetentionDays",
	"$.clientReadiness.legalContent",
	"$.clientReadiness.mediaStorage",
	"$.clientReadiness.nginx",
	"$.developmentExcel",
	"$.feed",
	"$.seoTemplateFile",
	"$.staticRoutes",
];

function fail(path, message) {
	throw new Error(`${path}: ${message}`);
}
function object(value, path) {
	if (!value || typeof value !== "object" || Array.isArray(value))
		fail(path, "must be an object");
	return value;
}
function string(value, path) {
	if (typeof value !== "string" || !value.trim())
		fail(path, "must be a non-empty string");
	return value.trim();
}
function array(value, path) {
	if (!Array.isArray(value)) fail(path, "must be an array");
	return value;
}
function noSecrets(value, path = "$") {
	if (!value || typeof value !== "object") return;
	for (const [key, child] of Object.entries(value)) {
		const next = `${path}.${key}`;
		if (
			/(?:password|secret|credential|private.?key|database.?url|api.?token)/i.test(
				key,
			)
		)
			fail(next, "secret-shaped fields are forbidden");
		noSecrets(child, next);
	}
}
function expandStates(groups, keys, path) {
	object(groups, path);
	const output = {};
	for (const state of states) {
		for (const key of array(groups[state] ?? [], `${path}.${state}`)) {
			if (!keys.includes(key)) fail(`${path}.${state}`, `unknown value ${key}`);
			if (output[key])
				fail(`${path}.${state}`, `duplicate decision for ${key}`);
			output[key] = state;
		}
	}
	for (const key of keys)
		if (!output[key]) fail(path, `missing explicit status for ${key}`);
	return output;
}
function assertExactKeys(record, keys, path) {
	object(record, path);
	for (const key of keys)
		if (!(key in record)) fail(path, `missing explicit decision for ${key}`);
	for (const key of Object.keys(record))
		if (!keys.includes(key)) fail(`${path}.${key}`, "unknown key");
	return record;
}
function normalized(value) {
	if (Array.isArray(value)) return value.map(normalized);
	if (!value || typeof value !== "object") return value;
	return Object.fromEntries(
		Object.keys(value)
			.sort()
			.map((key) => [key, normalized(value[key])]),
	);
}
function hash(value) {
	return createHash("sha256")
		.update(JSON.stringify(normalized(value)))
		.digest("hex");
}

export function compileCloneIntake(input) {
	object(input, "$");
	noSecrets(input);
	if (input.schemaVersion !== 1) fail("$.schemaVersion", "must equal 1");
	if (input.approvedDefaults !== defaultProfile)
		fail("$.approvedDefaults", `must explicitly equal ${defaultProfile}`);
	const project = object(input.project, "$.project");
	if (!clonePresets.includes(project.preset))
		fail("$.project.preset", "unsupported preset");
	if (!["SINGLE_GEO", "MULTI_GEO"].includes(project.geoMode))
		fail("$.project.geoMode", "invalid mode");
	if (!["public", "noindex"].includes(project.productionIndexing))
		fail("$.project.productionIndexing", "invalid decision");
	const cities = array(input.cities, "$.cities");
	if (!cities.length) fail("$.cities", "at least one city is required");
	const citySlugs = cities.map((city, index) =>
		string(city?.slug, `$.cities[${index}].slug`),
	);
	if (new Set(citySlugs).size !== citySlugs.length)
		fail("$.cities", "city slugs must be unique");
	const categoryStatus = expandStates(
		input.surfaces?.global,
		catalogSurfaces,
		"$.surfaces.global",
	);
	const geoCategoryStatus = {};
	for (const slug of citySlugs)
		geoCategoryStatus[slug] = expandStates(
			input.surfaces?.byCity?.[slug],
			catalogSurfaces,
			`$.surfaces.byCity.${slug}`,
		);
	assertExactKeys(input.surfaces?.byCity, citySlugs, "$.surfaces.byCity");
	const marketCapability = assertExactKeys(
		input.markets?.capability,
		marketKeys,
		"$.markets.capability",
	);
	const marketStatus = {};
	assertExactKeys(input.markets?.byCity, citySlugs, "$.markets.byCity");
	for (const slug of citySlugs)
		marketStatus[slug] = assertExactKeys(
			input.markets.byCity[slug],
			marketKeys,
			`$.markets.byCity.${slug}`,
		);
	const developers = object(
		input.surfaces?.developers,
		"$.surfaces.developers",
	);
	assertExactKeys(developers.byCity, citySlugs, "$.surfaces.developers.byCity");
	const geos = cities.map((city, index) => {
		const path = `$.cities[${index}]`;
		if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city.slug))
			fail(`${path}.slug`, "must be a lowercase URL slug");
		string(city.title, `${path}.title`);
		if (typeof city.published !== "boolean")
			fail(`${path}.published`, "must be boolean");
		if (!["ACTIVE", "NOINDEX_AUTO", "PREPARED_OFF"].includes(city.hubStatus))
			fail(`${path}.hubStatus`, "invalid hub status");
		if (city.morphologyApproved !== true)
			fail(`${path}.morphologyApproved`, "must be true");
		for (const key of [
			"nominative",
			"genitive",
			"prepositional",
			"preposition",
		])
			string(city.morphology?.[key], `${path}.morphology.${key}`);
		if (!["в", "во", "на"].includes(city.morphology.preposition))
			fail(`${path}.morphology.preposition`, "must be в, во or на");
		for (const [districtIndex, district] of array(
			city.districts,
			`${path}.districts`,
		).entries()) {
			const districtPath = `${path}.districts[${districtIndex}]`;
			for (const key of ["slug", "name", "locative", "preposition"])
				string(district[key], `${districtPath}.${key}`);
			if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(district.slug))
				fail(`${districtPath}.slug`, "must be a lowercase URL slug");
			if (!["в", "во", "на"].includes(district.preposition))
				fail(`${districtPath}.preposition`, "must be в, во or на");
			array(district.synonyms, `${districtPath}.synonyms`).forEach(
				(value, synonymIndex) => {
					string(value, `${districtPath}.synonyms[${synonymIndex}]`);
				},
			);
			if (district.parent !== null && typeof district.parent !== "string")
				fail(`${districtPath}.parent`, "must be a local slug or null");
			if (district.type === "admin_district") {
				string(district.adjLocative, `${districtPath}.adjLocative`);
				string(district.adjGenitive, `${districtPath}.adjGenitive`);
			} else if (district.type !== "microdistrict")
				fail(`${districtPath}.type`, "invalid district type");
		}
		return { ...city };
	});
	if (!citySlugs.includes(project.primaryGeo))
		fail("$.project.primaryGeo", "must reference a city");
	const region = object(input.region, "$.region");
	for (const key of ["slug", "name", "genitive", "locative", "shortName"])
		string(region[key], `$.region.${key}`);
	const nap = object(input.nap, "$.nap");
	for (const key of ["phone", "email", "address", "workingHours"])
		string(nap[key], `$.nap.${key}`);
	const legacy = object(input.legacy, "$.legacy");
	array(legacy.routes, "$.legacy.routes");
	array(legacy.patterns, "$.legacy.patterns");
	const seo = object(input.seo, "$.seo");
	object(seo.facets, "$.seo.facets");
	object(seo.tiers, "$.seo.tiers");
	const searchConsole = object(seo.searchConsole, "$.seo.searchConsole");
	for (const engine of ["yandex", "google"]) {
		if (searchConsole[engine] !== null) {
			string(searchConsole[engine], `$.seo.searchConsole.${engine}`);
		}
	}
	const hosts = assertExactKeys(
		input.hostAllowlists,
		["outbound", "externalImages", "leadOutbound"],
		"$.hostAllowlists",
	);
	for (const key of Object.keys(hosts))
		array(hosts[key], `$.hostAllowlists.${key}`).forEach((host, index) => {
			string(host, `$.hostAllowlists.${key}[${index}]`);
		});
	const preset = {
		schemaVersion: 3,
		projectId: string(project.id, "$.project.id"),
		packageName: string(project.packageName, "$.project.packageName"),
		brandName: string(project.brandName, "$.project.brandName"),
		defaultDescription: string(
			project.defaultDescription,
			"$.project.defaultDescription",
		),
		domain: string(project.domain, "$.project.domain"),
		preset: project.preset,
		geoMode: project.geoMode,
		primaryGeo: project.primaryGeo,
		productionIndexing: project.productionIndexing,
		region: { ...region },
		geos,
		categoryStatus,
		marketCapability: { ...marketCapability },
		geoCategoryStatus,
		marketStatus,
		developersSurface: {
			root: developers.root,
			byGeo: { ...developers.byCity },
		},
		seoFacets: { ...seo.facets },
		seoTiers: { ...seo.tiers },
		searchConsole: { ...searchConsole },
		staticRoutes: staticRoutes.filter(
			(route) => route.path !== "/sdat" || categoryStatus.arenda !== "OUT",
		),
		legacyRoutes: [...legacy.routes],
		legacyPatterns: [...legacy.patterns],
		nap: { ...nap },
		brandAssets: {
			status: "ready",
			logoPath: "/brand/logo.svg",
			faviconPath: "/icon.svg",
			tokenSource: "src/app/globals.css",
		},
		brand: validateCloneBrand(structuredClone(input.brand)),
		feed: { status: "ready", mode: "external-urls" },
		developmentExcel: { status: "ready", template: "client-developments.xlsx" },
		clientReadiness: {
			deploymentTarget: "approved-runtime",
			database: "approved-managed-postgresql",
			mediaStorage: "approved-object-storage",
			feedImageSource: "external-urls",
			jobsActiveRuntimeCount: 1,
			leadRetentionDays: 180,
			archiveRetentionDays: 90,
			legalContent: "approved",
			requiredHostAllowlists: { ...hosts },
			nginx: true,
			automaticBackup: true,
			externalMonitoring: true,
		},
		seoTemplateFile: "CLONE_SEO_TEMPLATES.example.json",
	};
	// This invokes the canonical SiteProfile compiler and rejects incomplete matrices.
	if (!/^[a-z0-9][a-z0-9._-]*$/.test(preset.packageName))
		fail("$.project.packageName", "must be a lowercase npm package name");
	if (!/^[a-z0-9.-]+$/.test(preset.domain))
		fail("$.project.domain", "invalid domain");
	try {
		siteProfileConfigForPreset(preset);
	} catch (error) {
		fail("$", `canonical SiteProfile rejected intake (${error.message})`);
	}
	return {
		preset,
		report: {
			schemaVersion: 1,
			defaultsProfile: defaultProfile,
			appliedDefaults,
			intakeSha256: hash(input),
			presetSha256: hash(preset),
		},
	};
}

export function readCloneIntake(file) {
	const path = resolve(file);
	if (!existsSync(path)) fail("$", `intake does not exist: ${path}`);
	try {
		return JSON.parse(readFileSync(path, "utf8"));
	} catch (error) {
		fail("$", `invalid JSON (${error.message})`);
	}
}
export function renderJson(value) {
	return `${JSON.stringify(value, null, "\t")}\n`;
}

function argument(name) {
	const prefix = `--${name}=`;
	return process.argv
		.slice(2)
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}
function defaultOutput(intakePath, suffix) {
	const extension = extname(intakePath);
	return resolve(
		dirname(intakePath),
		`${basename(intakePath, extension)}${suffix}`,
	);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	const intakeArg = argument("intake");
	if (!intakeArg) fail("$", "clone:init requires --intake=<file>");
	const intakePath = resolve(intakeArg);
	const outputPath = resolve(
		argument("output") ?? defaultOutput(intakePath, ".preset.json"),
	);
	const reportPath = resolve(
		argument("report") ?? defaultOutput(intakePath, ".defaults-diff.json"),
	);
	const compiled = compileCloneIntake(readCloneIntake(intakePath));
	writeFileSync(outputPath, renderJson(compiled.preset));
	writeFileSync(reportPath, renderJson(compiled.report));
	console.log(`clone:init: wrote ${outputPath} and ${reportPath}`);
}
