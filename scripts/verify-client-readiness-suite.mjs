import { execFileSync } from "node:child_process";

function node(args) {
	execFileSync(process.execPath, args, { stdio: "inherit" });
}

node(["scripts/verify-timeweb-blueprint.mjs"]);
node([
	"--experimental-strip-types",
	"scripts/verify-client-readiness.mjs",
	...process.argv.slice(2),
]);
node(["scripts/starter-drift.mjs", "--mode=warn"]);
