import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { renderSeoDefinition } from "../src/core/seo/registry.ts";
import {
	createPresetSiteProfileConfig,
	presetCatalogSurfaces,
	supportedSitePresets,
} from "../src/project/site-profile-presets.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	deterministicSeoRegistryValidationNow,
	renderSeoRegistryCsv,
	renderSeoRegistryModule,
	seoRegistryColumns,
} from "./seo-registry-output.mjs";

export const clonePresets = [...supportedSitePresets];
export const catalogSurfaces = [...presetCatalogSurfaces];

const requiredNap = ["phone", "email", "address", "workingHours"];
const requiredMorphology = ["nominative", "genitive", "prepositional"];
const allowedGeoPrepositions = ["в", "во", "на"];
const allowedDistrictTypes = ["admin_district", "microdistrict"];
const brandColorKeys = [
	"background",
	"foreground",
	"surface",
	"surfaceMuted",
	"surfaceSoft",
	"surfaceDark",
	"surfaceDarkStrong",
	"contentSecondary",
	"contentMuted",
	"contentInverse",
	"border",
	"accent",
	"accentHover",
	"accentSoft",
	"statusWarning",
	"statusDanger",
	"statusSuccess",
	"statusInfo",
];
const brandRadiusKeys = ["sm", "md", "lg", "xl", "full"];
const fontDefinitions = {
	Manrope: { importName: "Manrope", subsets: ["cyrillic", "latin"] },
	Inter: { importName: "Inter", subsets: ["cyrillic", "latin"] },
	Roboto: { importName: "Roboto", subsets: ["cyrillic", "latin"], weight: "400" },
};
const seoTemplateKeys = [
	"homeSingleGeo",
	"homeMultiGeo",
	"geoHub",
	"categoryRoot",
	"categoryGeo",
	"categoryGeoDistrictAdmin",
	"categoryGeoDistrictMicro",
	"categoryGeoFacet",
	"geoDevelopers",
	"developerRoot",
	"developmentNormal",
	"developmentCollision",
	"developer",
	"property",
];
const secretKeyPattern =
	/(?:password|secret|credential|private.?key|database.?url|api.?token)/i;

function requiredString(value, label) {
	if (typeof value !== "string" || !value.trim()) {
		throw new Error(`Clone preset requires ${label}.`);
	}
	return value.trim();
}

function validateSearchConsole(value) {
	if (!value || typeof value !== "object" || Array.isArray(value)) {
		throw new Error("Clone preset requires searchConsole.");
	}
	const result = {};
	for (const engine of ["yandex", "google"]) {
		const token = value[engine];
		if (token !== null && (typeof token !== "string" || !token.trim())) {
			throw new Error(`searchConsole.${engine} must be a non-empty string or null.`);
		}
		result[engine] = token === null ? null : token.trim();
	}
	return result;
}

function assertSlug(value, label) {
	const slug = requiredString(value, label);
	if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
		throw new Error(`${label} must be a lowercase URL slug.`);
	}
	return slug;
}

function validateRegion(region) {
	if (!region || typeof region !== "object" || Array.isArray(region)) {
		throw new Error("Clone preset requires region.");
	}
	region.slug = assertSlug(region.slug, "region.slug");
	region.name = requiredString(region.name, "region.name");
	region.genitive = requiredString(region.genitive, "region.genitive");
	region.locative = requiredString(region.locative, "region.locative");
	region.shortName = requiredString(region.shortName, "region.shortName");
	return region;
}

function validateGeoTaxonomy(geos) {
	const districtKeys = new Set();
	for (const geo of geos) {
		if (!allowedGeoPrepositions.includes(geo.morphology?.preposition)) {
			throw new Error(
				`Geo ${geo.slug} morphology.preposition must be в, во or на.`,
			);
		}
		if (!Array.isArray(geo.districts)) {
			throw new Error(`Geo ${geo.slug} requires districts[].`);
		}
		const localSlugs = new Set();
		for (const district of geo.districts) {
			district.slug = assertSlug(
				district.slug,
				`geo ${geo.slug} district.slug`,
			);
			const key = `${geo.slug}/${district.slug}`;
			if (districtKeys.has(key)) throw new Error(`Duplicate district: ${key}`);
			districtKeys.add(key);
			localSlugs.add(district.slug);
			district.name = requiredString(district.name, `district ${key} name`);
			district.locative = requiredString(
				district.locative,
				`district ${key} locative`,
			);
			if (!allowedDistrictTypes.includes(district.type)) {
				throw new Error(`District ${key} type is invalid.`);
			}
			if (district.type === "admin_district") {
				district.adjLocative = requiredString(
					district.adjLocative,
					`district ${key} adjLocative`,
				);
				district.adjGenitive = requiredString(
					district.adjGenitive,
					`district ${key} adjGenitive`,
				);
			} else if (
				district.adjLocative !== undefined ||
				district.adjGenitive !== undefined
			) {
				throw new Error(
					`Microdistrict ${key} cannot contain admin adjective forms.`,
				);
			}
			if (!allowedGeoPrepositions.includes(district.preposition)) {
				throw new Error(`District ${key} preposition must be в, во or на.`);
			}
			if (!Array.isArray(district.synonyms)) {
				throw new Error(`District ${key} synonyms must be an array.`);
			}
			district.synonyms = district.synonyms.map((value, index) =>
				requiredString(value, `district ${key} synonyms[${index}]`),
			);
			if (district.parent !== null && typeof district.parent !== "string") {
				throw new Error(`District ${key} parent must be a local slug or null.`);
			}
		}
		for (const district of geo.districts) {
			if (district.parent === district.slug) {
				throw new Error(
					`District ${geo.slug}/${district.slug} cannot parent itself.`,
				);
			}
			if (district.parent !== null && !localSlugs.has(district.parent)) {
				throw new Error(
					`District ${geo.slug}/${district.slug} parent must belong to the same geo.`,
				);
			}
			const visited = new Set([district.slug]);
			let parent = district.parent;
			while (parent !== null) {
				if (visited.has(parent))
					throw new Error(`District hierarchy cycle in geo ${geo.slug}.`);
				visited.add(parent);
				parent =
					geo.districts.find((item) => item.slug === parent)?.parent ?? null;
			}
		}
	}
}

