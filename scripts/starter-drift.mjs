import { createHash } from "node:crypto";
import { existsSync, lstatSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { validateStarterVersion } from "./starter-ownership.mjs";

const root = process.cwd();
const modeArg = process.argv.find((value) => value.startsWith("--mode="));
const mode = modeArg?.slice(7) || "warn";
if (!new Set(["warn", "fail", "report"]).has(mode)) throw new Error("starter drift mode must be warn, fail or report.");
const versionPath = join(root, ".starter-version");
if (!existsSync(versionPath)) {
	console.log("starter drift: NOT_APPLICABLE (.starter-version absent)");
	process.exit(0);
}
const version = validateStarterVersion(JSON.parse(readFileSync(versionPath, "utf8")));
const drift = [];
for (const [path, expected] of Object.entries(version.hashes)) {
	const target = resolve(root, path);
	if (!existsSync(target) || !lstatSync(target).isFile()) drift.push({ path, status: "missing" });
	else if (createHash("sha256").update(readFileSync(target)).digest("hex") !== expected) drift.push({ path, status: "modified" });
}
const result = { schemaVersion: 1, tag: version.tag, sha: version.sha, status: drift.length ? "DRIFT" : "PASS", drift };
if (mode === "report") writeFileSync(join(root, ".starter-drift.json"), `${JSON.stringify(result, null, "\t")}\n`);
console.log(`starter drift: ${result.status} (${drift.length} files)`);
if (drift.length && mode === "fail") process.exitCode = 1;
