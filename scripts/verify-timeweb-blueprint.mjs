import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const blueprintRoot = path.join(root, "deploy/clients/timeweb");
const requiredFiles = [
	"README.md",
	"env.client.example",
	"payload/s3-plugin.example.ts",
	"payload/activation.patch.md",
	"compose/client.compose.yml.example",
	"nginx/site.conf.example",
	"backup/README.md",
	"monitoring/README.md",
	"proofs/CLIENT_TIMEWEB_PROOF.md",
];

export function validateBlueprint(input) {
	const errors = [];
	const add = (message) => {
		if (!errors.includes(message)) errors.push(message);
	};
	const allText = [...input.files.values()].join("\n");
	const compose = input.files.get("compose/client.compose.yml.example") ?? "";
	const nginx = input.files.get("nginx/site.conf.example") ?? "";
	const proof = input.files.get("proofs/CLIENT_TIMEWEB_PROOF.md") ?? "";
	const envSource = input.envSource ?? "";
	const activationSource = input.activationSource ?? "";

	for (const file of requiredFiles)
		if (!input.files.has(file)) add(`missing:${file}`);
	if (allText.includes("start-baza.ams24.ru")) add("starter-demo-domain");
	if (/\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/.test(allText))
		add("credential-shaped-value");
	if (
		/^[ \t]*(?:DATABASE_URI|PAYLOAD_SECRET|S3_SECRET_ACCESS_KEY)[ \t]*=[ \t]*\S+/m.test(
			allText,
		)
	) {
		add("secret-example-value");
	}
	if (!compose.includes('image: "${IMAGE:?')) add("immutable-image-missing");
	if (/^\s*build\s*:/m.test(compose) || /git pull|pnpm build/i.test(compose))
		add("server-build-path");
	if ((compose.match(/JOBS_AUTORUN:\s*["']?true/g) ?? []).length !== 1)
		add("jobs-owner-count");
	if (
		/alias\s+[^;]*media/i.test(nginx) ||
		/location\s+[^\n]*\/media\//i.test(nginx)
	)
		add("local-media-alias");
	for (const marker of [
		"__CLIENT_DOMAIN__",
		"Strict-Transport-Security",
		"X-Content-Type-Options",
		"Referrer-Policy",
		"X-Frame-Options",
		"__ADMIN_ACCESS_POLICY__",
	]) {
		if (!nginx.includes(marker)) add(`nginx-marker:${marker}`);
	}
	for (const marker of [
		"Managed PostgreSQL",
		"S3-compatible",
		"Secret Master",
		"immutable image",
		"Exactly one runtime",
		"sslmode=verify-full",
		"DATABASE_POOL_MAX",
		"db:restore-drill",
	]) {
		if (!allText.includes(marker)) add(`contract-marker:${marker}`);
	}
	for (const marker of [
		"Real Managed PostgreSQL connection | NOT PROVEN",
		"Real Payload Admin S3 upload | NOT PROVEN",
		"No client `MEDIA_DIR` dependency | PROVEN LOCALLY",
		"Restore drill | NOT PROVEN",
	]) {
		if (!proof.includes(marker)) add(`proof-marker:${marker}`);
	}
	for (const marker of [
		"S3_ENDPOINT: optionalUrl",
		"S3_REGION: optionalString",
		"S3_BUCKET: optionalString",
		"S3_ACCESS_KEY_ID: optionalString",
		"S3_SECRET_ACCESS_KEY: optionalString",
		"S3_PREFIX: optionalString",
		"const clientMediaStorage = clientReadinessConfig.mediaStorage as",
		"function runtimeStorageKeys()",
		'clientMediaStorage === "timeweb-s3"',
		"return timewebS3RuntimeKeys",
		'return ["MEDIA_DIR"]',
		"return [...runtimeBaseKeys, ...runtimeStorageKeys()]",
	]) {
		if (!envSource.includes(marker)) add(`env-boundary:${marker}`);
	}
	for (const marker of [
		"function ensureS3EnvSchema(source)",
		"function ensureS3RuntimeRequirements(source)",
		"clone:activate-timeweb-storage: already activated; no changes",
	]) {
		if (!activationSource.includes(marker)) add(`activation-boundary:${marker}`);
	}
	const hasStorageAdapter = Boolean(
		input.packageJson.dependencies?.["@payloadcms/storage-s3"] ||
			input.packageJson.devDependencies?.["@payloadcms/storage-s3"],
	);
	if (input.projectKind !== "client" && hasStorageAdapter) {
		add("starter-storage-s3-dependency");
	}
	return errors;
}

const files = new Map(
	requiredFiles
		.filter((file) => fs.existsSync(path.join(blueprintRoot, file)))
		.map((file) => [
			file,
			fs.readFileSync(path.join(blueprintRoot, file), "utf8"),
		]),
);
const packageJson = JSON.parse(
	fs.readFileSync(path.join(root, "package.json"), "utf8"),
);
const siteConfig = fs.readFileSync(
	path.join(root, "src/project/site.config.ts"),
	"utf8",
);
const projectKind = siteConfig.includes('projectKind: "client"')
	? "client"
	: "starter-demo";
const envSource = fs.readFileSync(path.join(root, "src/project/env.ts"), "utf8");
const activationSource = fs.readFileSync(
	path.join(root, "scripts/clone-activate-timeweb-storage.mjs"),
	"utf8",
);
assert.deepEqual(
	validateBlueprint({
		files,
		packageJson,
		projectKind,
		envSource,
		activationSource,
	}),
	[],
);

const invalidFiles = new Map(files);
invalidFiles.set(
	"compose/client.compose.yml.example",
	`${invalidFiles.get("compose/client.compose.yml.example")}\nservices:\n  second-owner:\n    environment:\n      JOBS_AUTORUN: true\n`,
);
assert.ok(
	validateBlueprint({
		files: invalidFiles,
		packageJson,
		projectKind,
		envSource,
		activationSource,
	}).includes("jobs-owner-count"),
	"negative fixture must reject a second jobs owner",
);

assert.ok(
	validateBlueprint({
		files,
		packageJson,
		projectKind,
		envSource: envSource.replace("return timewebS3RuntimeKeys", "return [\"MEDIA_DIR\"]"),
		activationSource,
	}).includes("env-boundary:return timewebS3RuntimeKeys"),
	"negative fixture must reject client S3 runtime that still requires MEDIA_DIR",
);

console.log(
	"verify:timeweb-blueprint: PASS (static contract; live provider states NOT PROVEN)",
);
