import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import type { SiteProfile } from "../src/core/profile/index.ts";
import type { PageKey } from "../src/core/routing/url-grammar.ts";
import type { SeoRegistryRow } from "../src/core/seo/registry.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import type { ProjectDistrictRouteRegistry } from "../src/project/url-grammar.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	loadProjectDistrictRegistry,
	validateRegistryCsv,
} from "./seo-registry.ts";

type CoverageRow = Pick<SeoRegistryRow, "pageKey" | "url">;
type CoverageEntry = { kind: PageKey["kind"]; url: string };

const routeCanExist = (status: string): boolean =>
	status === "ACTIVE" || status === "NOINDEX_AUTO";

function requiredPageKeys(
	profile: SiteProfile,
	districtRegistry: ProjectDistrictRouteRegistry,
): PageKey[] {
	const keys: PageKey[] = [{ kind: "home" }];
	for (const [category, status] of Object.entries(profile.categoryStatus)) {
		if (routeCanExist(status)) {
			keys.push({ kind: "categoryRoot", category } as PageKey);
		}
	}
	for (const [geo, geoConfig] of Object.entries(profile.geos)) {
		if (geoConfig.published && routeCanExist(geoConfig.hubStatus)) {
			keys.push({ kind: "geoHub", geo });
		}
		for (const [category, status] of Object.entries(
			profile.geoCategoryStatus[geo] ?? {},
		)) {
			if (!geoConfig.published || !routeCanExist(status)) continue;
			keys.push({ kind: "categoryGeo", geo, category } as PageKey);
			const categoryKey = category as keyof typeof profile.categoryStatus;
			for (const district of districtRegistry[geo]?.[categoryKey] ?? []) {
				keys.push({
					kind: "categoryGeoDistrict",
					geo,
					category,
					district,
				} as PageKey);
			}
		}
		if (
			geoConfig.published &&
			routeCanExist(profile.developersSurface.byGeo[geo])
		) {
			keys.push({ kind: "geoDevelopers", geo });
		}
	}
	for (const [facet, definition] of Object.entries(profile.seoFacets)) {
		const geo = profile.geos[definition.geo];
		const status =
			profile.geoCategoryStatus[definition.geo]?.[definition.category];
		if (geo?.published && status && routeCanExist(status)) {
			keys.push({
				kind: "categoryGeoFacet",
				geo: definition.geo,
				category: definition.category,
				facet,
			});
		}
	}
	if (routeCanExist(profile.developersSurface.root)) {
		keys.push({ kind: "developerRoot" });
	}
	return keys;
}

const managedKinds = new Set<PageKey["kind"]>([
	"home",
	"geoHub",
	"categoryRoot",
	"categoryGeo",
	"categoryGeoDistrict",
	"categoryGeoFacet",
	"geoDevelopers",
	"developerRoot",
]);

export function registryCoverage(
	profile: SiteProfile,
	districtRegistry: ProjectDistrictRouteRegistry,
	rows: readonly CoverageRow[],
): {
	status: "PASS" | "FAIL";
	required: number;
	covered: number;
	missing: CoverageEntry[];
	ineligible: CoverageEntry[];
} {
	const grammar = createProjectUrlGrammar(profile, districtRegistry);
	const required = requiredPageKeys(profile, districtRegistry)
		.map((pageKey) => ({ kind: pageKey.kind, url: grammar.buildUrl(pageKey) }))
		.sort((left, right) => left.url.localeCompare(right.url));
	const requiredUrls = new Set(required.map((entry) => entry.url));
	const actualUrls = new Set(rows.map((row) => row.url));
	const missing = required.filter((entry) => !actualUrls.has(entry.url));
	const ineligible = rows
		.filter(
			(row) => managedKinds.has(row.pageKey.kind) && !requiredUrls.has(row.url),
		)
		.map((row) => ({ kind: row.pageKey.kind, url: row.url }))
		.sort((left, right) => left.url.localeCompare(right.url));
	return {
		status: missing.length === 0 && ineligible.length === 0 ? "PASS" : "FAIL",
		required: required.length,
		covered: required.length - missing.length,
		missing,
		ineligible,
	};
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const districts = loadProjectDistrictRegistry(siteProfile);
	const rows = validateRegistryCsv(
		readFileSync(resolve("docs/seo/SEO_REGISTRY_SEED.csv"), "utf8"),
		siteProfile,
		districts,
	);
	const report = registryCoverage(siteProfile, districts, rows);
	console.log(JSON.stringify(report, null, 2));
	if (report.status !== "PASS") process.exitCode = 1;
}
