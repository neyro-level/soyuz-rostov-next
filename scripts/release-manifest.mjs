import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const fullSha = /^[0-9a-f]{40}$/;
const sha256Digest = /^sha256:[0-9a-f]{64}$/;

function git(root, args) {
	return execFileSync("git", args, {
		cwd: root,
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

function tryGit(root, args) {
	try {
		return git(root, args);
	} catch {
		return null;
	}
}

async function sha256(root, path) {
	const content = await readFile(join(root, path));
	return createHash("sha256").update(content).digest("hex");
}

export async function writeReleaseManifest({
	root = process.cwd(),
	expectedSha,
	requireClean = false,
	artifactReference = null,
	artifactDigest = null,
	buildIdentity = null,
	buildMode = null,
	outputFile = join(root, ".release", "release-manifest.json"),
} = {}) {
	const sourceSha = git(root, ["rev-parse", "HEAD"]);
	const status = git(root, ["status", "--porcelain", "--untracked-files=all"]);
	if (!fullSha.test(sourceSha)) throw new Error("Git HEAD is not a full SHA.");
	if (expectedSha && !fullSha.test(expectedSha)) {
		throw new Error("Expected SHA must be the exact 40-character commit SHA.");
	}
	if (expectedSha && sourceSha !== expectedSha) {
		throw new Error(
			`Source SHA mismatch: expected ${expectedSha}, got ${sourceSha}.`,
		);
	}
	if (requireClean && status) {
		throw new Error("Release manifest requires a clean worktree.");
	}
	if (
		(artifactReference && !artifactDigest) ||
		(!artifactReference && artifactDigest)
	) {
		throw new Error("Artifact reference and digest must be supplied together.");
	}
	if (artifactDigest && !sha256Digest.test(artifactDigest)) {
		throw new Error("Artifact digest must be a full sha256 digest.");
	}
	if (artifactReference && !artifactReference.includes(sourceSha)) {
		throw new Error("Artifact reference must contain the exact source SHA.");
	}
	if (artifactReference && !buildIdentity) {
		throw new Error("Artifact evidence requires a build identity.");
	}

	const packageJson = JSON.parse(
		await readFile(join(root, "package.json"), "utf8"),
	);
	const migrationDir = join(root, "migrations");
	const migrations = existsSync(migrationDir)
		? (await readdir(migrationDir))
				.filter((file) => file.endsWith(".ts") || file.endsWith(".json"))
				.sort()
		: [];
	const checksumFiles = [
		"package.json",
		"pnpm-lock.yaml",
		"Dockerfile",
		"next.config.ts",
	].filter((path) => existsSync(join(root, path)));
	const checksums = Object.fromEntries(
		await Promise.all(
			checksumFiles.map(async (path) => [path, await sha256(root, path)]),
		),
	);

	const manifest = {
		schemaVersion: 2,
		project: packageJson.name,
		version: packageJson.version,
		profile: "REALTY_BASE",
		deliveryProfile: "COMMERCIAL",
		mode: "RELEASE",
		source: {
			branch: git(root, ["branch", "--show-current"]),
			commit: sourceSha,
			originMain: tryGit(root, ["rev-parse", "origin/main"]),
			clean: status.length === 0,
		},
		runtime: {
			node: packageJson.engines?.node,
			packageManager: packageJson.packageManager,
			nextRuntime: "next-start-full-image",
			jobsAutorunOwner: "single production runtime only",
		},
		build: artifactReference
			? {
					identity: buildIdentity,
					mode: buildMode,
					sourceSha,
				}
			: null,
		artifact: {
			format: "docker-image",
			imageName: "ams-realty-baza-starter",
			dockerfile: "Dockerfile",
			reference: artifactReference,
			digest: artifactDigest,
		},
		migrations: migrations.map((file) => basename(file)),
		checksums,
		rollback: {
			strategy:
				"keep previous image tag and previous runtime env; rollback by switching container image back and restarting one jobs owner",
		},
		generatedAt: new Date().toISOString(),
	};

	await mkdir(dirname(outputFile), { recursive: true });
	await writeFile(outputFile, `${JSON.stringify(manifest, null, 2)}\n`);
	return { manifest, outputFile };
}

function option(name) {
	const prefix = `--${name}=`;
	return process.argv
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const result = await writeReleaseManifest({
		expectedSha: option("expected-sha"),
		requireClean: process.argv.includes("--require-clean"),
		artifactReference: option("artifact-reference") ?? null,
		artifactDigest: option("artifact-digest") ?? null,
		buildIdentity: option("build-identity") ?? null,
		buildMode: option("build-mode") ?? null,
		outputFile: option("output") ? resolve(option("output")) : undefined,
	});
	console.log(`Release manifest written: ${result.outputFile}`);
}
