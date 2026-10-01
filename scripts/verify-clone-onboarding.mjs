import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const onboarding = readFileSync(join(root, "docs/CLONE_ONBOARDING.md"), "utf8");
const upstream = readFileSync(join(root, "docs/UPSTREAM_CANDIDATES.md"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const scripts = new Set(Object.keys(packageJson.scripts ?? {}));

const orderedMarkers = [
	"### 1. Intake",
	"### 2. Prepare",
	"### 3. Activate storage",
	"### 4. Seed geography and NAP",
	"### 5. Import demand",
	"### 6. Approve",
	"### 7. Verify and deployment handoff",
];
let previous = -1;
for (const marker of orderedMarkers) {
	const position = onboarding.indexOf(marker);
	assert.ok(position > previous, `Onboarding marker is missing or out of order: ${marker}`);
	previous = position;
}

for (const marker of ["Input:", "Output:", "STOP:", "Выпускаем production", "human gate"]) {
	assert.ok(onboarding.includes(marker), `Onboarding contract marker is missing: ${marker}`);
}
for (const marker of [
	"никогда автоматически не синхронизируется обратно",
	"отдельный starter workstream",
	"neutral fixture",
	"SourceCraft PR",
	"reverse/bidirectional",
]) {
	assert.ok(upstream.includes(marker), `Upstream contribution marker is missing: ${marker}`);
}

const commands = [...onboarding.matchAll(/`pnpm\s+([a-z0-9:.-]+)/gi)].map((match) => match[1]);
assert.ok(commands.length >= 12, "Onboarding command audit found too few commands.");
for (const command of commands) {
	if (command === "install") continue;
	assert.ok(scripts.has(command), `Documented pnpm command does not exist: ${command}`);
}

for (const relativePath of [
	"docs/CLONE_INTAKE.schema.json",
	"docs/CLONE_INTAKE.souz.json",
	"deploy/clients/timeweb/backup/README.md",
	"scripts/verify-clone-init.mjs",
	"scripts/verify-clone-prepare.mjs",
	"scripts/verify-db-restore-drill.mjs",
]) {
	assert.ok(existsSync(join(root, relativePath)), `Onboarding link/dry-run path is missing: ${relativePath}`);
}

assert.doesNotMatch(onboarding, /automatic(?:ally)?\s+(?:deploy|production|reverse sync)/i);
assert.doesNotMatch(upstream, /client.+git push.+starter/i);
console.log("verify:clone-onboarding: PASS (ordered checklist + commands + links + one-way upstream guard)");