function assertNoSecrets(value, path = "preset") {
	if (!value || typeof value !== "object") return;
	for (const [key, child] of Object.entries(value)) {
		const childPath = `${path}.${key}`;
		if (secretKeyPattern.test(key)) {
			throw new Error(`Clone preset must not contain secrets (${childPath}).`);
		}
		assertNoSecrets(child, childPath);
	}
}

function validateRepositoryAssetPath(value, label) {
	const path = requiredString(value, label).replaceAll("\\", "/");
	if (path.startsWith("/") || /^[a-z]:\//i.test(path) || path.split("/").includes("..")) {
		throw new Error(`${label} must stay inside the repository.`);
	}
	return path;
}

export function validateCloneBrand(brand) {
	if (!brand || typeof brand !== "object" || Array.isArray(brand)) {
		throw new Error("Clone preset requires brand.");
	}
	if (!brand.colors || typeof brand.colors !== "object" || Array.isArray(brand.colors)) {
		throw new Error("Clone preset requires brand.colors.");
	}
	for (const key of brandColorKeys) {
		const value = requiredString(brand.colors[key], `brand.colors.${key}`);
		if (!/^#[0-9a-f]{6}$/i.test(value)) {
			throw new Error(`brand.colors.${key} must be a six-digit hex color.`);
		}
		brand.colors[key] = value.toLowerCase();
	}
	if (Object.keys(brand.colors).some((key) => !brandColorKeys.includes(key))) {
		throw new Error("brand.colors contains an unknown key.");
	}
	if (!brand.radii || typeof brand.radii !== "object" || Array.isArray(brand.radii)) {
		throw new Error("Clone preset requires brand.radii.");
	}
	for (const key of brandRadiusKeys) {
		const value = requiredString(brand.radii[key], `brand.radii.${key}`);
		if (!/^\d+(?:\.\d+)?px$/.test(value)) {
			throw new Error(`brand.radii.${key} must be an explicit px value.`);
		}
		brand.radii[key] = value;
	}
	if (Object.keys(brand.radii).some((key) => !brandRadiusKeys.includes(key))) {
		throw new Error("brand.radii contains an unknown key.");
	}
	brand.fontFamily = requiredString(brand.fontFamily, "brand.fontFamily");
	if (!fontDefinitions[brand.fontFamily]) {
		throw new Error(`brand.fontFamily is not allowlisted: ${brand.fontFamily}.`);
	}
	brand.logoFile = validateRepositoryAssetPath(brand.logoFile, "brand.logoFile");
	brand.faviconFile = validateRepositoryAssetPath(brand.faviconFile, "brand.faviconFile");
	return brand;
}

function validateSeoInputs(input) {
	if (!input || typeof input !== "object" || Array.isArray(input)) {
		throw new Error("Clone preset requires seoTemplates or seoTemplateFile.");
	}
	for (const group of ["categoryLabels", "facetLabels", "templates"]) {
		if (!input[group] || typeof input[group] !== "object") {
			throw new Error(`SEO template input requires ${group}.`);
		}
	}
	for (const surface of catalogSurfaces) {
		const forms = input.categoryLabels[surface];
		if (!forms || typeof forms !== "object" || Array.isArray(forms)) {
			throw new Error(
				`SEO category forms are required: seoTemplates.categoryLabels.${surface}.`,
			);
		}
		for (const form of [
			"nominativePlural",
			"nominativePluralLower",
			"accusativeSingular",
			"genitivePlural",
			"dealVerb",
		]) {
			requiredString(
				forms[form],
				`seoTemplates.categoryLabels.${surface}.${form}`,
			);
		}
	}
	for (const key of seoTemplateKeys) {
		const definition = input.templates[key];
		for (const field of ["title", "h1", "description"]) {
			requiredString(
				definition?.[field],
				`seoTemplates.templates.${key}.${field}`,
			);
		}
	}
	for (const [key, value] of Object.entries(input.facetLabels)) {
		assertSlug(key, `seoTemplates.facetLabels.${key}`);
		requiredString(value, `seoTemplates.facetLabels.${key}`);
	}
	return input;
}

