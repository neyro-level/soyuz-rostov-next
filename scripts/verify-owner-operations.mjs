import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { FeedSources } from "../src/project/collections/FeedSources.ts";
import { ImportIssues } from "../src/project/collections/ImportIssues.ts";
import { ImportRuns } from "../src/project/collections/ImportRuns.ts";
import { LeadDeliveries } from "../src/project/collections/LeadDeliveries.ts";
import { Leads } from "../src/project/collections/Leads.ts";

const root = process.cwd();

const operationalCollections = [
	FeedSources,
	ImportRuns,
	ImportIssues,
	Leads,
	LeadDeliveries,
];

function assertRoleProtected(collection) {
	for (const operation of ["create", "read", "update", "delete"]) {
		assert.equal(
			typeof collection.access?.[operation],
			"function",
			`${collection.slug}.${operation} must be role protected`,
		);
	}
}

function findField(fields, name) {
	for (const field of fields) {
		if (field.name === name) return field;
		const nested =
			"fields" in field ? findField(field.fields ?? [], name) : null;
		if (nested) return nested;
	}
	return null;
}

for (const collection of operationalCollections) {
	assert.equal(
		collection.admin?.group,
		"Operations",
		`${collection.slug} must be grouped under Payload Admin Operations`,
	);
	assert.ok(
		collection.admin?.description,
		`${collection.slug} must describe the owner operation safely`,
	);
	assertRoleProtected(collection);
}

assert.deepEqual(FeedSources.admin?.defaultColumns, [
	"code",
	"title",
	"market",
	"enabled",
	"nextDueAt",
]);
assert.ok(
	findField(
		FeedSources.fields,
		"deactivationApproval",
	)?.admin?.description?.includes("Audit-safe approval"),
	"feed-sources must expose suspicious-run approval guidance",
);

assert.ok(
	ImportRuns.admin?.defaultColumns?.includes("warningCount"),
	"import-runs must expose warning count",
);
assert.ok(
	ImportRuns.admin?.defaultColumns?.includes("errorCount"),
	"import-runs must expose error count",
);
assert.ok(
	findField(
		ImportRuns.fields,
		"lastErrorRedacted",
	)?.admin?.description?.includes("Redacted"),
	"import-runs diagnostics must be explicitly redacted",
);

assert.ok(
	findField(
		ImportIssues.fields,
		"messageRedacted",
	)?.admin?.description?.includes("No raw XML"),
	"import issue diagnostics must reject raw payloads",
);

assert.ok(
	LeadDeliveries.admin?.defaultColumns?.includes("lastErrorKind"),
	"lead-deliveries must expose delivery error kind",
);
assert.ok(
	findField(
		LeadDeliveries.fields,
		"nextAttemptAt",
	)?.admin?.description?.includes("Manual retry"),
	"lead-deliveries must expose manual retry guidance",
);

assert.ok(
	Leads.admin?.description?.includes(
		"External delivery state lives in Lead Deliveries",
	),
	"leads must keep agency workflow separate from delivery state",
);

const roleRequest = (role) => ({
	req: {
		user: role
			? { id: `verify-${role}`, collection: "users", roles: [role] }
			: null,
	},
});
for (const role of [null, "editor", "admin"]) {
	assert.equal(await Leads.access.read(roleRequest(role)), false);
	assert.equal(await Leads.access.update(roleRequest(role)), false);
	assert.equal(await LeadDeliveries.access.read(roleRequest(role)), false);
}
assert.equal(await Leads.access.read(roleRequest("owner")), true);
assert.equal(await Leads.access.update(roleRequest("owner")), true);
assert.equal(await LeadDeliveries.access.read(roleRequest("owner")), true);
assert.equal(await Leads.access.create(roleRequest("owner")), false);
assert.equal(await LeadDeliveries.access.create(roleRequest("owner")), false);
assert.equal(await LeadDeliveries.access.update(roleRequest("owner")), false);

for (const fieldName of [
	"name",
	"phoneRaw",
	"phoneE164",
	"email",
	"message",
	"fraudFingerprint",
]) {
	const field = findField(Leads.fields, fieldName);
	assert.equal(await field?.access?.read?.(roleRequest("admin")), false);
	assert.equal(await field?.access?.read?.(roleRequest("owner")), true);
}

