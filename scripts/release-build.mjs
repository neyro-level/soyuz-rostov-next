import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { writeReleaseManifest } from "./release-manifest.mjs";

const fullSha = /^[0-9a-f]{40}$/;
const sha256Digest = /^sha256:[0-9a-f]{64}$/;

function option(name) {
	const prefix = `--${name}=`;
	return process.argv
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

function git(args) {
	return execFileSync("git", args, {
		cwd: process.cwd(),
		encoding: "utf8",
		stdio: ["ignore", "pipe", "pipe"],
	}).trim();
}

export async function runReleaseBuild({
	expectedSha,
	imageReference,
	dryRun = false,
	fixtureDigest = null,
} = {}) {
	if (!fullSha.test(expectedSha ?? "")) {
		throw new Error(
			"release:build requires --expected-sha=<exact 40-character SHA>.",
		);
	}
	git(["cat-file", "-e", `${expectedSha}^{commit}`]);
	const head = git(["rev-parse", "HEAD"]);
	if (head !== expectedSha) {
		throw new Error(
			`Release source mismatch: expected ${expectedSha}, got ${head}.`,
		);
	}
	if (git(["status", "--porcelain", "--untracked-files=all"])) {
		throw new Error("release:build requires a clean worktree.");
	}

	const reference = imageReference ?? `ams-realty-baza-starter:${expectedSha}`;
	if (!reference.includes(expectedSha)) {
		throw new Error(
			"Immutable image reference must contain the exact source SHA.",
		);
	}

	let digest;
	if (dryRun) {
		if (!sha256Digest.test(fixtureDigest ?? "")) {
			throw new Error(
				"Dry-run requires --artifact-digest=<sha256 fixture digest>.",
			);
		}
		digest = fixtureDigest;
	} else {
		execFileSync(
			"docker",
			[
				"build",
				"--label",
				`org.opencontainers.image.revision=${expectedSha}`,
				"--tag",
				reference,
				"--file",
				"Dockerfile",
				".",
			],
			{ cwd: process.cwd(), stdio: "inherit" },
		);
		digest = execFileSync(
			"docker",
			["image", "inspect", "--format", "{{.Id}}", reference],
			{
				cwd: process.cwd(),
				encoding: "utf8",
			},
		).trim();
		if (!sha256Digest.test(digest)) {
			throw new Error(
				"Docker image inspection did not return a full sha256 digest.",
			);
		}
	}

	return writeReleaseManifest({
		expectedSha,
		requireClean: true,
		artifactReference: reference,
		artifactDigest: digest,
		buildIdentity: "release-build-v1/dockerfile",
		buildMode: dryRun ? "dry-run-fixture" : "docker-build",
	});
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const result = await runReleaseBuild({
		expectedSha: option("expected-sha"),
		imageReference: option("image"),
		dryRun: process.argv.includes("--dry-run"),
		fixtureDigest: option("artifact-digest"),
	});
	console.log(
		`Release ${result.manifest.build.mode} evidence written: ${result.outputFile}`,
	);
}
