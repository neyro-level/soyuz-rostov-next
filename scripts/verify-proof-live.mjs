import assert from "node:assert/strict";
import { once } from "node:events";
import { createServer } from "node:http";
import {
	parseProofSelection,
	runProofs,
	sanitizeEvidence,
	scenarioDefinitions,
} from "./proof-live.mjs";

const marker = "AMS-PROOF-RUNNER-CONTRACT-0001";
const sha = "1".repeat(40);
const seen = [];
const server = createServer(async (request, response) => {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	const body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
	const scenario = request.url.split("/").at(-1).toUpperCase();
	assert.equal(body.scenario, scenario);
	assert.equal(body.scenarioKind, scenarioDefinitions[scenario]);
	assert.equal(body.proofRunMarker, marker);
	assert.equal(body.fixtureIsolation, "reversible");
	seen.push(scenario);
	let result;
	if (scenario === "B1") {
		result = {
			scenario,
			sourceSha: sha,
			status: "NOT_APPLICABLE",
			reason: "cache mode is http",
		};
	} else if (scenario === "B2") {
		result = {
			scenario,
			sourceSha: sha,
			status: "UNSUPPORTED",
			reason: "mock has no self-call adapter",
		};
	} else {
		result = {
			scenario,
			sourceSha: sha,
			status: "PASS",
			observed: true,
			observationKind: "runtime",
			observedAt: new Date().toISOString(),
			cleanup: scenario === "A" ? "NOT_REQUIRED" : "PASS",
			evidence: {
				counter: 1,
				token: "must-not-leak",
				email: "proof@example.invalid",
				phone: "+70000000000",
			},
		};
	}
	response.writeHead(200, { "content-type": "application/json" });
	response.end(JSON.stringify(result));
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
	const { port } = server.address();
	const origin = `http://127.0.0.1:${port}`;
	const result = await runProofs({
		origin,
		allowedOrigin: origin,
		proofEnvironment: "mock",
		marker,
		proof: "A..G",
		sourceSha: sha,
		fixtureIsolation: "reversible",
	});
	assert.deepEqual(seen, ["A", "B1", "B2", "C", "D", "E", "F", "G"]);
	assert.equal(
		result.results.find((item) => item.scenario === "B1").status,
		"NOT_APPLICABLE",
	);
	assert.equal(
		result.results.find((item) => item.scenario === "B2").status,
		"UNSUPPORTED",
	);
	const serialized = JSON.stringify(result);
	assert.ok(!serialized.includes("must-not-leak"));
	assert.ok(!serialized.includes("proof@example.invalid"));
	assert.ok(!serialized.includes("+70000000000"));
	assert.deepEqual(parseProofSelection("A,B1,G"), ["A", "B1", "G"]);
	assert.throws(() => parseProofSelection("A,Z"), /--proof must be/);
	assert.deepEqual(sanitizeEvidence({ authorization: "Bearer abc", safe: 1 }), {
		authorization: "[REDACTED]",
		safe: 1,
	});
	const dryRun = await runProofs({
		origin,
		allowedOrigin: origin,
		dryRun: true,
		proof: "A,B1",
		sourceSha: sha,
	});
	assert.ok(dryRun.results.every((item) => item.status === "NOT_RUN"));
	console.log(
		"verify:proof-live PASS (dispatcher, runtime verdicts, reasons, cleanup, redaction)",
	);
} finally {
	server.close();
	await once(server, "close");
}
