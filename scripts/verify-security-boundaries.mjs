import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import rawRestBoundary from "../config/raw-rest-boundary.json" with {
	type: "json",
};

const root = process.cwd();
const codeExtensions = /\.(?:js|mjs|cjs|ts|tsx)$/;
const violations = [];

function normalize(file) {
	return file.replaceAll("\\", "/");
}

function read(relativePath) {
	return readFileSync(path.join(root, relativePath), "utf8");
}

function filesUnder(relativePath) {
	const directory = path.join(root, relativePath);
	if (!existsSync(directory)) return [];

	return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
		if (
			entry.isDirectory() &&
			[".git", ".next", "coverage", "node_modules"].includes(entry.name)
		) {
			return [];
		}

		const next = path.join(directory, entry.name);
		if (entry.isDirectory()) return filesUnder(path.relative(root, next));
		return codeExtensions.test(entry.name)
			? [normalize(path.relative(root, next))]
			: [];
	});
}

function requireIncludes(file, needle, reason) {
	assert.ok(read(file).includes(needle), `${file}: ${reason}`);
}

const routeFiles = filesUnder("src/app").filter((file) =>
	/\/api\/(?:.*\/)?route\.(?:js|ts)$/.test(file),
);
assert.deepEqual(
	routeFiles.sort(),
	[...rawRestBoundary.allowedRouteFiles].sort(),
	"every app API route must be explicitly declared in config/raw-rest-boundary.json",
);

for (const collection of [
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
]) {
	assert.ok(
		rawRestBoundary.anonymousDenyCollections.includes(collection),
		`raw REST anonymous denylist must include ${collection}`,
	);
}

