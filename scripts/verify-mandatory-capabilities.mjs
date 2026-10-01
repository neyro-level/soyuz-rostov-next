import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const manifest = JSON.parse(
	readFileSync("config/final-verification-manifest.json", "utf8"),
);

const expectedOwners = {
	"global-indexing": "verify:seo-contracts",
	"metadata-adapter": "verify:seo-contracts",
	"sitemap-failure": "verify:discovery-feeds",
	"https-origin": "verify:seo-contracts",
	"tracking-query": "verify:tracking-query-params",
	"robots-clean-param": "verify:seo-contracts",
	"filtered-query-load": "verify:filtered-catalog-cache",
	"legacy-canonical-targets": "verify:runtime-seo-templates",
	"seo-template-matrix": "verify:runtime-seo-templates",
	"development-gate-passport": "verify:content-gate",
	"ownership-v2": "verify:starter-ownership",
	"starter-upgrade-e2e": "verify:starter-upgrade-propagation",
	"design-source-of-truth": "verify:ui-core:final",
	"active-doc-state": "verify:version-comments",
	"souz-source-integrity": "verify:souz-parity",
	"synthetic-geo-matrix": "verify:template-geo-matrix",
};

function capabilityOwners(suites) {
	const owners = new Map();
	for (const suite of suites) {
		for (const capability of suite.capabilities) {
			assert.ok(
				!owners.has(capability),
				`duplicate capability owner: ${capability}`,
			);
			owners.set(capability, suite.command);
		}
	}
	return owners;
}

const owners = capabilityOwners(manifest.suites);
for (const [capability, command] of Object.entries(expectedOwners)) {
	assert.equal(owners.get(capability), command, `${capability} owner drifted`);
}

assert.throws(
	() =>
		capabilityOwners([
			{ command: "a", capabilities: ["duplicate"] },
			{ command: "b", capabilities: ["duplicate"] },
		]),
	/duplicate capability owner/,
);
assert.equal(owners.has("missing-fixture"), false);

console.log(
	`verify:mandatory-capabilities PASS (${Object.keys(expectedOwners).length} exact owners + duplicate/missing negative fixtures)`,
);
