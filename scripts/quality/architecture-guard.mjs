import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
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
import {
	assertSqlOperationManifest,
	findSqlGovernanceViolations,
} from "./sql-governance.mjs";

const root = process.cwd();
const violations = [];
const codeExtensions = /\.(?:js|mjs|cjs|ts|tsx)$/;

function filesUnder(relative) {
	const directory = path.join(root, relative);
	if (!existsSync(directory)) return [];
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		const next = path.join(directory, entry.name);
		return entry.isDirectory()
			? filesUnder(path.relative(root, next))
			: codeExtensions.test(entry.name)
				? [next]
				: [];
	});
}

function relative(file) {
	return path.relative(root, file).replaceAll("\\", "/");
}

function report(file, rule) {
	violations.push(`${relative(file)}: ${rule}`);
}

if (existsSync(path.join(root, "packages", "ui", "src", "contracts"))) {
	violations.push(
		"packages/ui/src/contracts: duplicate DTO folder is forbidden; use packages/contracts and view-models",
	);
}

const packageBoundaryFiles = [
	...filesUnder("packages/ui"),
	...filesUnder("packages/contracts"),
	...filesUnder("src/core"),
];
const packageBoundaryEntries = packageBoundaryFiles.map((file) => ({
	name: relative(file),
	content: readFileSync(file, "utf8"),
}));

const seoEntries = filesUnder("src/project/seo").map((file) => ({
	name: relative(file),
	content: readFileSync(file, "utf8"),
}));
for (const violation of findSeoMorphologyDerivationViolations(seoEntries)) {
	violations.push(violation);
}
for (const violation of findPackageBoundaryViolations(packageBoundaryEntries)) {
	violations.push(violation);
}

const projectLiteralPolicyPath = path.join(
	root,
	"src",
	"project",
	"project-literals.json",
);
if (!existsSync(projectLiteralPolicyPath)) {
	violations.push(
		"src/project/project-literals.json: project literal policy is missing",
	);
} else {
	const projectLiteralPolicy = JSON.parse(
		readFileSync(projectLiteralPolicyPath, "utf8"),
	);
	const siteProfileSource = readFileSync(
		path.join(root, "src", "project", "site-profile.config.ts"),
		"utf8",
	);
	const generatedDenylist = [
		...projectLiteralDenylist(projectLiteralPolicy),
		...configuredProjectGeoSlugs(
			"src/project/site-profile.config.ts",
			siteProfileSource,
		),
	];
	for (const violation of findForbiddenProjectLiteralViolations(
		packageBoundaryEntries,
		generatedDenylist,
	)) {
		violations.push(violation);
	}
	const hrefReports = findHrefLiteralReports(
		[
			...filesUnder("src"),
			...filesUnder("packages/ui"),
			...filesUnder("packages/contracts"),
		].map((file) => ({
			name: relative(file),
			content: readFileSync(file, "utf8"),
		})),
	);
	if (projectLiteralPolicy.hrefLiteralMode !== "enforce") {
		violations.push(
			"src/project/project-literals.json: hrefLiteralMode must be enforce",
		);
	}
	violations.push(...hrefReports);
}

if (!existsSync(path.join(root, "src", "project", "static-routes.ts"))) {
	violations.push(
		"src/project/static-routes.ts: project static route owner is missing",
	);
}

