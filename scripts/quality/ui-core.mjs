import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { basename, dirname, join, relative, resolve } from "node:path";
import {
	collectDesignFindings,
	fingerprint,
	scanDesignLiterals,
	walk,
} from "./ui-core-lib.mjs";

const root = resolve(import.meta.dirname, "../..");
const readJson = (path) => JSON.parse(readFileSync(path, "utf8"));
const failures = [];
const rules = readJson(join(import.meta.dirname, "ui-core.rules.json"));
const baseline = readJson(join(import.meta.dirname, "ui-core-baseline.json"));
const clonePolicy = readJson(join(import.meta.dirname, "ui-clone-policy.json"));

assert.equal(rules.schema_version, 1);
assert.equal(baseline.schema_version, 1);
assert.equal(
	new Set(rules.rules.map((rule) => rule.id)).size,
	rules.rules.length,
);
for (const rule of rules.rules) {
	assert.match(
		rule.classification,
		/^(MECHANICAL|TARGETED|VISUAL|MANUAL|N\/A)$/,
	);
	assert.ok(rule.proof);
}

const fixture = [
	'<div className="rounded-[18px] text-[13px] font-[550] duration-[175ms]" />',
	'<div className="rounded-[15px] bg-[#fff]" />',
].join("\n");
const fixtureFindings = scanDesignLiterals(fixture);
for (const value of [
	"rounded-[18px]",
	"rounded-[15px]",
	"text-[13px]",
	"font-[550]",
	"duration-[175ms]",
	"bg-[#fff]",
]) {
	assert.ok(
		fixtureFindings.some((finding) => finding.value === value),
		`fixture not detected: ${value}`,
	);
}
assert.deepEqual(
	scanDesignLiterals(
		'<div className="w-[42px] grid-cols-[1fr_auto] aspect-[4/3] rounded-[var(--radius)] text-[var(--text)]" />',
	),
	[],
	"structural geometry and CSS variables must not be design-literal violations",
);

const designFindings = collectDesignFindings(root);
const current = new Map(
	designFindings.map((finding) => [fingerprint(finding), finding]),
);
const accepted = new Set(baseline.findings);
const acceptedDesign = new Set(
	baseline.findings.filter((key) => key.startsWith("design-literals|")),
);
for (const key of current.keys()) {
	if (!accepted.has(key)) failures.push(`new UI design literal: ${key}`);
}
for (const key of acceptedDesign) {
	if (!current.has(key)) failures.push(`stale UI baseline entry: ${key}`);
}

const componentsPath = join(root, "packages", "ui", "components.json");
const components = readJson(componentsPath);
const expectedAliases = {
	components: "@ams/realtbase-ui/components",
	utils: "@ams/realtbase-ui/lib/utils",
	ui: "@ams/realtbase-ui/components/ui",
	lib: "@ams/realtbase-ui/lib",
};
for (const [key, value] of Object.entries(expectedAliases)) {
	if (components.aliases?.[key] !== value)
		failures.push(`components.json alias ${key} must equal ${value}`);
}

const uiPackage = readJson(join(root, "packages", "ui", "package.json"));
assert.deepEqual(
	Object.keys(uiPackage.exports).sort(),
	[".", "./primitives", "./styles.css", "./views"].sort(),
	"UI package exports must stay intentional and closed",
);
const plainUsageCount = walk(join(root, "packages", "ui", "src"))
	.filter((path) => /\.tsx$/.test(path))
	.reduce((count, path) => count + (readFileSync(path, "utf8").match(/variant=["']plain["']/g)?.length ?? 0), 0);
if (plainUsageCount > clonePolicy.plain_usage_limit) {
	failures.push(`plain primitive usage ${plainUsageCount} exceeds policy limit ${clonePolicy.plain_usage_limit}`);
}

const primitiveRoot = join(root, "packages", "ui", "src", "components", "ui");
const primitiveNames = new Set(
	walk(primitiveRoot).map((path) => basename(path)),
);
for (const path of walk(join(root, "packages", "ui", "src"))) {
	if (dirname(path) === primitiveRoot || !primitiveNames.has(basename(path)))
		continue;
	failures.push(
		`duplicate primitive owner: ${relative(root, path).replaceAll("\\", "/")}`,
	);
}

const layout = readFileSync(join(root, "src", "app", "layout.tsx"), "utf8");
const fontConfig = readFileSync(
	join(root, "src", "project", "font.generated.ts"),
	"utf8",
);
const globals = readFileSync(join(root, "src", "app", "globals.css"), "utf8");
const fontToken = globals.match(/--font-sans:\s*([^;]+);/)?.[1]?.trim();
const usesNextFont = /from\s+["']next\/font\//.test(fontConfig);
if (!fontToken) failures.push("font mapping: --font-sans is missing");
if (!usesNextFont || !layout.includes('from "@/project/font.generated"'))
	failures.push("font mapping: generated next/font owner is not wired into layout");
if (!fontConfig.includes('variable: "--font-project"'))
	failures.push("font mapping: generated font must own --font-project");

const clientFiles = walk(join(root, "packages", "ui", "src"))
	.filter((path) => /^\s*["']use client["'];/m.test(readFileSync(path, "utf8")))
	.map((path) => relative(root, path).replaceAll("\\", "/"))
	.sort();

const report = {
	schema_version: 1,
	status: failures.length ? "FAIL" : "PASS",
	rules: rules.rules,
	counts: {
		design_findings: designFindings.length,
		baselined_findings: baseline.findings.length,
		client_boundaries: clientFiles.length,
	},
	client_boundaries: clientFiles,
};
assert.deepEqual(
	Object.keys(report).sort(),
	["client_boundaries", "counts", "rules", "schema_version", "status"].sort(),
);

if (failures.length) {
	console.error(failures.join("\n"));
	process.exit(1);
}

console.log(JSON.stringify(report, null, 2));
console.log("verify:ui-core: ok");
