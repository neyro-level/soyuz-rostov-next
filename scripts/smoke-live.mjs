import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const requiredPaths = ["200", "301", "308", "404", "410"];
const markerPattern = /^AMS-PROOF-[A-Za-z0-9-]{12,}$/;

export function normalizeOrigin(value) {
	const url = new URL(value);
	if (
		url.username ||
		url.password ||
		url.search ||
		url.hash ||
		url.pathname !== "/"
	) {
		throw new Error("Origin must contain only scheme, host and optional port.");
	}
	return url.origin;
}

export function validateProofTarget({
	origin: rawOrigin,
	allowedOrigin: rawAllowedOrigin,
	proofEnvironment = null,
	marker = null,
	dryRun = false,
}) {
	const origin = normalizeOrigin(rawOrigin);
	const allowedOrigin = normalizeOrigin(rawAllowedOrigin);
	if (origin !== allowedOrigin)
		throw new Error("Origin is not explicitly allowlisted.");
	if (proofEnvironment === "production")
		throw new Error("Production smoke is forbidden.");
	if (!dryRun && !["mock", "demo", "staging"].includes(proofEnvironment)) {
		throw new Error(
			"Mutating proof requires --proof-environment=mock|demo|staging.",
		);
	}
	if (
		proofEnvironment === "mock" &&
		!["127.0.0.1", "localhost"].includes(new URL(origin).hostname)
	) {
		throw new Error("Mock proof environment must use localhost.");
	}
	if (
		["demo", "staging"].includes(proofEnvironment) &&
		!origin.startsWith("https://")
	) {
		throw new Error("Remote proof environment requires HTTPS.");
	}
	if (!dryRun && !markerPattern.test(marker ?? "")) {
		throw new Error("Mutating proof requires a unique AMS-PROOF marker.");
	}
	return { origin, allowedOrigin, proofEnvironment, marker, dryRun };
}

function safePath(value, label) {
	if (!value?.startsWith("/") || value.startsWith("//")) {
		throw new Error(`${label} must be an absolute origin-relative path.`);
	}
	const url = new URL(value, "https://proof.invalid");
	if (url.origin !== "https://proof.invalid")
		throw new Error(`${label} escaped the origin.`);
	return `${url.pathname}${url.search}`;
}

function responseHash(text) {
	return createHash("sha256").update(text).digest("hex");
}

async function request(fetchImpl, origin, path, expectedStatus, init = {}) {
	const response = await fetchImpl(new URL(path, origin), {
		redirect: "manual",
		...init,
	});
	const body = await response.text();
	assert.equal(
		response.status,
		expectedStatus,
		`${path} returned ${response.status}.`,
	);
	return {
		method: init.method ?? "GET",
		path,
		status: response.status,
		xRobotsTag: response.headers.get("x-robots-tag"),
		location: response.headers.get("location")
			? new URL(response.headers.get("location"), origin).pathname
			: null,
		bodySha256: responseHash(body),
		body,
	};
}

export function validateSmokeOptions(options) {
	const target = validateProofTarget(options);
	const paths = Object.fromEntries(
		requiredPaths.map((status) => [
			status,
			safePath(options.paths?.[status], `--path-${status}`),
		]),
	);
	return {
		...options,
		...target,
		paths,
		noindexPath: safePath(options.noindexPath, "--noindex-path"),
		robotsPath: safePath(options.robotsPath ?? "/robots.txt", "--robots-path"),
		sitemapPath: safePath(
			options.sitemapPath ?? "/sitemap.xml",
			"--sitemap-path",
		),
		leadPath: safePath(options.leadPath ?? "/api/public/leads", "--lead-path"),
		cleanupPath: options.dryRun
			? null
			: safePath(options.cleanupPath, "--lead-cleanup-path"),
	};
}

