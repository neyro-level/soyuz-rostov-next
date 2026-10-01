import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
	return readFileSync(path, "utf8");
}

const packageJson = JSON.parse(read("package.json"));
const scripts = packageJson.scripts ?? {};
const isClientClone = /projectKind:\s*["']client["']/.test(
	read("src/project/site.config.ts"),
);

for (const requiredScript of [
	"verify:schema",
	"verify:public-gateway",
	"verify:feed-parser",
	"verify:feed-ingest",
	"verify:feed-lifecycle",
	"verify:manual-ownership",
	"verify:lead-intake",
	"verify:lead-outbox",
	"verify:lead-delivery-state",
	"verify:seo-contracts",
	"verify:operational-recovery",
	"verify:security-boundaries",
]) {
	assert.equal(
		typeof scripts[requiredScript],
		"string",
		`package.json missing product regression script: ${requiredScript}`,
	);
}
if (!isClientClone) {
	assert.equal(
		typeof scripts["visual:atlas-css-parity"],
		"string",
		"starter package must retain Atlas parity proof command",
	);
}

const requiredVerifyCommands = [
	"verify:public-gateway",
	"verify:feed-parser",
	"verify:feed-ingest",
	"verify:feed-lifecycle",
	"verify:manual-ownership",
	"verify:lead-intake",
	"verify:lead-outbox",
	"verify:lead-delivery-state",
	"verify:seo-contracts",
	"verify:operational-recovery",
	"verify:security-boundaries",
];
const manifestBackedVerify =
	scripts.verify === "node scripts/verify-final-manifest.mjs";
const finalCommands = manifestBackedVerify
	? new Set(
			JSON.parse(read("config/final-verification-manifest.json")).suites.map(
				(suite) => suite.command,
			),
		)
	: null;

for (const includedInVerify of requiredVerifyCommands) {
	assert.ok(
		manifestBackedVerify
			? finalCommands.has(includedInVerify)
			: scripts.verify.includes(includedInVerify),
		`pnpm verify must include ${includedInVerify}`,
	);
}

const schemaVerification = read("scripts/verify-schema.mjs");
for (const requiredSchemaProof of [
	"properties_feed_identity_unique_idx",
	"properties_feed_active_seen_idx",
	"lead_deliveries_lead_channel_unique_idx",
	"lead_deliveries_recovery_due_idx",
	"lead_deliveries_stale_sending_idx",
	"feed_sources_enabled_due_idx",
	"properties_public_catalog_idx",
	"properties_public_sitemap_idx",
	"feed_sources_prevent_delete_with_links",
	"Expected feed identity unique constraint",
	"Expected lead delivery unique constraint",
]) {
	assert.ok(
		schemaVerification.includes(requiredSchemaProof),
		`verify:schema missing proof for ${requiredSchemaProof}`,
	);
}
if (!isClientClone) {
	const atlasParity = JSON.parse(read("docs/research/atlas-css-parity.json"));
	assert.equal(
		atlasParity.result,
		"PASS",
		"Atlas CSS parity evidence must be PASS",
	);
	assert.equal(
		atlasParity.comparisonCount,
		24,
		"Atlas CSS parity must cover 6 scenarios × 4 viewports",
	);
	assert.equal(
		atlasParity.comparisons.every((item) => item.identical),
		true,
		"Atlas CSS parity comparisons must be pixel-identical",
	);

	const atlasBaseline = read("docs/research/ATLAS_BASELINE.md");
	for (const required of [
		"24 / 24",
		"mobile",
		"tablet",
		"desktop",
		"wide desktop",
		"semantic API, responsive/a11y",
	]) {
		assert.ok(
			atlasBaseline.includes(required),
			`Atlas baseline missing ${required}`,
		);
	}
}

const contractFeasibility = read("docs/CONTRACT_FEASIBILITY.md");
assert.ok(
	contractFeasibility.includes("Статус: `VERIFIED`"),
	"contract feasibility must be verified",
);
assert.ok(
	contractFeasibility.includes("DTO принадлежат"),
	"contract feasibility must pin DTO ownership",
);

const releaseChecklist = read("docs/05_RELEASE_CHECKLIST.md");
assert.ok(
	releaseChecklist.includes(
		"Checklist PASS for a given SHA requires immutable image + live smoke",
	),
	"production-only Definition of Success items must remain explicit SHA blockers",
);
assert.ok(
	releaseChecklist.includes("production secrets берутся из Secret Master"),
	"release checklist must keep Secret Master as production secrets source",
);

console.log("verify-product-regression: ok");
