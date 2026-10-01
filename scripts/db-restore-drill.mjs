import { resolve } from "node:path";
import { runRestoreDrill } from "./db-restore-contract.mjs";

function argumentsFrom(argv) {
	return Object.fromEntries(
		argv.map((argument) => {
			if (!argument.startsWith("--") || !argument.includes("=")) {
				throw new Error(`Unsupported argument: ${argument}`);
			}
			const [key, ...value] = argument.slice(2).split("=");
			return [key, value.join("=")];
		}),
	);
}

const input = argumentsFrom(process.argv.slice(2));
const required = [
	"dump-file",
	"dump-sha256",
	"expected-host",
	"expected-database",
	"ca-file",
	"smoke-sql",
	"smoke-expected",
];
for (const key of required) if (!input[key]) throw new Error(`Missing --${key}.`);
if (!process.env.DATABASE_URI) {
	throw new Error("DATABASE_URI must be materialized process-locally from Secret Master.");
}

const result = runRestoreDrill({
	dumpFile: resolve(input["dump-file"]),
	dumpSha256: input["dump-sha256"],
	targetUri: process.env.DATABASE_URI,
	expectedHost: input["expected-host"],
	expectedDatabase: input["expected-database"],
	caFile: resolve(input["ca-file"]),
	smokeSql: input["smoke-sql"],
	smokeExpected: input["smoke-expected"],
});

console.log(`db-restore-drill: PASS (${result.database}; restored smoke PASS; temporary database removed)`);
