import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
	existsSync,
	mkdtempSync,
	readFileSync,
	realpathSync,
	rmSync,
	symlinkSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assertLocalTestDatabaseUri } from "./integration/env.mjs";
import {
	readStarterOwnedManifest,
	starterOwnedFiles,
} from "./starter-ownership.mjs";
import { validateUpgradeArchive } from "./starter-upgrade.mjs";

const root = process.cwd();
const preFixSha = "950901f2b0069010314a4d004221c518a0548511";
const fixtureTag = "starter-v2.1.999";
const preparedAt = "2026-09-27T12:00:00.000Z";
const proofRoot = mkdtempSync(join(tmpdir(), "ams-starter-upgrade-proof-"));
const sourceRoot = join(proofRoot, "source");
const sourceArchive = join(proofRoot, "source.tar");
const releaseManifestPath = join(proofRoot, "release-manifest.json");
const evidencePath = join(proofRoot, "old-client-evidence.json");
const upgradeArchivePath = join(proofRoot, "upgrade-archive.json");
const brandBlockPattern =
	/\/\* CLONE_BRAND_VALUES_BEGIN:[\s\S]*?\/\* CLONE_BRAND_VALUES_END \*\//;
const legacyBrandImportPattern =
	/^@import\s+["']\.\.\/project\/brand\.css["'];\r?\n?/m;
const uiStylesImportPattern =
	/^@import\s+["']@ams\/realtbase-ui\/styles\.css["'];\r?\n?/m;

function git(cwd, args) {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function sha256(value) {
	return createHash("sha256").update(value).digest("hex");
}

function committedFile(relativePath) {
	return execFileSync("git", ["show", `HEAD:${relativePath}`], {
		cwd: root,
		maxBuffer: 64 * 1024 * 1024,
		stdio: ["ignore", "pipe", "pipe"],
	});
}

function archiveEntry(path, content = committedFile(path)) {
	const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content);
	return {
		type: "file",
		path,
		size: bytes.length,
		sha256: sha256(bytes),
		contentBase64: bytes.toString("base64"),
	};
}

function readJson(path) {
	return JSON.parse(readFileSync(path, "utf8"));
}

function requireClientFile(relativePath) {
	const path = join(sourceRoot, relativePath);
	assert.ok(existsSync(path), `prepared old client is missing ${relativePath}`);
	return path;
}

function renderNextGlobals(globalsSource, brandBlock) {
	const source = globalsSource.toString("utf8").replaceAll("\r\n", "\n");
	const block = brandBlock.toString("utf8").trim();
	if (brandBlockPattern.test(source)) {
		return Buffer.from(source.replace(brandBlockPattern, block));
	}
	if (legacyBrandImportPattern.test(source)) {
		return Buffer.from(source.replace(legacyBrandImportPattern, `${block}\n`));
	}
	assert.match(
		source,
		uiStylesImportPattern,
		"client globals.css brand block, legacy import, or UI styles import is missing",
	);
	return Buffer.from(
		source.replace(uiStylesImportPattern, (match) => `${match}${block}\n`),
	);
}

function clientPnpmSpecifier() {
	const packageJson = JSON.parse(
		readFileSync(join(sourceRoot, "package.json"), "utf8"),
	);
	const packageManager = String(packageJson.packageManager ?? "");
	const match = /^pnpm@([^+\s]+)(?:\+.*)?$/.exec(packageManager);
	assert.ok(
		match,
		`client packageManager must pin pnpm, got ${packageManager || "<missing>"}`,
	);
	return `pnpm@${match[1]}`;
}

function runClientPnpm(args, extraEnv = {}) {
	const corepackCommand = process.platform === "win32" ? "corepack.cmd" : "corepack";
	return execFileSync(corepackCommand, [clientPnpmSpecifier(), ...args], {
		cwd: sourceRoot,
		encoding: "utf8",
		env: { ...process.env, CI: "1", ...extraEnv },
		maxBuffer: 64 * 1024 * 1024,
		shell: process.platform === "win32",
		stdio: ["ignore", "pipe", "pipe"],
	});
}

function psql(databaseUri, sql) {
	return execFileSync(
		"psql",
		[
			"-X",
			"-q",
			"-v",
			"ON_ERROR_STOP=1",
			"-d",
			databaseUri,
			"-t",
			"-A",
			"-F",
			"\t",
			"-c",
			sql,
		],
		{
			encoding: "utf8",
			env: { ...process.env, PGPASSWORD: process.env.PGPASSWORD ?? "" },
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
		},
	).trim();
}

const migrationProofDatabaseUri =
	process.env.AMS_UPGRADE_PROOF_DATABASE_URI?.trim() || null;
const migrationProofEnv = migrationProofDatabaseUri
	? {
			DATABASE_URI: migrationProofDatabaseUri,
			PAYLOAD_SECRET:
				process.env.PAYLOAD_SECRET || "ams-upgrade-proof-disposable-secret",
			NEXT_PUBLIC_SERVER_URL: "http://127.0.0.1:3000",
		}
	: null;
let migrationProofRecord = null;

if (migrationProofDatabaseUri) {
	assertLocalTestDatabaseUri(migrationProofDatabaseUri);
}

const sourceTagsBefore = git(root, ["tag", "--list"]);

try {
	assert.equal(
		git(root, ["rev-parse", `${preFixSha}^{commit}`]),
		preFixSha,
		"the exact pre-fix commit must be available locally",
	);
	assert.equal(
		git(root, ["rev-parse", `${preFixSha}^`]),
		"e67e54173e3d5e24b63f7f1a2e90dfeba7eb3a47",
		"the frozen baseline ancestry changed",
	);
	assert.match(
		git(root, ["show", "-s", "--format=%s", preFixSha]),
		/Plan 12 EPIC-05/,
		"the frozen baseline no longer identifies the intended pre-fix main",
	);

	execFileSync(
		"git",
		["archive", "--format=tar", `--output=${sourceArchive}`, preFixSha],
		{ cwd: root, stdio: ["ignore", "pipe", "pipe"] },
	);
	const archiveHash = sha256(readFileSync(sourceArchive));
	assert.match(archiveHash, /^[0-9a-f]{64}$/);

	execFileSync(
		"git",
		["clone", "--no-local", "--no-checkout", root, sourceRoot],
		{ stdio: ["ignore", "pipe", "pipe"] },
	);
	git(sourceRoot, ["config", "core.autocrlf", "false"]);
	git(sourceRoot, ["checkout", "--detach", preFixSha]);
	assert.equal(git(sourceRoot, ["rev-parse", "HEAD"]), preFixSha);
	git(sourceRoot, ["tag", fixtureTag, preFixSha]);
	assert.equal(git(sourceRoot, ["rev-list", "-n", "1", fixtureTag]), preFixSha);
	const dependencyRoot = realpathSync(join(root, "node_modules"));
	assert.ok(
		existsSync(dependencyRoot),
		"installed root dependencies are required for the disposable clone proof",
	);
	symlinkSync(dependencyRoot, join(sourceRoot, "node_modules"), "junction");
	assert.equal(git(sourceRoot, ["status", "--porcelain"]), "");

	const ownershipEvidence = JSON.parse(
		execFileSync(
			process.execPath,
			[
				"--input-type=module",
				"--eval",
				"import { readStarterOwnedManifest, hashStarterOwnedFiles } from './scripts/starter-ownership.mjs'; const manifest = readStarterOwnedManifest(process.cwd()); process.stdout.write(JSON.stringify({ manifestVersion: manifest.schemaVersion, hashes: hashStarterOwnedFiles(process.cwd(), manifest) }));",
			],
			{
				cwd: sourceRoot,
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
				stdio: ["ignore", "pipe", "pipe"],
			},
		),
	);
	const releaseManifest = {
		schemaVersion: 1,
		status: "released",
		tag: fixtureTag,
		sha: preFixSha,
		starterOwnedManifestVersion: ownershipEvidence.manifestVersion,
		hashes: ownershipEvidence.hashes,
	};
	const releaseManifestBytes = `${JSON.stringify(releaseManifest, null, 2)}\n`;
	writeFileSync(releaseManifestPath, releaseManifestBytes);
	const manifestHash = sha256(releaseManifestBytes);

	execFileSync(
		process.execPath,
		[
			"--experimental-strip-types",
			"scripts/clone-prepare.mjs",
			`--preset-file=${join(sourceRoot, "docs", "CLONE_PRESET.souz.example.json")}`,
			`--source-tag=${fixtureTag}`,
			`--source-sha=${preFixSha}`,
			`--release-manifest=${releaseManifestPath}`,
			`--date=${preparedAt}`,
		],
		{
			cwd: sourceRoot,
			encoding: "utf8",
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
		},
	);

	const starterVersion = readJson(requireClientFile(".starter-version"));
	assert.deepEqual(starterVersion, {
		schemaVersion: 1,
		tag: fixtureTag,
		sha: preFixSha,
		manifestVersion: ownershipEvidence.manifestVersion,
		hashes: ownershipEvidence.hashes,
	});
	assert.doesNotMatch(
		JSON.stringify(starterVersion),
		/([a-z]:\\|\/Users\/|\\Users\\)/i,
	);

	const bootstrap = readJson(requireClientFile("docs/CLIENT_BOOTSTRAP.json"));
	assert.ok(
		bootstrap.seoRegistry.rows.length > 0,
		"old client must contain SEO registry evidence",
	);
	assert.equal(bootstrap.nap.brandName, "Союз застройщиков");
	assert.equal(bootstrap.clientReadiness.legalContent, "approved");
	assert.equal(
		bootstrap.clientReadiness.mediaStorage,
		"approved-object-storage",
	);
	for (const relativePath of [
		"src/project/brand.css",
		"src/app/globals.css",
		"src/project/site-profile.config.ts",
		"src/project/copy.ts",
		"src/project/legal.config.ts",
		"src/project/project-literals.json",
		"src/project/storage/local-fs.ts",
		"src/project/seo/registry-seed.ts",
		"docs/seo/DISTRICTS.csv",
		"docs/seo/SEO_REGISTRY_SEED.csv",
	]) {
		requireClientFile(relativePath);
	}
	assert.match(
		readFileSync(requireClientFile("src/project/brand.css"), "utf8"),
		/--brand-accent:/,
	);
	assert.match(
		readFileSync(requireClientFile("src/project/copy.ts"), "utf8"),
		/projectCopy/,
	);
	assert.match(
		readFileSync(
			requireClientFile("src/project/project-literals.json"),
			"utf8",
		),
		/souz-rostov\.example/,
	);
	git(sourceRoot, ["config", "user.name", "AMS Upgrade Proof"]);
	git(sourceRoot, ["config", "user.email", "upgrade-proof@invalid.local"]);
	git(sourceRoot, ["add", "--all"]);
	git(sourceRoot, ["commit", "-m", "Prepare disposable old client fixture"]);
	assert.equal(git(sourceRoot, ["status", "--porcelain"]), "");
	if (migrationProofDatabaseUri) {
		runClientPnpm(["payload:migrate"], migrationProofEnv);
		const inserted = psql(
			migrationProofDatabaseUri,
			`INSERT INTO properties (slug, category, deal_type, title)
			 VALUES ('upgrade-proof-existing', 'apartment', 'sale', 'Upgrade proof existing')
			 RETURNING id, slug, category::text, deal_type::text, title;`,
		).split("\t");
		assert.equal(inserted.length, 5, "old client fixture row was not inserted");
		migrationProofRecord = {
			id: inserted[0],
			slug: inserted[1],
			category: inserted[2],
			dealType: inserted[3],
			title: inserted[4],
		};
		assert.deepEqual(migrationProofRecord, {
			id: migrationProofRecord.id,
			slug: "upgrade-proof-existing",
			category: "apartment",
			dealType: "sale",
			title: "Upgrade proof existing",
		});
	}

	const targetSha = git(root, ["rev-parse", "HEAD"]);
	const targetTag = "starter-v2.2.999";
	const collectionPath = "src/project/collections/Properties.ts";
	const migrationPath = "migrations/20260929_120000_upgrade_proof.ts";
	const migrationIndexPath = "migrations/index.ts";
	const collectionSource = committedFile(collectionPath).toString("utf8");
	assert.doesNotMatch(collectionSource, /upgradeProofVersion/);
	const upgradedCollection = collectionSource.replace(
		"\tfields: [",
		'\tfields: [\n\t\t{ name: "upgradeProofVersion", type: "text", admin: { hidden: true } },',
	);
	assert.match(upgradedCollection, /upgradeProofVersion/);
	const migrationSource = Buffer.from(`import {
\ttype MigrateDownArgs,
\ttype MigrateUpArgs,
\tsql,
} from "@payloadcms/db-postgres";

export async function up({ db }: MigrateUpArgs): Promise<void> {
\tawait db.execute(sql.raw('ALTER TABLE "properties" ADD COLUMN "upgrade_proof_version" varchar;'));
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
\tawait db.execute(sql.raw('ALTER TABLE "properties" DROP COLUMN "upgrade_proof_version";'));
}
`);
	const migrationIndexSource =
		committedFile(migrationIndexPath).toString("utf8");
	const upgradedMigrationIndex = migrationIndexSource
		.replace(
			'import * as migration_20260928_163000_development_external_media from "./20260928_163000_development_external_media";',
			'import * as migration_20260928_163000_development_external_media from "./20260928_163000_development_external_media";\nimport * as migration_20260929_120000_upgrade_proof from "./20260929_120000_upgrade_proof";',
		)
		.replace(
			"\n];",
			'\n\t{\n\t\tup: migration_20260929_120000_upgrade_proof.up,\n\t\tdown: migration_20260929_120000_upgrade_proof.down,\n\t\tname: "20260929_120000_upgrade_proof",\n\t},\n];',
		);
	assert.match(
		upgradedMigrationIndex,
		/migration_20260929_120000_upgrade_proof/,
	);

	const platformOwnedPaths = new Set(
		starterOwnedFiles(root, readStarterOwnedManifest(root)),
	);
	const changedPlatformPaths = git(root, [
		"diff",
		"--name-only",
		`${preFixSha}..${targetSha}`,
	])
		.split(/\r?\n/)
		.filter(Boolean)
		.filter((path) => platformOwnedPaths.has(path))
		.filter(
			(path) =>
				existsSync(join(root, path)) &&
				(existsSync(join(sourceRoot, path)) || !starterVersion.hashes[path]),
		);
	const deletedUpgradePaths = ["scripts/verify-clone-runtime-matrix.mjs"];
	const regeneratedUpgradePaths = [];
	const requiredDeltaPaths = [
		...new Set([
			...changedPlatformPaths,
			collectionPath,
			migrationPath,
			migrationIndexPath,
			"src/app/robots.txt/route.ts",
			"src/proxy.ts",
			"src/core/seo/page-metadata.ts",
			"src/core/seo/final-robots.ts",
			"src/core/seo/tracking-query-params.ts",
			"src/project/seo/templates.ts",
			"src/project/env.ts",
			"src/project/url-grammar.ts",
			"docs/CLONE_PRESET.example.json",
			"docs/CLONE_PRESET.souz.example.json",
			"docs/CORE_5_5_COMPLIANCE_MATRIX.md",
			"next.config.ts",
			"package.json",
			"pnpm-lock.yaml",
			"pnpm-workspace.yaml",
			"src/app/globals.css",
			"packages/ui/src/styles.css",
			"packages/ui/src/styles/home-articles.css",
			"starter-owned.json",
			"scripts/clone-preset.mjs",
			"scripts/clone-prepare.mjs",
			"scripts/regenerate-brand-css.mjs",
			"scripts/quality/seo-template-ownership.mjs",
			"scripts/quality/architecture-guard.mjs",
			"scripts/quality/architecture-rules.mjs",
			"scripts/verify-seo-registry.ts",
			"scripts/verify-seo-registry-import-demand.ts",
			"scripts/verify-starter-fixture.ts",
			"scripts/starter-upgrade.mjs",
		]),
	]
		.filter(
			(path) =>
				!deletedUpgradePaths.includes(path) &&
				!regeneratedUpgradePaths.includes(path),
		)
		.sort();
	const entries = requiredDeltaPaths.map((path) => {
		if (path === collectionPath) return archiveEntry(path, upgradedCollection);
		if (path === migrationPath) return archiveEntry(path, migrationSource);
		if (path === migrationIndexPath) {
			return archiveEntry(path, upgradedMigrationIndex);
		}
		return archiveEntry(path);
	});
	const entryHashes = Object.fromEntries(
		entries.map((entry) => [entry.path, entry.sha256]),
	);
	const adopt = Object.fromEntries(
		entries
			.filter(
				(entry) =>
					entry.path !== "package.json" &&
					existsSync(join(sourceRoot, entry.path)) &&
					!starterVersion.hashes[entry.path],
			)
			.map((entry) => [
				entry.path,
				sha256(readFileSync(join(sourceRoot, entry.path))),
			]),
	);
	const previousGlobals = readFileSync(requireClientFile("src/app/globals.css"));
	const templateGlobals = committedFile("src/app/globals.css");
	const nextBrandBlock = execFileSync(
		process.execPath,
		[
			"--experimental-strip-types",
			"--input-type=module",
			"--eval",
			"import { readFileSync } from 'node:fs'; import { renderBrandCss } from './scripts/clone-preset.mjs'; const bootstrap = JSON.parse(readFileSync(process.env.AMS_PROOF_BOOTSTRAP, 'utf8')); process.stdout.write(renderBrandCss({ brand: bootstrap.brand }));",
		],
		{
			cwd: root,
			env: {
				...process.env,
				AMS_PROOF_BOOTSTRAP: join(sourceRoot, "docs", "CLIENT_BOOTSTRAP.json"),
			},
			maxBuffer: 64 * 1024 * 1024,
			stdio: ["ignore", "pipe", "pipe"],
		},
	);
	const nextGlobals = renderNextGlobals(templateGlobals, nextBrandBlock);
	const upgradeArchive = {
		schemaVersion: 1,
		from: { tag: fixtureTag, sha: preFixSha },
		tag: targetTag,
		sha: targetSha,
		entries,
		deletes: deletedUpgradePaths,
		adopt,
		migrationOwners: {
			[migrationPath]: [collectionPath],
			[migrationIndexPath]: [collectionPath],
		},
		packageMerge: {
			schemaVersion: 1,
			preserve: {
				dependencies: ["@payloadcms/storage-s3"],
				devDependencies: [],
				scripts: ["clone:activate-timeweb-storage", "verify:daily", "verify"],
			},
			omitScripts: [
				"visual:atlas-css-parity",
				"verify:starter:clone-readiness",
				"verify:client-clone-proof",
				"verify:clone-matrix",
				"verify:clone-presets",
				"verify:clone-readiness",
				"verify:clone-prepare",
			],
		},
		composites: [
			{ path: "package.json", strategy: "structured", handler: "package-json" },
		],
		regeneration: {
			schemaVersion: 1,
			steps: [
				{
					script: "scripts/regenerate-brand-css.mjs",
					allowTemplateContent: true,
					verifyBeforeRegeneration: true,
					removeOutputs: ["src/project/brand.css"],
					previousOutputs: {
						"src/app/globals.css": sha256(previousGlobals),
					},
					outputs: { "src/app/globals.css": sha256(nextGlobals) },
				},
			],
		},
		release: {
			schemaVersion: 1,
			status: "released",
			tag: targetTag,
			sha: targetSha,
			starterOwnedManifestVersion: 2,
			hashes: entryHashes,
		},
	};
	const upgradeArchiveBytes = `${JSON.stringify(upgradeArchive, null, 2)}\n`;
	writeFileSync(upgradeArchivePath, upgradeArchiveBytes);
	const validatedUpgrade = validateUpgradeArchive(readJson(upgradeArchivePath));
	assert.equal(validatedUpgrade.from.sha, preFixSha);
	assert.equal(validatedUpgrade.sha, targetSha);
	assert.deepEqual([...validatedUpgrade.contents.keys()], requiredDeltaPaths);
	assert.deepEqual(
		validatedUpgrade.contents.get(collectionPath),
		Buffer.from(upgradedCollection),
	);
	assert.match(
		validatedUpgrade.contents.get(migrationPath).toString("utf8"),
		/upgrade_proof_version/,
	);
	const upgradeArchiveHash = sha256(upgradeArchiveBytes);

	const protectedClientPaths = [
		"docs/CLIENT_BOOTSTRAP.json",
		"docs/seo/DISTRICTS.csv",
		"docs/seo/SEO_REGISTRY_SEED.csv",
		"src/project/site-profile.config.ts",
		"src/project/copy.ts",
		"src/project/legal.config.ts",
		"src/project/project-literals.json",
		"src/project/storage/local-fs.ts",
		"src/project/seo/registry-seed.ts",
	];
	const protectedClientContent = Object.fromEntries(
		protectedClientPaths.map((path) => [
			path,
			readFileSync(requireClientFile(path)),
		]),
	);
	const clientPackageName = readJson(requireClientFile("package.json")).name;
	const conflictPath = "src/core/seo/page-metadata.ts";
	const conflictTarget = requireClientFile(conflictPath);
	const conflictOriginal = readFileSync(conflictTarget);
	const versionBeforeConflict = readFileSync(
		requireClientFile(".starter-version"),
	);
	writeFileSync(
		conflictTarget,
		Buffer.concat([
			conflictOriginal,
			Buffer.from("\n// client-local conflict fixture\n"),
		]),
	);
	const runClientUpgrade = () =>
		spawnSync(
			process.execPath,
			[
				join(root, "scripts", "starter-upgrade.mjs"),
				`--root=${sourceRoot}`,
				`--archive=${upgradeArchivePath}`,
			],
			{
				cwd: root,
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
				stdio: ["ignore", "pipe", "pipe"],
			},
		);
	const firstConflict = runClientUpgrade();
	assert.equal(
		firstConflict.status,
		2,
		firstConflict.stderr || firstConflict.stdout,
	);
	assert.equal(firstConflict.stderr, "");
	const firstConflictReport = JSON.parse(firstConflict.stdout);
	assert.deepEqual(firstConflictReport.conflicts, [
		{ path: conflictPath, reason: "locally-modified" },
	]);
	const firstConflictDiskReport = readJson(
		requireClientFile(".starter-upgrade/report.json"),
	);
	const firstRejection = readFileSync(requireClientFile(`${conflictPath}.rej`));
	rmSync(requireClientFile(`${conflictPath}.rej`), { force: true });
	rmSync(requireClientFile(".starter-upgrade/report.json"), { force: true });
	const secondConflict = runClientUpgrade();
	assert.equal(
		secondConflict.status,
		2,
		secondConflict.stderr || secondConflict.stdout,
	);
	assert.deepEqual(JSON.parse(secondConflict.stdout), firstConflictReport);
	assert.deepEqual(firstConflictDiskReport, firstConflictReport);
	assert.deepEqual(
		readJson(requireClientFile(".starter-upgrade/report.json")),
		firstConflictReport,
	);
	assert.deepEqual(
		readFileSync(requireClientFile(".starter-version")),
		versionBeforeConflict,
	);
	assert.deepEqual(
		readFileSync(conflictTarget),
		Buffer.concat([
			conflictOriginal,
			Buffer.from("\n// client-local conflict fixture\n"),
		]),
	);
	assert.deepEqual(firstRejection, validatedUpgrade.contents.get(conflictPath));
	assert.deepEqual(
		readFileSync(requireClientFile(`${conflictPath}.rej`)),
		firstRejection,
	);
	assert.equal(existsSync(join(sourceRoot, migrationPath)), false);
	writeFileSync(conflictTarget, conflictOriginal);
	rmSync(requireClientFile(`${conflictPath}.rej`), { force: true });
	rmSync(requireClientFile(".starter-upgrade/report.json"), { force: true });
	if (process.env.AMS_UPGRADE_PROOF_NEGATIVE_ONLY === "conflict") {
		console.log(
			`verify:starter-upgrade-propagation: T5 conflict PASS (${conflictPath})`,
		);
		rmSync(proofRoot, { recursive: true, force: true });
		process.exit(0);
	}
	const generatedPath = "src/app/globals.css";
	const generatedTarget = requireClientFile(generatedPath);
	const generatedOriginal = readFileSync(generatedTarget);
	const generatedDrift = Buffer.from("/* manual generated-file drift */\n");
	writeFileSync(generatedTarget, generatedDrift);
	const driftResult = runClientUpgrade();
	assert.equal(driftResult.status, 1, driftResult.stderr || driftResult.stdout);
	assert.equal(driftResult.stdout, "");
	assert.match(
		driftResult.stderr,
		/Generated output has drifted before regeneration: src\/app\/globals\.css\./,
	);
	assert.deepEqual(readFileSync(generatedTarget), generatedDrift);
	assert.deepEqual(
		readFileSync(requireClientFile(".starter-version")),
		versionBeforeConflict,
	);
	assert.equal(existsSync(join(sourceRoot, migrationPath)), false);
	assert.equal(
		existsSync(join(sourceRoot, ".starter-upgrade", "report.json")),
		false,
	);
	writeFileSync(generatedTarget, generatedOriginal);
	if (process.env.AMS_UPGRADE_PROOF_NEGATIVE_ONLY === "generated-drift") {
		console.log(
			`verify:starter-upgrade-propagation: T6 generated drift PASS (${generatedPath})`,
		);
		rmSync(proofRoot, { recursive: true, force: true });
		process.exit(0);
	}
	const applied = JSON.parse(
		execFileSync(
			process.execPath,
			[
				join(root, "scripts", "starter-upgrade.mjs"),
				`--root=${sourceRoot}`,
				`--archive=${upgradeArchivePath}`,
			],
			{
				cwd: root,
				encoding: "utf8",
				maxBuffer: 64 * 1024 * 1024,
				stdio: ["ignore", "pipe", "pipe"],
			},
		),
	);
	assert.equal(applied.status, "applied");
	for (const [path, expected] of Object.entries(protectedClientContent)) {
		assert.deepEqual(readFileSync(requireClientFile(path)), expected, path);
	}
	assert.deepEqual(
		readFileSync(requireClientFile("src/app/globals.css")),
		nextGlobals,
	);
	assert.equal(
		readJson(requireClientFile("docs/CLIENT_BOOTSTRAP.json")).brand.accent,
		bootstrap.brand.accent,
	);
	const upgradedPackage = readJson(requireClientFile("package.json"));
	assert.equal(upgradedPackage.name, clientPackageName);
	assert.equal(
		upgradedPackage.scripts["verify:starter-upgrade-propagation"],
		"node scripts/verify-starter-upgrade-propagation.mjs",
	);
	for (const entry of entries) {
		if (entry.path === "package.json") continue;
		assert.deepEqual(
			readFileSync(requireClientFile(entry.path)),
			validatedUpgrade.contents.get(entry.path),
			entry.path,
		);
	}
	const upgradedLockHash = sha256(readFileSync(requireClientFile("pnpm-lock.yaml")));
	const upgradedVersion = readJson(requireClientFile(".starter-version"));
	assert.equal(upgradedVersion.tag, targetTag);
	assert.equal(upgradedVersion.sha, targetSha);
	const expectedUpgradedHashes = {
		...starterVersion.hashes,
		...validatedUpgrade.hashes,
	};
	delete expectedUpgradedHashes["scripts/verify-clone-runtime-matrix.mjs"];
	for (const [path, hash] of validatedUpgrade.regenerated) {
		expectedUpgradedHashes[path] = hash;
	}
	assert.deepEqual(upgradedVersion.hashes, expectedUpgradedHashes);
	assert.equal(
		existsSync(join(sourceRoot, "scripts", "verify-clone-runtime-matrix.mjs")),
		false,
	);
	if (migrationProofDatabaseUri) {
		assert.ok(migrationProofRecord, "old client database fixture is required");
		runClientPnpm(["payload:migrate"], migrationProofEnv);
		const preserved = psql(
			migrationProofDatabaseUri,
			`SELECT id, slug, category::text, deal_type::text, title,
			        COALESCE(upgrade_proof_version, '<null>')
			 FROM properties WHERE id = ${Number(migrationProofRecord.id)};`,
		).split("\t");
		assert.deepEqual(preserved, [
			migrationProofRecord.id,
			migrationProofRecord.slug,
			migrationProofRecord.category,
			migrationProofRecord.dealType,
			migrationProofRecord.title,
			"<null>",
		]);
		assert.equal(
			psql(
				migrationProofDatabaseUri,
				`SELECT data_type || ':' || is_nullable
				 FROM information_schema.columns
				 WHERE table_schema = 'public'
				   AND table_name = 'properties'
				   AND column_name = 'upgrade_proof_version';`,
			),
			"character varying:YES",
		);
		assert.equal(
			psql(
				migrationProofDatabaseUri,
				`SELECT count(*) FROM payload_migrations
				 WHERE name = '20260929_120000_upgrade_proof';`,
			),
			"1",
		);
		runClientPnpm(["verify:schema"], migrationProofEnv);
		if (process.env.AMS_UPGRADE_PROOF_NEGATIVE_ONLY === "migration") {
			console.log(
				"verify:starter-upgrade-propagation: T7 migration safety PASS (old non-empty DB -> new code -> migration -> preserved data)",
			);
			rmSync(proofRoot, { recursive: true, force: true });
			process.exit(0);
		}
	}

	// T4 validates the upgraded clone as a standalone project. The fixture initially
	// borrows root dependencies only to prepare the old clone; remove that junction
	// before proving a frozen install and the complete post-upgrade acceptance gates.
	unlinkSync(join(sourceRoot, "node_modules"));
	const focusedContinuation = process.env.AMS_UPGRADE_PROOF_FOCUSED === "1";
	const postUpgradeChecks = focusedContinuation
		? [["install", "--frozen-lockfile"], ["verify:client-readiness"], ["build"]]
		: [
				["install", "--frozen-lockfile"],
				["verify:daily"],
				["verify:schema"],
				["verify:client-readiness"],
				["build"],
			];
	for (const args of postUpgradeChecks) {
		const checkEnv =
			args[0] === "verify:schema" ? (migrationProofEnv ?? {}) : {};
		runClientPnpm(args, checkEnv);
	}
	assert.equal(
		sha256(readFileSync(requireClientFile("pnpm-lock.yaml"))),
		upgradedLockHash,
		"frozen install and verification must not rewrite the upgraded lockfile",
	);

	const evidence = {
		schemaVersion: 1,
		sourceSha: preFixSha,
		fixtureTag,
		manifestSha256: manifestHash,
		archiveSha256: archiveHash,
		upgradeArchiveSha256: upgradeArchiveHash,
		starterVersion,
		upgradeTarget: { tag: targetTag, sha: targetSha },
		upgradeEntries: requiredDeltaPaths,
		upgradeResult: {
			status: applied.status,
			writes: applied.writes,
			regenerated: applied.regenerated,
		},
		proofMode: focusedContinuation ? "focused-continuation" : "full",
		deferredChecks: focusedContinuation
			? [
					{
						command: "pnpm verify:schema",
						reason: "requires the T7 local PostgreSQL migration-safety fixture",
					},
				]
			: [],
		postUpgradeChecks: postUpgradeChecks.map(
			(args) => `pnpm ${args.join(" ")}`,
		),
		clientProof: {
			brand: "src/app/globals.css",
			siteProfile: "src/project/site-profile.config.ts",
			seoRegistry: "docs/seo/SEO_REGISTRY_SEED.csv",
			copy: "src/project/copy.ts",
			legalNap: "src/project/project-literals.json",
			storageExtension: "src/project/storage/local-fs.ts",
		},
	};
	writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
	assert.deepEqual(readJson(evidencePath), evidence);
	assert.equal(git(root, ["tag", "--list"]), sourceTagsBefore);

	console.log(
		`verify:starter-upgrade-propagation: T1/T2/T3/T4 PASS (old client ${preFixSha.slice(0, 8)}, manifest ${manifestHash.slice(0, 12)}, source ${archiveHash.slice(0, 12)}, upgrade ${upgradeArchiveHash.slice(0, 12)})`,
	);
} finally {
	rmSync(proofRoot, { recursive: true, force: true });
}
