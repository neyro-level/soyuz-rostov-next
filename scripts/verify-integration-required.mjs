import { execFileSync } from "node:child_process";

import {
	assertLocalTestDatabaseUri,
	loadLocalEnv,
} from "./integration/env.mjs";

if (process.env.AMS_SKIP_LOCAL_ENV !== "true") loadLocalEnv();

const testUri = process.env.DATABASE_URI_TEST;
if (!testUri) {
	throw new Error(
		"verify:integration:required requires an explicit DATABASE_URI_TEST; DATABASE_URI fallback is forbidden.",
	);
}

assertLocalTestDatabaseUri(testUri);

execFileSync(
	"node",
	["--experimental-strip-types", "scripts/verify-integration-suites.mjs"],
	{
		stdio: "inherit",
		shell: process.platform === "win32",
		env: {
			...process.env,
			DATABASE_URI_TEST: testUri,
			DATABASE_URI: testUri,
		},
	},
);

console.log("verify:integration:required: ok (isolated loopback PostgreSQL)");
