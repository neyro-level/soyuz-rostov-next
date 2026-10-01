import { readFileSync } from "node:fs";

const catalogSource = readFileSync(
	"src/project/data-access/public/catalog.ts",
	"utf8",
);
const gatewaySource = readFileSync(
	"src/project/data-access/public/index.ts",
	"utf8",
);
const geoCatalogSource = readFileSync(
	"src/project/data-access/public/geo-catalog.ts",
	"utf8",
);
const policySource = readFileSync(
	"src/project/data-access/public/policy.ts",
	"utf8",
);
const accessSource = readFileSync(
	"src/project/data-access/public/access-mode.ts",
	"utf8",
);
const propertiesSource = readFileSync(
	"src/project/collections/Properties.ts",
	"utf8",
);
const pagesSource = readFileSync("src/project/collections/Pages.ts", "utf8");
const redirectsSource = readFileSync(
	"src/project/collections/Redirects.ts",
	"utf8",
);
const rawRestBoundary = JSON.parse(
	readFileSync("config/raw-rest-boundary.json", "utf8"),
);

const forbiddenPublicFields = [
	"feedSource",
	"externalId",
	"importHash",
	"lastImportRun",
	"deactivatedByRun",
	"manualOverrides",
	"unitNumber",
	"cadastralNumber",
	"internalComment",
	"ownerContact",
];

const selectMatch = catalogSource.match(
	/const publicPropertySelect = \{(?<select>[\s\S]*?)\} satisfies PropertiesSelect/u,
);

if (!selectMatch?.groups?.select) {
	throw new Error("publicPropertySelect allowlist not found");
}

for (const field of forbiddenPublicFields) {
	if (selectMatch.groups.select.includes(`${field}:`)) {
		throw new Error(
			`Forbidden private/internal field in public select: ${field}`,
		);
	}
}

const requiredPolicySnippets = [
	"publicGatewayReadAccess",
	"depth: 0",
	"maxLimit: 48",
	'output: "dto"',
];

for (const snippet of requiredPolicySnippets) {
	if (!policySource.includes(snippet)) {
		throw new Error(`Public Gateway policy missing: ${snippet}`);
	}
}

if (
	!accessSource.includes('publicGatewayOperation = "public-read"') ||
	!accessSource.includes("publicGatewayOperation }")
) {
	throw new Error(
		"Public Gateway must declare explicit public-read access mode",
	);
}

if (
	!accessSource.includes(
		'propertyLifecycleOperation = "property-lifecycle-read"',
	) ||
	!accessSource.includes("propertyLifecycleReadAccess") ||
	!accessSource.includes("isPropertyLifecycleRead") ||
	!accessSource.includes("{ publishedAt: { exists: true } }")
) {
	throw new Error(
		"Published purged properties need a classified lifecycle-only read for 410 resolution",
	);
}

if (
	!readFileSync(
		"src/project/data-access/public/payload-reads.ts",
		"utf8",
	).includes("...propertyLifecycleReadAccess()")
) {
	throw new Error(
		"Property lifecycle lookup must use its narrow classified read mode",
	);
}

if (
	!accessSource.includes("overrideAccess:") ||
	!accessSource.includes("false")
) {
	throw new Error(
		"Public Gateway Local API must enforce collection access with overrideAccess:false",
	);
}

if (
	!accessSource.includes("user: null") ||
	!accessSource.includes("context: { publicGatewayOperation }")
) {
	throw new Error(
		"Public Gateway reads must be anonymous and carry the classified public-read context",
	);
}

for (const [file, source, accessName] of [
	["Properties", propertiesSource, "publicPropertyReadAccess"],
	["Pages", pagesSource, "publicPageReadAccess"],
	["Redirects", redirectsSource, "publicRedirectReadAccess"],
]) {
	if (!source.includes(`read: ${accessName}`)) {
		throw new Error(
			`${file} must authorize only its context-aware Public Gateway read access`,
		);
	}
}

if (!gatewaySource.includes("export { publicGatewayPolicy }")) {
	throw new Error("Public Gateway policy is not exported from index");
}

if (
	!gatewaySource.includes("publicGatewayReadAccess") ||
	!gatewaySource.includes('from "./access-mode"')
) {
	throw new Error(
		"publicGatewayReadAccess must be exported from Public Gateway",
	);
}

for (const method of [
	"getGeoBySlug",
	"getGeoHub",
	"getListing",
	"getPropertyByPublicUrlId",
	"getDevelopment",
	"listDevelopments",
	"getDeveloper",
	"listGeoDevelopers",
	"getNearby",
	"countInventory",
]) {
	if (!geoCatalogSource.includes(`export async function ${method}`)) {
		throw new Error(`Public geo/catalog Gateway method missing: ${method}`);
	}
	if (!gatewaySource.includes(`\t${method},`)) {
		throw new Error(`Public geo/catalog Gateway export missing: ${method}`);
	}
}

for (const snippet of [
	"overrideAccess: publicGatewayPolicy.overrideAccess",
	"context: publicGatewayPolicy.context",
	"depth: 0",
	"depth: 1",
	"limit: 48",
	"cityRef: { equals:",
	"districtRef: { equals:",
]) {
	if (!geoCatalogSource.includes(snippet) && !catalogSource.includes(snippet)) {
		throw new Error(
			`Bounded geo/catalog Gateway invariant missing: ${snippet}`,
		);
	}
}

for (const field of forbiddenPublicFields) {
	if (geoCatalogSource.includes(`${field}: true`)) {
		throw new Error(
			`Forbidden private/internal field in geo/catalog select: ${field}`,
		);
	}
}

const requiredPredicateSnippets = [
	'status: { equals: "active" }',
	"publishedAt: { exists: true }",
	"contentPurgedAt: { exists: false }",
];

for (const snippet of requiredPredicateSnippets) {
	if (!catalogSource.includes(snippet)) {
		throw new Error(
			`Publication predicate missing from Public Gateway: ${snippet}`,
		);
	}
}

const facetSnippets = [
	"aggregatePublicCatalogFacets",
	'source: "payload-aggregate"',
	"export async function findPublicCatalogFacets",
];

for (const snippet of facetSnippets) {
	if (!catalogSource.includes(snippet)) {
		throw new Error(`Public Gateway facet implementation missing: ${snippet}`);
	}
}

const requiredRawRestDeniedCollections = [
	"pages",
	"properties",
	"feed-sources",
	"import-runs",
	"import-issues",
	"leads",
	"lead-deliveries",
	"media",
	"redirects",
];

for (const collection of requiredRawRestDeniedCollections) {
	if (!rawRestBoundary.anonymousDenyCollections.includes(collection)) {
		throw new Error(`Raw anonymous REST is not denied for ${collection}`);
	}
}

const payloadAdapter = readFileSync(
	"src/project/data-access/public/payload.ts",
	"utf8",
);
if (!payloadAdapter.includes("isPayloadRuntimeConfigured")) {
	throw new Error(
		"Public gateway must skip Payload init when DATABASE_URI is absent",
	);
}
if (!payloadAdapter.includes("getOptionalPublicGatewayPayload")) {
	throw new Error(
		"Public gateway needs optional Payload for ISR build without Postgres",
	);
}

console.log("verify:public-gateway passed");
