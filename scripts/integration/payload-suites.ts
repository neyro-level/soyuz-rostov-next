import assert from "node:assert/strict";
import { existsSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { getPayload } from "payload";
import config from "../../payload.config.ts";
import {
	claimQueuedImportRun,
	consumeDeactivationApproval,
	finishImportRun,
	touchImportRunHeartbeat,
} from "../../src/core/data-access/ingest/sql/index.ts";
import { systemOverrideAccess } from "../../src/core/data-access/system/overrides.ts";
import { createPayloadFeedIngestRepository } from "../../src/core/ingest/payload-feed-ingest-repository.ts";
import { runDeliverLeadTask } from "../../src/core/leads/deliver-lead.ts";
import { defineLeadDeliveryPolicy } from "../../src/core/leads/delivery-policy.ts";
import { defineSiteProfile } from "../../src/core/profile/index.ts";
import { resolvePropertyPageLifecycle } from "../../src/core/seo/property.ts";
import {
	createControllableClock,
	installRuntimeClock,
	resetRuntimeClock,
} from "../../src/core/time/clock.ts";
import { fixtureSiteSettingsData } from "../../src/fixture/site-settings.ts";
import { LeadDeliveries } from "../../src/project/collections/LeadDeliveries.ts";
import {
	findPublicCatalogProperties,
	findPublicPropertyBySlug,
	findPublicPropertyLifecycleBySlug,
} from "../../src/project/data-access/public/catalog.ts";
import {
	countInventory,
	getDeveloper,
	getDevelopment,
	listDeveloperDevelopments,
	listDevelopmentGateFactsForCities,
	listDevelopments,
	listGeoDevelopers,
} from "../../src/project/data-access/public/geo-catalog.ts";
import { submitPublicLead } from "../../src/project/data-access/public/leads.ts";
import { findPublicNap } from "../../src/project/data-access/public/nap.ts";
import { findPublicPage } from "../../src/project/data-access/public/pages.ts";
import { requirePayloadRuntime } from "../../src/project/env.ts";
import {
	payloadJobQueues,
	payloadJobTaskSlugs,
} from "../../src/project/jobs/registry.ts";
import { payloadJobTasks } from "../../src/project/jobs/tasks.ts";
import { projectConfig } from "../../src/project/project.config.ts";
import { siteProfile } from "../../src/project/site-profile.ts";
import {
	getMediaDirectory,
	isLocalMediaReady,
	mediaOverwriteDisabled,
	uniqueMediaFilename,
} from "../../src/project/storage/local-fs.ts";

requirePayloadRuntime();

const clock = createControllableClock("2026-09-18T12:00:00.000Z");
installRuntimeClock(clock);

const payload = await getPayload({ config });
const access = systemOverrideAccess("system-job");
const owner = { id: 10_001, collection: "users", roles: ["owner"] } as never;
const admin = { id: 10_002, collection: "users", roles: ["admin"] } as never;
const editor = { id: 10_003, collection: "users", roles: ["editor"] } as never;

const identitySuffix = `${Date.now()}`;
const parallelProperties = await Promise.all(
	Array.from({ length: 8 }, (_, index) =>
		payload.create({
			collection: "properties",
			data: {
				origin: "manual",
				status: "active",
				slug: `identity-parallel-${identitySuffix}-${index}`,
				market: "secondary",
				category: "apartment",
				dealType: "sale",
				title: `Identity parallel ${index}`,
			},
			...access,
		}),
	),
);
const allocatedIds = parallelProperties.map((property) => property.publicUrlId);
assert.equal(new Set(allocatedIds).size, parallelProperties.length);
assert.ok(
	allocatedIds.every(
		(value): value is number =>
			typeof value === "number" && Number.isSafeInteger(value) && value > 0,
	),
);
const retainedId = parallelProperties[0].publicUrlId;
if (typeof retainedId !== "number")
	throw new Error("publicUrlId default was not applied");
const republished = await payload.update({
	collection: "properties",
	id: parallelProperties[0].id,
	data: { publishedAt: clock.nowIso() },
	...access,
});
assert.equal(
	republished.publicUrlId,
	retainedId,
	"republication must retain publicUrlId",
);
await assert.rejects(
	() =>
		payload.update({
			collection: "properties",
			id: parallelProperties[0].id,
			data: { publicUrlId: retainedId + 10_000 },
			...access,
		}),
	/immutable|publicUrlId/i,
);

const identityFeedSource = await payload.create({
	collection: "feed-sources",
	data: {
		code: `identity-${identitySuffix}`,
		title: "Identity integration feed",
		parser: "yrl",
		market: "secondary",
		feedUrlRef: "INTEGRATION_FEED_URL",
		enabled: false,
		refreshIntervalMinutes: 1440,
		safetyThresholdPercent: 30,
		maxDeactivationsPerRun: 50,
	},
	...access,
});
const identityImportRun = await payload.create({
	collection: "import-runs",
	data: {
		feedSource: identityFeedSource.id,
		status: "running",
		queuedAt: clock.nowIso(),
		startedAt: clock.nowIso(),
	},
	...access,
});
const identityRepository = createPayloadFeedIngestRepository(
	payload,
	String(identityFeedSource.id),
);
const feedIdentityData = {
	feedSource: String(identityFeedSource.id),
	externalId: "stable-offer-1",
	origin: "feed" as const,
	importHash: "hash-v1",
	firstSeenAt: clock.nowIso(),
	lastSeenAt: clock.nowIso(),
	lastImportRun: String(identityImportRun.id),
	status: "active" as const,
	market: "secondary" as const,
	category: "apartment" as const,
	dealType: "sale" as const,
	currency: "RUB" as const,
	title: "Stable feed property",
	images: [],
	slug: `feed-identity-${identitySuffix}`,
};
const firstFeedWrite =
	await identityRepository.createFeedProperty(feedIdentityData);
const repeatedFeedIdentity = await identityRepository.findFeedProperty({
	feedSourceId: String(identityFeedSource.id),
	externalId: feedIdentityData.externalId,
});
assert.equal(repeatedFeedIdentity?.id, firstFeedWrite.id);
const secondFeedWrite = await identityRepository.updateFeedProperty(
	firstFeedWrite.id,
	{
		importHash: "hash-v2",
		title: "Stable feed property updated",
	},
);
assert.equal(secondFeedWrite.publicUrlId, firstFeedWrite.publicUrlId);

async function assertPubliclyInaccessible(
	collection:
		| "leads"
		| "lead-deliveries"
		| "properties"
		| "pages"
		| "media"
		| "redirects"
		| "developers"
		| "developments",
) {
	try {
		const result = await payload.find({
			collection,
			overrideAccess: false,
			user: null,
			limit: 1,
		});
		assert.equal(
			result.docs.length,
			0,
			`${collection} must not return documents to anonymous Local API`,
		);
	} catch {
		return;
	}
}

await assertPubliclyInaccessible("leads");
await assertPubliclyInaccessible("lead-deliveries");
await assertPubliclyInaccessible("properties");
await assertPubliclyInaccessible("pages");
await assertPubliclyInaccessible("media");
await assertPubliclyInaccessible("redirects");
await assertPubliclyInaccessible("developers");
await assertPubliclyInaccessible("developments");

const developmentRegion = await payload.create({
	collection: "regions",
	data: {
		slug: `development-region-${identitySuffix}`,
		title: "Development Region",
		morphology: {
			nominative: "Development Region",
			genitive: "Development Region genitive",
			prepositional: "Development Region prepositional",
		},
		shortName: "Development",
		sortOrder: 90,
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const developmentCity = await payload.create({
	collection: "cities",
	data: {
		slug: `development-city-${identitySuffix}`,
		title: "Development City",
		morphology: {
			nominative: "Development City",
			genitive: "Development City genitive",
			prepositional: "Development City prepositional",
		},
		preposition: "v",
		cityType: "city",
		region: developmentRegion.id,
		morphologyApproved: true,
		sortOrder: 90,
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const preparedDeveloper = await payload.create({
	collection: "developers",
	data: {
		name: "Prepared Developer",
		slug: `prepared-developer-${identitySuffix}`,
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const preparedDevelopment = await payload.create({
	collection: "developments",
	draft: true,
	data: {
		name: "Prepared Residential Complex",
		slug: `prepared-complex-${identitySuffix}`,
		kind: "residential_complex",
		region: developmentRegion.id,
		city: developmentCity.id,
		developer: preparedDeveloper.id,
		salesStatus: "on_sale",
		salesAvailability: "confirmed",
		dataTier: "B",
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		layouts: [{ title: "One room", rooms: 1, area: 42 }],
		priceByRooms: [
			{
				roomsLabel: "Студии",
				priceFromMinor: 8_000_000_00,
				priceCheckedAt: "2026-09-01T12:00:00.000Z",
				source: "integration-fixture",
			},
			{
				roomsLabel: "1-комнатные",
				priceFromMinor: 6_000_000_00,
				priceCheckedAt: "2026-09-10T12:00:00.000Z",
				source: "integration-fixture",
			},
			{
				roomsLabel: "Устаревшая цена",
				priceFromMinor: 1_000_000_00,
				priceCheckedAt: "2026-07-01T12:00:00.000Z",
				source: "integration-fixture",
			},
		],
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const preparedDevelopmentDetails = await getDevelopment(
	payload,
	preparedDevelopment.slug,
	fixtureSiteSettingsData.brandName,
);
assert.equal(
	preparedDevelopmentDetails?.id,
	String(preparedDevelopment.id),
	"published development must be reachable only through the public Gateway",
);
assert.equal(
	preparedDevelopmentDetails?.priceFrom?.priceMinor,
	6_000_000_00,
	"priceFrom must be the minimum fresh room price",
);
assert.deepEqual(
	preparedDevelopmentDetails?.priceByRooms.map((row) => row.roomsLabel),
	["Студии", "1-комнатные"],
	"prices older than 45 days must be absent from the public DTO consumed by UI and SEO",
);
assert.ok(
	(await listDevelopments(payload, { geo: developmentCity.slug })).some(
		(item) => item.id === String(preparedDevelopment.id),
	),
);
assert.equal(
	(
		await getDeveloper(
			payload,
			preparedDeveloper.slug,
			fixtureSiteSettingsData.brandName,
		)
	)?.id,
	String(preparedDeveloper.id),
	"published developer must be reachable only through the public Gateway",
);
assert.ok(
	(await listGeoDevelopers(payload, developmentCity.slug)).some(
		(item) => item.id === String(preparedDeveloper.id),
	),
);
const paginationDevelopmentIds: (string | number)[] = [];
for (let index = 1; index <= 49; index += 1) {
	const paginationDevelopment = await payload.create({
		collection: "developments",
		draft: true,
		data: {
			name: `Prepared Residential Complex ${index}`,
			slug: `prepared-complex-${identitySuffix}-${index}`,
			kind: "residential_complex",
			region: developmentRegion.id,
			city: developmentCity.id,
			developer: preparedDeveloper.id,
			salesStatus: "on_sale",
			salesAvailability: "confirmed",
			dataTier: "B",
			source: "integration-fixture",
			checkedAt: clock.nowIso(),
			layouts: [{ title: "One room", rooms: 1, area: 42 }],
			status: "published",
			publishedAt: clock.nowIso(),
		},
		...access,
	});
	paginationDevelopmentIds.push(paginationDevelopment.id);
}
const observedDevelopmentQueries: Array<{
	limit?: number;
	page?: number;
	pagination?: boolean;
}> = [];
const boundedPayload = new Proxy(payload, {
	get(target, property, receiver) {
		const value = Reflect.get(target, property, receiver);
		if (property === "find" && typeof value === "function") {
			return (input: Parameters<typeof payload.find>[0]) => {
				if (input.collection === "developments") {
					observedDevelopmentQueries.push({
						limit: input.limit,
						page: input.page,
						pagination: input.pagination,
					});
				}
				return Reflect.apply(value, target, [input]);
			};
		}
		return typeof value === "function" ? value.bind(target) : value;
	},
});
const completeGeoDeveloperAggregate = await listGeoDevelopers(
	boundedPayload,
	developmentCity.slug,
);
assert.equal(
	completeGeoDeveloperAggregate.find(
		(item) => item.id === String(preparedDeveloper.id),
	)?.developmentsCount,
	50,
	"city developer aggregate must not truncate after 48 developments",
);
const developerPageThree = await listDeveloperDevelopments(boundedPayload, {
	developerId: Number(preparedDeveloper.id),
	page: 3,
	limit: 24,
});
assert.equal(developerPageThree.total, 50);
assert.equal(developerPageThree.totalPages, 3);
assert.equal(developerPageThree.items.length, 2);
assert.ok(
	developerPageThree.items.every(
		(item) => item.developer?.id === String(preparedDeveloper.id),
	),
	"developer project pagination must query by developer relation",
);
assert.ok(
	observedDevelopmentQueries.length >= 3 &&
		observedDevelopmentQueries.every(
			(query) =>
				query.pagination !== false &&
				typeof query.limit === "number" &&
				query.limit >= 1 &&
				query.limit <= 48 &&
				typeof query.page === "number" &&
				query.page >= 1,
		),
	"developer aggregates and relation pagination must use bounded paged queries",
);
observedDevelopmentQueries.length = 0;
const batchGateFacts = await listDevelopmentGateFactsForCities(boundedPayload, [
	Number(developmentCity.id),
]);
assert.equal(
	batchGateFacts.filter(
		(fact) => fact.developerId === String(preparedDeveloper.id),
	).length,
	50,
	"one batch facts read must preserve every published development",
);
assert.deepEqual(
	observedDevelopmentQueries,
	[{ limit: 2000, page: 1, pagination: undefined }],
	"development Gate facts query count must remain one independently of entity count",
);
const draftDeveloper = await payload.create({
	collection: "developers",
	data: {
		name: "Draft Developer",
		slug: `draft-developer-${identitySuffix}`,
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		status: "draft",
	},
	...access,
});
const draftDevelopment = await payload.create({
	collection: "developments",
	draft: true,
	data: {
		name: "Draft Residential Complex",
		slug: `draft-complex-${identitySuffix}`,
		kind: "residential_complex",
		region: developmentRegion.id,
		city: developmentCity.id,
		developer: draftDeveloper.id,
		salesStatus: "on_sale",
		salesAvailability: "in_inventory",
		dataTier: "C",
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		status: "draft",
	},
	...access,
});
assert.equal(
	await getDevelopment(
		payload,
		draftDevelopment.slug,
		fixtureSiteSettingsData.brandName,
	),
	null,
	"draft development must be excluded by an explicit Gateway status predicate",
);
assert.equal(
	await getDeveloper(
		payload,
		draftDeveloper.slug,
		fixtureSiteSettingsData.brandName,
	),
	null,
	"draft developer must be excluded by an explicit Gateway status predicate",
);
assert.ok(
	!(await listDevelopments(payload, { geo: developmentCity.slug })).some(
		(item) => item.id === String(draftDevelopment.id),
	),
);
assert.ok(
	!(await listGeoDevelopers(payload, developmentCity.slug)).some(
		(item) => item.id === String(draftDeveloper.id),
	),
);
assert.equal(
	await countInventory(payload, {
		geo: developmentCity.slug,
		surface: "novostroyki",
	}),
	0,
	"unconfigured geo inventory must fail closed",
);
const configuredDevelopmentGeoInput = structuredClone(siteProfile);
configuredDevelopmentGeoInput.geoMode = "MULTI_GEO";
configuredDevelopmentGeoInput.geos[developmentCity.slug] = {
	published: true,
	hubStatus: "ACTIVE",
};
configuredDevelopmentGeoInput.geoCategoryStatus[developmentCity.slug] = {
	...configuredDevelopmentGeoInput.geoCategoryStatus[siteProfile.primaryGeo],
};
configuredDevelopmentGeoInput.marketStatus[developmentCity.slug] = {
	newbuild: "ACTIVE",
	secondary: "ACTIVE",
};
configuredDevelopmentGeoInput.developersSurface.byGeo[developmentCity.slug] =
	"ACTIVE";
const configuredDevelopmentGeo = defineSiteProfile(
	configuredDevelopmentGeoInput,
);
assert.equal(
	await countInventory(
		payload,
		{ geo: developmentCity.slug, surface: "novostroyki" },
		configuredDevelopmentGeo,
	),
	50,
	"configured development inventory aggregate must remain city-scoped",
);
await payload.update({
	collection: "properties",
	id: parallelProperties[1].id,
	data: { development: preparedDevelopment.id },
	...access,
});
assert.equal(
	Number(
		(
			await payload.findByID({
				collection: "properties",
				id: parallelProperties[1].id,
				depth: 0,
				...access,
			})
		).development,
	),
	preparedDevelopment.id,
);
await assert.rejects(
	() =>
		payload.create({
			collection: "developments",
			draft: true,
			data: {
				name: "Polluted Cottage Village",
				slug: `polluted-village-${identitySuffix}`,
				kind: "cottage_village",
				region: developmentRegion.id,
				city: developmentCity.id,
				developer: preparedDeveloper.id,
				salesStatus: "sales_finished",
				salesAvailability: "none",
				dataTier: "C",
				source: "integration-fixture",
				checkedAt: clock.nowIso(),
				progress: [
					{
						date: clock.nowIso(),
						percent: 10,
						source: "fixture",
						checkedAt: clock.nowIso(),
					},
				],
				status: "draft",
			},
			...access,
		}),
	/kind=cottage_village/,
);
await assertPubliclyInaccessible("developers");
await assertPubliclyInaccessible("developments");
await payload.update({
	collection: "properties",
	id: parallelProperties[1].id,
	data: { development: null },
	...access,
});
await payload.delete({
	collection: "developments",
	id: preparedDevelopment.id,
	...access,
});
await payload.delete({
	collection: "developments",
	where: { id: { in: paginationDevelopmentIds } },
	...access,
});
await payload.delete({
	collection: "developments",
	id: draftDevelopment.id,
	...access,
});
await payload.delete({
	collection: "developers",
	id: preparedDeveloper.id,
	...access,
});
await payload.delete({
	collection: "developers",
	id: draftDeveloper.id,
	...access,
});
await payload.delete({
	collection: "cities",
	id: developmentCity.id,
	...access,
});
await payload.delete({
	collection: "regions",
	id: developmentRegion.id,
	...access,
});

await assert.rejects(
	() =>
		payload.findGlobal({
			slug: "site-settings",
			overrideAccess: false,
			user: null,
		}),
	"anonymous Local API must not read raw site settings",
);
await payload.updateGlobal({
	slug: "site-settings",
	data: fixtureSiteSettingsData,
	overrideAccess: false,
	user: owner,
});
const publicNap = await findPublicNap(payload);
assert.deepEqual(publicNap, {
	brandName: fixtureSiteSettingsData.brandName,
	phone: { label: fixtureSiteSettingsData.phone, href: "tel:+70000000000" },
	email: {
		label: fixtureSiteSettingsData.email,
		href: `mailto:${fixtureSiteSettingsData.email}`,
	},
	address: fixtureSiteSettingsData.address,
	workingHours: fixtureSiteSettingsData.workingHours,
	socialLinks: [],
});

const usersCollection = payload.config.collections.find(
	(collection) => collection.slug === "users",
);
assert.ok(
	usersCollection?.auth,
	"users must remain the Payload auth collection",
);
assert.equal(usersCollection.auth.maxLoginAttempts, 5);
assert.equal(usersCollection.auth.cookies.sameSite, "Lax");

const authSuffix = `${Date.now()}`;
const authEmail = `payload-security-${authSuffix}@example.test`;
const initialPassword = `Initial-${authSuffix}-A1!`;
const resetPassword = `Reset-${authSuffix}-B2!`;
const authUser = await payload.create({
	collection: "users",
	data: {
		email: authEmail,
		password: initialPassword,
		roles: ["owner"],
	},
	...access,
});

const firstLogin = await payload.login({
	collection: "users",
	data: { email: authEmail, password: initialPassword },
});
const secondLogin = await payload.login({
	collection: "users",
	data: { email: authEmail, password: initialPassword },
});
assert.ok(firstLogin.token, "Payload Admin login must return a session token");
assert.ok(secondLogin.token, "a second session must be issued before reset");

const emailAdapter = payload.email;
const originalSendEmail = emailAdapter.sendEmail;
let resetEmailCount = 0;
emailAdapter.sendEmail = async () => {
	resetEmailCount += 1;
	return undefined;
};
let resetToken: null | string;
let throttledToken: null | string;
try {
	resetToken = await payload.forgotPassword({
		collection: "users",
		data: { email: authEmail },
		disableEmail: false,
	});
	throttledToken = await payload.forgotPassword({
		collection: "users",
		data: { email: authEmail },
		disableEmail: false,
	});
} finally {
	emailAdapter.sendEmail = originalSendEmail;
}
assert.ok(resetToken, "forgot password must issue a reset token");
assert.equal(
	resetEmailCount,
	1,
	"forgot password must throttle repeated email",
);
assert.equal(
	throttledToken,
	null,
	"throttled reset request must fail silently",
);

const resetResult = await payload.resetPassword({
	collection: "users",
	data: { password: resetPassword, token: resetToken },
	...access,
});
assert.ok(resetResult.token, "reset password must create a fresh session");
await assert.rejects(() =>
	payload.login({
		collection: "users",
		data: { email: authEmail, password: initialPassword },
	}),
);
assert.ok(
	(
		await payload.login({
			collection: "users",
			data: { email: authEmail, password: resetPassword },
		})
	).token,
	"the reset password must authenticate",
);
const resetUser = await payload.findByID({
	collection: "users",
	id: authUser.id,
	...access,
	showHiddenFields: true,
});
assert.equal(
	resetUser.sessions?.length,
	2,
	"reset must revoke prior sessions and retain only reset plus verification login",
);

const lockedEmail = `payload-lockout-${authSuffix}@example.test`;
const lockedPassword = `Locked-${authSuffix}-C3!`;
await payload.create({
	collection: "users",
	data: {
		email: lockedEmail,
		password: lockedPassword,
		roles: ["owner"],
	},
	...access,
});
for (let attempt = 0; attempt < 5; attempt += 1) {
	await assert.rejects(() =>
		payload.login({
			collection: "users",
			data: { email: lockedEmail, password: `${lockedPassword}-wrong` },
		}),
	);
}
await assert.rejects(
	() =>
		payload.login({
			collection: "users",
			data: { email: lockedEmail, password: lockedPassword },
		}),
	/locked/i,
	"correct credentials must not bypass account lockout",
);

const mediaCollection = payload.config.collections.find(
	(collection) => collection.slug === "media",
);
assert.ok(
	mediaCollection?.upload && typeof mediaCollection.upload === "object",
);
assert.deepEqual(mediaCollection.upload.mimeTypes, [
	"image/jpeg",
	"image/png",
	"image/webp",
	"image/gif",
	"application/pdf",
]);
assert.ok(!mediaCollection.upload.mimeTypes?.includes("image/svg+xml"));
assert.ok(!mediaCollection.upload.mimeTypes?.includes("application/xml"));
assert.equal(mediaOverwriteDisabled, true);
assert.equal(isLocalMediaReady(), true);
const mediaProbeName = uniqueMediaFilename("payload-security-probe.txt");
const mediaProbePath = path.join(getMediaDirectory(), mediaProbeName);
writeFileSync(mediaProbePath, "payload-security-probe", { flag: "wx" });
assert.equal(existsSync(mediaProbePath), true, "MEDIA_DIR must be writable");
rmSync(mediaProbePath);

const catalog = await findPublicCatalogProperties(payload, {
	page: 1,
	limit: 1,
});
assert.ok(
	Array.isArray(catalog.items),
	"public catalog gateway must return DTO items",
);
assert.ok(
	typeof catalog.total === "number",
	"public catalog gateway must return totals",
);
const catalogProperty = await findPublicPropertyBySlug(
	payload,
	"__missing-public-property__",
);
assert.equal(
	catalogProperty,
	null,
	"missing public property slug must resolve to null",
);
const cmsPage = await findPublicPage(
	payload,
	"__missing-public-page__",
	fixtureSiteSettingsData.brandName,
);
assert.equal(
	cmsPage,
	null,
	"missing public CMS page slug must resolve to null",
);

const suffix = `${Date.now()}`;
const numericPropertyBase = {
	origin: "manual" as const,
	status: "active" as const,
	market: "secondary" as const,
	category: "apartment" as const,
	dealType: "sale" as const,
	title: "Numeric invariant probe",
};
await assert.rejects(
	() =>
		payload.create({
			collection: "properties",
			data: {
				...numericPropertyBase,
				slug: `integration-fractional-money-${suffix}`,
				priceMinor: 100.5,
			},
			...access,
		}),
	/safe integer/,
	"System writes must reject fractional minor units before PostgreSQL",
);
await assert.rejects(
	() =>
		payload.create({
			collection: "properties",
			data: {
				...numericPropertyBase,
				slug: `integration-area-precision-${suffix}`,
				totalArea: 12.345,
			},
			overrideAccess: false,
			user: {
				id: 10_002,
				collection: "users",
				roles: ["admin"],
			} as never,
		}),
	/two decimal places/,
	"Admin writes must reject area precision above two decimals",
);
const publishedPage = await payload.create({
	collection: "pages",
	data: {
		slug: `integration-public-page-${suffix}`,
		title: "Published integration page",
		status: "published",
		publishedAt: clock.nowIso(),
		seo: { description: "Public page" },
	},
	...access,
});
await payload.create({
	collection: "pages",
	data: {
		slug: `integration-draft-page-${suffix}`,
		title: "Draft integration page",
		status: "draft",
	},
	...access,
});

const titleOnlyPage = await payload.update({
	collection: "pages",
	id: publishedPage.id,
	data: { title: "Published integration page, updated title" },
	...access,
});

await payload.update({
	collection: "pages",
	id: publishedPage.id,
	data: { seo: { ...titleOnlyPage.seo, noindex: true } },
	...access,
});

const publicPage = await findPublicPage(
	payload,
	publishedPage.slug,
	fixtureSiteSettingsData.brandName,
);
assert.equal(
	publicPage?.slug,
	publishedPage.slug,
	"published page must pass Public Gateway access",
);
assert.equal(
	await findPublicPage(
		payload,
		`integration-draft-page-${suffix}`,
		fixtureSiteSettingsData.brandName,
	),
	null,
	"draft page must remain unavailable through Public Gateway",
);

const publishedProperty = await payload.create({
	collection: "properties",
	data: {
		origin: "manual",
		status: "active",
		publishedAt: clock.nowIso(),
		slug: `integration-public-property-${suffix}`,
		market: "secondary",
		category: "apartment",
		dealType: "sale",
		title: "Published integration property",
		internalComment: "must never enter public DTO",
		ownerContact: "+79990000099",
	},
	...access,
});
await payload.create({
	collection: "properties",
	data: {
		origin: "manual",
		status: "active",
		slug: `integration-private-property-${suffix}`,
		market: "secondary",
		category: "apartment",
		dealType: "sale",
		title: "Unpublished integration property",
	},
	...access,
});

const publicProperty = await findPublicPropertyBySlug(
	payload,
	publishedProperty.slug,
);
assert.equal(
	publicProperty?.slug,
	publishedProperty.slug,
	"published property must pass Public Gateway access",
);
assert.equal(
	"internalComment" in (publicProperty ?? {}),
	false,
	"private property fields must be absent from the public DTO",
);
assert.equal(
	"ownerContact" in (publicProperty ?? {}),
	false,
	"owner contact must be absent from the public DTO",
);
assert.equal(
	await findPublicPropertyBySlug(
		payload,
		`integration-private-property-${suffix}`,
	),
	null,
	"unpublished property must remain unavailable through Public Gateway",
);

await payload.update({
	collection: "properties",
	id: publishedProperty.id,
	data: { contentPurgedAt: clock.nowIso() },
	...access,
});
assert.deepEqual(
	resolvePropertyPageLifecycle(
		await findPublicPropertyLifecycleBySlug(payload, publishedProperty.slug),
	),
	{ kind: "gone", statusCode: 410, robots: "noindex" },
	"published purged property must resolve through the narrow lifecycle read",
);
assert.equal(
	await findPublicPropertyBySlug(payload, publishedProperty.slug),
	null,
	"purged property content must remain unavailable through the normal Public Gateway",
);
await payload.update({
	collection: "properties",
	id: publishedProperty.id,
	data: { contentPurgedAt: null },
	...access,
});

const propertyLeadBody = {
	name: "Integration Property Lead",
	phone: "+79990000009",
	formKind: "property_request",
	sourcePage: `/kvartiry/${publishedProperty.slug}-${publishedProperty.publicUrlId}/`,
	property: String(publishedProperty.id),
	context: {
		geo: "rostov-na-donu",
		surface: "apartments",
		propertyUrlId: "999999999",
	},
	consentAccepted: true,
	consentVersion: "pd-2026-01",
	honeypot: "",
	renderedAt: "2026-09-18T11:59:50.000Z",
	submittedAt: "2026-09-18T12:00:00.000Z",
	requestAttemptId: "33333333-3333-4333-8333-333333333333",
};
const propertyLeadA = await submitPublicLead({
	body: propertyLeadBody,
	rateLimitKey: `integration-property-a-${suffix}`,
});
assert.deepEqual(propertyLeadA, { accepted: true, reused: false });
const propertyLeadRetry = await submitPublicLead({
	body: propertyLeadBody,
	rateLimitKey: `integration-property-retry-${suffix}`,
});
assert.deepEqual(propertyLeadRetry, { accepted: true, reused: true });
const propertyLeadB = await submitPublicLead({
	body: {
		...propertyLeadBody,
		requestAttemptId: "44444444-4444-4444-8444-444444444444",
	},
	rateLimitKey: `integration-property-b-${suffix}`,
});
assert.deepEqual(propertyLeadB, { accepted: true, reused: false });
const persistedPropertyLeads = await payload.find({
	collection: "leads",
	where: { phoneE164: { equals: "+79990000009" } },
	limit: 10,
	depth: 0,
	...access,
});
assert.equal(persistedPropertyLeads.totalDocs, 2);
for (const persisted of persistedPropertyLeads.docs) {
	assert.equal(
		persisted.property && typeof persisted.property === "object"
			? String(persisted.property.id)
			: String(persisted.property),
		String(publishedProperty.id),
	);
	assert.equal(
		persisted.sourcePage,
		`/kvartiry/${publishedProperty.slug}-${publishedProperty.publicUrlId}`,
		"property lead source page must use the normalized canonical path",
	);
	assert.equal(persisted.consent?.version, "pd-2026-01");
	assert.equal(persisted.context?.geo, "rostov-na-donu");
	assert.equal(persisted.context?.surface, "apartments");
	assert.equal(
		persisted.context?.propertyUrlId,
		String(publishedProperty.publicUrlId),
		"property URL identity must be assigned from the canonical server record",
	);
	assert.notEqual(
		persisted.consent?.consentedAt,
		propertyLeadBody.submittedAt,
		"legal consent time must be assigned by the server",
	);
}
const mismatchedPropertyLead = await submitPublicLead({
	body: {
		...propertyLeadBody,
		sourcePage: "/kvartiry/client-forged-slug-999999999/",
		requestAttemptId: "55555555-5555-4555-8555-555555555555",
	},
	rateLimitKey: `integration-property-mismatch-${suffix}`,
});
assert.equal(mismatchedPropertyLead.accepted, false);
assert.equal(mismatchedPropertyLead.code, "lead.invalid_payload");
assert.equal(mismatchedPropertyLead.safeDiagnostics.rawPiiIncluded, false);
assert.equal(
	mismatchedPropertyLead.safeDiagnostics.code,
	"lead.property_context_invalid",
);

const leadRegion = await payload.create({
	collection: "regions",
	data: {
		slug: `lead-region-${suffix}`,
		title: "Lead Region",
		morphology: {
			nominative: "Lead Region",
			genitive: "Lead Region genitive",
			prepositional: "Lead Region prepositional",
		},
		shortName: "Lead",
		sortOrder: 91,
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const leadCity = await payload.create({
	collection: "cities",
	data: {
		slug: `lead-city-${suffix}`,
		title: "Lead City",
		morphology: {
			nominative: "Lead City",
			genitive: "Lead City genitive",
			prepositional: "Lead City prepositional",
		},
		preposition: "v",
		cityType: "city",
		region: leadRegion.id,
		morphologyApproved: true,
		sortOrder: 91,
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const leadDeveloper = await payload.create({
	collection: "developers",
	data: {
		name: "Lead Developer",
		slug: `lead-developer-${suffix}`,
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const leadDevelopment = await payload.create({
	collection: "developments",
	draft: true,
	data: {
		name: "Lead Residential Complex",
		slug: `lead-complex-${suffix}`,
		kind: "residential_complex",
		region: leadRegion.id,
		city: leadCity.id,
		developer: leadDeveloper.id,
		salesStatus: "on_sale",
		salesAvailability: "confirmed",
		dataTier: "B",
		source: "integration-fixture",
		checkedAt: clock.nowIso(),
		priceByRooms: [
			{
				roomsLabel: "1-комнатные",
				priceFromMinor: 6_000_000_00,
				priceCheckedAt: "2026-09-10T12:00:00.000Z",
				source: "integration-fixture",
			},
		],
		status: "published",
		publishedAt: clock.nowIso(),
	},
	...access,
});
const priceAuthorityCheck = await getDevelopment(
	payload,
	leadDevelopment.slug,
	fixtureSiteSettingsData.brandName,
);
assert.ok(priceAuthorityCheck?.href, "development price authority fixture must be public");

const priceLeadBody = {
	name: "Integration Price Lead",
	phone: "+79990000019",
	formKind: "development_price",
	sourcePage: priceAuthorityCheck.href,
	context: {
		geo: "rostov-na-donu",
		surface: "new-buildings",
		district: "leninskiy",
		development: leadDevelopment.slug,
		developer: leadDeveloper.slug,
	},
	consentAccepted: true,
	consentVersion: "pd-2026-01",
	honeypot: "",
	renderedAt: "2026-09-18T11:59:50.000Z",
	submittedAt: "2026-09-18T12:00:00.000Z",
	requestAttemptId: "66666666-6666-4666-8666-666666666666",
};
assert.deepEqual(
	await submitPublicLead({
		body: priceLeadBody,
		rateLimitKey: `integration-price-${suffix}`,
	}),
	{ accepted: true, reused: false },
);
assert.deepEqual(
	await submitPublicLead({
		body: priceLeadBody,
		rateLimitKey: `integration-price-retry-${suffix}`,
	}),
	{ accepted: true, reused: true },
);
const persistedPriceLeads = await payload.find({
	collection: "leads",
	where: { phoneE164: { equals: "+79990000019" } },
	limit: 2,
	depth: 0,
	...access,
});
assert.equal(persistedPriceLeads.totalDocs, 1);
assert.equal(persistedPriceLeads.docs[0]?.formKind, "development_price");
assert.equal(
	persistedPriceLeads.docs[0]?.context?.development,
	leadDevelopment.slug,
);
assert.equal(persistedPriceLeads.docs[0]?.context?.city, leadCity.slug);
assert.equal(persistedPriceLeads.docs[0]?.context?.region, leadRegion.slug);
assert.equal(persistedPriceLeads.docs[0]?.context?.developer, leadDeveloper.slug);
assert.equal(persistedPriceLeads.docs[0]?.context?.dataTier, "B");

const lead = await payload.create({
	collection: "leads",
	data: {
		name: "Integration",
		phoneE164: "+79990000001",
		formKind: "callback",
		sourcePage: "/",
		status: "new",
		consent: {
			accepted: true,
			version: "test",
			consentedAt: clock.nowIso(),
		},
		idempotencyKey: `itest-lead-${suffix}`,
		retentionUntil: "2099-01-01T00:00:00.000Z",
		retentionMode: "anonymize",
	},
	...access,
});

let hidden = false;
try {
	const stillHidden = await payload.find({
		collection: "leads",
		overrideAccess: false,
		user: null,
		where: { id: { equals: lead.id } },
	});
	hidden = stillHidden.totalDocs === 0;
} catch (error) {
	const status =
		error && typeof error === "object" && "status" in error
			? Number(error.status)
			: 0;
	hidden = status === 403 || /forbidden/i.test(String(error));
}
assert.equal(hidden, true, "created lead must stay inaccessible anonymously");

async function assertRoleReadDenied(
	collection: "leads" | "lead-deliveries",
	id: number | string,
	role: string,
	user: typeof owner | null,
) {
	let denied = false;
	try {
		const result = await payload.find({
			collection,
			overrideAccess: false,
			user,
			where: { id: { equals: id } },
		});
		denied = result.totalDocs === 0;
	} catch {
		denied = true;
	}
	assert.equal(denied, true, `${role} must not read ${collection}`);
}

const ownerLead = await payload.findByID({
	collection: "leads",
	id: lead.id,
	overrideAccess: false,
	user: owner,
});
assert.equal(ownerLead.phoneE164, "+79990000001");
assert.equal(ownerLead.name, "Integration");
for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
] as const) {
	await assertRoleReadDenied("leads", lead.id, role, user);
}
const systemLead = await payload.findByID({
	collection: "leads",
	id: lead.id,
	...access,
});
assert.equal(systemLead.phoneE164, "+79990000001");

const updatedByOwner = await payload.update({
	collection: "leads",
	id: lead.id,
	data: {
		status: "in_progress",
		message: "Owner-only PII update proof",
	},
	overrideAccess: false,
	user: owner,
});
assert.equal(
	updatedByOwner.status,
	"in_progress",
	"owner must update operational lead data",
);
assert.equal(updatedByOwner.message, "Owner-only PII update proof");

for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
] as const) {
	await assert.rejects(
		() =>
			payload.update({
				collection: "leads",
				id: lead.id,
				data: { status: "processed" },
				overrideAccess: false,
				user,
			}),
		`${role} must not update leads`,
	);
}
await payload.update({
	collection: "leads",
	id: lead.id,
	data: {
		status: "new",
		fraudFingerprint: "system-only-pii-update-proof",
	},
	...access,
});
assert.equal(
	(
		await payload.findByID({
			collection: "leads",
			id: lead.id,
			...access,
		})
	).fraudFingerprint,
	"system-only-pii-update-proof",
);

for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
	["owner", owner],
] as const) {
	await assert.rejects(
		() =>
			payload.create({
				collection: "leads",
				data: {
					name: `Denied ${role}`,
					phoneE164: "+79990000008",
					formKind: "callback",
					sourcePage: "/denied-create",
					consent: {
						accepted: true,
						version: "test",
						consentedAt: clock.nowIso(),
					},
					idempotencyKey: `itest-denied-create-${role}-${suffix}`,
					retentionMode: "delete",
				},
				overrideAccess: false,
				user,
			} as never),
		`${role} must not use generic lead create`,
	);
}

for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
] as const) {
	await assert.rejects(
		() =>
			payload.delete({
				collection: "leads",
				id: lead.id,
				overrideAccess: false,
				user,
			}),
		`${role} must not delete leads`,
	);
}

const ownerDeleteLead = await payload.create({
	collection: "leads",
	data: {
		name: "Owner delete proof",
		phoneE164: "+79990000002",
		formKind: "callback",
		sourcePage: "/",
		status: "new",
		consent: {
			accepted: true,
			version: "test",
			consentedAt: clock.nowIso(),
		},
		idempotencyKey: `itest-owner-delete-${suffix}`,
		retentionUntil: "2099-01-01T00:00:00.000Z",
		retentionMode: "anonymize",
	},
	...access,
});
const ownerDeleteDelivery = await payload.create({
	collection: "lead-deliveries",
	data: {
		lead: ownerDeleteLead.id,
		channelId: `owner-delete-${suffix}`,
		channelKind: "messenger",
		status: "pending",
		attempts: 0,
		idempotencyKey: `itest-owner-delete-delivery-${suffix}`,
	},
	...access,
});
await payload.delete({
	collection: "leads",
	id: ownerDeleteLead.id,
	overrideAccess: false,
	user: owner,
});
await assert.rejects(
	() =>
		payload.findByID({
			collection: "lead-deliveries",
			id: ownerDeleteDelivery.id,
			...access,
		}),
	/not found/i,
	"owner lead delete must cascade to linked deliveries",
);

const directDeleteLead = await payload.create({
	collection: "leads",
	data: {
		name: "Direct delivery delete proof",
		phoneE164: "+79990000012",
		formKind: "callback",
		sourcePage: "/",
		status: "new",
		consent: {
			accepted: true,
			version: "test",
			consentedAt: clock.nowIso(),
		},
		idempotencyKey: `itest-direct-delete-${suffix}`,
		retentionMode: "delete",
	},
	...access,
});
const directOwnerDeleteDelivery = await payload.create({
	collection: "lead-deliveries",
	data: {
		lead: directDeleteLead.id,
		channelId: `direct-owner-delete-${suffix}`,
		channelKind: "messenger",
		status: "pending",
		attempts: 0,
		idempotencyKey: `itest-direct-owner-delete-${suffix}`,
	},
	...access,
});
await payload.delete({
	collection: "lead-deliveries",
	id: directOwnerDeleteDelivery.id,
	overrideAccess: false,
	user: owner,
});
const directSystemDeleteDelivery = await payload.create({
	collection: "lead-deliveries",
	data: {
		lead: directDeleteLead.id,
		channelId: `direct-system-delete-${suffix}`,
		channelKind: "messenger",
		status: "pending",
		attempts: 0,
		idempotencyKey: `itest-direct-system-delete-${suffix}`,
	},
	...access,
});
await payload.delete({
	collection: "lead-deliveries",
	id: directSystemDeleteDelivery.id,
	...access,
});
await payload.delete({
	collection: "leads",
	id: directDeleteLead.id,
	...access,
});

const retentionLead = await payload.create({
	collection: "leads",
	data: {
		name: "Retention PII",
		phoneRaw: "+7 999 000 00 03",
		phoneE164: "+79990000003",
		email: "retention@example.test",
		message: "private retention message",
		formKind: "callback",
		sourcePage: "/retention-proof",
		status: "new",
		consent: {
			accepted: true,
			version: "test",
			consentedAt: clock.nowIso(),
		},
		idempotencyKey: `itest-retention-${suffix}`,
		retentionUntil: "2026-09-18T11:00:00.000Z",
		retentionMode: "anonymize",
		fraudFingerprint: "irreversible-but-private-marker",
	},
	...access,
});
const retentionDelivery = await payload.create({
	collection: "lead-deliveries",
	data: {
		lead: retentionLead.id,
		channelId: `retention-${suffix}`,
		channelKind: "messenger",
		status: "failed",
		attempts: 1,
		idempotencyKey: `itest-retention-delivery-${suffix}`,
		lastErrorKind: "retryable",
		lastErrorRedacted: "private retention message",
		attemptLog: [
			{
				attemptedAt: clock.nowIso(),
				outcome: "retryable",
				redactedNote: "+79990000003",
			},
		],
	},
	...access,
});

const ownerDelivery = await payload.findByID({
	collection: "lead-deliveries",
	id: retentionDelivery.id,
	overrideAccess: false,
	user: owner,
});
assert.equal(ownerDelivery.lastErrorKind, "retryable");
for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
] as const) {
	await assertRoleReadDenied(
		"lead-deliveries",
		retentionDelivery.id,
		role,
		user,
	);
}
assert.equal(
	(
		await payload.findByID({
			collection: "lead-deliveries",
			id: retentionDelivery.id,
			...access,
		})
	).lastErrorKind,
	"retryable",
);

for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
	["owner", owner],
] as const) {
	await assert.rejects(
		() =>
			payload.update({
				collection: "lead-deliveries",
				id: retentionDelivery.id,
				data: { nextAttemptAt: clock.nowIso() },
				overrideAccess: false,
				user,
			}),
		`${role} must not use generic delivery update`,
	);
	await assert.rejects(
		() =>
			payload.create({
				collection: "lead-deliveries",
				data: {
					lead: retentionLead.id,
					channelId: `denied-${role}-${suffix}`,
					channelKind: "messenger",
					status: "pending",
					attempts: 0,
					idempotencyKey: `itest-denied-delivery-${role}-${suffix}`,
				},
				overrideAccess: false,
				user,
			} as never),
		`${role} must not use generic delivery create`,
	);
}
for (const [role, user] of [
	["anonymous", null],
	["editor", editor],
	["admin", admin],
] as const) {
	await assert.rejects(
		() =>
			payload.delete({
				collection: "lead-deliveries",
				id: retentionDelivery.id,
				overrideAccess: false,
				user,
			}),
		`${role} must not delete lead deliveries`,
	);
}
await payload.update({
	collection: "lead-deliveries",
	id: retentionDelivery.id,
	data: { nextAttemptAt: clock.nowIso() },
	...access,
});

const retentionTask = payloadJobTasks.find(
	(task) => task.slug === payloadJobTaskSlugs.leadRetentionCleanup,
);
if (typeof retentionTask?.handler !== "function") {
	throw new Error("leadRetentionCleanup handler is missing");
}
const mutableProjectConfig = projectConfig as {
	leadRetentionDays: number | null;
};
const previousLeadRetentionDays = mutableProjectConfig.leadRetentionDays;
mutableProjectConfig.leadRetentionDays = 90;
try {
	await retentionTask.handler({
		req: { payload, user: undefined } as never,
		input: {},
		job: {} as never,
	} as never);
} finally {
	mutableProjectConfig.leadRetentionDays = previousLeadRetentionDays;
}

const anonymizedLead = await payload.findByID({
	collection: "leads",
	id: retentionLead.id,
	depth: 0,
	...access,
});
assert.equal(anonymizedLead.name, "Anonymized lead");
assert.equal(anonymizedLead.phoneRaw, null);
assert.equal(anonymizedLead.phoneE164, "+00000000000");
assert.equal(anonymizedLead.email, null);
assert.equal(anonymizedLead.message, null);
assert.equal(anonymizedLead.fraudFingerprint, null);
assert.ok(
	anonymizedLead.piiPurgedAt,
	"anonymize must preserve shell and mark PII purge",
);

const purgedDelivery = await payload.findByID({
	collection: "lead-deliveries",
	id: retentionDelivery.id,
	depth: 0,
	...access,
});
assert.deepEqual(purgedDelivery.attemptLog, []);
assert.equal(purgedDelivery.lastErrorRedacted, null);
assert.ok(purgedDelivery.diagnosticsPurgedAt);

async function createRetryFixture(label: string, phone: string) {
	const retryLead = await payload.create({
		collection: "leads",
		data: {
			name: `Retry ${label}`,
			phoneE164: phone,
			formKind: "callback",
			sourcePage: "/retry-proof",
			status: "new",
			consent: {
				accepted: true,
				version: "test",
				consentedAt: clock.nowIso(),
			},
			idempotencyKey: `itest-retry-lead-${label}-${suffix}`,
			retentionUntil: "2099-01-01T00:00:00.000Z",
			retentionMode: "anonymize",
		},
		...access,
	});
	return payload.create({
		collection: "lead-deliveries",
		data: {
			lead: retryLead.id,
			channelId: "max",
			channelKind: "messenger",
			status: "pending",
			attempts: 0,
			nextAttemptAt: clock.nowIso(),
			idempotencyKey: `itest-retry-delivery-${label}-${suffix}`,
		},
		...access,
	});
}

async function findDeliveryJobs(deliveryId: number | string) {
	return payload.find({
		collection: "payload-jobs",
		where: {
			and: [
				{ taskSlug: { equals: payloadJobTaskSlugs.deliverLead } },
				{ concurrencyKey: { equals: `lead-delivery:${deliveryId}` } },
			],
		},
		limit: 10,
		depth: 0,
		...access,
	});
}

const retryEndpoint = Array.isArray(LeadDeliveries.endpoints)
	? LeadDeliveries.endpoints.find((endpoint) => endpoint.path === "/:id/retry")
	: undefined;
assert.ok(retryEndpoint, "lead delivery retry endpoint must exist");
const manualRetryDelivery = await createRetryFixture(
	"manual-owner",
	"+79990000013",
);
for (const [role, user, context] of [
	["anonymous", null, undefined],
	["editor", editor, undefined],
	["admin", admin, undefined],
	["system", undefined, { systemGatewayOperation: "system-job" }],
] as const) {
	const response = await retryEndpoint.handler({
		payload,
		user,
		context,
		routeParams: { id: String(manualRetryDelivery.id) },
	} as never);
	assert.equal(response.status, 403, `${role} retry endpoint must deny`);
}
const ownerRetryResponse = await retryEndpoint.handler({
	payload,
	user: owner,
	routeParams: { id: String(manualRetryDelivery.id) },
} as never);
assert.equal(ownerRetryResponse.status, 200, "owner retry endpoint must allow");
const ownerRetryBody = (await ownerRetryResponse.json()) as {
	ok?: boolean;
	jobId?: string;
};
assert.equal(ownerRetryBody.ok, true);
assert.ok(ownerRetryBody.jobId);
const manualRetryAfter = await payload.findByID({
	collection: "lead-deliveries",
	id: manualRetryDelivery.id,
	depth: 0,
	...access,
});
assert.equal(manualRetryAfter.status, "pending");
assert.equal(manualRetryAfter.jobId, ownerRetryBody.jobId);
assert.equal((await findDeliveryJobs(manualRetryDelivery.id)).totalDocs, 1);

const deliverTask = payloadJobTasks.find(
	(task) => task.slug === payloadJobTaskSlugs.deliverLead,
);
if (typeof deliverTask?.handler !== "function") {
	throw new Error("deliverLead handler is missing");
}

const policyTimingDelivery = await createRetryFixture(
	"policy-timing",
	"+79990000003",
);
const timingPolicy = defineLeadDeliveryPolicy({
	...projectConfig.leadDelivery,
	retryScheduleMinutes: [0, 3, 9],
	unknownDeliveryBackoffMinutes: 3,
});
let capturedWaitUntil: string | undefined;
await runDeliverLeadTask({
	payload,
	leadDeliveryId: String(policyTimingDelivery.id),
	nowIso: clock.nowIso(),
	policy: timingPolicy,
	env: {
		LEAD_OUTBOUND_HOSTS: "127.0.0.1",
		MAX_API_URL: process.env.MAX_API_URL,
		MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
		MAX_CHAT_ID: process.env.MAX_CHAT_ID,
		AMS_ALLOW_TEST_DESTINATIONS: process.env.AMS_ALLOW_TEST_DESTINATIONS,
		AMS_TEST_APPROVED_ORIGINS: process.env.AMS_TEST_APPROVED_ORIGINS,
		NODE_ENV: process.env.NODE_ENV,
	},
	queueRetry: async ({ waitUntil }) => {
		capturedWaitUntil = waitUntil.toISOString();
		return "policy-timing-job";
	},
});
const policyTimingAfter = await payload.findByID({
	collection: "lead-deliveries",
	id: policyTimingDelivery.id,
	depth: 0,
	...access,
});
assert.equal(policyTimingAfter.nextAttemptAt, "2026-09-18T12:03:00.000Z");
assert.equal(capturedWaitUntil, policyTimingAfter.nextAttemptAt);

const scheduledRetryDelivery = await createRetryFixture(
	"scheduled",
	"+79990000004",
);
const scheduledResult = await deliverTask.handler({
	req: { payload, user: undefined } as never,
	input: { leadDeliveryId: String(scheduledRetryDelivery.id) },
	job: {} as never,
} as never);
assert.deepEqual(
	Object.keys(scheduledResult).sort(),
	["output"],
	"Payload task result must contain only supported handler fields",
);
const scheduledDeliveryAfter = await payload.findByID({
	collection: "lead-deliveries",
	id: scheduledRetryDelivery.id,
	depth: 0,
	...access,
});
assert.equal(scheduledDeliveryAfter.status, "pending");
assert.ok(scheduledDeliveryAfter.jobId);
const scheduledJobs = await findDeliveryJobs(scheduledRetryDelivery.id);
assert.equal(
	scheduledJobs.totalDocs,
	1,
	"retry must queue exactly one future job",
);
const scheduledJob = scheduledJobs.docs[0];
assert.equal(scheduledJob.queue, payloadJobQueues.leadDeliveries);
assert.equal(scheduledJob.taskSlug, payloadJobTaskSlugs.deliverLead);
assert.deepEqual(scheduledJob.input, {
	leadDeliveryId: String(scheduledRetryDelivery.id),
});
assert.equal(scheduledJob.waitUntil, scheduledDeliveryAfter.nextAttemptAt);
assert.ok(new Date(scheduledJob.waitUntil ?? 0) > clock.now());

const enqueueCrashDelivery = await createRetryFixture("crash", "+79990000005");
await assert.rejects(
	() =>
		runDeliverLeadTask({
			payload,
			leadDeliveryId: String(enqueueCrashDelivery.id),
			nowIso: clock.nowIso(),
			policy: projectConfig.leadDelivery,
			env: {
				LEAD_OUTBOUND_HOSTS: "127.0.0.1",
				MAX_API_URL: process.env.MAX_API_URL,
				MAX_BOT_TOKEN: process.env.MAX_BOT_TOKEN,
				MAX_CHAT_ID: process.env.MAX_CHAT_ID,
				AMS_ALLOW_TEST_DESTINATIONS: process.env.AMS_ALLOW_TEST_DESTINATIONS,
				AMS_TEST_APPROVED_ORIGINS: process.env.AMS_TEST_APPROVED_ORIGINS,
				NODE_ENV: process.env.NODE_ENV,
			},
			queueRetry: async () => {
				throw new Error("fixture enqueue crash");
			},
		}),
	/fixture enqueue crash/,
);
const crashPending = await payload.findByID({
	collection: "lead-deliveries",
	id: enqueueCrashDelivery.id,
	depth: 0,
	...access,
});
assert.equal(crashPending.status, "pending");
assert.equal(crashPending.jobId, null);
assert.ok(crashPending.nextAttemptAt);

clock.setIso(crashPending.nextAttemptAt ?? "2026-09-18T12:01:00.000Z");
const recoveryTask = payloadJobTasks.find(
	(task) => task.slug === payloadJobTaskSlugs.recoverLeadDeliveries,
);
if (typeof recoveryTask?.handler !== "function") {
	throw new Error("recoverLeadDeliveries handler is missing");
}
const stalePolicyDelivery = await createRetryFixture(
	"stale-policy",
	"+79990000007",
);
const staleHeartbeat = new Date(
	clock.now().getTime() - 16 * 60_000,
).toISOString();
await payload.update({
	collection: "lead-deliveries",
	id: stalePolicyDelivery.id,
	data: {
		status: "sending",
		attempts: 1,
		claimedAt: staleHeartbeat,
		heartbeatAt: staleHeartbeat,
	},
	...access,
});
await recoveryTask.handler({
	req: { payload, user: undefined } as never,
	input: {},
	job: {} as never,
} as never);
const stalePolicyAfter = await payload.findByID({
	collection: "lead-deliveries",
	id: stalePolicyDelivery.id,
	depth: 0,
	...access,
});
assert.equal(stalePolicyAfter.status, "pending");
assert.ok(
	stalePolicyAfter.attemptLog?.some(
		(entry) => entry.safeCode === "stale_sending_recovered",
	),
	"15-minute policy must recover stale sending before the 30-minute orphan threshold",
);
const recoveredCrashDelivery = await payload.findByID({
	collection: "lead-deliveries",
	id: enqueueCrashDelivery.id,
	depth: 0,
	...access,
});
assert.ok(recoveredCrashDelivery.jobId, "sweeper must recover enqueue failure");
assert.equal((await findDeliveryJobs(enqueueCrashDelivery.id)).totalDocs, 1);
await recoveryTask.handler({
	req: { payload, user: undefined } as never,
	input: {},
	job: {} as never,
} as never);
assert.equal(
	(await findDeliveryJobs(enqueueCrashDelivery.id)).totalDocs,
	1,
	"attached live job must prevent duplicate requeue",
);

const attachCrashDelivery = await createRetryFixture(
	"attach-crash",
	"+79990000006",
);
const futureJob = await payload.jobs.queue({
	task: payloadJobTaskSlugs.deliverLead,
	queue: payloadJobQueues.leadDeliveries,
	input: { leadDeliveryId: String(attachCrashDelivery.id) },
	waitUntil: new Date(clock.now().getTime() + 10 * 60_000),
});
await recoveryTask.handler({
	req: { payload, user: undefined } as never,
	input: {},
	job: {} as never,
} as never);
const repairedAttach = await payload.findByID({
	collection: "lead-deliveries",
	id: attachCrashDelivery.id,
	depth: 0,
	...access,
});
assert.equal(repairedAttach.jobId, String(futureJob.id));
assert.equal(
	(await findDeliveryJobs(attachCrashDelivery.id)).totalDocs,
	1,
	"live future job found by concurrency key must prevent duplicate requeue",
);

const feedSource = await payload.create({
	collection: "feed-sources",
	data: {
		code: `itest-feed-${suffix}`,
		title: "Integration feed",
		parser: "yrl",
		market: "secondary",
		feedUrlRef: "INTEGRATION_FEED_URL",
		enabled: true,
		refreshIntervalMinutes: 60,
		nextDueAt: clock.nowIso(),
		safetyThresholdPercent: 30,
		maxDeactivationsPerRun: 50,
		lastOfferCount: 2,
	},
	...access,
});

const lifecycleRun = await payload.create({
	collection: "import-runs",
	data: {
		feedSource: feedSource.id,
		status: "queued",
		queuedAt: "2026-09-18T11:55:00.000Z",
	},
	...access,
});
const claimAt = new Date("2026-09-18T12:00:00.000Z");
const contenders = await Promise.all([
	claimQueuedImportRun(payload, {
		importRunId: String(lifecycleRun.id),
		now: claimAt,
	}),
	claimQueuedImportRun(payload, {
		importRunId: String(lifecycleRun.id),
		now: claimAt,
	}),
]);
assert.equal(
	contenders.filter(Boolean).length,
	1,
	"two concurrent import contenders must produce exactly one claim winner",
);
const heartbeatAt = new Date("2026-09-18T12:01:00.000Z");
assert.equal(
	await touchImportRunHeartbeat(payload, {
		importRunId: String(lifecycleRun.id),
		now: heartbeatAt,
	}),
	true,
	"the running claim owner must update its heartbeat",
);
const heartbeatRead = await payload.findByID({
	collection: "import-runs",
	id: lifecycleRun.id,
	depth: 0,
	...access,
});
assert.equal(
	heartbeatRead.heartbeatAt,
	heartbeatAt.toISOString(),
	"an independent Local API read must observe the committed heartbeat",
);
assert.equal(
	await finishImportRun(payload, {
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:02:00.000Z"),
		status: "success",
	}),
	true,
	"the running claim owner must win one terminal transition",
);
assert.equal(
	await finishImportRun(payload, {
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:03:00.000Z"),
		status: "failed",
	}),
	false,
	"a terminal import run must reject a second terminal transition",
);
assert.equal(
	await claimQueuedImportRun(payload, {
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:04:00.000Z"),
	}),
	undefined,
	"a terminal import run must never restart",
);
await payload.update({
	collection: "feed-sources",
	id: feedSource.id,
	data: {
		deactivationApproval: {
			runId: lifecycleRun.id,
			expiresAt: "2026-09-18T13:00:00.000Z",
			consumedAt: null,
		},
	},
	...access,
});
assert.equal(
	await consumeDeactivationApproval(payload, {
		feedSourceId: String(feedSource.id),
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:05:00.000Z"),
	}),
	false,
	"database approval consumption must reject a row without approvedAt",
);
await payload.update({
	collection: "feed-sources",
	id: feedSource.id,
	data: {
		deactivationApproval: {
			runId: lifecycleRun.id,
			approvedAt: "2026-09-18T12:00:00.000Z",
			expiresAt: "2026-09-18T13:00:00.000Z",
			consumedAt: null,
		},
	},
	...access,
});
assert.equal(
	await consumeDeactivationApproval(payload, {
		feedSourceId: String(feedSource.id),
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:05:00.000Z"),
	}),
	true,
	"complete matching approval must be consumed once",
);
assert.equal(
	await consumeDeactivationApproval(payload, {
		feedSourceId: String(feedSource.id),
		importRunId: String(lifecycleRun.id),
		now: new Date("2026-09-18T12:05:00.000Z"),
	}),
	false,
	"consumed approval must not be reusable",
);

const importRun = await payload.create({
	collection: "import-runs",
	data: {
		feedSource: feedSource.id,
		status: "running",
		queuedAt: "2026-09-18T10:00:00.000Z",
		startedAt: "2026-09-18T10:00:00.000Z",
		heartbeatAt: "2026-09-18T10:00:00.000Z",
	},
	...access,
});

const janitor = payloadJobTasks.find(
	(task) => task.slug === payloadJobTaskSlugs.jobsJanitor,
);
const handler = janitor?.handler;
if (typeof handler !== "function") {
	throw new Error("jobsJanitor handler is missing");
}

clock.setIso("2026-09-18T12:00:00.000Z");
await handler({
	req: { payload, user: undefined } as never,
	input: {},
	job: {} as never,
} as never);

const recovered = await payload.findByID({
	collection: "import-runs",
	id: importRun.id,
	...access,
});
assert.equal(recovered.status, "interrupted");

resetRuntimeClock();
await payload.destroy();