function validateClientReadiness(value) {
	const allowed = {
		deploymentTarget: ["timeweb-vps", "approved-runtime"],
		database: ["timeweb-managed-postgresql", "approved-managed-postgresql"],
		mediaStorage: ["timeweb-s3", "approved-object-storage"],
		feedImageSource: ["external-urls", "object-storage"],
		legalContent: ["approved", "placeholder"],
	};
	for (const [key, values] of Object.entries(allowed)) {
		if (!values.includes(value?.[key])) {
			throw new Error(`clientReadiness.${key} is invalid.`);
		}
	}
	for (const key of ["leadRetentionDays", "archiveRetentionDays"]) {
		if (!Number.isInteger(value?.[key]) || value[key] <= 0) {
			throw new Error(`clientReadiness.${key} must be a positive integer.`);
		}
	}
	if (value.jobsActiveRuntimeCount !== 1) {
		throw new Error("clientReadiness.jobsActiveRuntimeCount must be 1.");
	}
	for (const key of ["nginx", "automaticBackup", "externalMonitoring"]) {
		if (value[key] !== true)
			throw new Error(`clientReadiness.${key} must be true.`);
	}
	for (const key of ["outbound", "externalImages", "leadOutbound"]) {
		const hosts = value.requiredHostAllowlists?.[key];
		if (!Array.isArray(hosts) || hosts.length === 0) {
			throw new Error(
				`clientReadiness.requiredHostAllowlists.${key} is required.`,
			);
		}
		for (const host of hosts) {
			if (!/^[a-z0-9.-]+$/i.test(requiredString(host, `allowlist ${key}`))) {
				throw new Error(
					`clientReadiness allowlist ${key} contains an invalid host.`,
				);
			}
		}
	}
	return value;
}

function validateProfileReadiness(preset) {
	const feedStatus = preset.feed?.status;
	if (
		(preset.preset === "NEWBUILD_FIRST" &&
			!["ready", "not_required"].includes(feedStatus)) ||
		(preset.preset !== "NEWBUILD_FIRST" && feedStatus !== "ready")
	) {
		throw new Error(
			"feed.status must be ready unless NEWBUILD_FIRST explicitly uses not_required.",
		);
	}
	const excelStatus = preset.developmentExcel?.status;
	if (
		(preset.preset === "SECONDARY_FIRST" &&
			!["ready", "not_required"].includes(excelStatus)) ||
		(preset.preset !== "SECONDARY_FIRST" && excelStatus !== "ready")
	) {
		throw new Error(
			"developmentExcel.status must be ready unless SECONDARY_FIRST explicitly uses not_required.",
		);
	}
}

export function activeSurfacesForPreset(preset) {
	if (preset === "NEWBUILD_FIRST") {
		return ["novostroyki", "kottedzhnye-poselki"];
	}
	if (preset === "SECONDARY_FIRST") {
		return catalogSurfaces.filter(
			(surface) => !["novostroyki", "kottedzhnye-poselki"].includes(surface),
		);
	}
	return [...catalogSurfaces];
}

const platformReservedRoots = [
	"_next",
	"admin",
	"api",
	"journal",
	"legal",
	"media",
	"poisk",
	"sotrudniki",
	"komplex",
	"robots.txt",
	"sitemap.xml",
	"sitemap",
	"search",
];

export function siteProfileConfigForPreset(preset) {
	const geos = Object.fromEntries(
		preset.geos.map((geo) => [
			geo.slug,
			{
				published: geo.published,
				hubStatus: geo.hubStatus,
				...(geo.agglomerationOf
					? { agglomerationOf: geo.agglomerationOf }
					: {}),
			},
		]),
	);
	return createPresetSiteProfileConfig({
		projectKind: "client",
		preset: preset.preset,
		geoMode: preset.geoMode,
		primaryGeo: preset.primaryGeo,
		geos,
		categoryStatus: preset.categoryStatus,
		marketCapability: preset.marketCapability,
		geoCategoryStatus: preset.geoCategoryStatus,
		marketStatus: preset.marketStatus,
		developersSurface: preset.developersSurface,
		searchConsole: preset.searchConsole,
		seoFacets: preset.seoFacets,
		filterKeys: preset.filterKeys,
		seoTiers: preset.seoTiers,
		gate: preset.gate,
		staticRoutes: preset.staticRoutes,
		legacyRoutes: preset.legacyRoutes,
		legacyPatterns: preset.legacyPatterns,
	});
}

export function reservedRootsForSiteProfile(config) {
	return [
		...new Set([
			...platformReservedRoots,
			...catalogSurfaces,
			"zastroyshchiki",
			...config.staticRoutes
				.map((route) => route.path.split("/").filter(Boolean)[0])
				.filter(Boolean),
			...config.legacyRoutes
				.map((route) => route.from.split("/").filter(Boolean)[0])
				.filter(Boolean),
			...config.legacyPatterns
				.map((pattern) => pattern.from.split("/").filter(Boolean)[0])
				.filter(Boolean),
			...Object.values(config.modules).flatMap(
				(module) => module.reservedRoots,
			),
		]),
	].sort();
}