const siteProfileConfigPath = path.join(
	root,
	"src",
	"project",
	"site-profile.config.ts",
);
const siteConfigSource = readFileSync(
	path.join(root, "src", "project", "site.config.ts"),
	"utf8",
);
const clientProject = /projectKind:\s*["']client["']/.test(siteConfigSource);
if (existsSync(siteProfileConfigPath)) {
	const siteProfileConfig = readFileSync(siteProfileConfigPath, "utf8");
	if (
		!siteProfileConfig.startsWith(
			"/** Generated from the canonical project preset. Do not edit directly. */",
		)
	) {
		violations.push(
			"src/project/site-profile.config.ts: runtime profile must remain generated from docs/CLONE_PRESET.starter.json",
		);
	}
	violations.push(
		...findStaticRouteParityViolations(
			filesUnder("src/app/(site)").map(relative),
			configuredStaticRoutePaths(
				"src/project/site-profile.config.ts",
				siteProfileConfig,
			),
			configuredLegacyRoutePaths(
				"src/project/site-profile.config.ts",
				siteProfileConfig,
			),
			clientProject,
		),
	);
}

const siteProfilePresetPath = path.join(
	root,
	"src",
	"project",
	"site-profile-presets.ts",
);
if (existsSync(siteProfilePresetPath)) {
	const presetSource = readFileSync(siteProfilePresetPath, "utf8");
	if (/primorsk|zarechnyy|defaultSeoFacets/.test(presetSource)) {
		violations.push(
			"src/project/site-profile-presets.ts: fixture geography and facets must stay in src/fixture",
		);
	}
	if (
		!presetSource.includes('["seoFacets", "seoTiers", "staticRoutes"]') ||
		!/Client preset requires explicit \$\{field\}\./.test(presetSource)
	) {
		violations.push(
			"src/project/site-profile-presets.ts: client preset must require explicit seoFacets, seoTiers and staticRoutes",
		);
	}
}

const projectSiteProfilePath = path.join(
	root,
	"src",
	"project",
	"site-profile.ts",
);
if (existsSync(projectSiteProfilePath)) {
	const projectProfileSource = readFileSync(projectSiteProfilePath, "utf8");
	if (/primorsk|zarechnyy|siteProfileFixtures/.test(projectProfileSource)) {
		violations.push(
			"src/project/site-profile.ts: production profile module must not own fixture geography",
		);
	}
}

for (const file of filesUnder("src")) {
	const content = readFileSync(file, "utf8");
	const name = relative(file);
	if (
		/overrideAccess\s*:\s*true/.test(content) &&
		!name.startsWith("src/core/data-access/system/")
	) {
		report(file, "overrideAccess:true outside System Gateway");
	}
	if (
		content.includes("systemOverrideAccess") &&
		!(
			name.startsWith("src/core/data-access/system/") ||
			name.startsWith("src/project/jobs/") ||
			name.startsWith("src/core/data-access/leads/") ||
			name.startsWith("src/project/data-access/public/") ||
			name === "src/core/ingest/payload-feed-ingest-repository.ts" ||
			name === "src/core/leads/deliver-lead.ts"
		)
	) {
		report(
			file,
			"systemOverrideAccess import outside System Gateway whitelist",
		);
	}
	if (/hostname\s*:\s*["']\*+["']/.test(content))
		report(file, "wildcard image hostname");
	if (/(?:token|secret|password)\s*[:=]\s*["'][^"']{12,}["']/i.test(content)) {
		report(file, "obvious embedded secret");
	}
}

const nextConfigPath = path.join(root, "next.config.ts");
if (existsSync(nextConfigPath)) {
	const nextConfig = readFileSync(nextConfigPath, "utf8");
	if (/hostname\s*:\s*["']\*+["']/.test(nextConfig)) {
		violations.push("next.config.ts: wildcard image hostname");
	}
	if (
		!nextConfig.includes("parseAllowedImageHosts") ||
		!nextConfig.includes("toNextImageRemotePatterns")
	) {
		violations.push(
			"next.config.ts: image remotePatterns must come from src/core/ingest/image-hosts.ts",
		);
	}
}

const fixtureRuntimeFiles = [
	...filesUnder("src/fixture"),
	...filesUnder("src/components/fixture"),
	...filesUnder("src/app/(site)"),
];
const persistenceImport =
	/from\s+["'](?:payload|@payloadcms\/[^"']+|pg|prisma|@prisma\/[^"']+)["']/;
for (const file of fixtureRuntimeFiles) {
	if (persistenceImport.test(readFileSync(file, "utf8")))
		report(file, "fixture website imports persistence");
}

const requiredFixtureRoutes = [
	"src/app/(site)/page.tsx",
	"src/app/(site)/[...segments]/page.tsx",
	"src/app/(site)/nedvizhimost/page.tsx",
	"src/app/(site)/obekty/[slug]/page.tsx",
	"src/app/(site)/uslugi/page.tsx",
	"src/app/(site)/o-kompanii/page.tsx",
	"src/app/(site)/ipoteka/page.tsx",
	"src/app/(site)/ipoteka/semeynaya/page.tsx",
	"src/app/(site)/prodat/page.tsx",
	"src/app/(site)/sdat/page.tsx",
	"src/app/(site)/otzyvy/page.tsx",
	"src/app/(site)/stroitelstvo-domov/page.tsx",
	"src/app/(site)/kontakty/page.tsx",
	"src/app/(site)/politika-konfidencialnosti/page.tsx",
	"src/app/(site)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx",
	"src/app/not-found.tsx",
];
for (const route of requiredFixtureRoutes) {
	if (!existsSync(path.join(root, route)))
		violations.push(`${route}: required fixture route is missing`);
}

for (const file of filesUnder("src/app")) {
	const name = relative(file);
	if (name.includes("/(payload)/") || name.includes("src\\app\\(payload)")) {
		continue;
	}
	if (
		/@\/components\/fixture|components\/fixture\//.test(
			readFileSync(file, "utf8"),
		)
	) {
		violations.push(
			`${name}: production app routes must not import fixture presentation`,
		);
	}
}

const boundary = JSON.parse(
	readFileSync(path.join(root, "config", "raw-rest-boundary.json"), "utf8"),
);
const allowed = new Set(boundary.allowedRouteFiles);
const routeFiles = filesUnder("src/app")
	.map(relative)
	.filter((file) => /\/api\/(?:.*\/)?route\.(?:js|ts)$/.test(file));
for (const file of routeFiles) {
	if (!allowed.has(file))
		violations.push(`${file}: app API route is not in raw REST allowlist`);
}
if (
	!Array.isArray(boundary.anonymousDenyCollections) ||
	!boundary.anonymousDenyCollections.includes("media")
) {
	violations.push(
		"config/raw-rest-boundary.json: anonymous raw REST deny collections must include media",
	);
}
if (
	!Array.isArray(boundary.anonymousAuthAllowPaths) ||
	!boundary.anonymousAuthAllowPaths.includes("/api/users/login")
) {
	violations.push(
		"config/raw-rest-boundary.json: Payload auth allowlist must preserve /api/users/login",
	);
}
const proxyPath = path.join(root, "src", "proxy.ts");
const middlewarePath = path.join(root, "src", "middleware.ts");
const legacyManifestPath = path.join(
	root,
	"src",
	"project",
	"routing",
	"legacy-route-manifest.ts",
);
const anonymousRestHelperPath = path.join(
	root,
	"src",
	"core",
	"security",
	"anonymous-raw-rest.ts",
);
if (!existsSync(proxyPath)) {
	violations.push("src/proxy.ts: raw REST edge boundary is missing");
} else {
	const proxy = readFileSync(proxyPath, "utf8");
	if (!proxy.includes("anonymousRawRestEdgeDecision")) {
		violations.push(
			"src/proxy.ts: raw REST edge boundary must use anonymousRawRestEdgeDecision",
		);
	}
	if (!/export (?:async )?function proxy\s*\(/.test(proxy)) {
		violations.push(
			"src/proxy.ts: Next 16 request boundary must keep the named proxy export",
		);
	}
	if (!proxy.includes("notFound")) {
		violations.push(
			"src/proxy.ts: anonymous raw REST denial must return notFound",
		);
	}
	if (
		!proxy.includes("_next/static|_next/image") ||
		!proxy.includes("matchLegacyRoute") ||
		!proxy.includes("parseCurrentPropertyLifecyclePath") ||
		!proxy.includes("lookupCurrentPropertyLifecyclePreflight") ||
		!proxy.includes("overwriteLifecyclePreflightHeader")
	) {
		violations.push(
			"src/proxy.ts: bounded property lifecycle preflight contract is missing",
		);
	}
	if (proxy.includes("fetch(")) {
		violations.push(
			"src/proxy.ts: lifecycle preflight must not recursively fetch the application",
		);
	}
	if (
		proxy.indexOf("const legacyRoute = matchLegacyRoute(") >
		proxy.indexOf("await lookupCanonicalEntityLifecyclePreflight(")
	) {
		violations.push(
			"src/proxy.ts: SiteProfile legacy contract must run before stored redirect/canonical resolution",
		);
	}
}
if (!existsSync(legacyManifestPath)) {
	violations.push(
		"src/project/routing/legacy-route-manifest.ts: SiteProfile-derived matcher is missing",
	);
} else {
	const legacyManifest = readFileSync(legacyManifestPath, "utf8");
	if (
		!legacyManifest.includes("siteProfile.legacyRoutes") ||
		!legacyManifest.includes("siteProfile.legacyPatterns")
	) {
		violations.push(
			"src/project/routing/legacy-route-manifest.ts: legacy routes and patterns must be read from SiteProfile",
		);
	}
	if (/['"]\/(?:nedvizhimost|obekty)(?:\/|['"])/.test(legacyManifest)) {
		violations.push(
			"src/project/routing/legacy-route-manifest.ts: duplicate hardcoded legacy declaration is forbidden",
		);
	}
	if (
		!legacyManifest.includes("statusCode: route.statusCode") ||
		!legacyManifest.includes("statusCode: pattern.statusCode")
	) {
		violations.push(
			"src/project/routing/legacy-route-manifest.ts: compiled legacy matches must preserve the SiteProfile 301 status",
		);
	}
}
if (existsSync(middlewarePath)) {
	violations.push(
		"src/middleware.ts: Next 16 canonical request boundary must remain src/proxy.ts",
	);
}

const propertyPagePath = path.join(
	root,
	"src",
	"app",
	"(site)",
	"obekty",
	"[slug]",
	"page.tsx",
);
const goneResponsePath = path.join(
	root,
	"src",
	"core",
	"http",
	"property-gone-response.ts",
);
if (
	existsSync(
		path.join(
			root,
			"src",
			"app",
			"http",
			"property-lifecycle",
			"[slug]",
			"route.ts",
		),
	)
) {
	violations.push(
		"src/app/http/property-lifecycle/[slug]/route.ts: superseded proof boundary must stay removed after P8-23B",
	);
}
if (
	!existsSync(goneResponsePath) ||
	!readFileSync(goneResponsePath, "utf8").includes("status: 410")
) {
	violations.push(
		"src/core/http/property-gone-response.ts: public gone response must keep HTTP 410",
	);
}
if (!existsSync(propertyPagePath)) {
	violations.push(
		"src/app/(site)/obekty/[slug]/page.tsx: direct legacy compatibility redirect is missing",
	);
} else {
	const propertyPage = readFileSync(propertyPagePath, "utf8");
	if (
		!propertyPage.includes("notFound") ||
		propertyPage.includes("permanentRedirect") ||
		propertyPage.includes("GonePropertyPage")
	) {
		violations.push(
			"src/app/(site)/obekty/[slug]/page.tsx: proxy-owned legacy route fallback must stay 404-only without a 308 redirect",
		);
	}
}
for (const removedRuntime of [
	"packages/ui/src/views/catalog/StarterCatalogPageView.tsx",
	"packages/ui/src/views/property/GonePropertyPageView.tsx",
	"packages/ui/src/views/shared/HtmlSitemapListingView.tsx",
	"packages/ui/src/views/shared/HtmlSitemapView.tsx",
	"src/project/seo/catalog.ts",
]) {
	if (existsSync(path.join(root, removedRuntime))) {
		violations.push(
			`${removedRuntime}: superseded post-cutover runtime returned`,
		);
	}
}
if (!existsSync(anonymousRestHelperPath)) {
	violations.push(
		"src/core/security/anonymous-raw-rest.ts: denylist helper is missing",
	);
} else if (
	!readFileSync(anonymousRestHelperPath, "utf8").includes(
		"anonymousDenyCollections",
	)
) {
	violations.push(
		"src/core/security/anonymous-raw-rest.ts: helper must read anonymousDenyCollections",
	);
}

const globals = readFileSync(
	path.join(root, "src", "app", "globals.css"),
	"utf8",
);
if (!globals.includes('@source "../../packages/ui/src";')) {
	violations.push(
		"src/app/globals.css: packages/ui Tailwind source is missing",
	);
}
function findShadcnOwners(directory = root) {
	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (
			entry.isDirectory() &&
			[".git", ".next", "graphify-out", "node_modules"].includes(entry.name)
		)
			return [];
		const absolute = path.join(directory, entry.name);
		if (entry.isDirectory()) return findShadcnOwners(absolute);
		return entry.name === "components.json" ? [relative(absolute)] : [];
	});
}
const shadcnOwners = findShadcnOwners();
if (
	shadcnOwners.length !== 1 ||
	shadcnOwners[0] !== "packages/ui/components.json"
) {
	violations.push(
		`shadcn owner must be packages/ui/components.json; found ${shadcnOwners.join(", ") || "none"}`,
	);
}

const rootPackage = JSON.parse(
	readFileSync(path.join(root, "package.json"), "utf8"),
);
if (rootPackage.scripts?.["ui:shadcn"] !== "node scripts/ui-shadcn.mjs") {
	violations.push("package.json: ui:shadcn must use the project-owned wrapper");
}

const uiTsConfig = JSON.parse(
	readFileSync(path.join(root, "packages", "ui", "tsconfig.json"), "utf8"),
);
if (
	uiTsConfig.compilerOptions?.paths?.["@ams/realtbase-ui/*"]?.[0] !== "./src/*"
) {
	violations.push(
		"packages/ui/tsconfig.json: @ams/realtbase-ui alias must resolve inside packages/ui/src",
	);
}

const shadcnConfig = JSON.parse(
	readFileSync(path.join(root, "packages", "ui", "components.json"), "utf8"),
);
if (
	shadcnConfig.aliases?.ui !== "@ams/realtbase-ui/components/ui" ||
	shadcnConfig.aliases?.utils !== "@ams/realtbase-ui/lib/utils"
) {
	violations.push(
		"packages/ui/components.json: shadcn aliases must resolve to the canonical UI package",
	);
}

const baseline = JSON.parse(
	readFileSync(path.join(root, "docs", "guard-baseline.json"), "utf8"),
);
if (baseline.frozen !== true) {
	violations.push("docs/guard-baseline.json must be frozen");
}
if (
	!Array.isArray(baseline.knownExceptions) ||
	baseline.knownExceptions.length !== 0
) {
	violations.push("docs/guard-baseline.json knownExceptions must stay empty");
}

const sourceFiles = filesUnder("src");
for (const violation of findSqlGovernanceViolations(
	sourceFiles.map((file) => ({
		name: relative(file),
		content: readFileSync(file, "utf8"),
	})),
)) {
	violations.push(violation);
}
for (const sqlFile of [
	"src/core/data-access/ingest/sql/index.ts",
	"src/core/data-access/system/sql/index.ts",
]) {
	assertSqlOperationManifest(
		sqlFile,
		readFileSync(path.join(root, sqlFile), "utf8"),
	);
}
for (const file of sourceFiles) {
	const name = relative(file);
	const content = readFileSync(file, "utf8");
	if (
		/collection:\s*["']payload-jobs["']/.test(content) &&
		!name.startsWith("src/core/data-access/system/jobs/") &&
		!name.startsWith("src/project/payload-types.ts")
	) {
		report(file, "payload-jobs access is only allowed in system/jobs");
	}
	if (
		/\bfetch\s*\(/.test(content) &&
		name !== "src/core/security/safe-outbound-client.ts"
	) {
		report(file, "direct fetch is forbidden outside Safe Outbound Client");
	}
}

for (const violation of findCacheGraphViolations(
	sourceFiles.map((file) => ({
		name: relative(file),
		content: readFileSync(file, "utf8"),
	})),
)) {
	violations.push(violation);
}

for (const violation of findUiPersistenceViolations(
	filesUnder("packages/ui").map((file) => ({
		name: relative(file),
		content: readFileSync(file, "utf8"),
	})),
)) {
	violations.push(violation);
}

const payloadConfig = readFileSync(
	path.join(root, "payload.config.ts"),
	"utf8",
);
if (
	/cors:\s*["']\*["']/.test(payloadConfig) ||
	/origin:\s*["']\*["']/.test(payloadConfig)
) {
	violations.push("payload.config.ts: wildcard CORS is forbidden");
}

const classified = new Set(Object.keys(boundary.classifiedCollections ?? {}));
const requiredCollections = [
	"users",
	"pages",
	"regions",
	"cities",
	"districts",
	"properties",
	"feed-sources",
	"import-runs",
	"import-issues",
	"leads",
	"lead-deliveries",
	"media",
	"redirects",
	"payload-jobs",
];
for (const slug of requiredCollections) {
	if (!classified.has(slug)) {
		violations.push(
			`config/raw-rest-boundary.json: collection ${slug} is unclassified`,
		);
	}
}
if (boundary.classifiedCollections?.media !== "deny-anonymous") {
	violations.push(
		"media must be classified deny-anonymous in raw-rest-boundary.json",
	);
}

const denyAnonymousFiles = {
	users: "src/project/collections/Users.ts",
	pages: "src/project/collections/Pages.ts",
	regions: "src/project/collections/Regions.ts",
	cities: "src/project/collections/Cities.ts",
	districts: "src/project/collections/Districts.ts",
	properties: "src/project/collections/Properties.ts",
	"feed-sources": "src/project/collections/FeedSources.ts",
	"import-runs": "src/project/collections/ImportRuns.ts",
	"import-issues": "src/project/collections/ImportIssues.ts",
	leads: "src/project/collections/Leads.ts",
	"lead-deliveries": "src/project/collections/LeadDeliveries.ts",
	media: "src/project/collections/Media.ts",
	redirects: "src/project/collections/Redirects.ts",
};
const classifiedPublicReadAccess = {
	pages: "publicPageReadAccess",
	regions: "geoReadAccess",
	cities: "geoReadAccess",
	districts: "geoReadAccess",
	properties: "publicPropertyReadAccess",
	redirects: "publicRedirectReadAccess",
};
for (const slug of boundary.anonymousDenyCollections ?? []) {
	const relativeFile = denyAnonymousFiles[slug];
	if (!relativeFile) {
		violations.push(
			`anonymousDenyCollections includes unclassified file mapping for ${slug}`,
		);
		continue;
	}
	const content = readFileSync(path.join(root, relativeFile), "utf8");
	const publicAccess = classifiedPublicReadAccess[slug];
	if (
		!(publicAccess
			? content.includes(`read: ${publicAccess}`)
			: /access:\s*\{[\s\S]*?read:\s*(?:adminsAndOwners|ownersOnly)/.test(
					content,
				))
	) {
		violations.push(
			`${relativeFile}: deny-anonymous collection must not expose generic anonymous read`,
		);
	}
	if (/read:\s*\(\)\s*=>\s*true/.test(content)) {
		violations.push(`${relativeFile}: open anonymous read is forbidden`);
	}
}

for (const file of routeFiles) {
	if (/\/jobs(?:\/|$)/.test(file) && !file.includes("payload")) {
		violations.push(`${file}: public jobs endpoint is forbidden`);
	}
}

const reserved = ["/novostroyki", "/komplex", "/journal"];
for (const prefix of reserved) {
	const appHit = filesUnder("src/app").some((file) =>
		relative(file).includes(prefix.slice(1)),
	);
	if (appHit) {
		violations.push(
			`reserved namespace ${prefix} must not be occupied by a static app route`,
		);
	}
}

if (
	!existsSync(
		path.join(
			root,
			"src",
			"core",
			"data-access",
			"system",
			"jobs",
			"inspect.ts",
		),
	)
) {
	violations.push("src/core/data-access/system/jobs module is missing");
}

if (
	existsSync(path.join(root, "src", "project", "data-access", "public", "sql"))
) {
	violations.push(
		"src/project/data-access/public/sql: public raw SQL layer must be removed",
	);
}

for (const leftover of [
	"src/server/public-gateway",
	"src/server/system-gateway",
	"src/server/security",
	"src/server/seo",
	"src/server/http",
	"src/server/ingest-gateway",
	"src/components/fixture",
	"src/demo-data",
	"src/app/(site)/_lib",
]) {
	if (existsSync(path.join(root, leftover))) {
		violations.push(
			`${leftover}: moved under src/core; leftover path must be removed`,
		);
	}
}

const publicReadRoots = ["src/project/data-access/public", "src/app/(site)"];
const publicSqlForbidden =
	/drizzle\.execute|from\s+["']@payloadcms\/db-postgres\/drizzle["']|payload\.db|db\.drizzle/;
for (const directory of publicReadRoots) {
	for (const file of filesUnder(directory)) {
		if (publicSqlForbidden.test(readFileSync(file, "utf8"))) {
			report(
				file,
				"public/read path must not use drizzle.execute or payload.db",
			);
		}
	}
}

if (violations.length) {
	console.error(violations.join("\n"));
	process.exit(1);
}
console.log("architecture guards: PASS");
