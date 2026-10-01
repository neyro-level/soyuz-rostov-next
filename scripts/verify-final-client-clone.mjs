import assert from "node:assert/strict";
import { execFileSync, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import {
	cpSync,
	existsSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
	hashStarterOwnedFiles,
	starterOwnedFiles,
} from "./starter-ownership.mjs";

const root = process.cwd();
const matrix = [
	{
		name: "souz",
		presetFile: "docs/CLONE_PRESET.souz.example.json",
	},
	{
		name: "newbuild-first",
		preset: "NEWBUILD_FIRST",
		geoMode: "SINGLE_GEO",
		geoCount: 1,
	},
	{
		name: "secondary-first",
		preset: "SECONDARY_FIRST",
		geoMode: "SINGLE_GEO",
		geoCount: 1,
	},
	{ name: "multi-geo", preset: "MIXED", geoMode: "MULTI_GEO", geoCount: 2 },
	{
		name: "districts-legacy",
		preset: "MIXED",
		geoMode: "SINGLE_GEO",
		geoCount: 1,
		districtsLegacy: true,
	},
];
const runtimeMatrix = process.env.AMS_CLONE_RUNTIME === "1";
const selectedProfile = process.env.AMS_CLONE_PROFILE;
const selectedMatrix = selectedProfile
	? matrix.filter((entry) => entry.name === selectedProfile)
	: matrix;
assert.ok(
	selectedMatrix.length,
	`Unknown AMS_CLONE_PROFILE: ${selectedProfile}`,
);

function git(cwd, args) {
	return execFileSync("git", args, {
		cwd,
		encoding: "utf8",
		maxBuffer: 32 * 1024 * 1024,
		stdio: ["ignore", "pipe", "pipe"],
	});
}

function hash(value) {
	return createHash("sha256").update(value).digest("hex");
}

function pnpm(cwd, args, environment) {
	const cli = process.env.npm_execpath;
	assert.ok(cli, "pnpm CLI path is unavailable from npm_execpath");
	const isNativeExecutable = /\.(?:exe|cmd|bat)$/i.test(cli);
	return execFileSync(isNativeExecutable ? cli : process.execPath, [
		...(isNativeExecutable ? [] : [cli]),
		...args,
	], {
		cwd,
		env: environment,
		stdio: "pipe",
		maxBuffer: 64 * 1024 * 1024,
	});
}

function safeFailure(entry, step, error) {
	const exitCode =
		typeof error === "object" && error && "status" in error
			? String(error.status ?? "unknown")
			: "unknown";
	const diagnostic =
		process.env.AMS_CLONE_DEBUG === "1"
			? `\n${
					[error?.stdout, error?.stderr, error?.message]
						.filter((value) => value !== undefined && String(value).trim())
						.map(String)
						.join("\n") || "unknown failure"
				}`
			: "";
	return new Error(
		`verify:clone-matrix: ${entry.name} FAIL at ${step} (exit ${exitCode}); command output omitted and disposable worktree removed${diagnostic}`,
	);
}

const wait = (milliseconds) =>
	new Promise((resolvePromise) => setTimeout(resolvePromise, milliseconds));

async function availablePort() {
	return new Promise((resolvePromise, reject) => {
		const server = createServer();
		server.once("error", reject);
		server.listen(0, "127.0.0.1", () => {
			const address = server.address();
			const port = typeof address === "object" && address ? address.port : 0;
			server.close((error) => (error ? reject(error) : resolvePromise(port)));
		});
	});
}

function docker(args, options = {}) {
	return execFileSync("docker", args, {
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
		...options,
	}).trim();
}

function dockerContainerExists(containerName) {
	try {
		docker(["inspect", "--format", "{{.Id}}", containerName]);
		return true;
	} catch (error) {
		if (
			error?.status === 1 &&
			/no such object/i.test(String(error?.stderr ?? ""))
		)
			return false;
		throw error;
	}
}

function processExists(processId) {
	try {
		process.kill(processId, 0);
		return true;
	} catch {
		return false;
	}
}

async function waitForPostgres(containerName) {
	for (let attempt = 0; attempt < 60; attempt += 1) {
		try {
			if (
				docker([
					"exec",
					containerName,
					"pg_isready",
					"-U",
					"postgres",
					"-d",
					"clone_runtime",
				]).includes("accepting connections")
			)
				return;
		} catch {}
		await wait(1000);
	}
	throw new Error("Disposable PostgreSQL did not become ready.");
}

async function waitForHttp(origin, serverProcess, serverLogs) {
	for (let attempt = 0; attempt < 90; attempt += 1) {
		if (serverProcess.exitCode !== null) {
			throw new Error(
				`Disposable Next runtime exited before readiness. ${serverLogs().slice(-1000)}`,
			);
		}
		try {
			const response = await fetch(`${origin}/robots.txt`);
			if (response.status === 200) return;
		} catch {}
		await wait(1000);
	}
	throw new Error(
		`Disposable Next runtime did not become ready. ${serverLogs().slice(-1000)}`,
	);
}

function findStatusPath(bootstrap, status) {
	for (const [category, value] of Object.entries(
		bootstrap.categoryStatus ?? {},
	)) {
		if (value === status) return `/${category}/`;
	}
	for (const [geo, categories] of Object.entries(
		bootstrap.geoCategoryStatus ?? {},
	)) {
		for (const [category, value] of Object.entries(categories)) {
			if (value === status) return `/${geo}/${category}/`;
		}
	}
	for (const geo of bootstrap.geos ?? [])
		if (geo.hubStatus === status) return `/${geo.slug}/`;
	return null;
}

async function proveRuntime(origin, bootstrap) {
	const request = async (path, expected) => {
		const response = await fetch(new URL(path, origin), { redirect: "manual" });
		const body = await response.text();
		assert.equal(
			response.status,
			expected,
			`${path} expected ${expected}, got ${response.status}: ${body.slice(0, 500)}`,
		);
		return { response, body };
	};
	const activePath = `/${bootstrap.primaryGeo}/`;
	await request(activePath, 200);
	for (const status of ["PREPARED_OFF", "OUT"]) {
		const path = findStatusPath(bootstrap, status);
		assert.ok(path, `${status} route is required for runtime proof`);
		await request(path, 404);
	}
	const legacy = bootstrap.legacyRoutes?.[0];
	assert.ok(legacy, "runtime proof requires an exact legacy route");
	const legacyResult = await request(legacy.from, 301);
	assert.equal(
		new URL(legacyResult.response.headers.get("location"), origin).pathname,
		legacy.to,
	);
	const direct = await request(legacy.to, 200);
	assert.ok(
		direct.response.status < 300,
		"legacy target must not redirect again",
	);
	const draft =
		bootstrap.seoRegistry.rows.find(
			(row) => row.status === "draft" && row.url === activePath,
		) ?? bootstrap.seoRegistry.rows.find((row) => row.status === "draft");
	assert.ok(draft, "runtime proof requires a draft registry row");
	const draftResult = await request(draft.url, 200);
	assert.match(
		`${draftResult.response.headers.get("x-robots-tag") ?? ""}\n${draftResult.body}`,
		/noindex/i,
	);
	const robots = await request("/robots.txt", 200);
	assert.match(robots.body, /user-agent:/i);
	assert.match(robots.body, /disallow:\s*\//i);
}

for (const entry of selectedMatrix) {
	const clone = mkdtempSync(join(tmpdir(), `ams-plan10-${entry.name}-`));
	const presetPath = join(
		tmpdir(),
		`ams-plan10-${entry.name}-${process.pid}.json`,
	);
	let step = "create disposable worktree";
	let containerName = "";
	let containerStarted = false;
	let serverProcess = null;
	let serverOutput = "";
	let taskFailure = null;
	let cleanupFailure = null;
	try {
		execFileSync("git", ["worktree", "add", "--detach", clone, "HEAD"], {
			cwd: root,
			stdio: "pipe",
		});
		for (const relativePath of new Set([
			...starterOwnedFiles(root),
			"public/brand/logo.svg",
			"scripts/seo-registry.ts",
			"scripts/seo-registry-output.mjs",
			"scripts/seo-registry-output.d.mts",
			"scripts/verify-clone-bootstrap.mjs",
			"scripts/verify-site-profile.ts",
			"scripts/quality/seo-template-ownership.mjs",
			"src/project/client-readiness.config.ts",
			"src/app/icon.svg",
			"src/app/layout.tsx",
			"src/app/globals.css",
			"src/project/font.generated.ts",
			"src/project/project-literals.json",
			"src/project/seo/templates.ts",
			"src/project/seo/template-inputs.ts",
			"src/project/site-profile.config.ts",
			"src/project/site-profile.config.types.ts",
			"src/project/site-profile.ts",
			"src/project/routing/runtime-route.ts",
			"src/project/routing/legacy-route-manifest.ts",
		])) {
			mkdirSync(dirname(join(clone, relativePath)), { recursive: true });
			cpSync(join(root, relativePath), join(clone, relativePath));
		}
		step = "compose approved preset";
		const primarySlug = `${entry.name}-city`;
		const geos = entry.presetFile
			? []
			: [
					{
						slug: primarySlug,
						title: "Тестоград",
						published: true,
						hubStatus: "ACTIVE",
						morphologyApproved: true,
						morphology: {
							nominative: "Тестоград",
							genitive: "Тестограда",
							prepositional: "Тестограде",
							preposition: "в",
						},
						districts: entry.districtsLegacy
							? [
									{
										slug: "centralnyy",
										name: "Центральный район",
										type: "admin_district",
										locative: "Центральном районе",
										adjLocative: "Центральном",
										adjGenitive: "Центрального",
										preposition: "в",
										synonyms: ["Центр"],
										parent: null,
									},
								]
							: [],
					},
					...Array.from({ length: entry.geoCount - 1 }, (_, index) =>
						entry.geoMode === "MULTI_GEO"
							? {
									slug: `${entry.name}-satellite-${index + 1}`,
									title: `Спутник ${index + 1}`,
									published: true,
									hubStatus: "NOINDEX_AUTO",
									morphologyApproved: true,
									morphology: {
										nominative: `Спутник ${index + 1}`,
										genitive: `Спутника ${index + 1}`,
										prepositional: `Спутнике ${index + 1}`,
										preposition: "в",
									},
									districts: [],
									agglomerationOf: primarySlug,
								}
							: {
									slug: `${entry.name}-inactive-${index + 1}`,
									title: `Резерв ${index + 1}`,
									published: false,
									hubStatus: "PREPARED_OFF",
									morphologyApproved: true,
									morphology: {
										nominative: `Резерв ${index + 1}`,
										genitive: `Резерва ${index + 1}`,
										prepositional: `Резерве ${index + 1}`,
										preposition: "в",
									},
									districts: [],
									agglomerationOf: primarySlug,
								},
					),
				];
		const seoTemplates = JSON.parse(
			readFileSync(join(root, "docs/CLONE_SEO_TEMPLATES.example.json"), "utf8"),
		);
		const clientExample = JSON.parse(
			readFileSync(join(root, "docs/CLONE_PRESET.example.json"), "utf8"),
		);
		const categoryStatus = {
			kvartiry: "ACTIVE",
			doma: "PREPARED_OFF",
			uchastki: "ACTIVE",
			"kommercheskaya-nedvizhimost": "ACTIVE",
			komnaty: "OUT",
			garazhi: "ACTIVE",
			arenda: "ACTIVE",
			novostroyki: "ACTIVE",
			"kottedzhnye-poselki": "ACTIVE",
		};
		const preset = entry.presetFile
			? JSON.parse(readFileSync(join(root, entry.presetFile), "utf8"))
			: {
					schemaVersion: 3,
					projectId: `P8-24 ${entry.preset}`,
					packageName: `s13-${entry.name}`,
					brandName: `Агентство ${entry.name}`,
					defaultDescription: `Клиентский проект ${entry.preset}`,
					domain: `${entry.name}.client-proof.local`,
					preset: entry.preset,
					geoMode: entry.geoMode,
					primaryGeo: primarySlug,
					productionIndexing: "noindex",
					searchConsole: structuredClone(clientExample.searchConsole),
					region: {
						slug: `${entry.name}-region`,
						name: "Тестовый край",
						genitive: "Тестового края",
						locative: "Тестовом крае",
						shortName: "Тестовый край",
					},
					geos,
					categoryStatus,
					geoCategoryStatus: Object.fromEntries(
						geos.map((geo) => [geo.slug, categoryStatus]),
					),
					seoFacets: {},
					seoTiers: clientExample.seoTiers,
					staticRoutes: clientExample.staticRoutes,
					legacyRoutes: [
						{
							from: `/legacy-${entry.name}`,
							to: `/${primarySlug}/`,
							statusCode: 301,
						},
					],
					legacyPatterns: clientExample.legacyPatterns,
					nap: {
						phone: "+7 900 000-00-00",
						email: `hello@${entry.name}.local`,
						address: "Тестоград",
						workingHours: "09:00-18:00",
					},
					brand: structuredClone(clientExample.brand),
					brandAssets: {
						status: "ready",
						logoPath: "/brand/logo.svg",
						faviconPath: "/icon.svg",
						tokenSource: "src/app/globals.css",
					},
					feed:
						entry.preset === "NEWBUILD_FIRST"
							? { status: "not_required", mode: "external-urls" }
							: { status: "ready", mode: "external-urls" },
					developmentExcel: {
						status:
							entry.preset === "SECONDARY_FIRST" ? "not_required" : "ready",
						template: "client-developments.xlsx",
					},
					clientReadiness: {
						deploymentTarget: "approved-runtime",
						database: "approved-managed-postgresql",
						mediaStorage: "approved-object-storage",
						feedImageSource: "external-urls",
						jobsActiveRuntimeCount: 1,
						leadRetentionDays: 180,
						archiveRetentionDays: 90,
						legalContent: "approved",
						requiredHostAllowlists: {
							outbound: [`api.${entry.name}.local`],
							externalImages: [`images.${entry.name}.local`],
							leadOutbound: [`crm.${entry.name}.local`],
						},
						nginx: true,
						automaticBackup: true,
						externalMonitoring: true,
					},
					seoTemplates,
				};
		if (!entry.presetFile) writeFileSync(presetPath, JSON.stringify(preset));
		const effectivePresetPath = entry.presetFile
			? join(root, entry.presetFile)
			: presetPath;
		const protectedPaths = [
			"src/core",
			"packages",
			"migrations",
			"scripts/quality",
		];
		const protectedBaseline = hash(
			git(clone, ["diff", "--binary", "--", ...protectedPaths]),
		);
		const args = [
			join(clone, "scripts/clone-prepare.mjs"),
			`--root=${clone}`,
			`--preset-file=${effectivePresetPath}`,
			"--source-tag=starter-v2.2.0",
			`--source-sha=${git(root, ["rev-parse", "HEAD"]).trim()}`,
			`--release-manifest=${join(clone, ".starter-release-proof.json")}`,
			"--date=2026-09-25T00:00:00.000Z",
		];
		const proofEnvironment = {
			...process.env,
			AMS_CLONE_PROOF_MODE: "1",
			NEXT_TELEMETRY_DISABLED: "1",
			NODE_OPTIONS: "--max-old-space-size=1024",
		};
		writeFileSync(
			join(clone, ".starter-release-proof.json"),
			JSON.stringify({
				schemaVersion: 1,
				status: "released",
				tag: "starter-v2.2.0",
				sha: git(root, ["rev-parse", "HEAD"]).trim(),
				starterOwnedManifestVersion: 2,
				hashes: hashStarterOwnedFiles(clone),
			}),
		);
		step = "install locked dependencies";
		pnpm(clone, ["install", "--frozen-lockfile"], proofEnvironment);
		step = "prepare client clone";
		execFileSync(process.execPath, args, {
			cwd: clone,
			env: proofEnvironment,
			stdio: "pipe",
		});
		step = "validate client bootstrap";
		execFileSync(
			process.execPath,
			[join(clone, "scripts/verify-clone-bootstrap.mjs"), `--root=${clone}`],
			{ cwd: clone, stdio: "pipe" },
		);
		step = "prove repeat safety";
		const firstDiffHash = hash(git(clone, ["diff"]));
		execFileSync(process.execPath, args, {
			cwd: clone,
			env: proofEnvironment,
			stdio: "pipe",
		});
		assert.equal(
			hash(git(clone, ["diff"])),
			firstDiffHash,
			`${entry.preset} repeat must be idempotent`,
		);
		step = "generate and check client SEO registry";
		pnpm(clone, ["seo:registry:generate"], proofEnvironment);
		pnpm(clone, ["seo:registry:check"], proofEnvironment);
		step = "verify prepared site profile";
		pnpm(clone, ["verify:site-profile"], proofEnvironment);
		step = "typecheck prepared client";
		pnpm(clone, ["typecheck"], proofEnvironment);
		if (runtimeMatrix) {
			step = "build prepared client";
			pnpm(clone, ["build"], proofEnvironment);
			step = "start disposable PostgreSQL";
			containerName = `ams-plan11-${process.pid}-${entry.name}`.replace(
				/[^a-z0-9_.-]/g,
				"-",
			);
			docker([
				"run",
				"-d",
				"--rm",
				"--name",
				containerName,
				"-e",
				"POSTGRES_PASSWORD=fixture-clone-runtime-password",
				"-e",
				"POSTGRES_DB=clone_runtime",
				"-p",
				"127.0.0.1::5432",
				"postgres:18-alpine",
			]);
			containerStarted = true;
			await waitForPostgres(containerName);
			const mapped = docker(["port", containerName, "5432/tcp"]);
			const databasePort = mapped.split(":").at(-1).trim();
			const appPort = await availablePort();
			const origin = `http://127.0.0.1:${appPort}`;
			const bootstrap = JSON.parse(
				readFileSync(join(clone, "docs/CLIENT_BOOTSTRAP.json"), "utf8"),
			);
			const mediaDir = join(clone, ".runtime-media");
			mkdirSync(mediaDir, { recursive: true });
			const runtimeEnvironment = {
				...proofEnvironment,
				AMS_PROFILE: "REALTY_BASE",
				TZ: "Europe/Moscow",
				DATABASE_URI: `postgresql://postgres:fixture-clone-runtime-password@127.0.0.1:${databasePort}/clone_runtime`,
				PAYLOAD_SECRET: "clone-runtime-payload-secret-at-least-32-characters",
				REVALIDATE_SECRET:
					"clone-runtime-revalidate-secret-at-least-32-characters",
				INTERNAL_HEALTH_SECRET:
					"clone-runtime-health-secret-at-least-32-characters",
				NEXT_PUBLIC_SERVER_URL: `https://${bootstrap.domain}`,
				INTERNAL_REVALIDATE_BASE_URL: origin,
				MEDIA_DIR: mediaDir,
				ARCHIVE_RETENTION_DAYS: "30",
				JOBS_AUTORUN: "false",
				PAYLOAD_DB_PUSH: "false",
			};
			step = "run migrations";
			pnpm(clone, ["payload:migrate"], runtimeEnvironment);
			step = "seed geo";
			pnpm(clone, ["clone:seed-geo"], runtimeEnvironment);
			step = "start disposable client runtime";
			serverProcess = spawn(
				/\.(?:exe|cmd|bat)$/i.test(process.env.npm_execpath ?? "")
					? process.env.npm_execpath
					: process.execPath,
				[
					...(/\.(?:exe|cmd|bat)$/i.test(process.env.npm_execpath ?? "")
						? []
						: [process.env.npm_execpath]),
					"exec",
					"next",
					"start",
					"-p",
					String(appPort),
				],
				{
					cwd: clone,
					env: { ...runtimeEnvironment, NODE_ENV: "production" },
					stdio: ["ignore", "pipe", "pipe"],
				},
			);
			serverProcess.stdout.on("data", (chunk) => {
				serverOutput = `${serverOutput}${chunk}`.slice(-10000);
			});
			serverProcess.stderr.on("data", (chunk) => {
				serverOutput = `${serverOutput}${chunk}`.slice(-10000);
			});
			await waitForHttp(origin, serverProcess, () => serverOutput);
			step = "run HTTP smoke";
			try {
				await proveRuntime(origin, bootstrap);
			} catch (error) {
				throw new Error(
					`${String(error?.message ?? error)}\n${serverOutput.slice(-2000)}`,
				);
			}
		}
		assert.equal(
			hash(git(clone, ["diff", "--binary", "--", ...protectedPaths])),
			protectedBaseline,
			"clone:prepare changed a protected platform path",
		);
		assert.match(
			readFileSync(join(clone, "src/project/site-profile.config.ts"), "utf8"),
			new RegExp(entry.preset),
		);
		assert.match(
			readFileSync(join(clone, "src/project/routing/runtime-route.ts"), "utf8"),
			/resolveEmptyClientRuntimeRoute/,
		);
		assert.match(
			readFileSync(join(clone, "src/project/site.config.ts"), "utf8"),
			/projectKind:\s*["']client["']/,
			"prepared tree must disable the starter fixture runtime",
		);
		const clientOwnedFiles = [
			"docs/CLIENT_BOOTSTRAP.json",
			"docs/CLONE_PROVENANCE.md",
			"docs/seo/DISTRICTS.csv",
			"docs/seo/SEO_REGISTRY_SEED.csv",
			"src/project/client-readiness.config.ts",
			"src/project/project-literals.json",
			"src/project/seo/registry-seed.ts",
			"src/project/seo/template-inputs.ts",
			"src/project/site-profile.config.ts",
		];
		for (const relativePath of clientOwnedFiles) {
			assert.doesNotMatch(
				readFileSync(join(clone, relativePath), "utf8"),
				/primorsk|приморск/iu,
				`${relativePath} retained starter fixture content`,
			);
		}
		assert.equal(
			JSON.parse(readFileSync(join(clone, "package.json"), "utf8"))
				.dependencies?.["@payloadcms/storage-s3"],
			undefined,
			"clone:prepare must not activate S3 storage",
		);
		assert.equal(
			JSON.parse(readFileSync(join(clone, "package.json"), "utf8")).scripts?.[
				"clone:seed-geo"
			],
			"node --conditions=react-server ./node_modules/payload/bin.js run scripts/clone-seed-geo.ts",
			"prepared clone must retain the explicit geo seed command",
		);
		console.log(
			`verify:clone-matrix: ${entry.name} PASS (client-kind + fixture-free outputs + registry URLs + typecheck + idempotence)`,
		);
	} catch (error) {
		taskFailure = safeFailure(entry, step, error);
	} finally {
		if (serverProcess && serverProcess.exitCode === null) {
			try {
				if (process.platform === "win32")
					execFileSync(
						"taskkill",
						["/PID", String(serverProcess.pid), "/T", "/F"],
						{ stdio: "ignore" },
					);
				else serverProcess.kill("SIGTERM");
			} catch {}
			await wait(250);
			if (processExists(serverProcess.pid))
				cleanupFailure ??= new Error(
					`Disposable process leaked: ${serverProcess.pid}`,
				);
		}
		serverProcess?.stdout?.destroy();
		serverProcess?.stderr?.destroy();
		serverProcess?.unref();
		if (containerName) {
			try {
				docker(["rm", "-f", containerName]);
			} catch {}
			if (containerStarted) {
				try {
					if (dockerContainerExists(containerName))
						cleanupFailure ??= new Error(
							`Disposable container leaked: ${containerName}`,
						);
				} catch (error) {
					cleanupFailure ??= new Error(
						`Unable to prove disposable container cleanup: ${String(error?.message ?? error)}`,
					);
				}
			}
		}
		try {
			execFileSync("git", ["worktree", "remove", "--force", clone], {
				cwd: root,
				stdio: "pipe",
			});
		} catch {
			rmSync(clone, { recursive: true, force: true });
		}
		if (existsSync(clone))
			cleanupFailure ??= new Error(`Disposable worktree leaked: ${clone}`);
		rmSync(presetPath, { force: true });
	}
	if (cleanupFailure) throw cleanupFailure;
	if (taskFailure) throw taskFailure;
}

console.log(
	`verify:clone-matrix: PASS (${selectedMatrix.length} profiles, no source-worktree or protected platform mutation)`,
);