export function readClonePreset(file) {
	const path = resolve(file);
	if (!existsSync(path))
		throw new Error(`Clone preset does not exist: ${path}`);
	const preset = JSON.parse(readFileSync(path, "utf8"));
	if (preset.schemaVersion === 1) {
		throw new Error(
			"Clone preset schemaVersion 1 is obsolete. Migrate through schemaVersion 2, then to schemaVersion 3 with canonical SiteProfile overrides.",
		);
	}
	if (preset.schemaVersion === 2) {
		throw new Error(
			"Clone preset schemaVersion 2 is obsolete. Migrate to schemaVersion 3; existing v2 fields stay unchanged and optional SiteProfile override fields may be added.",
		);
	}
	if (preset.schemaVersion !== 3)
		throw new Error("Clone preset schemaVersion must be 3.");
	assertNoSecrets(preset);
	if (!clonePresets.includes(preset.preset))
		throw new Error("Unsupported clone preset.");
	if (!["SINGLE_GEO", "MULTI_GEO"].includes(preset.geoMode)) {
		throw new Error("geoMode must be SINGLE_GEO or MULTI_GEO.");
	}
	preset.projectId = requiredString(preset.projectId, "projectId");
	preset.packageName = requiredString(preset.packageName, "packageName");
	if (!/^[a-z0-9][a-z0-9._-]*$/.test(preset.packageName)) {
		throw new Error("packageName must be a lowercase npm package name.");
	}
	preset.brandName = requiredString(preset.brandName, "brandName");
	preset.defaultDescription = requiredString(
		preset.defaultDescription,
		"defaultDescription",
	);
	preset.domain = requiredString(preset.domain, "domain").toLowerCase();
	if (!/^[a-z0-9.-]+$/.test(preset.domain))
		throw new Error("domain is invalid.");
	if (!["public", "noindex"].includes(preset.productionIndexing)) {
		throw new Error("productionIndexing must be public or noindex.");
	}
	preset.primaryGeo = assertSlug(preset.primaryGeo, "primaryGeo");
	preset.region = validateRegion(preset.region);
	if (!Array.isArray(preset.geos) || preset.geos.length === 0) {
		throw new Error("Clone preset requires at least one geo.");
	}
	const slugs = new Set();
	for (const geo of preset.geos) {
		geo.slug = assertSlug(geo.slug, "geo.slug");
		if (slugs.has(geo.slug)) throw new Error(`Duplicate geo slug: ${geo.slug}`);
		slugs.add(geo.slug);
		requiredString(geo.title, `geo ${geo.slug} title`);
		if (geo.morphologyApproved !== true) {
			throw new Error(
				`Geo ${geo.slug} morphology must be explicitly approved.`,
			);
		}
		for (const key of requiredMorphology) {
			requiredString(
				geo.morphology?.[key],
				`geo ${geo.slug} morphology.${key}`,
			);
		}
		if (typeof geo.published !== "boolean") {
			throw new Error(`Geo ${geo.slug} requires explicit published.`);
		}
		if (!["ACTIVE", "NOINDEX_AUTO", "PREPARED_OFF"].includes(geo.hubStatus)) {
			throw new Error(`Geo ${geo.slug} requires a valid hubStatus.`);
		}
		if (!geo.published && geo.hubStatus !== "PREPARED_OFF") {
			throw new Error(`Geo ${geo.slug} unpublished hub must be PREPARED_OFF.`);
		}
		if (
			geo.agglomerationOf &&
			!preset.geos.some((item) => item.slug === geo.agglomerationOf)
		) {
			throw new Error(`Geo ${geo.slug} has unknown agglomerationOf.`);
		}
	}
	validateGeoTaxonomy(preset.geos);
	if (!slugs.has(preset.primaryGeo))
		throw new Error("primaryGeo is absent from geos.");
	const routableGeos = preset.geos.filter(
		(geo) => geo.published && geo.hubStatus !== "PREPARED_OFF",
	);
	if (!routableGeos.some((geo) => geo.slug === preset.primaryGeo)) {
		throw new Error("primaryGeo must be a published routable hub.");
	}
	if (preset.geoMode === "SINGLE_GEO" && routableGeos.length !== 1) {
		throw new Error("SINGLE_GEO preset must contain exactly one routable geo.");
	}
	if (preset.geoMode === "MULTI_GEO" && routableGeos.length < 2) {
		throw new Error(
			"MULTI_GEO preset must contain at least two routable geos.",
		);
	}
	for (const key of requiredNap)
		requiredString(preset.nap?.[key], `nap.${key}`);
	preset.brand = validateCloneBrand(preset.brand);
	if (preset.brandAssets?.status !== "ready") {
		throw new Error("brandAssets.status must be ready.");
	}
	requiredString(preset.brandAssets.logoPath, "brandAssets.logoPath");
	requiredString(preset.brandAssets.faviconPath, "brandAssets.faviconPath");
	requiredString(preset.brandAssets.tokenSource, "brandAssets.tokenSource");
	if (preset.brandAssets.tokenSource !== "src/app/globals.css") {
		throw new Error("brandAssets.tokenSource must be src/app/globals.css.");
	}
	validateProfileReadiness(preset);
	preset.clientReadiness = validateClientReadiness(preset.clientReadiness);
	preset.searchConsole = validateSearchConsole(preset.searchConsole);
	const hasInlineTemplates = preset.seoTemplates !== undefined;
	const hasTemplateFile = preset.seoTemplateFile !== undefined;
	if (hasInlineTemplates === hasTemplateFile) {
		throw new Error(
			"Clone preset requires exactly one of seoTemplates or seoTemplateFile.",
		);
	}
	if (hasTemplateFile) {
		const templatePath = resolve(
			dirname(path),
			requiredString(preset.seoTemplateFile, "seoTemplateFile"),
		);
		if (!existsSync(templatePath)) {
			throw new Error(`SEO template file does not exist: ${templatePath}`);
		}
		preset.seoTemplates = JSON.parse(readFileSync(templatePath, "utf8"));
		delete preset.seoTemplateFile;
	}
	preset.seoTemplates = validateSeoInputs(preset.seoTemplates);
	assertNoSecrets(preset.seoTemplates, "seoTemplates");
	siteProfileConfigForPreset(preset);
	return preset;
}

