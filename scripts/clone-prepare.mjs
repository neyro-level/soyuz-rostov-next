import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { isAbsolute, join, relative, resolve } from "node:path";
import {
	buildCloneBootstrap,
	clonePresetHash,
	readClonePreset,
	renderBrandCss,
	renderClientReadinessConfig,
	renderClientSeoArtifacts,
	renderProjectCopy,
	renderProjectFontConfig,
	renderProjectLiterals,
	renderSeoTemplateInputs,
	renderSiteProfileConfig,
	reservedRootsForSiteProfile,
	siteProfileConfigForPreset,
	validateCloneBootstrap,
} from "./clone-preset.mjs";
import {
	hashStarterOwnedFiles,
	readStarterOwnedManifest,
	validateStarterVersion,
} from "./starter-ownership.mjs";
import {
	readStarterReleaseManifest,
	validateStarterTag,
} from "./starter-release.mjs";

const args = new Map(
	process.argv.slice(2).map((arg) => {
		const [key, ...value] = arg.split("=");
		return [key, value.join("=") || true];
	}),
);
const root = resolve(String(args.get("--root") || process.cwd()));
const proofMode = process.env.AMS_CLONE_PROOF_MODE === "1";
const git = (...gitArgs) => {
	try {
		return execFileSync("git", gitArgs, {
			cwd: root,
			encoding: "utf8",
			stdio: ["ignore", "pipe", "ignore"],
		}).trim();
	} catch {
		return "UNKNOWN";
	}
};
const presetFile = args.get("--preset-file");
if (!presetFile || presetFile === true) {
	throw new Error(
		"clone:prepare requires --preset-file=<approved JSON preset>.",
	);
}
const preset = readClonePreset(
	isAbsolute(String(presetFile))
		? String(presetFile)
		: resolve(process.cwd(), String(presetFile)),
);
const presetSha = clonePresetHash(preset);
const resolveRepositoryFile = (relativePath, label) => {
	const target = resolve(root, relativePath);
	const rootRelative = relative(root, target);
	if (
		!rootRelative ||
		rootRelative.startsWith("..") ||
		isAbsolute(rootRelative)
	) {
		throw new Error(`${label} must stay inside the repository.`);
	}
	if (!existsSync(target))
		throw new Error(`${label} does not exist: ${relativePath}`);
	return target;
};
resolveRepositoryFile(preset.brand.logoFile, "brand.logoFile");
resolveRepositoryFile(preset.brand.faviconFile, "brand.faviconFile");
const sourceTag = String(args.get("--source-tag") || "");
validateStarterTag(sourceTag);
const preparedAt = String(args.get("--date") || new Date().toISOString());
const preparedPreset = {
	...preset,
	seoTiers: {
		...preset.seoTiers,
		snapshotDate: preparedAt.slice(0, 10),
	},
};
const preparedProfile = siteProfileConfigForPreset(preparedPreset);

const provenancePath = join(root, "docs", "CLONE_PROVENANCE.md");
const bootstrapPath = join(root, "docs", "CLIENT_BOOTSTRAP.json");
if (existsSync(provenancePath)) {
	if (!existsSync(bootstrapPath)) {
		throw new Error("Prepared clone is missing docs/CLIENT_BOOTSTRAP.json.");
	}
	const existing = JSON.parse(readFileSync(bootstrapPath, "utf8"));
	if (existing.presetSha !== presetSha) {
		throw new Error("Clone is already prepared from a different preset.");
	}
	validateCloneBootstrap(root);
	console.log(
		"clone:prepare: already prepared from the same preset; no changes",
	);
	process.exit(0);
}

const sourceHead = git("rev-parse", "HEAD");
const taggedHead = git("rev-list", "-n", "1", sourceTag);
if (!proofMode) {
	if (
		sourceHead === "UNKNOWN" ||
		taggedHead === "UNKNOWN" ||
		sourceHead !== taggedHead
	) {
		throw new Error(
			"clone:prepare must run from the exact immutable released starter-v2.MINOR.PATCH tag.",
		);
	}
	if (git("status", "--porcelain")) {
		throw new Error(
			"clone:prepare requires a clean checkout before preparation.",
		);
	}
}
const sourceSha = String(args.get("--source-sha") || sourceHead);
if (!/^[0-9a-f]{40}$/.test(sourceSha)) {
	throw new Error("clone:prepare requires an exact 40-character source SHA.");
}
if (!proofMode && sourceSha !== sourceHead) {
	throw new Error("clone:prepare source SHA must match the exact tagged HEAD.");
}
const starterManifest = readStarterOwnedManifest(root);
const starterHashes = hashStarterOwnedFiles(root, starterManifest);
const releaseManifestPath = args.get("--release-manifest");
if (!releaseManifestPath || releaseManifestPath === true) {
	throw new Error(
		"clone:prepare requires --release-manifest=<released manifest JSON>.",
	);
}
readStarterReleaseManifest(
	isAbsolute(String(releaseManifestPath))
		? String(releaseManifestPath)
		: resolve(process.cwd(), String(releaseManifestPath)),
	{
		expectedTag: sourceTag,
		expectedSha: sourceSha,
		expectedHashes: starterHashes,
	},
);

