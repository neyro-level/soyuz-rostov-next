import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getPayload } from "payload";
import config from "../payload.config.ts";
import { requirePayloadRuntime } from "../src/project/env.ts";
import { calculatePropertyDerivedFields } from "../src/core/ingest/derived-fields.ts";
import { systemOverrideAccess } from "../src/core/data-access/system/overrides.ts";

type AtlasPhoto = {
	path: string;
	alt?: string | null;
	checksum?: string | null;
};

type AtlasProvenance = {
	source: string;
	externalId: string;
	technicalUrl?: string | null;
	collectedAt: string;
};

type AtlasProperty = {
	type: "property";
	order: number;
	slug: string;
	externalId: string;
	category: "apartment" | "commercial" | "house" | "land";
	rooms?: number | null;
	title: string;
	address: string;
	district?: string | null;
	price?: number | null;
	area?: number | null;
	lotArea?: number | null;
	livingArea?: number | null;
	kitchenArea?: number | null;
	floor?: number | null;
	floorsTotal?: number | null;
	description?: string | null;
	photos: AtlasPhoto[];
	latitude?: number | null;
	longitude?: number | null;
	provenance: AtlasProvenance;
};

type AtlasComplex = {
	type: "residential-complex";
	order: number;
	slug: string;
	name: string;
	developer?: string | null;
	address: string;
	district?: string | null;
	latitude?: number | null;
	longitude?: number | null;
	readiness?: string | null;
	completion?: string | null;
	classLabel?: string | null;
	buildingType?: string | null;
	floorsLabel?: string | null;
	ceilingHeightLabel?: string | null;
	priceFrom?: number | null;
	description?: string | null;
	photos: AtlasPhoto[];
	provenance: AtlasProvenance;
};

type AtlasCatalog = {
	schemaVersion: string;
	city: string;
	collectedAt: string;
	properties: AtlasProperty[];
	complexes: AtlasComplex[];
	checksum: string;
};

type ImportRecord = {
	externalId: string;
	slug: string;
	data: Record<string, unknown>;
};

const catalogPath = join(process.cwd(), "scripts", "demo", "atlas-yandex", "catalog.json");
const mediaRoot = join(process.cwd(), "public", "atlas-demo", "yandex");
const mediaUrlPrefix = "/atlas-demo/yandex";
const verifyOnly = process.argv.includes("--verify-only");

function readCatalog(): AtlasCatalog {
	const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as AtlasCatalog;
	if (catalog.properties.length !== 60) {
		throw new Error(`Atlas demo import expected 60 properties, got ${catalog.properties.length}.`);
	}
	if (catalog.complexes.length !== 20) {
		throw new Error(`Atlas demo import expected 20 complexes, got ${catalog.complexes.length}.`);
	}
	return catalog;
}

function hashRecord(record: unknown): string {
	return createHash("sha256").update(JSON.stringify(record)).digest("hex");
}

function moneyMinor(value?: number | null): number | undefined {
	if (typeof value !== "number") return undefined;
	return Math.round(value * 100);
}

function pricePerMeterMinor(priceMinor?: number | null, area?: number | null) {
	return calculatePropertyDerivedFields({
		priceMinor,
		totalArea: area,
	}).pricePerMeterMinor;
}

function defined<T>(value: T | null | undefined): T | undefined {
	return value == null ? undefined : value;
}

function mediaImages(photos: AtlasPhoto[], title: string) {
	return photos.map((photo, index) => {
		const localPath = join(mediaRoot, photo.path);
		if (!existsSync(localPath)) {
			throw new Error(`Atlas demo media is missing: ${photo.path}`);
		}
		return {
			kind: "external",
			url: `${mediaUrlPrefix}/${photo.path.replaceAll("\\", "/")}`,
			alt: photo.alt || title,
			order: index,
		};
	});
}

function internalSourceNote(provenance: AtlasProvenance, kind: "property" | "complex") {
	return [
		`Atlas demo ${kind}.`,
		`source=${provenance.source}`,
		`externalId=${provenance.externalId}`,
		`collectedAt=${provenance.collectedAt}`,
	].join("\n");
}

function propertyRecord(item: AtlasProperty): ImportRecord {
	const externalId = `atlas-demo-property-${item.externalId}`;
	const priceMinor = moneyMinor(item.price);
	return {
		externalId,
		slug: item.slug,
		data: {
			origin: "manual",
			externalId,
			importHash: hashRecord(item),
			firstSeenAt: item.provenance.collectedAt,
			lastSeenAt: item.provenance.collectedAt,
			status: "active",
			needsReview: Boolean(item.latitude == null || item.longitude == null),
			publishedAt: item.provenance.collectedAt,
			slug: item.slug,
			market: "secondary",
			category: item.category,
			dealType: "sale",
			priceMinor,
			currency: "RUB",
			pricePerMeterMinor: pricePerMeterMinor(priceMinor, item.area),
			rooms: defined(item.rooms),
			totalArea: defined(item.area),
			livingArea: defined(item.livingArea),
			kitchenArea: defined(item.kitchenArea),
			floor: defined(item.floor),
			floors: defined(item.floorsTotal),
			region: "Краснодарский край",
			locality: "Краснодар",
			district: defined(item.district),
			publicAddress: item.address,
			lat: defined(item.latitude),
			lng: defined(item.longitude),
			title: item.title,
			description: item.description,
			images: mediaImages(item.photos, item.title),
			internalComment: internalSourceNote(item.provenance, "property"),
		},
	};
}