export function clonePresetHash(preset) {
	return createHash("sha256").update(JSON.stringify(preset)).digest("hex");
}

export function renderSiteProfileConfig(preset) {
	return renderSiteProfileConfigFromConfig(siteProfileConfigForPreset(preset));
}

export function renderBrandCss(preset) {
	const brand = validateCloneBrand(structuredClone(preset.brand));
	const lines = [
		"/* CLONE_BRAND_VALUES_BEGIN: generated by clone:prepare from the approved clone preset. */",
		":root {",
		...brandColorKeys.map((key) => {
			const cssKey = key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
			return `  --brand-${cssKey}: ${brand.colors[key]};`;
		}),
		...brandRadiusKeys.map((key) => `  --brand-radius-${key}: ${brand.radii[key]};`),
		"  --brand-font-sans: var(--font-project), ui-sans-serif, system-ui, sans-serif;",
		"}",
		"/* CLONE_BRAND_VALUES_END */",
		"",
	];
	return lines.join("\n");
}

export function renderProjectFontConfig(preset) {
	const brand = validateCloneBrand(structuredClone(preset.brand));
	const definition = fontDefinitions[brand.fontFamily];
	const options = [
		'display: "swap"',
		`subsets: ${JSON.stringify(definition.subsets).replaceAll('","', '", "')}`,
		'variable: "--font-project"',
		...(definition.weight ? [`weight: "${definition.weight}"`] : []),
	];
	return `/* Generated by clone:prepare from the approved clone preset. */\nimport { ${definition.importName} } from "next/font/google";\n\nexport const projectFont = ${definition.importName}({\n\t${options.join(",\n\t")},\n});\n`;
}

export function renderSiteProfileConfigFromConfig(config) {
	return `/** Generated from the canonical project preset. Do not edit directly. */\nimport type { ProjectSiteProfileConfig } from "./site-profile.config.types.ts";\n\nexport const projectSiteProfileConfig = ${JSON.stringify(
		config,
		null,
		"\t",
	)} as const satisfies ProjectSiteProfileConfig;\n`;
}

export function renderProjectCopy(preset) {
	return renderProjectCopyFromConfig(siteProfileConfigForPreset(preset));
}

export function renderProjectCopyFromConfig(config) {
	const catalogSurface = catalogSurfaces.find((surface) =>
		["ACTIVE", "NOINDEX_AUTO"].includes(config.categoryStatus[surface]),
	);
	if (!catalogSurface) {
		throw new Error(
			"Project copy requires at least one routable catalog surface.",
		);
	}
	const catalogHref = `/${catalogSurface}/`;
	const copy = {
		notFound: {
			code: "Ошибка 404",
			title: "Страница не найдена",
			body: "Адрес мог измениться. Вернитесь на главную или откройте каталог недвижимости.",
			homeLabel: "На главную",
			catalogLabel: "В каталог",
			catalogHref,
		},
		catalog: {
			filteredSummary: "Каталог отфильтрован по выбранным параметрам.",
		},
		entityGone: {
			title: "Объект снят с публикации",
			bodyPrefix: "Страница объекта",
			bodySuffix:
				"больше не содержит публичные данные после окончания retention-периода. Автоматический редирект на главную не выполняется.",
			catalogLabel: "Смотреть актуальные объекты",
			catalogHref,
		},
	};
	return `/** Generated from the canonical project preset. Do not edit directly. */\nimport type { ProjectCopy } from "./copy.types.ts";\n\nexport const projectCopy = ${JSON.stringify(
		copy,
		null,
		"\t",
	)} as const satisfies ProjectCopy;\n`;
}

export function renderSeoTemplateInputs(preset) {
	return `/** Generated project-owned SEO copy inputs from clone preset v3. */\nexport const projectSeoCategoryLabelsInput = ${JSON.stringify(
		preset.seoTemplates.categoryLabels,
		null,
		"\t",
	)} as const;\n\nexport const projectSeoFacetLabelsInput = ${JSON.stringify(
		preset.seoTemplates.facetLabels,
		null,
		"\t",
	)} as const;\n\nexport const projectSeoTemplatesInput = ${JSON.stringify(
		preset.seoTemplates.templates,
		null,
		"\t",
	)} as const;\n`;
}

export function renderProjectLiterals(preset) {
	return `${JSON.stringify(
		{
			projectIdentity: {
				brands: [preset.brandName],
				domains: [preset.domain],
				cities: [
					...new Set(
						preset.geos.flatMap((geo) => [
							geo.title,
							...requiredMorphology.map((key) => geo.morphology[key]),
						]),
					),
				],
			},
			hrefLiteralMode: "enforce",
		},
		null,
		"\t",
	)}\n`;
}

