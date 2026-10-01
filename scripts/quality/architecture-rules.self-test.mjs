import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import dependencyConfig from "../../.dependency-cruiser.mjs";
import {
	configuredLegacyRoutePaths,
	configuredProjectGeoSlugs,
	configuredStaticRoutePaths,
	findCacheGraphViolations,
	findForbiddenProjectLiteralViolations,
	findHrefLiteralReports,
	findPackageBoundaryViolations,
	findSeoMorphologyDerivationViolations,
	findStaticRouteParityViolations,
	findUiPersistenceViolations,
	projectLiteralDenylist,
} from "./architecture-rules.mjs";
import { findMissingLocalApiModes } from "./local-api-mode-rule.mjs";
import { findSqlGovernanceViolations } from "./sql-governance.mjs";

const root = process.cwd();
const fixtureRoot = path.join(
	root,
	"scripts",
	"quality",
	"fixtures",
	"architecture",
);
const fixture = (kind, name, virtualName) => ({
	name: virtualName,
	content: readFileSync(
		path.join(fixtureRoot, kind, `${name}.fixture.txt`),
		"utf8",
	),
});

assert.equal(
	findPackageBoundaryViolations([
		fixture("allowed", "ui-dto-type-import", "packages/ui/src/card.tsx"),
	]).length,
	0,
	"UI pure-type DTO import fixture must remain allowed",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("broken", "ui-framework-import", "packages/ui/src/card.tsx"),
	]).length,
	1,
	"UI framework runtime fixture must fail",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture(
			"broken",
			"contracts-persistence-import",
			"packages/contracts/src/property.ts",
		),
	]).length,
	1,
	"contracts persistence runtime fixture must fail",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("broken", "ui-app-persistence-import", "packages/ui/src/card.tsx"),
	]).length,
	1,
	"UI application persistence fixture must fail",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("broken", "core-ui-import", "src/core/catalog/card.ts"),
	]).length,
	1,
	"core-to-UI fixture must fail",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("allowed", "core-dto-type-import", "src/core/catalog/dto.ts"),
	]).length,
	0,
	"core pure-type DTO import fixture must remain allowed",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("allowed", "project-composes-core", "src/project/profile.ts"),
	]).length,
	0,
	"project-to-core composition fixture must remain allowed",
);
assert.equal(
	findPackageBoundaryViolations([
		fixture("broken", "core-project-import", "src/core/profile/index.ts"),
	]).length,
	1,
	"core-to-project fixture must fail",
);
assert.equal(
	findForbiddenProjectLiteralViolations(
		[fixture("broken", "project-literal", "packages/ui/src/brand.ts")],
		["Example Project City"],
	).length,
	1,
	"project literal in a reusable package must fail",
);
assert.equal(
	findForbiddenProjectLiteralViolations(
		[fixture("allowed", "core-dto-type-import", "src/core/catalog/dto.ts")],
		["Example Project City"],
	).length,
	0,
	"reusable code without project literals must remain allowed",
);
assert.equal(
	findHrefLiteralReports([
		fixture("broken", "href-literal", "packages/ui/src/navigation.tsx"),
	]).length,
	1,
	"href literals must remain visible in report mode",
);
assert.deepEqual(
	projectLiteralDenylist({
		projectIdentity: {
			brands: ["Brand"],
			domains: ["example.test"],
			cities: ["City"],
		},
	}),
	["Brand", "example.test", "City"],
);
assert.throws(() => projectLiteralDenylist({}), /projectIdentity/);
const staticProfileFixture = `export const config = { staticRoutes: [{ path: "/" }, { path: "/kontakty" }] }`;
assert.deepEqual(
	configuredStaticRoutePaths("site-profile.config.ts", staticProfileFixture),
	["/", "/kontakty"],
);
assert.deepEqual(
	configuredLegacyRoutePaths(
		"site-profile.config.ts",
		`export const config = { legacyRoutes: [{ from: "/old", to: "/new/" }] }`,
	),
	["/old"],
);
assert.deepEqual(
	configuredProjectGeoSlugs(
		"site-profile.config.ts",
		`export const config = { geos: { primorsk: {}, "zarechnyy": {} } }`,
	),
	["primorsk", "zarechnyy"],
);
assert.deepEqual(
	findStaticRouteParityViolations(
		["src/app/(site)/page.tsx", "src/app/(site)/kontakty/page.tsx"],
		["/", "/kontakty"],
	),
	[],
);
assert.equal(
	findStaticRouteParityViolations(
		["src/app/(site)/page.tsx", "src/app/(site)/missing/page.tsx"],
		["/"],
	).length,
	1,
	"unregistered static route folder must fail",
);
assert.deepEqual(
	findStaticRouteParityViolations(
		["src/app/(site)/page.tsx", "src/app/(site)/legacy/page.tsx"],
		["/"],
		["/legacy"],
	),
	[],
);

assert.equal(
	findMissingLocalApiModes(
		fixture("allowed", "local-api-mode", "src/core/read.ts").content,
	).length,
	0,
	"explicit Local API mode fixture must remain allowed",
);
assert.equal(
	findMissingLocalApiModes(
		fixture("broken", "local-api-mode", "src/core/read.ts").content,
	).length,
	1,
	"missing Local API mode fixture must fail",
);

assert.equal(
	findSqlGovernanceViolations([
		fixture("allowed", "migration-sql", "migrations/fixture.ts"),
	]).length,
	0,
	"migration SQL fixture must remain allowed",
);
assert.equal(
	findSqlGovernanceViolations([
		fixture("broken", "runtime-sql", "src/core/ingest/broken-sql.ts"),
	]).length,
	1,
	"unapproved raw SQL fixture must fail",
);

assert.equal(
	findCacheGraphViolations([
		fixture("allowed", "cache-executor", "src/core/cache/in-process.ts"),
	]).length,
	0,
	"approved lazy cache executor fixture must remain allowed",
);
assert.equal(
	findCacheGraphViolations([
		fixture("broken", "cache-top-level", "src/core/cache/http-revalidate.ts"),
	]).length,
	1,
	"top-level cache runtime fixture must fail",
);

assert.equal(
	findUiPersistenceViolations([
		fixture("allowed", "ui-controlled-state", "packages/ui/src/form.tsx"),
	]).length,
	0,
	"controlled UI state fixture must remain allowed",
);
assert.equal(
	findUiPersistenceViolations([
		fixture("broken", "ui-browser-persistence", "packages/ui/src/form.tsx"),
	]).length,
	1,
	"UI browser persistence fixture must fail",
);

assert.equal(
	findSeoMorphologyDerivationViolations([
		{
			name: "src/project/seo/templates.ts",
			content:
				"const districtAdjLocative = context.districtAdjLocative?.trim();",
		},
	]).length,
	0,
	"explicit district morphology must remain allowed",
);
assert.equal(
	findSeoMorphologyDerivationViolations([
		{
			name: "src/project/seo/templates.ts",
			content:
				'districtAdjLocative: districtPhrase.replace(/\\s+районе$/iu, "")',
		},
	]).length,
	1,
	"district suffix mutation must fail",
);

const dependencyRules = new Set(
	dependencyConfig.forbidden.map((rule) => rule.name),
);
for (const rule of [
	"ui-has-no-persistence-dependencies",
	"contracts-have-no-runtime-or-persistence-dependencies",
	"ui-does-not-import-app-persistence",
	"core-does-not-import-ui",
	"core-and-packages-do-not-import-project",
]) {
	assert.ok(
		dependencyRules.has(rule),
		`Dependency Cruiser rule ${rule} is missing`,
	);
}

console.log("architecture guard self-tests: PASS");
