import assert from "node:assert/strict";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { systemOverrideAccess } from "../src/core/data-access/system/overrides.ts";
import { findPublicEntityLifecycle } from "../src/project/data-access/public/entity-lifecycle.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";

requirePayloadRuntime();
const payload = await getPayload({ config });
const access = systemOverrideAccess("system-job");
const suffix = Date.now();

try {
	const property = await payload.create({
		collection: "properties",
		data: {
			origin: "manual",
			status: "active",
			publishedAt: "2026-09-24T18:00:00.000Z",
			slug: `lifecycle-${suffix}`,
			market: "secondary",
			category: "apartment",
			dealType: "sale",
			title: "Lifecycle integration fixture",
		},
		...access,
	});
	const region = await payload.create({
		collection: "regions",
		data: {
			slug: `lifecycle-region-${suffix}`,
			title: "Lifecycle Region",
			morphology: {
				nominative: "Lifecycle Region",
				genitive: "Lifecycle Region",
				prepositional: "Lifecycle Region",
			},
			shortName: "Lifecycle",
			sortOrder: 91,
			status: "published",
			publishedAt: "2026-09-24T18:00:00.000Z",
		},
		...access,
	});
	const city = await payload.create({
		collection: "cities",
		data: {
			slug: `lifecycle-city-${suffix}`,
			title: "Lifecycle City",
			morphology: {
				nominative: "Lifecycle City",
				genitive: "Lifecycle City",
				prepositional: "Lifecycle City",
			},
			preposition: "v",
			cityType: "city",
			region: region.id,
			morphologyApproved: true,
			sortOrder: 91,
			status: "published",
			publishedAt: "2026-09-24T18:00:00.000Z",
		},
		...access,
	});
	const developer = await payload.create({
		collection: "developers",
		data: {
			name: "Lifecycle Developer",
			slug: `lifecycle-developer-${suffix}`,
			source: "integration",
			checkedAt: "2026-09-24T18:00:00.000Z",
			status: "published",
			publishedAt: "2026-09-24T18:00:00.000Z",
		},
		...access,
	});
	const development = await payload.create({
		collection: "developments",
		draft: true,
		data: {
			name: "Lifecycle Development",
			slug: `lifecycle-development-${suffix}`,
			kind: "residential_complex",
			region: region.id,
			city: city.id,
			developer: developer.id,
			salesStatus: "sales_finished",
			salesAvailability: "none",
			dataTier: "B",
			source: "integration",
			checkedAt: "2026-09-24T18:00:00.000Z",
			status: "archived",
			publishedAt: "2026-09-24T18:00:00.000Z",
		},
		...access,
	});
	const developerLifecycle = await findPublicEntityLifecycle({
		payload,
		entityType: "developer",
		slug: developer.slug,
		canonicalPath: `/zastroyshchiki/${developer.slug}/`,
	});
	assert.equal(developerLifecycle.found, true);
	if (!developerLifecycle.found)
		throw new Error("developer lifecycle not found");
	assert.equal(developerLifecycle.status, "published");
	const developmentLifecycle = await findPublicEntityLifecycle({
		payload,
		entityType: "development",
		slug: development.slug,
		canonicalPath: `/novostroyki/zhk-${development.slug}/`,
	});
	assert.equal(developmentLifecycle.found, true);
	if (!developmentLifecycle.found)
		throw new Error("development lifecycle not found");
	assert.equal(developmentLifecycle.status, "archived");
	await payload.update({
		collection: "properties",
		id: property.id,
		data: { status: "archived" },
		...access,
	});
	await payload.update({
		collection: "properties",
		id: property.id,
		data: { contentPurgedAt: "2026-09-24T19:00:00.000Z" },
		...access,
	});

	const history = await payload.find({
		collection: "lifecycle-events",
		where: {
			and: [
				{ entityType: { equals: "property" } },
				{ entityId: { equals: String(property.id) } },
			],
		},
		limit: 10,
		sort: "occurredAt",
		...access,
	});
	assert.deepEqual(
		history.docs.map((event) => event.action),
		["published", "archived", "purged"],
	);
	await assert.rejects(() =>
		payload.update({
			collection: "lifecycle-events",
			id: history.docs[0].id,
			data: { reason: "must fail" },
			...access,
		}),
	);

	const redirect = await payload.create({
		collection: "redirects",
		data: {
			from: `/old-${suffix}/`,
			to: `/final-${suffix}/`,
			statusCode: "301",
			entityType: "property",
			entityId: String(property.id),
		},
		...access,
	});
	await payload.update({
		collection: "redirects",
		id: redirect.id,
		data: { reason: "partial update retains the direct edge" },
		...access,
	});
	await assert.rejects(
		() =>
			payload.create({
				collection: "redirects",
				data: {
					from: `/older-${suffix}/`,
					to: `/old-${suffix}/`,
					statusCode: "301",
				},
				...access,
			}),
		/chain|canonical|redirect/i,
	);
	const concurrentEdges = await Promise.allSettled([
		payload.create({
			collection: "redirects",
			data: {
				from: `/concurrent-a-${suffix}/`,
				to: `/concurrent-b-${suffix}/`,
				statusCode: "301",
			},
			...access,
		}),
		payload.create({
			collection: "redirects",
			data: {
				from: `/concurrent-b-${suffix}/`,
				to: `/concurrent-c-${suffix}/`,
				statusCode: "301",
			},
			...access,
		}),
	]);
	assert.equal(
		concurrentEdges.filter((result) => result.status === "fulfilled").length,
		1,
		"concurrent redirect chain contenders must have exactly one winner",
	);

	const moveHistory = await payload.find({
		collection: "lifecycle-events",
		where: {
			and: [
				{ entityId: { equals: String(property.id) } },
				{ action: { equals: "canonical_move" } },
			],
		},
		limit: 2,
		...access,
	});
	assert.equal(moveHistory.totalDocs, 1);
	console.log("verify:entity-lifecycle:integration passed");
} finally {
	await payload.destroy();
}