export function renderClientReadinessConfig(preset) {
	const value = {
		domain: preset.domain,
		...preset.clientReadiness,
		productionIndexing: preset.productionIndexing,
	};
	return `export type ClientReadinessConfig = {\n\tdomain: string | null;\n\tdeploymentTarget: "timeweb-vps" | "approved-runtime" | null;\n\tdatabase: "timeweb-managed-postgresql" | "approved-managed-postgresql" | null;\n\tmediaStorage: "timeweb-s3" | "approved-object-storage" | null;\n\tfeedImageSource: "external-urls" | "object-storage" | null;\n\tjobsActiveRuntimeCount: number | null;\n\tleadRetentionDays: number | null;\n\tarchiveRetentionDays: number | null;\n\tlegalContent: "approved" | "placeholder";\n\tproductionIndexing: "public" | "noindex" | null;\n\trequiredHostAllowlists: {\n\t\toutbound: readonly string[];\n\t\texternalImages: readonly string[];\n\t\tleadOutbound: readonly string[];\n\t};\n\tnginx: boolean;\n\tautomaticBackup: boolean;\n\texternalMonitoring: boolean;\n};\n\nexport const clientReadinessConfig = ${JSON.stringify(
		value,
		null,
		"\t",
	)} as const satisfies ClientReadinessConfig;\n`;
}

function approvedGeoMorphology(geo) {
	return {
		approved: geo.morphologyApproved,
		nominative: geo.morphology.nominative,
		genitive: geo.morphology.genitive,
		prepositional: geo.morphology.prepositional,
		preposition: geo.morphology.preposition,
	};
}

export function buildClientSeoSkeleton(preset, profile, preparedAt) {
	const brandName = preset.brandName ?? preset.nap?.brandName;
	const activeCategoriesListForGeo = (geo) => {
		const labels = Object.entries(profile.categoryStatus).flatMap(
			([category, globalStatus]) => {
				const localStatus = profile.geoCategoryStatus[geo.slug]?.[category];
				return (globalStatus === "ACTIVE" || globalStatus === "NOINDEX_AUTO") &&
					(localStatus === "ACTIVE" || localStatus === "NOINDEX_AUTO")
					? [preset.seoTemplates.categoryLabels[category].nominativePluralLower]
					: [];
			},
		);
		if (labels.length === 0) {
			throw new Error(`Geo hub requires active categories: ${geo.slug}.`);
		}
		if (labels.length === 1) return labels[0];
		if (labels.length === 2) return labels.join(" и ");
		return `${labels.slice(0, -1).join(", ")} и ${labels.at(-1)}`;
	};
	const districtRegistry = {};
	for (const geo of preset.geos) {
		for (const district of geo.districts) {
			for (const [category, status] of Object.entries(
				profile.geoCategoryStatus[geo.slug] ?? {},
			)) {
				if (status === "PREPARED_OFF" || status === "OUT") continue;
				districtRegistry[geo.slug] ??= {};
				districtRegistry[geo.slug][category] ??= [];
				districtRegistry[geo.slug][category].push(district.slug);
			}
		}
	}
	const grammar = createProjectUrlGrammar(profile, districtRegistry);
	const rows = [];
	const snapshotDate = preparedAt.slice(0, 10);
	const tier = profile.seoTiers.unmeasuredPolicy;
	const minimumObjects =
		tier === "NONE" ? 0 : profile.seoTiers.minInventory[tier];
	const add = ({
		pageKey,
		templateKey,
		geo,
		category,
		facet,
		district,
		entityRef,
		contentGateRule,
	}) => {
		const geoMorphology = geo ? approvedGeoMorphology(geo) : undefined;
		const rendered = renderSeoDefinition(
			preset.seoTemplates.templates[templateKey],
			{
				brand: brandName,
				activeCategoriesList:
					templateKey === "geoHub" && geo
						? activeCategoriesListForGeo(geo)
						: undefined,
				geoGenitive: geoMorphology?.genitive,
				cityPhrase: geoMorphology
					? `${geoMorphology.preposition} ${geoMorphology.prepositional}`
					: undefined,
				cityGenitive: geoMorphology?.genitive,
				districtPhrase: district
					? `${district.preposition} ${district.locative}`
					: undefined,
				districtAdjLocative: district?.adjLocative,
				category: category
					? preset.seoTemplates.categoryLabels[category].nominativePlural
					: undefined,
				categoryLower: category
					? preset.seoTemplates.categoryLabels[category].nominativePluralLower
					: undefined,
				categoryNominativePlural: category
					? preset.seoTemplates.categoryLabels[category].nominativePlural
					: undefined,
				categoryAccusative: category
					? preset.seoTemplates.categoryLabels[category].accusativeSingular
					: undefined,
				dealVerb: category
					? preset.seoTemplates.categoryLabels[category].dealVerb
					: undefined,
				categoryGenitivePlural: category
					? preset.seoTemplates.categoryLabels[category].genitivePlural
					: undefined,
				facet: facet ? preset.seoTemplates.facetLabels[facet] : undefined,
			},
			geo ? geo.morphologyApproved : true,
		);
		const url = grammar.buildUrl(pageKey);
		rows.push({
			pageKey,
			url,
			canonical: url,
			entityRef,
			targetPhrases: [`client skeleton ${url}`],
			metric: profile.seoTiers.metric,
			value: null,
			source: "fallback_no_data",
			snapshotDate,
			synthetic: false,
			tier,
			minimumObjects,
			defaultRobots: "noindex,follow",
			templateKey,
			title: rendered.title,
			h1: rendered.h1,
			description: rendered.description,
			status: "draft",
			morphologyApproved: rendered.morphologyApproved,
			release: "client-bootstrap",
			contentGateRule,
		});
	};
	const primary = preset.geos.find((geo) => geo.slug === preset.primaryGeo);
	add({
		pageKey: { kind: "home" },
		templateKey:
			profile.geoMode === "MULTI_GEO" ? "homeMultiGeo" : "homeSingleGeo",
		geo: primary,
		entityRef: null,
		contentGateRule: "listing",
	});
	for (const [category, status] of Object.entries(profile.categoryStatus)) {
		if (status === "PREPARED_OFF" || status === "OUT") continue;
		add({
			pageKey: { kind: "categoryRoot", category },
			templateKey: "categoryRoot",
			category,
			entityRef: `category:${category}`,
			contentGateRule: "listing",
		});
	}
	for (const geo of preset.geos.filter(
		(item) => item.published && item.hubStatus !== "PREPARED_OFF",
	)) {
		add({
			pageKey: { kind: "geoHub", geo: geo.slug },
			templateKey: "geoHub",
			geo,
			entityRef: `geo:${geo.slug}`,
			contentGateRule: "listing",
		});
		for (const [category, status] of Object.entries(
			profile.geoCategoryStatus[geo.slug] ?? {},
		)) {
			if (status === "PREPARED_OFF" || status === "OUT") continue;
			add({
				pageKey: { kind: "categoryGeo", geo: geo.slug, category },
				templateKey: "categoryGeo",
				geo,
				category,
				entityRef: `geo:${geo.slug}/category:${category}`,
				contentGateRule: "listing",
			});
			for (const district of geo.districts) {
				add({
					pageKey: {
						kind: "categoryGeoDistrict",
						geo: geo.slug,
						category,
						district: district.slug,
					},
					templateKey:
						district.type === "admin_district"
							? "categoryGeoDistrictAdmin"
							: "categoryGeoDistrictMicro",
					geo,
					category,
					district,
					entityRef: `geo:${geo.slug}/category:${category}/district:${district.slug}`,
					contentGateRule: "listing",
				});
			}
		}
		if (
			profile.developersSurface.byGeo[geo.slug] !== "PREPARED_OFF" &&
			profile.developersSurface.byGeo[geo.slug] !== "OUT"
		) {
			add({
				pageKey: { kind: "geoDevelopers", geo: geo.slug },
				templateKey: "geoDevelopers",
				geo,
				entityRef: `geo:${geo.slug}/developers`,
				contentGateRule: "developerGeo",
			});
		}
	}
	if (
		profile.developersSurface.root !== "PREPARED_OFF" &&
		profile.developersSurface.root !== "OUT"
	) {
		add({
			pageKey: { kind: "developerRoot" },
			templateKey: "developerRoot",
			entityRef: "developers:root",
			contentGateRule: "developerGeo",
		});
	}
	for (const [facet, definition] of Object.entries(profile.seoFacets)) {
		const geo = preset.geos.find((item) => item.slug === definition.geo);
		if (
			!geo ||
			profile.geoCategoryStatus[definition.geo]?.[definition.category] ===
				"PREPARED_OFF" ||
			profile.geoCategoryStatus[definition.geo]?.[definition.category] === "OUT"
		)
			continue;
		add({
			pageKey: {
				kind: "categoryGeoFacet",
				geo: definition.geo,
				category: definition.category,
				facet,
			},
			templateKey: "categoryGeoFacet",
			geo,
			category: definition.category,
			facet,
			entityRef: `facet:${facet}`,
			contentGateRule: "listing",
		});
	}
	return { rows, districtRegistry };
}