export async function runSmoke(rawOptions, fetchImpl = fetch) {
	const options = validateSmokeOptions(rawOptions);
	if (options.dryRun) {
		return {
			schemaVersion: 1,
			origin: options.origin,
			proofEnvironment: options.proofEnvironment ?? "NOT_DECLARED",
			mode: "dry-run",
			checks: requiredPaths.map((status) => ({
				status,
				path: options.paths[status],
			})),
			lead: { status: "NOT_RUN", reason: "dry-run-no-write" },
		};
	}

	const checks = [];
	for (const status of requiredPaths) {
		checks.push(
			await request(
				fetchImpl,
				options.origin,
				options.paths[status],
				Number(status),
			),
		);
	}
	const noindex = await request(
		fetchImpl,
		options.origin,
		options.noindexPath,
		200,
	);
	assert.match(
		noindex.xRobotsTag ?? "",
		/noindex/i,
		"Noindex path lacks X-Robots-Tag.",
	);
	checks.push(noindex);
	const robots = await request(
		fetchImpl,
		options.origin,
		options.robotsPath,
		200,
	);
	assert.match(robots.body, /user-agent:/i, "robots.txt lacks User-agent.");
	checks.push(robots);
	const sitemap = await request(
		fetchImpl,
		options.origin,
		options.sitemapPath,
		200,
	);
	assert.ok(
		!sitemap.body.includes(new URL(options.noindexPath, options.origin).href),
		"Noindex URL must be absent from sitemap.",
	);
	checks.push(sitemap);

	const now = new Date().toISOString();
	const leadPayload = {
		name: `AMS Synthetic Proof ${options.marker}`,
		phone: "+70000000000",
		email: `${options.marker.toLowerCase()}@example.invalid`,
		message: `SYNTHETIC TEST LEAD — DELETE AFTER PROOF — ${options.marker}`,
		formKind: "general",
		sourcePage: "/",
		referrer: "/",
		consentAccepted: true,
		consentVersion: "pd-2026-01",
		honeypot: "",
		renderedAt: now,
		submittedAt: now,
		requestAttemptId: randomUUID(),
		proofRunMarker: options.marker,
		synthetic: true,
	};
	const lead = await request(fetchImpl, options.origin, options.leadPath, 200, {
		method: "POST",
		headers: {
			"content-type": "application/json",
			"x-ams-proof-run-marker": options.marker,
		},
		body: JSON.stringify(leadPayload),
	});
	const cleanup = await request(
		fetchImpl,
		options.origin,
		options.cleanupPath,
		200,
		{
			method: "DELETE",
			headers: {
				"content-type": "application/json",
				"x-ams-proof-run-marker": options.marker,
			},
			body: JSON.stringify({ marker: options.marker }),
		},
	);
	const cleanupResult = JSON.parse(cleanup.body);
	assert.equal(
		cleanupResult.reconciled,
		true,
		"Synthetic lead cleanup was not reconciled.",
	);
	assert.equal(
		cleanupResult.marker,
		options.marker,
		"Cleanup marker mismatch.",
	);

	return {
		schemaVersion: 1,
		origin: options.origin,
		proofEnvironment: options.proofEnvironment,
		proofRunMarker: options.marker,
		mode: "mutating-with-reconciliation",
		checkedAt: new Date().toISOString(),
		checks: checks.map(({ body: _body, ...evidence }) => evidence),
		lead: {
			status: "PASS",
			evidence: (({ body: _body, ...rest }) => rest)(lead),
		},
		cleanup: {
			status: "PASS",
			evidence: (({ body: _body, ...rest }) => rest)(cleanup),
		},
	};
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
	const origin = process.argv.slice(2).find((value) => !value.startsWith("--"));
	if (!origin)
		throw new Error(
			"Usage: smoke-live.mjs <origin> --allow-origin=<origin> ...",
		);
	const marker = option("proof-run-marker");
	const result = await runSmoke({
		origin,
		allowedOrigin: option("allow-origin"),
		proofEnvironment: option("proof-environment"),
		marker,
		dryRun: process.argv.includes("--dry-run"),
		paths: Object.fromEntries(
			requiredPaths.map((status) => [status, option(`path-${status}`)]),
		),
		noindexPath: option("noindex-path"),
		robotsPath: option("robots-path"),
		sitemapPath: option("sitemap-path"),
		leadPath: option("lead-path"),
		cleanupPath: option("lead-cleanup-path"),
	});
	const fileMarker = marker?.replace(/[^A-Za-z0-9-]/g, "-") ?? "dry-run";
	const outputDir = join(process.cwd(), ".release");
	const outputFile = join(outputDir, `smoke-live-${fileMarker}.json`);
	await mkdir(outputDir, { recursive: true });
	await writeFile(outputFile, `${JSON.stringify(result, null, 2)}\n`);
	console.log(`Smoke evidence written: ${outputFile}`);
}