const collectionFileBySlug = {
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

for (const slug of rawRestBoundary.anonymousDenyCollections) {
	const file = collectionFileBySlug[slug];
	assert.ok(
		file,
		`deny-anonymous collection ${slug} must map to a collection file`,
	);
	const content = read(file);
	const classifiedAccess = classifiedPublicReadAccess[slug];
	assert.ok(
		classifiedAccess
			? content.includes(`read: ${classifiedAccess}`)
			: /access:\s*\{[\s\S]*?read:\s*(?:adminsAndOwners|ownersOnly)/.test(
					content,
				),
		`${file}: anonymous generic read must be role-denied or classified by Public Gateway context`,
	);
	assert.ok(
		!/read:\s*\(\)\s*=>\s*true/.test(content),
		`${file}: anonymous open read is forbidden`,
	);
}

requireIncludes(
	"src/proxy.ts",
	"anonymousRawRestEdgeDecision",
	"raw REST edge boundary must use the configured denylist helper",
);
requireIncludes(
	"src/core/security/anonymous-raw-rest.ts",
	"anonymousDenyCollections",
	"anonymous REST helper must read the configured denylist",
);
requireIncludes(
	"src/proxy.ts",
	"payload-token",
	"raw REST edge boundary must require an auth signal",
);
requireIncludes(
	"src/proxy.ts",
	"notFound",
	"anonymous raw REST denial must not reveal protected collections",
);
requireIncludes(
	"src/app/api/internal/revalidate/route.ts",
	"x-ams-revalidate-secret",
	"cache revalidation must require the internal secret header",
);
requireIncludes(
	"src/app/api/internal/revalidate/route.ts",
	"rateLimited",
	"cache revalidation must keep application rate limiting",
);
requireIncludes(
	"src/core/cache/internal-route-executor.ts",
	"allowedTarget",
	"cache revalidation targets must be allowlisted",
);
requireIncludes(
	"src/app/api/internal/healthz/route.ts",
	"x-ams-health-secret",
	"health endpoint must require the internal health secret header",
);
requireIncludes(
	"src/project/collections/Users.ts",
	"maxLoginAttempts: 5",
	"admin login must lock after repeated attempts",
);
requireIncludes(
	"src/project/collections/Media.ts",
	"mediaOverwriteDisabled",
	"local media overwrite must stay disabled",
);
requireIncludes(
	"deploy/nginx/start-baza.ams24.ru.conf",
	"location /media/",
	"nginx must alias persistent MEDIA_DIR",
);
requireIncludes(
	"instrumentation.ts",
	"assertRuntimeEnvOrThrow",
	"production start must fail-fast on missing runtime env",
);
requireIncludes(
	"src/app/api/public/leads/route.ts",
	"submitPublicLead",
	"public lead intake must use the classified public gateway, not generic Payload REST",
);
requireIncludes(
	"src/project/jobs/tasks.ts",
	"skipped: decision.reason",
	"missing lead retention policy must skip destructive cleanup",
);
requireIncludes(
	"src/project/jobs/tasks.ts",
	"input: { leadDeliveryId: String(delivery.id) }",
	"lead delivery jobs must queue identifiers only",
);

const nextConfig = read("next.config.ts");
const headerBuilder = read("src/core/security/headers.ts");
for (const required of ["Content-Security-Policy", "publicCsp", "adminCsp"]) {
	assert.ok(
		nextConfig.includes(required),
		`next.config.ts missing ${required}`,
	);
}
for (const required of [
	"Strict-Transport-Security",
	"X-Content-Type-Options",
	"Referrer-Policy",
	"X-Frame-Options",
	"Permissions-Policy",
]) {
	assert.ok(
		headerBuilder.includes(required),
		`security header builder missing ${required}`,
	);
}
assert.ok(
	!nextConfig.includes("img-src 'self' data: blob: https:"),
	"CSP img-src must not use a global https: wildcard",
);
assert.ok(
	nextConfig.includes("buildImageCspSrc"),
	"CSP img-src must be assembled from EXTERNAL_IMAGE_HOSTS",
);
assert.ok(
	nextConfig.includes("buildSecurityHeaders"),
	"CSP and HSTS must use the tested environment-aware header builder",
);
assert.ok(
	!read("deploy/nginx/start-baza.ams24.ru.conf").includes(
		"includeSubDomains; preload",
	),
	"nginx must not bypass the HSTS_PRELOAD app opt-in",
);

const payloadConfig = read("payload.config.ts");
assert.ok(
	/graphQL:\s*{\s*disable:\s*true/s.test(payloadConfig),
	"GraphQL must stay disabled",
);
assert.ok(
	payloadConfig.includes("cors: runtimeEnv.NEXT_PUBLIC_SERVER_URL"),
	"CORS must be exact-origin driven",
);
assert.ok(
	/process\.env\.NODE_ENV\s*===\s*"production"\s*\?\s*false/s.test(
		payloadConfig,
	),
	"production Payload db push must be hard-disabled",
);
assert.ok(
	payloadConfig.includes("build-only-payload-secret-replace-before-runtime"),
	"build-only Payload secret fallback remains for compile",
);

const redaction = read("src/core/security/redaction.ts").toLowerCase();
for (const sensitive of [
	"password",
	"secret",
	"token",
	"authorization",
	"cookie",
	"database",
]) {
	assert.ok(
		redaction.includes(sensitive),
		`central redaction must cover ${sensitive}`,
	);
}

const outbound = read("src/core/security/safe-outbound-client.ts");
for (const required of [
	"allowedHosts",
	"approvedHttpHosts",
	"private or link-local",
	'redirect: "manual"',
	"Outbound response exceeded max size",
	"createPinnedDispatcher",
	"dispatcher",
]) {
	assert.ok(
		outbound.includes(required),
		`safe outbound client missing ${required}`,
	);
}

for (const nginxFile of [
	"deploy/nginx/start-baza.ams24.ru.conf",
	"deploy/clients/timeweb/nginx/site.conf.example",
]) {
	const nginx = read(nginxFile);
	assert.ok(
		nginx.includes("proxy_set_header X-Real-IP $remote_addr;"),
		`${nginxFile}: trusted client address must be overwritten by Nginx`,
	);
	assert.ok(
		nginx.includes("limit_req zone="),
		`${nginxFile}: edge rate limiting must remain active`,
	);
}

const overrideAllowlist = new Set([
	"src/core/data-access/system/overrides.ts",
	"scripts/quality/architecture-guard.mjs",
	"scripts/verify-security-boundaries.mjs",
]);
for (const file of [...filesUnder("src"), ...filesUnder("scripts")]) {
	const content = read(file);
	if (
		/overrideAccess\s*:\s*true/.test(content) &&
		!overrideAllowlist.has(file)
	) {
		violations.push(
			`${file}: direct overrideAccess:true must go through System Gateway`,
		);
	}
}

const leadsCollection = read("src/project/collections/Leads.ts");
assert.ok(!leadsCollection.includes("adminsAndOwners"));
assert.match(leadsCollection, /create:\s*systemGatewayOnly/);
assert.match(leadsCollection, /read:\s*ownersOnly/);
assert.match(leadsCollection, /update:\s*ownersOnly/);
assert.match(leadsCollection, /delete:\s*ownersOnly/);

const deliveriesCollection = read("src/project/collections/LeadDeliveries.ts");
assert.ok(!deliveriesCollection.includes("adminsAndOwners"));
assert.match(deliveriesCollection, /create:\s*systemGatewayOnly/);
assert.match(deliveriesCollection, /read:\s*ownersOnly/);
assert.match(deliveriesCollection, /update:\s*systemGatewayOnly/);
assert.match(deliveriesCollection, /delete:\s*ownersOnly/);
assert.ok(
	deliveriesCollection.includes('hasRole(req.user, ["owner"])'),
	"manual lead delivery retry must be owner-only",
);
assert.ok(
	deliveriesCollection.includes("retryLeadDeliveryThroughSystemGateway"),
	"manual retry must mutate delivery state through a named System Gateway",
);

assert.equal(
	read("src/project/collections/Properties.ts").includes(
		"systemOverrideAccess",
	),
	false,
	"Properties return-to-feed must not import systemOverrideAccess",
);
assert.ok(
	read("scripts/quality/architecture-guard.mjs").includes(
		"systemOverrideAccess import outside System Gateway whitelist",
	),
	"architecture guard must fail business imports of systemOverrideAccess",
);

const healthAlerts = read("scripts/verify-health-alerts.mjs");
for (const forbidden of ["token", "secret", "password", "phone", "email"]) {
	assert.ok(
		healthAlerts.includes(`"${forbidden}"`),
		`health alerts regression must guard ${forbidden}`,
	);
}

if (violations.length) {
	console.error(violations.join("\n"));
	process.exit(1);
}

requireIncludes(
	"src/project/collections/Leads.ts",
	"POST /api/public/leads",
	"Leads collection must document that public create is not generic REST",
);
requireIncludes(
	"src/project/collections/Leads.ts",
	"Generic collection create stays closed",
	"Leads collection generic create must remain system-only",
);

assert.equal(
	existsSync(path.join(root, "src/middleware.ts")),
	false,
	"Next 16 must keep src/proxy.ts; src/middleware.ts must not return",
);
assert.match(
	read("src/proxy.ts"),
	/export (?:async )?function proxy\s*\(/,
	"src/proxy.ts must export function proxy",
);
const proxySource = read("src/proxy.ts");
for (const required of [
	"anonymousRawRestEdgeDecision",
	"parseCurrentPropertyLifecyclePath",
	"lookupCurrentPropertyLifecyclePreflight",
	"overwriteLifecyclePreflightHeader",
]) {
	assert.ok(
		proxySource.includes(required),
		`proxy boundary missing ${required}`,
	);
}
assert.ok(
	(proxySource.includes('"/api/:path*"') &&
		proxySource.includes('"/obekty/:slug"')) ||
		proxySource.includes(
			'"/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"',
		),
	"proxy boundary must match API and property paths directly or through the canonical broad matcher",
);
assert.equal(
	proxySource.includes("fetch("),
	false,
	"proxy must not recursively fetch the application",
);

const { isAnonymousDeniedRawRestPath, anonymousRawRestEdgeDecision } =
	await import("../src/core/security/anonymous-raw-rest.ts");
for (const slug of [
	"properties",
	"pages",
	"regions",
	"cities",
	"districts",
	"leads",
	"lead-deliveries",
	"users",
]) {
	assert.equal(
		isAnonymousDeniedRawRestPath(`/api/${slug}`),
		true,
		`anonymous GET /api/${slug} must be denied`,
	);
	assert.equal(
		isAnonymousDeniedRawRestPath(`/api/${slug}/example-id`),
		true,
		`anonymous GET /api/${slug}/:id must be denied`,
	);
}
assert.equal(
	isAnonymousDeniedRawRestPath("/api/payload-jobs"),
	true,
	"anonymous payload-jobs REST must be denied",
);
assert.equal(
	isAnonymousDeniedRawRestPath("/api/payload-jobs/example-id"),
	true,
	"anonymous payload-jobs item REST must be denied",
);
assert.equal(
	isAnonymousDeniedRawRestPath("/api/users/login"),
	false,
	"Payload login remain on the auth allowlist",
);
assert.equal(
	isAnonymousDeniedRawRestPath("/api/public/leads"),
	false,
	"classified public lead intake must stay reachable",
);

const fakeSession = "aaaaaaaaaa.bbbbbbbbbb.cccccccccc";
for (const pathname of [
	"/api/leads",
	"/api/properties",
	"/api/regions",
	"/api/cities",
	"/api/districts",
	"/api/users",
	"/api/payload-jobs",
]) {
	assert.deepEqual(
		anonymousRawRestEdgeDecision(pathname, undefined),
		{ status: 404, body: { error: "notFound" } },
		`edge decision must 404 anonymous ${pathname}`,
	);
	assert.equal(
		anonymousRawRestEdgeDecision(pathname, fakeSession),
		null,
		`edge decision must pass ${pathname} with a session token`,
	);
}
assert.equal(
	anonymousRawRestEdgeDecision("/api/users/login", undefined),
	null,
	"edge decision must not block Payload login",
);
requireIncludes(
	"src/proxy.ts",
	"anonymousRawRestEdgeDecision",
	"proxy.ts must apply the anonymous REST edge decision",
);

assert.equal(
	read("src/core/cache/http-revalidate.ts").includes("next/cache"),
	false,
	"HTTP cache adapter must not import next/cache",
);
assert.ok(
	/import\(["']next\/cache["']\)/.test(read("src/core/cache/in-process.ts")),
	"in-process adapter must lazy-import next/cache",
);
assert.equal(
	/from\s+["']next\/cache["']/.test(read("src/core/cache/in-process.ts")),
	false,
	"in-process adapter must not top-level import next/cache",
);

console.log("verify-security-boundaries: ok");