export function renderClientSeoArtifacts(preset, profile, preparedAt) {
	const skeleton = buildClientSeoSkeleton(preset, profile, preparedAt);
	const districtRows = ["geo,category,district"];
	for (const [geo, categories] of Object.entries(skeleton.districtRegistry)) {
		for (const [category, districts] of Object.entries(categories)) {
			for (const district of districts)
				districtRows.push(`${geo},${category},${district}`);
		}
	}
	return {
		skeleton,
		districtCsv: `${districtRows.join("\n")}\n`,
		registryCsv: renderSeoRegistryCsv(seoRegistryColumns, skeleton.rows),
		registryModule: renderSeoRegistryModule(
			skeleton.rows,
			skeleton.districtRegistry,
			deterministicSeoRegistryValidationNow(skeleton.rows),
		),
	};
}

export function buildCloneBootstrap(
	preset,
	reservedRoots,
	presetSha,
	preparedAt,
) {
	const activeSurfaces = activeSurfacesForPreset(preset.preset);
	const profile = siteProfileConfigForPreset(preset);
	const skeleton = buildClientSeoSkeleton(preset, profile, preparedAt);
	return {
		schemaVersion: 3,
		presetSha,
		preparedAt: requiredString(preparedAt, "preparedAt"),
		projectId: preset.projectId,
		packageName: preset.packageName,
		defaultDescription: preset.defaultDescription,
		domain: preset.domain,
		preset: preset.preset,
		geoMode: preset.geoMode,
		primaryGeo: preset.primaryGeo,
		region: preset.region,
		geos: preset.geos,
		categoryStatus: preset.categoryStatus,
		marketCapability: preset.marketCapability,
		geoCategoryStatus: preset.geoCategoryStatus,
		marketStatus: preset.marketStatus,
		developersSurface: preset.developersSurface,
		seoFacets: preset.seoFacets,
		filterKeys: preset.filterKeys,
		seoTiers: preset.seoTiers,
		gate: preset.gate,
		staticRoutes: preset.staticRoutes,
		legacyRoutes: profile.legacyRoutes,
		legacyPatterns: profile.legacyPatterns,
		nap: { brandName: preset.brandName, ...preset.nap },
		brand: preset.brand,
		seoRegistry: {
			activeSurfaces,
			rows: skeleton.rows,
		},
		brandAssets: preset.brandAssets,
		feed: preset.feed,
		developmentExcel: preset.developmentExcel,
		clientReadiness: preset.clientReadiness,
		seoTemplates: preset.seoTemplates,
		reservedRoots,
		catalogSurfaces,
		productionIndexing: preset.productionIndexing,
		fixtureData: "cleared",
	};
}

