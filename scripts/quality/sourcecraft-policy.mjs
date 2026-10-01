import { readFileSync } from "node:fs";

const config = readFileSync(".sourcecraft/ci.yaml", "utf8");
const riskyAdapter = readFileSync("scripts/verify-merge-risky.mjs", "utf8");
const riskyEntrypoint = readFileSync(
	"scripts/ci/sourcecraft-merge-risky.sh",
	"utf8",
);
const riskScopes = [
	"schema-data",
	"auth-pii-leads",
	"ingest-jobs",
	"dependency-runtime",
	"ci-governance",
];
const required = [
	"merge-standard:",
	"merge-risky:",
	"expected_commit_sha",
	"risk_scope",
	"RISK_SCOPE",
	"assert-exact-head.mjs",
	"pnpm verify:merge-standard",
	"sourcecraft-merge-risky.sh",
	"DATABASE_URI_TEST",
];
const forbidden = [/^\s*pull_request\s*:/m, /^\s*schedule\s*:/m];
const neverTriggerSentinel =
	/on:\s*\r?\n\s*push:\s*\r?\n\s*-\s*workflows:\s*\[merge-standard,\s*merge-risky\]\s*\r?\n\s*filter:\s*\r?\n\s*paths:\s*\[\]/m;
const missing = required.filter((value) => !config.includes(value));
const automatic = forbidden.filter((pattern) => pattern.test(config));
const pushKeys = config.match(/^\s*push\s*:/gm) ?? [];
const missingScopes = riskScopes.filter(
	(scope) => !config.includes(scope) || !riskyAdapter.includes(`"${scope}"`),
);
const migrationPosition = riskyEntrypoint.indexOf("pnpm payload:migrate");
const migrationDatabaseBinding = riskyEntrypoint.includes(
	'DATABASE_URI="$DATABASE_URI_TEST" AMS_SKIP_LOCAL_ENV=true pnpm payload:migrate',
);
const riskyVerificationPosition = riskyEntrypoint.indexOf(
	"pnpm verify:merge-risky",
);
const targetedContract =
	riskyAdapter.includes('["verify:merge-standard", ...selected.commands]') &&
	!riskyAdapter.includes('["verify"]') &&
	riskyEntrypoint.includes('if [[ "$requires_database" == "true" ]]') &&
	migrationPosition >= 0 &&
	migrationDatabaseBinding &&
	riskyVerificationPosition > migrationPosition;

if (
	missing.length ||
	missingScopes.length ||
	automatic.length ||
	pushKeys.length !== 1 ||
	!neverTriggerSentinel.test(config) ||
	!targetedContract
) {
	console.error(
		`SourceCraft policy FAIL; missing=${missing.join(",") || "none"}; missingScopes=${missingScopes.join(",") || "none"}; automatic=${automatic.length}; pushKeys=${pushKeys.length}; sentinel=${neverTriggerSentinel.test(config)}; targeted=${targetedContract}`,
	);
	process.exit(1);
}
console.log(
	"SourceCraft policy: PASS (explicit zero-trigger, manual exact-head only)",
);
