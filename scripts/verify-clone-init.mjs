import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import { compileCloneIntake, renderJson } from "./clone-init.mjs";
import { readClonePreset, renderSiteProfileConfig } from "./clone-preset.mjs";

const root = process.cwd();
const intakePath = resolve(root, "docs/CLONE_INTAKE.souz.json");
const referencePath = resolve(root, "docs/CLONE_PRESET.souz.example.json");
const schema = JSON.parse(
	readFileSync(resolve(root, "docs/CLONE_INTAKE.schema.json"), "utf8"),
);
assert.equal(schema.$schema, "https://json-schema.org/draft/2020-12/schema");
assert.equal(schema.additionalProperties, false);

const intake = JSON.parse(readFileSync(intakePath, "utf8"));
const validateSchema = new Ajv2020({ allErrors: true, strict: false }).compile(
	schema,
);
assert.equal(
	validateSchema(intake),
	true,
	JSON.stringify(validateSchema.errors),
);
const schemaNegative = structuredClone(intake);
delete schemaNegative.cities[0].districts[0].adjGenitive;
assert.equal(validateSchema(schemaNegative), false);
assert.ok(
	validateSchema.errors?.some(
		(error) =>
			error.instancePath === "/cities/0/districts/0" &&
			error.params?.missingProperty === "adjGenitive",
	),
	"JSON Schema must reject missing admin morphology at the exact instance path.",
);
const reference = JSON.parse(readFileSync(referencePath, "utf8"));
const first = compileCloneIntake(structuredClone(intake));
const second = compileCloneIntake(structuredClone(intake));
assert.deepEqual(
	first.preset,
	reference,
	"Souz intake must produce the exact reference preset.",
);
assert.equal(renderJson(first.preset), renderJson(second.preset));
assert.deepEqual(first.report, second.report);
assert.deepEqual(
	first.report.appliedDefaults,
	[...first.report.appliedDefaults].sort(),
);

const temporary = mkdtempSync(join(tmpdir(), "ams-clone-init-"));
const output = join(temporary, "client-preset.json");
const report = join(temporary, "default-diff.json");
cpSync(
	resolve(root, "docs/CLONE_SEO_TEMPLATES.example.json"),
	join(temporary, "CLONE_SEO_TEMPLATES.example.json"),
);
execFileSync(
	process.execPath,
	[
		"--experimental-strip-types",
		"scripts/clone-init.mjs",
		`--intake=${intakePath}`,
		`--output=${output}`,
		`--report=${report}`,
	],
	{ cwd: root, stdio: "pipe" },
);
const firstOutput = readFileSync(output, "utf8");
const firstReport = readFileSync(report, "utf8");
execFileSync(
	process.execPath,
	[
		"--experimental-strip-types",
		"scripts/clone-init.mjs",
		`--intake=${intakePath}`,
		`--output=${output}`,
		`--report=${report}`,
	],
	{ cwd: root, stdio: "pipe" },
);
assert.equal(
	readFileSync(output, "utf8"),
	firstOutput,
	"Repeated clone:init output drifted.",
);
assert.equal(
	readFileSync(report, "utf8"),
	firstReport,
	"Repeated default diff drifted.",
);
const validated = readClonePreset(output);
assert.equal(
	renderSiteProfileConfig(validated),
	renderSiteProfileConfig(readClonePreset(referencePath)),
	"Preset to SiteProfile round-trip drifted.",
);

function rejected(mutator, pattern) {
	const value = structuredClone(intake);
	mutator(value);
	assert.throws(() => compileCloneIntake(value), pattern);
}
rejected((value) => {
	delete value.approvedDefaults;
}, /\$\.approvedDefaults:/);
rejected((value) => {
	value.surfaces.global.OUT = value.surfaces.global.OUT.filter(
		(item) => item !== "garazhi",
	);
}, /\$\.surfaces\.global: missing explicit status for garazhi/);
rejected((value) => {
	delete value.cities[0].morphology.genitive;
}, /\$\.cities\[0\]\.morphology\.genitive:/);
rejected((value) => {
	delete value.cities[0].districts[0].adjGenitive;
}, /\$\.cities\[0\]\.districts\[0\]\.adjGenitive:/);
rejected((value) => {
	value.databaseUrl = "forbidden";
}, /\$\.databaseUrl: secret-shaped fields are forbidden/);
rejected((value) => {
	delete value.markets.byCity.aksay;
}, /\$\.markets\.byCity: missing explicit decision for aksay/);
rejected((value) => {
	delete value.seo.searchConsole;
}, /\$\.seo\.searchConsole: must be an object/);

writeFileSync(
	join(temporary, "proof.json"),
	renderJson({ presetSha256: first.report.presetSha256 }),
);
console.log(
	"verify:clone-init passed (schema, exact Souz parity, path errors and byte-stable round-trip)",
);
