import assert from "node:assert/strict";
import { buildEntityInvalidationTargets } from "../src/core/cache/entity-targets.ts";
import { executeInternalRevalidation } from "../src/core/cache/internal-route-executor.ts";
import { resolveEntityPageLifecycle } from "../src/core/lifecycle/entity-lifecycle.ts";
import { assertDirectRedirect } from "../src/core/lifecycle/redirect-graph.ts";

assert.deepEqual(resolveEntityPageLifecycle({ found: false }), {
	kind: "missing",
	statusCode: 404,
});
assert.equal(
	resolveEntityPageLifecycle({ found: true, status: "draft" }).statusCode,
	404,
);
assert.deepEqual(
	resolveEntityPageLifecycle({
		found: true,
		status: "published",
		publishedAt: "2026-09-24T00:00:00.000Z",
	}),
	{ kind: "active", statusCode: 200 },
);
assert.deepEqual(
	resolveEntityPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-09-24T00:00:00.000Z",
	}),
	{ kind: "archived", statusCode: 200, robots: "noindex" },
);
assert.deepEqual(
	resolveEntityPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: "2026-09-24T01:00:00.000Z",
	}),
	{ kind: "gone", statusCode: 410, robots: "noindex" },
);
assert.deepEqual(
	resolveEntityPageLifecycle({
		found: true,
		status: "archived",
		publishedAt: "2026-09-24T00:00:00.000Z",
		contentPurgedAt: "2026-09-24T01:00:00.000Z",
		explicitRedirectPath: "/kvartiry/final-42/",
	}),
	{ kind: "redirect", statusCode: 301, destination: "/kvartiry/final-42/" },
);

assert.doesNotThrow(() =>
	assertDirectRedirect(
		{ from: "/old/", to: "/final/" },
		[{ from: "/other/", to: "/elsewhere/" }],
	),
);
assert.throws(() => assertDirectRedirect({ from: "/same/", to: "/same/" }, []), /loop/i);
assert.throws(
	() =>
		assertDirectRedirect(
			{ from: "/old/", to: "/middle/" },
			[{ from: "/middle/", to: "/final/" }],
		),
	/another redirect source/i,
);
assert.throws(
	() =>
		assertDirectRedirect(
			{ from: "/middle/", to: "/final/" },
			[{ from: "/old/", to: "/middle/" }],
		),
	/existing redirect chain/i,
);

const targets = buildEntityInvalidationTargets({
	geo: "primorsk",
	surface: "kvartiry",
	districtId: 4,
	developmentId: 5,
	developerId: 6,
	propertyId: 7,
	includeRegistry: true,
});
assert.deepEqual(
	targets.map((target) => target.type === "tag" && target.tag),
	[
		"geo:primorsk",
		"geo-surface:primorsk:kvartiry",
		"district:4",
		"development:5",
		"developer:6",
		"property:7",
		"registry",
	],
);
let invalidated = 0;
const accepted = await executeInternalRevalidation({
	expectedSecret: "test-secret",
	providedSecret: "test-secret",
	body: { targets },
	invalidate: async (acceptedTargets) => {
		invalidated = acceptedTargets.length;
	},
});
assert.equal(accepted.status, 200);
assert.equal(invalidated, 7);
assert.equal(
	(
		await executeInternalRevalidation({
			expectedSecret: "test-secret",
			providedSecret: "test-secret",
			body: { targets: [{ type: "tag", tag: "unbounded:anything" }] },
			invalidate: async () => undefined,
		})
	).status,
	403,
);

console.log("verify:entity-lifecycle passed");
