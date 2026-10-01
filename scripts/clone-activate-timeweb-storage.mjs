import { execFileSync } from "node:child_process";
import {
	copyFileSync,
	existsSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import path from "node:path";

const root = process.cwd();
const adapter = "@payloadcms/storage-s3";
const exactVersion = "3.90.2";
const targetPlugin = "src/project/timeweb-s3.plugin.ts";

function read(relativePath) {
	return readFileSync(path.join(root, relativePath), "utf8").replaceAll(
		"\r\n",
		"\n",
	);
}

function write(relativePath, value) {
	writeFileSync(path.join(root, relativePath), value);
}

function run(command, args) {
	execFileSync(command, args, { cwd: root, stdio: "inherit" });
}

function pnpm(args) {
	const cli = process.env.npm_execpath;
	if (!cli) throw new Error("pnpm CLI path is unavailable; run this through pnpm.");
	if (/\.(?:exe|cmd|bat)$/i.test(cli)) {
		run(cli, args);
		return;
	}
	run(process.execPath, [cli, ...args]);
}

function replaceOnce(source, needle, replacement, label) {
	const occurrences = source.split(needle).length - 1;
	if (occurrences !== 1) {
		throw new Error(`${label}: expected one activation anchor, found ${occurrences}`);
	}
	return source.replace(needle, replacement);
}

function ensureS3EnvSchema(source) {
	if (source.includes("S3_SECRET_ACCESS_KEY: optionalString")) return source;
	return replaceOnce(
		source,
		"\tMEDIA_DIR: optionalString,",
		[
			"\tMEDIA_DIR: optionalString,",
			"\tS3_ENDPOINT: optionalUrl,",
			"\tS3_REGION: optionalString,",
			"\tS3_BUCKET: optionalString,",
			"\tS3_ACCESS_KEY_ID: optionalString,",
			"\tS3_SECRET_ACCESS_KEY: optionalString,",
			"\tS3_PREFIX: optionalString,",
		].join("\n"),
		"client S3 env schema",
	);
}

function ensureS3RuntimeRequirements(source) {
	if (
		source.includes("function runtimeStorageKeys()") &&
		source.includes('clientMediaStorage === "timeweb-s3"') &&
		source.includes('"S3_SECRET_ACCESS_KEY"')
	) {
		return source;
	}
	if (
		source.includes("function runtimeStorageKeys()") &&
		source.includes('clientReadinessConfig.mediaStorage === "timeweb-s3"') &&
		source.includes('"S3_SECRET_ACCESS_KEY"')
	) {
		let migrated = source;
		if (!migrated.includes("const clientMediaStorage = clientReadinessConfig.mediaStorage as")) {
			migrated = replaceOnce(
				migrated,
				"function runtimeStorageKeys(): string[] {",
				[
					"const clientMediaStorage = clientReadinessConfig.mediaStorage as",
					'\t| "timeweb-s3"',
					'\t| "approved-object-storage"',
					"\t| null;",
					"",
					"function runtimeStorageKeys(): string[] {",
				].join("\n"),
				"client S3 media storage type guard",
			);
		}
		return migrated.replace(
			'clientReadinessConfig.mediaStorage === "timeweb-s3"',
			'clientMediaStorage === "timeweb-s3"',
		);
	}

	return replaceOnce(
		source,
		[
			"export function requiredKeysForMode(mode: RuntimeEnvMode): string[] {",
			'\tif (mode === "migrate") return ["DATABASE_URI", "PAYLOAD_SECRET"];',
			'\tif (mode !== "runtime") return [];',
			"\treturn [",
			'\t\t"AMS_PROFILE",',
			'\t\t"TZ",',
			'\t\t"DATABASE_URI",',
			'\t\t"PAYLOAD_SECRET",',
			'\t\t"NEXT_PUBLIC_SERVER_URL",',
			'\t\t"MEDIA_DIR",',
			"\t];",
			"}",
		].join("\n"),
		[
			"const runtimeBaseKeys = [",
			'\t"AMS_PROFILE",',
			'\t"TZ",',
			'\t"DATABASE_URI",',
			'\t"PAYLOAD_SECRET",',
			'\t"NEXT_PUBLIC_SERVER_URL",',
			"];",
			"const timewebS3RuntimeKeys = [",
			'\t"S3_ENDPOINT",',
			'\t"S3_REGION",',
			'\t"S3_BUCKET",',
			'\t"S3_ACCESS_KEY_ID",',
			'\t"S3_SECRET_ACCESS_KEY",',
			'\t"S3_PREFIX",',
			"];",
			"",
			"const clientMediaStorage = clientReadinessConfig.mediaStorage as",
			'\t| "timeweb-s3"',
			'\t| "approved-object-storage"',
			"\t| null;",
			"",
			"function runtimeStorageKeys(): string[] {",
			"\tif (",
			'\t\t(siteConfig.projectKind as "starter-demo" | "client") === "client" &&',
			'\t\tclientMediaStorage === "timeweb-s3"',
			"\t) {",
			"\t\treturn timewebS3RuntimeKeys;",
			"\t}",
			'\treturn ["MEDIA_DIR"];',
			"}",
			"",
			"export function requiredKeysForMode(mode: RuntimeEnvMode): string[] {",
			'\tif (mode === "migrate") return ["DATABASE_URI", "PAYLOAD_SECRET"];',
			'\tif (mode !== "runtime") return [];',
			"\treturn [...runtimeBaseKeys, ...runtimeStorageKeys()];",
			"}",
		].join("\n"),
		"client S3 runtime requirements",
	);
}

function packageVersion() {
	const pkg = JSON.parse(read("package.json"));
	return pkg.dependencies?.[adapter] ?? pkg.devDependencies?.[adapter] ?? null;
}

function isActivated() {
	return (
		existsSync(path.join(root, targetPlugin)) &&
		packageVersion() === exactVersion &&
		read(targetPlugin).includes("disableLocalStorage: true") &&
		read("payload.config.ts").includes(
			'import { timewebS3Plugin } from "./src/project/timeweb-s3.plugin.ts";',
		) &&
		read("payload.config.ts").includes("plugins: [timewebS3Plugin]") &&
		read("src/project/env.ts").includes("S3_SECRET_ACCESS_KEY: optionalString") &&
		read("src/project/env.ts").includes('"S3_PREFIX"') &&
		read("src/project/client-readiness.config.ts").includes(
			'mediaStorage: "timeweb-s3"',
		)
	);
}

const siteConfig = read("src/project/site.config.ts");
if (!siteConfig.includes('projectKind: "client"')) {
	throw new Error(
		"clone:activate-timeweb-storage works only after projectKind is set to client.",
	);
}

if (isActivated()) {
	console.log("clone:activate-timeweb-storage: already activated; no changes");
	process.exit(0);
}

const dirty = execFileSync("git", ["status", "--porcelain"], {
	cwd: root,
	encoding: "utf8",
});
if (dirty.trim()) {
	throw new Error(
		"clone:activate-timeweb-storage requires a clean client checkout before first activation.",
	);
}

const pkg = JSON.parse(read("package.json"));
if (pkg.dependencies?.payload !== exactVersion) {
	throw new Error(
		`Expected payload@${exactVersion}; found ${pkg.dependencies?.payload ?? "missing"}.`,
	);
}

pnpm(["add", "--save-exact", `${adapter}@${exactVersion}`]);
copyFileSync(
	path.join(root, "deploy/clients/timeweb/payload/s3-plugin.example.ts"),
	path.join(root, targetPlugin),
);
write(
	targetPlugin,
	read(targetPlugin).replace(
		"// @ts-nocheck -- activation source copied to src/project/timeweb-s3.plugin.ts.\n",
		"// Activated from the version-pinned Timeweb client storage source.\n",
	),
);

let payloadConfig = read("payload.config.ts");
payloadConfig = replaceOnce(
	payloadConfig,
	'import { runtimeEnv } from "./src/project/env.ts";',
	'import { runtimeEnv } from "./src/project/env.ts";\nimport { timewebS3Plugin } from "./src/project/timeweb-s3.plugin.ts";',
	"payload plugin import",
);
payloadConfig = replaceOnce(
	payloadConfig,
	"\tgraphQL: {",
	"\tplugins: [timewebS3Plugin],\n\tgraphQL: {",
	"payload plugins",
);
write("payload.config.ts", payloadConfig);

let envSource = read("src/project/env.ts");
envSource = ensureS3EnvSchema(envSource);
write("src/project/env.ts", envSource);

envSource = read("src/project/env.ts");
envSource = ensureS3RuntimeRequirements(envSource);
write("src/project/env.ts", envSource);

let readiness = read("src/project/client-readiness.config.ts");
readiness = replaceOnce(
	readiness,
	"\tmediaStorage: null,",
	'\tmediaStorage: "timeweb-s3",',
	"client readiness storage",
);
write("src/project/client-readiness.config.ts", readiness);

let envExample = read(".env.example");
envExample += [
	"",
	"# Client-only Timeweb S3 activation (values come from Secret Master)",
	"S3_ENDPOINT=https://s3.twcstorage.ru",
	"S3_REGION=ru-1",
	"S3_BUCKET=",
	"S3_ACCESS_KEY_ID=",
	"S3_SECRET_ACCESS_KEY=",
	"S3_PREFIX=media",
	"",
].join("\n");
write(".env.example", envExample);

if (!isActivated()) {
	throw new Error("Client S3 activation did not reach the expected deterministic state.");
}

pnpm(["typecheck"]);
pnpm(["verify:client-readiness", "--mode=fixture-client"]);
console.log(`clone:activate-timeweb-storage: activated ${adapter}@${exactVersion}`);