const retryEndpoint = LeadDeliveries.endpoints?.find(
	(endpoint) => endpoint.path === "/:id/retry",
);
assert.ok(retryEndpoint, "lead-deliveries must expose controlled retry");
for (const role of [null, "editor", "admin"]) {
	const response = await retryEndpoint.handler({
		...roleRequest(role).req,
		routeParams: { id: "verify-denied" },
	});
	assert.equal(response.status, 403, `${role ?? "anonymous"} retry must deny`);
}

assert.equal(
	existsSync(join(root, "src", "app", "owner-operations")),
	false,
	"owner operations must not create a second Admin framework",
);

assert.ok(
	Array.isArray(FeedSources.endpoints) && FeedSources.endpoints.length >= 2,
	"feed-sources must expose controlled owner endpoints",
);
assert.ok(
	FeedSources.endpoints?.some((endpoint) =>
		endpoint.path.includes("manual-import"),
	),
	"feed-sources must expose manual import",
);
assert.ok(
	FeedSources.endpoints?.some((endpoint) =>
		endpoint.path.includes("approve-deactivation"),
	),
	"feed-sources must expose suspicious-run approval",
);

assert.equal(typeof ImportRuns.access?.create, "function");
assert.equal(typeof ImportRuns.access?.update, "function");
assert.equal(await ImportRuns.access.create({ req: {} }), false);
assert.equal(await ImportRuns.access.update({ req: {} }), false);

assert.ok(
	existsSync(
		join(root, "src", "core", "data-access", "system", "jobs", "unstuck.ts"),
	),
	"payload-jobs unstuck must live in system/jobs",
);
assert.ok(
	existsSync(
		join(root, "src", "core", "data-access", "system", "jobs", "inspect.ts"),
	),
	"payload-jobs inspect must live in system/jobs",
);

const payloadConfig = readFileSync(join(root, "payload.config.ts"), "utf8");
assert.equal(payloadConfig.includes('slug: "payload-jobs"'), false);
assert.equal(payloadConfig.includes("jobsCollectionOverrides"), false);

const propertiesSource = readFileSync(
	join(root, "src", "project", "collections", "Properties.ts"),
	"utf8",
);
assert.equal(
	propertiesSource.includes("systemOverrideAccess"),
	false,
	"return-to-feed must use request access, not systemOverrideAccess",
);
assert.ok(
	propertiesSource.includes("overrideAccess: false"),
	"return-to-feed must pin request access",
);

const ownerFeed = readFileSync(
	join(root, "src", "project", "ingest", "owner-feed-operations.ts"),
	"utf8",
);
assert.equal(
	ownerFeed.includes("systemOverrideAccess"),
	false,
	"owner feed operations must not call systemOverrideAccess",
);

const projectDoc = readFileSync(join(root, "docs", "PROJECT.md"), "utf8");
assert.ok(
	projectDoc.includes("DATABASE") && projectDoc.includes("DATABASE_URI"),
	"PROJECT.md must map canonical DATABASE to DATABASE_URI",
);
assert.ok(
	projectDoc.includes("NEXT_PUBLIC_SERVER_URL") &&
		projectDoc.includes("MEDIA_DIR") &&
		projectDoc.includes("LEAD_CHANNELS"),
	"PROJECT.md must map public origin, media, and lead channels",
);
assert.ok(
	projectDoc.includes("no CRM / telegram keys"),
	"PROJECT.md mapping must exclude CRM/telegram keys",
);

const envSource = readFileSync(join(root, "src", "project", "env.ts"), "utf8");
assert.ok(
	/NEXT_PUBLIC_SERVER_URL:\s*optionalString/.test(envSource),
	"NEXT_PUBLIC_SERVER_URL must not use optionalUrl at Zod parse",
);

const runtimeEnvSource = envSource;
assert.ok(
	runtimeEnvSource.includes('addInvalid(missing, "LEAD_CHANNELS")'),
	"unknown LEAD_CHANNELS must fail-fast at runtime",
);

console.log("verify-owner-operations: ok");