const configPath = join(root, "src", "project", "site.config.ts");
const config = readFileSync(configPath, "utf8");
if (!/projectKind:\s*["'](?:starter-demo|client)["']/.test(config)) {
	throw new Error("site.config.ts projectKind owner is missing.");
}

const removalGroups = [
	"docs/legacy",
	"docs/proofs",
	"docs/orchestration",
	"docs/research/ATLAS_BASELINE.md",
	"docs/research/atlas-css-parity.json",
	"docs/AMS_MASTER_PLAN_6_STARTER_FINAL_FREEZE.md",
	"docs/AMS_MASTER_PLAN_7_STARTER_FINAL_AUDIT_CORRECTIONS.md",
	"docs/AMS_MASTER_PLAN_8_GEO_CATALOG_PLATFORM.md",
	"docs/AMS_MASTER_PLAN_9_STARTER_V2_1_CLONE_READINESS.md",
	"docs/AMS_MASTER_PLAN_10_CLONE_READY_2_1.md",
	"docs/AMS_MASTER_PLAN_11_CLONE_FACTORY_2_2.md",
	"docs/AMS_REALTY_BAZA_STARTER_FINAL_COMMERCIAL_FREEZE_MASTER_PLAN_V2_0.md",
	"docs/evidence/plan9",
	"docs/evidence/plan10",
	"docs/evidence/plan11",
	"docs/evidence/plan12",
	"docs/evidence/final-audit-freeze",
	"deploy/compose/start-baza.compose.yml",
	"deploy/nginx/start-baza.ams24.ru.conf",
	"scripts/capture-atlas-visual-proof.mjs",
	"scripts/capture-starter-visual-proof.mjs",
	"scripts/verify-atlas-css-parity.mjs",
	"scripts/verify-final-client-clone.mjs",
	"scripts/verify-clone-runtime-matrix.mjs",
	"scripts/verify-clone-readiness.mjs",
	"scripts/verify-clone-prepare.mjs",
	"scripts/generate-align-inventory.mjs",
	"scripts/generate-corrections-inventory.mjs",
	"scripts/generate-hardening-inventory.mjs",
	"scripts/generate-residual-inventory.mjs",
];
const removed = [];
for (const relativePath of removalGroups) {
	const target = resolve(root, relativePath);
	const rootRelative = relative(root, target);
	if (
		!rootRelative ||
		rootRelative.startsWith("..") ||
		isAbsolute(rootRelative)
	) {
		throw new Error(`unsafe cleanup path: ${relativePath}`);
	}
	if (!existsSync(target)) continue;
	rmSync(target, { recursive: true, force: true });
	removed.push(relativePath);
}

const packagePath = join(root, "package.json");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
packageJson.name = preset.packageName;
delete packageJson.scripts?.["visual:atlas-css-parity"];
delete packageJson.scripts?.["verify:starter:clone-readiness"];
delete packageJson.scripts?.["verify:client-clone-proof"];
delete packageJson.scripts?.["verify:clone-matrix"];
delete packageJson.scripts?.["verify:clone-presets"];
delete packageJson.scripts?.["verify:clone-readiness"];
delete packageJson.scripts?.["verify:clone-prepare"];
if (packageJson.scripts?.["verify:daily"]) {
	packageJson.scripts["verify:daily"] = packageJson.scripts[
		"verify:daily"
	].replace("pnpm verify:clone-readiness", "pnpm verify:client-readiness");
}
if (packageJson.scripts?.verify) {
	packageJson.scripts.verify = packageJson.scripts.verify.replace(
		"pnpm verify:clone-readiness",
		"pnpm verify:client-readiness",
	);
}
writeFileSync(packagePath, `${JSON.stringify(packageJson, null, "\t")}\n`);

const replaceLiteral = (source, pattern, replacement, label) => {
	if (!pattern.test(source))
		throw new Error(`site.config.ts ${label} owner is missing.`);
	return source.replace(pattern, replacement);
};
const replaceGeneratedBrandValues = (source, generated) => {
	const pattern =
		/\/\* CLONE_BRAND_VALUES_BEGIN:[\s\S]*?\/\* CLONE_BRAND_VALUES_END \*\//;
	if (!pattern.test(source)) {
		throw new Error("globals.css clone brand values block is missing.");
	}
	return source.replace(pattern, generated.trim());
};
let siteConfig = config;
siteConfig = replaceLiteral(
	siteConfig,
	/projectKind:\s*["'](?:starter-demo|client)["']/,
	'projectKind: "client"',
	"projectKind",
);
writeFileSync(configPath, siteConfig);
const globalsPath = join(root, "src", "app", "globals.css");
writeFileSync(
	globalsPath,
	replaceGeneratedBrandValues(
		readFileSync(globalsPath, "utf8"),
		renderBrandCss(preset),
	),
);
writeFileSync(
	join(root, "src", "project", "site-profile.config.ts"),
	renderSiteProfileConfig(preparedPreset),
);
writeFileSync(
	join(root, "src", "project", "project-literals.json"),
	renderProjectLiterals(preset),
);
writeFileSync(
	join(root, "src", "project", "copy.ts"),
	renderProjectCopy(preset),
);
writeFileSync(
	join(root, "src", "project", "seo", "template-inputs.ts"),
	renderSeoTemplateInputs(preset),
);
writeFileSync(
	join(root, "src", "project", "font.generated.ts"),
	renderProjectFontConfig(preset),
);

const readinessPath = join(
	root,
	"src",
	"project",
	"client-readiness.config.ts",
);
writeFileSync(readinessPath, renderClientReadinessConfig(preset));

const bootstrap = buildCloneBootstrap(
	preparedPreset,
	reservedRootsForSiteProfile(preparedProfile),
	presetSha,
	preparedAt,
);
writeFileSync(bootstrapPath, `${JSON.stringify(bootstrap, null, "\t")}\n`);
const seoArtifacts = renderClientSeoArtifacts(
	preparedPreset,
	preparedProfile,
	preparedAt,
);
mkdirSync(join(root, "docs", "seo"), { recursive: true });
writeFileSync(
	join(root, "docs", "seo", "DISTRICTS.csv"),
	seoArtifacts.districtCsv,
);
writeFileSync(
	join(root, "docs", "seo", "SEO_REGISTRY_SEED.csv"),
	seoArtifacts.registryCsv,
);
writeFileSync(
	join(root, "src", "project", "seo", "registry-seed.ts"),
	seoArtifacts.registryModule,
);

const provenance = `# Clone provenance\n\n- Client project: ${preset.projectId}\n- Preset: ${preset.preset}\n- Preset SHA-256: ${presetSha}\n- Source starter tag: ${sourceTag}\n- Source starter SHA: ${sourceSha}\n- Prepared at: ${preparedAt}\n- Fixture runtime: cleared for client mode\n- Storage topology: separate explicit clone:activate-* step\n- Retained platform standard: AMS Realty Platform Core 5.5 (repository-pinned)\n- Retained UI contract: project Design System and closed @ams/realtbase-ui public API\n\n## Removed starter-only groups\n\n${removed.length ? removed.map((item) => `- \`${item}\``).join("\n") : "- None (already absent)"}\n\nCore, packages, guards, migrations and shared security/data checks remain unchanged.\n`;
writeFileSync(provenancePath, provenance);

const generatedOutputs = [
	"package.json",
	"src/project/site.config.ts",
	"src/project/site-profile.config.ts",
	"src/project/project-literals.json",
	"src/project/copy.ts",
	"src/project/seo/template-inputs.ts",
	"src/app/globals.css",
	"src/project/font.generated.ts",
	"src/project/client-readiness.config.ts",
	"docs/CLIENT_BOOTSTRAP.json",
	"docs/seo/DISTRICTS.csv",
	"docs/seo/SEO_REGISTRY_SEED.csv",
	"src/project/seo/registry-seed.ts",
	"docs/CLONE_PROVENANCE.md",
];
const outputManifest = {
	schemaVersion: 1,
	presetSha,
	outputs: Object.fromEntries(
		generatedOutputs.map((relativePath) => [
			relativePath,
			createHash("sha256")
				.update(readFileSync(join(root, relativePath)))
				.digest("hex"),
		]),
	),
};
writeFileSync(
	join(root, "docs", "CLONE_GENERATED_OUTPUTS.json"),
	`${JSON.stringify(outputManifest, null, "\t")}\n`,
);
const starterVersion = validateStarterVersion(
	{
		schemaVersion: 1,
		tag: sourceTag,
		sha: sourceSha,
		manifestVersion: starterManifest.schemaVersion,
		hashes: starterHashes,
	},
	{ expectedTag: sourceTag, expectedSha: sourceSha },
);
writeFileSync(
	join(root, ".starter-version"),
	`${JSON.stringify(starterVersion, null, "\t")}\n`,
);
validateCloneBootstrap(root);
console.log(
	`clone:prepare: prepared ${preset.projectId} with ${preset.preset}; removed ${removed.length} starter-only groups`,
);
