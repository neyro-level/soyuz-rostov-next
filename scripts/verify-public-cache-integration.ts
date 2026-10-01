import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { systemOverrideAccess } from "../src/core/data-access/system/overrides.ts";

const expectedSecret = process.env.REVALIDATE_SECRET;
const expectedBaseUrl = process.env.INTERNAL_REVALIDATE_BASE_URL?.replace(/\/$/, "");
assert.ok(expectedSecret && expectedBaseUrl, "Cache integration requires local revalidation env.");

const requests: Array<{ url: string; body: unknown; secret: string | null }> = [];
const originalFetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
	requests.push({
		url: String(input),
		body: JSON.parse(String(init?.body ?? "null")),
		secret: new Headers(init?.headers).get("x-ams-revalidate-secret"),
	});
	return new Response(JSON.stringify({ revalidated: true }), { status: 200 });
};

const payload = await getPayload({ config });
const access = systemOverrideAccess("controlled-maintenance");
try {
	const found = await payload.find({
		collection: "properties",
		where: { publicUrlId: { equals: 100001 } },
		limit: 1,
		depth: 0,
		...access,
	});
	const original = found.docs[0];
	assert.ok(original, "Cache integration fixture property is missing.");
	requests.length = 0;
	const changedTitle = `${original.title} cache-proof`;
	const changed = await payload.update({
		collection: "properties",
		id: original.id,
		data: { title: changedTitle },
		depth: 0,
		...access,
	});
	assert.equal(changed.title, changedTitle, "afterChange hook replaced the updated document.");
	await payload.update({
		collection: "properties",
		id: original.id,
		data: { title: original.title },
		depth: 0,
		...access,
	});

	assert.equal(requests.length, 2, "Each standalone mutation must invalidate exactly once.");
	for (const request of requests) {
		assert.equal(request.url, `${expectedBaseUrl}/api/internal/revalidate`);
		assert.equal(request.secret, expectedSecret);
		assert.deepEqual(
			(request.body as { targets: unknown }).targets,
			[
				{ type: "tag", tag: "properties" },
				{ type: "tag", tag: "property:100001" },
			],
		);
		assert.ok(!JSON.stringify(request.body).includes(expectedSecret));
	}
	console.log("Public cache integration verified: mutation invalidates exact related surface once.");
} finally {
	globalThis.fetch = originalFetch;
	await payload.destroy();
}