function complexDescription(item: AtlasComplex): string {
	const facts = [
		item.developer ? `Застройщик: ${item.developer}.` : null,
		item.completion ? `Срок/готовность: ${item.completion}.` : null,
		item.classLabel ? `Класс: ${item.classLabel}.` : null,
		item.buildingType ? `Технология: ${item.buildingType}.` : null,
		item.floorsLabel ? `Этажность: ${item.floorsLabel}.` : null,
		item.ceilingHeightLabel ? `Высота потолков: ${item.ceilingHeightLabel}.` : null,
	].filter(Boolean);
	return [item.description, ...facts].filter(Boolean).join("\n\n");
}

function complexRecord(item: AtlasComplex): ImportRecord {
	const sourceId = item.provenance.externalId || item.slug;
	const externalId = `atlas-demo-complex-${sourceId}`;
	const priceMinor = moneyMinor(item.priceFrom);
	return {
		externalId,
		slug: `atlas-${item.slug}`,
		data: {
			origin: "manual",
			externalId,
			externalComplexId: sourceId,
			externalComplexName: item.name,
			importHash: hashRecord(item),
			firstSeenAt: item.provenance.collectedAt,
			lastSeenAt: item.provenance.collectedAt,
			status: "active",
			needsReview: Boolean(item.latitude == null || item.longitude == null),
			publishedAt: item.provenance.collectedAt,
			slug: `atlas-${item.slug}`,
			market: "newbuild",
			category: "apartment",
			dealType: "sale",
			priceMinor,
			currency: "RUB",
			region: "Краснодарский край",
			locality: "Краснодар",
			district: defined(item.district),
			publicAddress: item.address,
			lat: defined(item.latitude),
			lng: defined(item.longitude),
			title: item.name,
			description: complexDescription(item),
			images: mediaImages(item.photos, item.name),
			internalComment: internalSourceNote(item.provenance, "complex"),
		},
	};
}

async function findExisting(payload: Awaited<ReturnType<typeof getPayload>>, record: ImportRecord) {
	const result = await payload.find({
		collection: "properties",
		depth: 0,
		limit: 1,
		where: {
			or: [
				{ externalId: { equals: record.externalId } },
				{ slug: { equals: record.slug } },
			],
		},
		...systemOverrideAccess("controlled-maintenance"),
	});
	return result.docs[0];
}

async function upsertRecords(
	payload: Awaited<ReturnType<typeof getPayload>>,
	records: ImportRecord[],
) {
	let created = 0;
	let updated = 0;

	for (const record of records) {
		const existing = await findExisting(payload, record);
		if (existing) {
			await payload.update({
				collection: "properties",
				id: existing.id,
				data: record.data,
				...systemOverrideAccess("controlled-maintenance"),
			});
			updated += 1;
		} else {
			await payload.create({
				collection: "properties",
				data: record.data,
				...systemOverrideAccess("controlled-maintenance"),
			} as never);
			created += 1;
		}
	}

	return { created, updated };
}

async function countExpected(
	payload: Awaited<ReturnType<typeof getPayload>>,
	records: ImportRecord[],
) {
	let found = 0;
	for (const record of records) {
		const existing = await findExisting(payload, record);
		if (existing) found += 1;
	}
	return found;
}

requirePayloadRuntime();

const catalog = readCatalog();
const propertyRecords = catalog.properties.map(propertyRecord);
const complexRecords = catalog.complexes.map(complexRecord);
const records = [...propertyRecords, ...complexRecords];

const payload = await getPayload({ config });

try {
	const before = await countExpected(payload, records);
	const result = verifyOnly ? { created: 0, updated: 0 } : await upsertRecords(payload, records);
	const afterProperties = await countExpected(payload, propertyRecords);
	const afterComplexes = await countExpected(payload, complexRecords);
	const after = afterProperties + afterComplexes;

	if (afterProperties !== 60 || afterComplexes !== 20) {
		throw new Error(
			`Atlas demo verification failed: properties=${afterProperties}, complexes=${afterComplexes}.`,
		);
	}

	payload.logger.info(
		`atlas demo import ${verifyOnly ? "verify" : "upsert"}: before=${before}, after=${after}, properties=${afterProperties}, complexes=${afterComplexes}, created=${result.created}, updated=${result.updated}`,
	);
} finally {
	await payload.destroy();
}

