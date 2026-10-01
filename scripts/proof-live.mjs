import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProofTarget } from "./smoke-live.mjs";

export const scenarioDefinitions = {
	A: "heartbeat",
	B1: "in-process-invalidation-when-claimed",
	B2: "http-self-call-in-base",
	C: "dispatcher-no-catch-up",
	D: "stale-import-recovery",
	E: "retention",
	F: "lead-outbox-crash-window",
	G: "retryable-delivery",
};
const scenarioIds = Object.keys(scenarioDefinitions);
const resultStatuses = ["PASS", "NOT_APPLICABLE", "UNSUPPORTED", "FAIL"];
const sensitiveKey =
	/secret|token|password|authorization|cookie|phone|email|name|payload|body/i;

export function parseProofSelection(value) {
	if (value === "A..G") return [...scenarioIds];
	const selected =
		value
			?.split(",")
			.map((item) => item.trim().toUpperCase())
			.filter(Boolean) ?? [];
	if (
		!selected.length ||
		selected.some((item) => !scenarioIds.includes(item))
	) {
		throw new Error(
			"--proof must be A..G or a comma-separated subset of A,B1,B2,C,D,E,F,G.",
		);
	}
	return [...new Set(selected)];
}

export function sanitizeEvidence(value, key = "") {
	if (sensitiveKey.test(key)) return "[REDACTED]";
	if (Array.isArray(value)) return value.map((item) => sanitizeEvidence(item));
	if (value && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value).map(([childKey, childValue]) => [
				childKey,
				sanitizeEvidence(childValue, childKey),
			]),
		);
	}
	if (typeof value === "string") {
		return value
			.replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
			.replace(/\+?\d[\d ()-]{8,}\d/g, "[REDACTED_PHONE]")
			.replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [REDACTED]");
	}
	return value;
}

function assertRuntimeResult(scenario, result, sourceSha) {
	assert.equal(
		result.scenario,
		scenario,
		`Scenario ${scenario} response identity mismatch.`,
	);
	assert.ok(
		resultStatuses.includes(result.status),
		`Scenario ${scenario} returned unsupported status.`,
	);
	assert.equal(
		result.sourceSha,
		sourceSha,
		`Scenario ${scenario} observed a different deployed SHA.`,
	);
	if (["NOT_APPLICABLE", "UNSUPPORTED", "FAIL"].includes(result.status)) {
		assert.ok(
			result.reason?.trim(),
			`Scenario ${scenario} ${result.status} requires an exact reason.`,
		);
	}
	if (result.status === "PASS") {
		assert.equal(
			result.observed,
			true,
			`Scenario ${scenario} cannot PASS without runtime observation.`,
		);
		assert.ok(
			["runtime", "live"].includes(result.observationKind),
			`Scenario ${scenario} cannot PASS from static inspection.`,
		);
		assert.ok(
			!Number.isNaN(Date.parse(result.observedAt)),
			`Scenario ${scenario} needs observedAt.`,
		);
		if (scenario !== "A") {
			assert.equal(
				result.cleanup,
				"PASS",
				`Scenario ${scenario} requires fixture cleanup.`,
			);
		}
	}
}

export async function runProofs(rawOptions, fetchImpl = fetch) {
	const target = validateProofTarget(rawOptions);
	const scenarios = parseProofSelection(rawOptions.proof);
	const sourceSha = rawOptions.sourceSha;
	if (!/^[0-9a-f]{40}$/.test(sourceSha ?? "")) {
		throw new Error("Proof evidence requires an exact full source SHA.");
	}
	if (!rawOptions.dryRun && rawOptions.fixtureIsolation !== "reversible") {
		throw new Error("Live proof requires --fixture-isolation=reversible.");
	}
	const scenarioBasePath =
		rawOptions.scenarioBasePath ?? "/api/internal/proofs";
	if (!scenarioBasePath.startsWith("/") || scenarioBasePath.startsWith("//")) {
		throw new Error("Scenario base path must stay on the allowlisted origin.");
	}
	const requestedAt = new Date().toISOString();
	const results = [];
	for (const scenario of scenarios) {
		if (rawOptions.dryRun) {
			results.push({
				scenario,
				status: "NOT_RUN",
				reason: "dry-run-no-request",
			});
			continue;
		}
		const endpoint = new URL(
			`${scenarioBasePath}/${scenario.toLowerCase()}`,
			target.origin,
		);
		const response = await fetchImpl(endpoint, {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-ams-proof-run-marker": target.marker,
			},
			body: JSON.stringify({
				scenario,
				scenarioKind: scenarioDefinitions[scenario],
				proofRunMarker: target.marker,
				sourceSha,
				requestedAt,
				fixtureIsolation: "reversible",
			}),
		});
		assert.equal(
			response.status,
			200,
			`Scenario ${scenario} returned HTTP ${response.status}.`,
		);
		const result = await response.json();
		assertRuntimeResult(scenario, result, sourceSha);
		results.push(sanitizeEvidence(result));
	}
	return {
		schemaVersion: 1,
		sourceSha,
		origin: target.origin,
		proofEnvironment: target.proofEnvironment ?? "NOT_DECLARED",
		proofRunMarker: target.marker,
		requestedAt,
		completedAt: new Date().toISOString(),
		mode: rawOptions.dryRun ? "dry-run" : "runtime-dispatch",
		scenarioDefinitions,
		results,
	};
}

function option(name) {
	const prefix = `--${name}=`;
	return process.argv
		.find((value) => value.startsWith(prefix))
		?.slice(prefix.length);
}

function gitHead() {
	return execFileSync("git", ["rev-parse", "HEAD"], {
		cwd: process.cwd(),
		encoding: "utf8",
	}).trim();
}

if (
	process.argv[1] &&
	resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
	const result = await runProofs({
		origin: option("origin"),
		allowedOrigin: option("allow-origin"),
		proofEnvironment: option("proof-environment"),
		marker: option("proof-run-marker"),
		dryRun: process.argv.includes("--dry-run"),
		proof: option("proof"),
		sourceSha: gitHead(),
		fixtureIsolation: option("fixture-isolation"),
		scenarioBasePath: option("scenario-base-path"),
	});
	const outputDir = join(process.cwd(), "docs", "proofs", result.sourceSha);
	const stamp = result.requestedAt.replaceAll(":", "-");
	const outputFile = join(outputDir, `proof-${stamp}.json`);
	await mkdir(outputDir, { recursive: true });
	await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`);
	console.log(`Proof evidence written: ${outputFile}`);
}
