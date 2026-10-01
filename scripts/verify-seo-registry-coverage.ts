import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fixtureDistrictRouteRegistryFor } from "../src/fixture/route-registries.ts";
import { siteProfileFixtures } from "../src/fixture/site-profile.ts";
import { siteProfile } from "../src/project/site-profile.ts";
import { createProjectUrlGrammar } from "../src/project/url-grammar.ts";
import {
	loadProjectDistrictRegistry,
	validateRegistryCsv,
} from "./seo-registry.ts";
import { registryCoverage } from "./seo-registry-coverage.ts";

const projectDistricts = loadProjectDistrictRegistry(siteProfile);
const projectRows = validateRegistryCsv(
	readFileSync("docs/seo/SEO_REGISTRY_SEED.csv", "utf8"),
	siteProfile,
	projectDistricts,
);
assert.equal(
	registryCoverage(siteProfile, projectDistricts, projectRows).status,
	"PASS",
);

for (const [name, profile] of Object.entries(siteProfileFixtures)) {
	const districts = fixtureDistrictRouteRegistryFor(profile);
	const seed = registryCoverage(profile, districts, []);
	const grammar = createProjectUrlGrammar(profile, districts);
	const rows = seed.missing.map((entry) => ({
		pageKey: grammar.parseUrl(entry.url),
		url: entry.url,
	}));
	assert.ok(rows.every((row) => row.pageKey));
	const complete = registryCoverage(
		profile,
		districts,
		rows as Array<{
			pageKey: NonNullable<(typeof rows)[number]["pageKey"]>;
			url: string;
		}>,
	);
	assert.equal(complete.status, "PASS", `${name} complete coverage`);
	assert.equal(complete.missing.length, 0, `${name} missing rows`);

	const missing = registryCoverage(
		profile,
		districts,
		rows.slice(1) as never[],
	);
	assert.equal(missing.status, "FAIL", `${name} missing row must fail`);
	assert.equal(missing.missing.length, 1, `${name} one missing row`);

	const outUrl = grammar.buildUrl({ kind: "categoryRoot", category: "arenda" });
	const disabledProfile = {
		...profile,
		categoryStatus: { ...profile.categoryStatus, arenda: "OUT" as const },
		geoCategoryStatus: Object.fromEntries(
			Object.entries(profile.geoCategoryStatus).map(([geo, statuses]) => [
				geo,
				{ ...statuses, arenda: "OUT" as const },
			]),
		),
	};
	const ineligible = registryCoverage(disabledProfile, districts, [
		...(rows as never[]),
		{
			pageKey: { kind: "categoryRoot", category: "arenda" },
			url: outUrl,
		},
	]);
	assert.equal(ineligible.status, "FAIL", `${name} OUT row must fail`);
	assert.ok(ineligible.ineligible.some((entry) => entry.url === outUrl));
}

console.log("SEO registry coverage passed: project and all profile fixtures");
