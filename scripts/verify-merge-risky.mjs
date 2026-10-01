import { execFileSync } from "node:child_process";

import {
	assertLocalTestDatabaseUri,
	loadLocalEnv,
} from "./integration/env.mjs";

const scopes = {
	"schema-data": {
		requiresDatabase: true,
		commands: ["verify:schema", "verify:integration:required"],
	},
	"auth-pii-leads": {
		requiresDatabase: true,
		commands: [
			"verify:public-gateway",
			"verify:lead-intake",
			"verify:lead-analytics",
			"verify:lead-outbox",
			"verify:lead-delivery-state",
			"verify:max-adapter",
			"verify:custom-webhook-adapter",
			"verify:security-boundaries",
			"verify:integration:required",
		],
	},
	"ingest-jobs": {
		requiresDatabase: true,
		commands: [
			"verify:development-excel:integration",
			"verify:jobs-config",
			"verify:feed-parser",
			"verify:feed-ingest",
			"verify:feed-lifecycle",
			"verify:manual-ownership",
			"verify:health-alerts",
			"verify:operational-recovery",
			"verify:integration:required",
		],
	},
	"dependency-runtime": {
		requiresDatabase: false,
		commands: [
			"verify:dependency-security",
			"verify:product-regression",
			"verify:production-topology",
			"verify:release-artifact",
			"build",
		],
	},
	"ci-governance": {
		requiresDatabase: false,
		commands: ["verify:production-topology", "verify:release-artifact"],
	},
};

const riskScope = process.env.RISK_SCOPE;
const selected = scopes[riskScope];
if (!selected) {
	throw new Error(
		`verify:merge-risky requires RISK_SCOPE=${Object.keys(scopes).join("|")}.`,
	);
}

let testUri;
if (selected.requiresDatabase) {
	if (process.env.AMS_SKIP_LOCAL_ENV !== "true") loadLocalEnv();
	testUri = process.env.DATABASE_URI_TEST;
	if (!testUri) {
		throw new Error(
			`verify:merge-risky scope=${riskScope} requires an explicit DATABASE_URI_TEST.`,
		);
	}
	assertLocalTestDatabaseUri(testUri);
}

const env = {
	...process.env,
	...(selected.requiresDatabase
		? {
				AMS_REQUIRE_INTEGRATION_DB: "true",
				DATABASE_URI_TEST: testUri,
				DATABASE_URI: testUri,
			}
		: {}),
};

for (const command of ["verify:merge-standard", ...selected.commands]) {
	execFileSync("pnpm", [command], {
		stdio: "inherit",
		shell: process.platform === "win32",
		env,
	});
}

console.log(`verify:merge-risky: ok (scope=${riskScope})`);