export function validateCloneBootstrap(root) {
	const bootstrapPath = resolve(root, "docs", "CLIENT_BOOTSTRAP.json");
	if (!existsSync(bootstrapPath))
		throw new Error("docs/CLIENT_BOOTSTRAP.json is missing.");
	const value = JSON.parse(readFileSync(bootstrapPath, "utf8"));
	assertNoSecrets(value, "bootstrap");
	if (value.schemaVersion !== 3 || value.fixtureData !== "cleared") {
		throw new Error("Client fixture data is not explicitly cleared.");
	}
	if (!clonePresets.includes(value.preset))
		throw new Error("Bootstrap preset is invalid.");
	requiredString(value.packageName, "bootstrap packageName");
	requiredString(value.defaultDescription, "bootstrap defaultDescription");
	requiredString(value.domain, "bootstrap domain");
	requiredString(value.preparedAt, "bootstrap preparedAt");
	validateRegion(value.region);
	if (!["public", "noindex"].includes(value.productionIndexing)) {
		throw new Error("Bootstrap indexing decision is missing.");
	}
	for (const geo of value.geos ?? []) {
		if (geo.morphologyApproved !== true)
			throw new Error(`Geo ${geo.slug} morphology is not approved.`);
		for (const key of requiredMorphology)
			requiredString(
				geo.morphology?.[key],
				`geo ${geo.slug} morphology.${key}`,
			);
	}
	for (const key of ["brandName", ...requiredNap])
		requiredString(value.nap?.[key], `nap.${key}`);
	const expectedSurfaces = activeSurfacesForPreset(value.preset);
	if (
		JSON.stringify(value.seoRegistry?.activeSurfaces) !==
		JSON.stringify(expectedSurfaces)
	) {
		throw new Error("SEO registry active surfaces do not match the preset.");
	}
	const expectedSkeleton = buildClientSeoSkeleton(
		value,
		siteProfileConfigForPreset(value),
		value.preparedAt,
	);
	if (
		JSON.stringify(value.seoRegistry.rows) !==
		JSON.stringify(expectedSkeleton.rows)
	) {
		throw new Error("SEO registry skeleton drifted from SiteProfile.");
	}
	validateGeoTaxonomy(value.geos ?? []);
	if (value.brandAssets?.status !== "ready") {
		throw new Error("Brand onboarding must be ready.");
	}
	requiredString(value.brandAssets.logoPath, "bootstrap brandAssets.logoPath");
	requiredString(value.brandAssets.faviconPath, "bootstrap brandAssets.faviconPath");
	validateCloneBrand(value.brand);
	const generatedManifestPath = resolve(root, "docs", "CLONE_GENERATED_OUTPUTS.json");
	if (!existsSync(generatedManifestPath)) {
		throw new Error("docs/CLONE_GENERATED_OUTPUTS.json is missing.");
	}
	const generatedManifest = JSON.parse(readFileSync(generatedManifestPath, "utf8"));
	if (generatedManifest.schemaVersion !== 1 || generatedManifest.presetSha !== value.presetSha) {
		throw new Error("Generated output manifest does not match the clone preset.");
	}
	for (const [relativePath, expectedHash] of Object.entries(generatedManifest.outputs ?? {})) {
		const outputPath = resolve(root, relativePath);
		const rootRelative = relative(resolve(root), outputPath);
		if (!rootRelative || rootRelative.startsWith("..") || isAbsolute(rootRelative) || !existsSync(outputPath)) {
			throw new Error(`Generated output is missing or unsafe: ${relativePath}.`);
		}
		const actualHash = createHash("sha256")
			.update(readFileSync(outputPath, "utf8").replace(/\r\n/g, "\n"))
			.digest("hex");
		if (actualHash !== expectedHash) {
			throw new Error(`Generated output hash mismatch: ${relativePath}.`);
		}
	}
	validateProfileReadiness(value);
	validateClientReadiness(value.clientReadiness);
	validateSeoInputs(value.seoTemplates);
	const reserved = reservedRootsForSiteProfile(
		siteProfileConfigForPreset(value),
	);
	if (JSON.stringify(value.reservedRoots) !== JSON.stringify(reserved)) {
		throw new Error("Reserved-root agreement drifted from SiteProfile.");
	}
	return value;
}
