import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const manifest = JSON.parse(
	readFileSync("config/final-verification-manifest.json", "utf8"),
);
const scripts = packageJson.scripts;
const finalCommands = new Set(manifest.suites.map((suite) => suite.command));

const checklist = [
	[
		"anonymous raw REST deny",
		"verify:security-boundaries",
		"verify-security-boundaries.mjs",
	],
	[
		"overrideAccess guards",
		"verify:security-boundaries",
		"verify-security-boundaries.mjs",
	],
	["secrets scan", "verify:security-boundaries", "verify-secrets-guard.mjs"],
	["safe outbound", "verify:security-boundaries", "verify-safe-outbound.mjs"],
	["PII logs/analytics", "verify:lead-analytics", "verify-lead-analytics.ts"],
	["lead outbox", "verify:lead-outbox", "verify-lead-outbox.mjs"],
	["jobs owner", "verify:jobs-config", "verify-jobs-config.mjs"],
	[
		"production schema push deny",
		"verify:production-topology",
		"verify-production-topology.mjs",
	],
	[
		"image host allowlist",
		"verify:security-boundaries",
		"verify-safe-outbound.mjs",
	],
];

for (const [requirement, command, ownerScript] of checklist) {
	assert.ok(
		finalCommands.has(command),
		`${requirement}: ${command} is absent from final manifest`,
	);
	assert.ok(
		scripts[command]?.includes(ownerScript),
		`${requirement}: ${command} does not invoke ${ownerScript}`,
	);
}

console.log(
	`security regression contract PASS: ${checklist.length} requirements have exact final-command owners.`,
);
