import assert from "node:assert/strict";
import {
	lifecyclePreflightHeader,
	overwriteLifecyclePreflightHeader,
	parseCurrentPropertyLifecyclePath,
	resolvePropertyLifecyclePreflight,
} from "../src/core/http/property-lifecycle-preflight.ts";

assert.equal(parseCurrentPropertyLifecyclePath("/obekty/dom-42"), "dom-42");
assert.equal(parseCurrentPropertyLifecyclePath("/obekty/dom-42/"), "dom-42");
for (const path of [
	"/api/properties",
	"/admin",
	"/_next/static/app.js",
	"/media/photo.jpg",
	"/obekty/",
	"/obekty/dom-42/extra",
	"/obekty/DOM-42",
]) {
	assert.equal(parseCurrentPropertyLifecyclePath(path), null, path);
}

assert.deepEqual(resolvePropertyLifecyclePreflight({ found: false }), {
	kind: "pass",
});
assert.deepEqual(
	resolvePropertyLifecyclePreflight({
		found: true,
		status: "active",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: null,
	}),
	{ kind: "pass" },
);
assert.deepEqual(
	resolvePropertyLifecyclePreflight({
		found: true,
		status: "active",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: null,
		canonicalPath: "/kvartiry/kvartira-42-42/",
	}),
	{
		kind: "redirect",
		statusCode: 301,
		destination: "/kvartiry/kvartira-42-42/",
	},
);
assert.deepEqual(
	resolvePropertyLifecyclePreflight({
		found: true,
		status: "archived",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: "2026-09-24T01:00:00.000Z",
	}),
	{ kind: "gone", statusCode: 410 },
);
assert.deepEqual(
	resolvePropertyLifecyclePreflight({
		found: true,
		status: "archived",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: "2026-09-24T01:00:00.000Z",
		explicitRedirectPath: "/obekty/replacement",
	}),
	{
		kind: "redirect",
		statusCode: 301,
		destination: "/obekty/replacement",
	},
);
assert.equal(lifecyclePreflightHeader, "x-ams-property-lifecycle-preflight");
const spoofed = new Headers({
	[lifecyclePreflightHeader]: "gone",
	rsc: "1",
	"next-router-state-tree": "fixture-tree",
});
const trusted = overwriteLifecyclePreflightHeader(spoofed, "pass");
assert.equal(trusted.get(lifecyclePreflightHeader), "pass");
assert.equal(trusted.get("rsc"), "1");
assert.equal(trusted.get("next-router-state-tree"), "fixture-tree");

console.log("verify:property-lifecycle-preflight passed");
