import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { runSmoke, validateSmokeOptions } from "./smoke-live.mjs";

const marker = "AMS-PROOF-LOCAL-CONTRACT-0001";
let postedMarker = null;
let reconciled = false;
const server = createServer(async (request, response) => {
	const chunks = [];
	for await (const chunk of request) chunks.push(chunk);
	const body = chunks.length
		? JSON.parse(Buffer.concat(chunks).toString("utf8"))
		: null;
	const path = new URL(request.url, "http://localhost").pathname;
	if (request.method === "POST" && path === "/api/public/leads") {
		assert.equal(body.synthetic, true);
		assert.equal(body.proofRunMarker, marker);
		assert.match(body.message, /SYNTHETIC TEST LEAD/);
		postedMarker = body.proofRunMarker;
		response.writeHead(200, { "content-type": "application/json" });
		response.end('{"accepted":true,"reused":false}');
		return;
	}
	if (request.method === "DELETE" && path === "/__proof/cleanup") {
		assert.equal(body.marker, postedMarker);
		reconciled = true;
		response.writeHead(200, { "content-type": "application/json" });
		response.end(JSON.stringify({ reconciled: true, marker: body.marker }));
		return;
	}
	const routes = {
		"/ok": [200, { "x-robots-tag": "noindex, follow" }, "ok"],
		"/moved": [301, { location: "/ok" }, ""],
		"/slash": [308, { location: "/slash/" }, ""],
		"/missing": [404, {}, "missing"],
		"/gone": [410, {}, "gone"],
		"/robots.txt": [
			200,
			{ "content-type": "text/plain" },
			"User-agent: *\nDisallow: /",
		],
		"/sitemap.xml": [
			200,
			{ "content-type": "application/xml" },
			"<urlset></urlset>",
		],
	};
	const [status, headers, content] = routes[path] ?? [500, {}, "unexpected"];
	response.writeHead(status, headers);
	response.end(content);
});

server.listen(0, "127.0.0.1");
await once(server, "listening");
try {
	const { port } = server.address();
	const origin = `http://127.0.0.1:${port}`;
	const options = {
		origin,
		allowedOrigin: origin,
		proofEnvironment: "mock",
		marker,
		paths: {
			200: "/ok",
			301: "/moved",
			308: "/slash",
			404: "/missing",
			410: "/gone",
		},
		noindexPath: "/ok",
		cleanupPath: "/__proof/cleanup",
	};
	const result = await runSmoke(options);
	assert.equal(result.checks.length, 8);
	assert.equal(result.lead.status, "PASS");
	assert.equal(result.cleanup.status, "PASS");
	assert.equal(reconciled, true);
	assert.ok(
		!JSON.stringify(result).includes("+70000000000"),
		"Evidence must redact payload PII.",
	);

	const dryRun = await runSmoke({
		...options,
		dryRun: true,
		marker: undefined,
	});
	assert.equal(dryRun.lead.status, "NOT_RUN");
	assert.throws(
		() =>
			validateSmokeOptions({ ...options, allowedOrigin: "http://127.0.0.1:1" }),
		/not explicitly allowlisted/,
	);
	assert.throws(
		() => validateSmokeOptions({ ...options, proofEnvironment: "production" }),
		/Production smoke is forbidden/,
	);
	console.log(
		"verify:smoke-live PASS (HTTP contract, redaction, dry-run, allowlist, cleanup)",
	);
} finally {
	server.close();
	await once(server, "close");
}
