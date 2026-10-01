import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixture = mkdtempSync(join(tmpdir(), "starter-drift-"));
const script = join(process.cwd(), "scripts/starter-drift.mjs");
try {
	mkdirSync(join(fixture, "src/core"), { recursive: true });
	const content = Buffer.from("baseline\n");
	writeFileSync(join(fixture, "src/core/example.txt"), content);
	writeFileSync(join(fixture, ".starter-version"), JSON.stringify({
		schemaVersion: 1,
		tag: "starter-v2.1.0",
		sha: "1".repeat(40),
		manifestVersion: 1,
		hashes: { "src/core/example.txt": createHash("sha256").update(content).digest("hex") },
	}));
	const run = (mode) => execFileSync(process.execPath, [script, `--mode=${mode}`], { cwd: fixture, encoding: "utf8" });
	assert.match(run("fail"), /PASS/);
	writeFileSync(join(fixture, "src/core/example.txt"), "drift\n");
	assert.match(run("warn"), /DRIFT/);
	assert.throws(() => run("fail"));
	assert.match(run("report"), /DRIFT/);
	assert.ok(existsSync(join(fixture, ".starter-drift.json")));
} finally {
	rmSync(fixture, { recursive: true, force: true });
}
console.log("starter drift modes: PASS (warn, fail, report)");
