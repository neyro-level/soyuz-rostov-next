import { starterFixtureDataset } from "./starter-dataset.ts";

export type StarterFixtureCollection =
	| "regions"
	| "cities"
	| "districts"
	| "developers"
	| "developments"
	| "properties";

export type StarterFixtureSeedPort = {
	upsert(input: {
		collection: StarterFixtureCollection;
		identity:
			| { field: string; value: string }
			| { fields: Record<string, string | number> };
		data: Record<string, unknown>;
	}): Promise<{
		id: string | number;
		state: "created" | "updated" | "unchanged";
	}>;
};

type GeoSeedDistrict = Record<string, unknown> & {
	slug: string;
	parent: string | null;
	preposition: "v" | "vo" | "na";
} & (
		| {
				districtType: "admin_district";
				adjLocative: string;
				adjGenitive: string;
		  }
		| {
				districtType: "microdistrict";
				locative: string;
				adjLocative?: never;
				adjGenitive?: never;
		  }
	);

export type GeoSeedDataset = {
	snapshotAt: string;
	region: Record<string, unknown> & { slug: string };
	cities: readonly (Record<string, unknown> & {
		slug: string;
		agglomerationOf?: string;
		districts: readonly GeoSeedDistrict[];
	})[];
};

function hasRequiredMorphology(value: unknown): boolean {
	if (!value || typeof value !== "object") return false;
	const morphology = value as Record<string, unknown>;
	return ["nominative", "genitive", "prepositional"].every(
		(key) =>
			typeof morphology[key] === "string" && morphology[key].trim() !== "",
	);
}

export function validateGeoSeedDataset(dataset: GeoSeedDataset): void {
	if (
		!dataset.region.slug ||
		!dataset.snapshotAt ||
		!hasRequiredMorphology(dataset.region.morphology)
	) {
		throw new Error("Geo seed requires region slug and snapshotAt.");
	}
	const citySlugs = new Set<string>();
	for (const city of dataset.cities) {
		if (
			!city.slug ||
			citySlugs.has(city.slug) ||
			!hasRequiredMorphology(city.morphology) ||
			!["v", "vo", "na"].includes(String(city.preposition))
		) {
			throw new Error(
				`Geo seed city slug is invalid or duplicated: ${city.slug}`,
			);
		}
		citySlugs.add(city.slug);
		const districts = new Map(city.districts.map((item) => [item.slug, item]));
		if (districts.size !== city.districts.length) {
			throw new Error(`Geo seed has duplicate districts in city ${city.slug}.`);
		}
		for (const district of city.districts) {
			if (
				!district.slug ||
				!["admin_district", "microdistrict"].includes(district.districtType) ||
				!hasRequiredMorphology(district.morphology)
			) {
				throw new Error(
					`Geo seed district ${city.slug}/${district.slug} is invalid.`,
				);
			}
			if (!["v", "vo", "na"].includes(district.preposition)) {
				throw new Error(
					`Geo seed district ${city.slug}/${district.slug} preposition is invalid.`,
				);
			}
			if (
				district.districtType === "admin_district" &&
				(typeof district.adjLocative !== "string" ||
					!district.adjLocative.trim() ||
					typeof district.adjGenitive !== "string" ||
					!district.adjGenitive.trim())
			) {
				throw new Error(
					`Geo seed admin district ${city.slug}/${district.slug} requires adjective forms.`,
				);
			}
			if (
				district.districtType === "microdistrict" &&
				(typeof district.locative !== "string" ||
					!district.locative.trim() ||
					district.adjLocative !== undefined ||
					district.adjGenitive !== undefined)
			) {
				throw new Error(
					`Geo seed microdistrict ${city.slug}/${district.slug} has invalid morphology forms.`,
				);
			}
			if (district.parent !== null && !districts.has(district.parent)) {
				throw new Error(
					`Geo seed district ${city.slug}/${district.slug} parent crosses city.`,
				);
			}
			const visited = new Set([district.slug]);
			let parent = district.parent;
			while (parent !== null) {
				if (visited.has(parent))
					throw new Error(`Geo seed district cycle in city ${city.slug}.`);
				visited.add(parent);
				parent = districts.get(parent)?.parent ?? null;
			}
		}
	}
	for (const city of dataset.cities) {
		if (city.agglomerationOf && !citySlugs.has(city.agglomerationOf)) {
			throw new Error(
				`Geo seed city ${city.slug} has unknown agglomerationOf.`,
			);
		}
		const visited = new Set([city.slug]);
		let parent = city.agglomerationOf;
		while (parent) {
			if (visited.has(parent)) {
				throw new Error(
					"Geo seed city agglomeration hierarchy contains a cycle.",
				);
			}
			visited.add(parent);
			parent = dataset.cities.find(
				(item) => item.slug === parent,
			)?.agglomerationOf;
		}
	}
}

export async function seedGeoDataset(
	port: StarterFixtureSeedPort,
	dataset: GeoSeedDataset,
): Promise<{
	report: StarterFixtureSeedReport;
	regionId: string | number;
	cityIds: Map<string, string | number>;
	districtIds: Map<string, string | number>;
}> {
	validateGeoSeedDataset(dataset);
	const report = emptySeedReport();
	const published = { status: "published", publishedAt: dataset.snapshotAt };
	const upsert = async (
		collection: StarterFixtureCollection,
		identity:
			| { field: string; value: string }
			| { fields: Record<string, string | number> },
		data: Record<string, unknown>,
	) => {
		const result = await port.upsert({ collection, identity, data });
		report[result.state] += 1;
		report.byCollection[collection] += 1;
		return result.id;
	};
	const regionId = await upsert(
		"regions",
		{ field: "slug", value: dataset.region.slug },
		{ ...dataset.region, ...published },
	);
	const cityIds = new Map<string, string | number>();
	const pendingCities = [...dataset.cities];
	while (pendingCities.length > 0) {
		const index = pendingCities.findIndex(
			(city) => !city.agglomerationOf || cityIds.has(city.agglomerationOf),
		);
		if (index < 0) throw new Error("Geo seed cannot resolve city hierarchy.");
		const city = pendingCities.splice(index, 1)[0];
		const { districts: _districts, agglomerationOf, ...data } = city;
		cityIds.set(
			city.slug,
			await upsert(
				"cities",
				{ field: "slug", value: city.slug },
				{
					...data,
					region: regionId,
					agglomerationOf: agglomerationOf
						? requiredReference(
								cityIds,
								agglomerationOf,
								"city.agglomerationOf",
							)
						: undefined,
					...published,
				},
			),
		);
	}
	const districtIds = new Map<string, string | number>();
	for (const city of dataset.cities) {
		const pendingDistricts = [...city.districts];
		while (pendingDistricts.length > 0) {
			const index = pendingDistricts.findIndex(
				(item) =>
					item.parent === null ||
					districtIds.has(`${city.slug}/${item.parent}`),
			);
			if (index < 0) {
				throw new Error(
					`Geo seed cannot resolve district hierarchy in ${city.slug}.`,
				);
			}
			const district = pendingDistricts.splice(index, 1)[0];
			const { parent, ...data } = district;
			const cityId = requiredReference(cityIds, city.slug, "district.city");
			const key = `${city.slug}/${district.slug}`;
			districtIds.set(
				key,
				await upsert(
					"districts",
					{ fields: { slug: district.slug, city: cityId } },
					{
						...data,
						city: cityId,
						parent: parent
							? requiredReference(
									districtIds,
									`${city.slug}/${parent}`,
									"district.parent",
								)
							: undefined,
						...published,
					},
				),
			);
		}
	}
	return { report, regionId, cityIds, districtIds };
}

export type StarterFixtureResetPort = {
	deleteOwned(input: {
		collection: "properties" | "developments" | "developers";
		identity: { field: string; value: string };
		ownership: { field: string; value: string };
	}): Promise<"deleted" | "missing">;
};

export type StarterFixtureSeedReport = {
	created: number;
	updated: number;
	unchanged: number;
	byCollection: Record<StarterFixtureCollection, number>;
};

function emptySeedReport(): StarterFixtureSeedReport {
	return {
		created: 0,
		updated: 0,
		unchanged: 0,
		byCollection: {
			regions: 0,
			cities: 0,
			districts: 0,
			developers: 0,
			developments: 0,
			properties: 0,
		},
	};
}

function requiredReference(
	map: ReadonlyMap<string, string | number>,
	key: string,
	label: string,
): string | number {
	const value = map.get(key);
	if (value === undefined)
		throw new Error(`Starter fixture reference is missing: ${label}=${key}`);
	return value;
}

export async function seedStarterFixture(
	port: StarterFixtureSeedPort,
	options: { through?: "geo" | "all" } = {},
): Promise<StarterFixtureSeedReport> {
	const dataset = starterFixtureDataset;
	if (dataset.identity.indexing !== "noindex") {
		throw new Error("Starter fixture must remain noindex.");
	}
	const geo = await seedGeoDataset(port, {
		snapshotAt: dataset.identity.snapshotAt,
		region: dataset.region,
		cities: dataset.cities,
	});
	const { report, regionId, cityIds, districtIds } = geo;
	async function upsert(
		collection: StarterFixtureCollection,
		identity: { field: string; value: string },
		data: Record<string, unknown>,
	) {
		const result = await port.upsert({ collection, identity, data });
		report[result.state] += 1;
		report.byCollection[collection] += 1;
		return result.id;
	}

	if (options.through === "geo") return report;

	const developerIds = new Map<string, string | number>();
	for (const developer of dataset.developers) {
		developerIds.set(
			developer.slug,
			await upsert(
				"developers",
				{ field: "slug", value: developer.slug },
				{
					...developer,
					description: `Синтетическое описание ${developer.name}.`,
					source: dataset.identity.source,
					checkedAt: dataset.identity.snapshotAt,
					status: "draft",
				},
			),
		);
	}
	const developmentIds = new Map<string, string | number>();
	for (const development of dataset.developments) {
		developmentIds.set(
			development.slug,
			await upsert(
				"developments",
				{ field: "slug", value: development.slug },
				{
					name: development.name,
					slug: development.slug,
					kind: development.kind,
					region: regionId,
					city: requiredReference(
						cityIds,
						development.citySlug,
						"development.city",
					),
					district: requiredReference(
						districtIds,
						`${development.citySlug}/${development.districtSlug}`,
						"development.district",
					),
					developer: requiredReference(
						developerIds,
						development.developerSlug,
						"development.developer",
					),
					address: development.address,
					districtRaw: development.districtSlug,
					salesStatus: "on_sale",
					salesAvailability: "confirmed",
					dataTier: development.dataTier,
					priceByRooms: [
						{
							roomsLabel: "1-комнатные",
							priceFromMinor: development.priceMinor,
							priceToMinor: development.priceMinor,
							lotsAvailable: 1,
							priceCheckedAt: dataset.identity.snapshotAt,
							source: dataset.identity.source,
						},
					],
					descriptions: [
						{
							kind: "short",
							text: `Синтетическое описание ${development.name}.`,
							source: dataset.identity.source,
							checkedAt: dataset.identity.snapshotAt,
						},
					],
					externalIdentities: [
						{
							source: dataset.identity.source,
							externalId: development.externalId,
						},
					],
					source: dataset.identity.source,
					checkedAt: dataset.identity.snapshotAt,
					status: "draft",
				},
			),
		);
	}
	for (const property of dataset.properties) {
		await upsert(
			"properties",
			{ field: "externalId", value: `starter-fixture-${property.externalId}` },
			{
				origin: "manual",
				externalId: `starter-fixture-${property.externalId}`,
				slug: property.slug,
				market: property.market,
				category: property.category,
				dealType: "sale",
				priceMinor: property.priceMinor,
				currency: "RUB",
				rooms: "rooms" in property ? property.rooms : undefined,
				totalArea: "totalArea" in property ? property.totalArea : undefined,
				plotAreaSotka:
					"plotAreaSotka" in property ? property.plotAreaSotka : undefined,
				region: dataset.region.title,
				regionRef: regionId,
				locality: dataset.cities.find((city) => city.slug === property.citySlug)
					?.title,
				cityRef: requiredReference(cityIds, property.citySlug, "property.city"),
				districtRef: requiredReference(
					districtIds,
					`${property.citySlug}/${property.districtSlug}`,
					"property.district",
				),
				district: property.districtSlug,
				development:
					"developmentSlug" in property
						? requiredReference(
								developmentIds,
								property.developmentSlug,
								"property.development",
							)
						: undefined,
				publicAddress: property.title,
				title: property.title,
				description: "Синтетический объект starter fixture.",
				status: "active",
				needsReview: false,
			},
		);
	}
	return report;
}

export async function resetStarterFixture(
	port: StarterFixtureResetPort,
): Promise<{ deleted: number; missing: number; retainedGeoRecords: number }> {
	const dataset = starterFixtureDataset;
	const targets = [
		...dataset.properties.map((property) => ({
			collection: "properties" as const,
			identity: {
				field: "externalId",
				value: `starter-fixture-${property.externalId}`,
			},
			ownership: {
				field: "externalId",
				value: `starter-fixture-${property.externalId}`,
			},
		})),
		...dataset.developments.map((development) => ({
			collection: "developments" as const,
			identity: { field: "slug", value: development.slug },
			ownership: { field: "source", value: dataset.identity.source },
		})),
		...dataset.developers.map((developer) => ({
			collection: "developers" as const,
			identity: { field: "slug", value: developer.slug },
			ownership: { field: "source", value: dataset.identity.source },
		})),
	];
	let deleted = 0;
	let missing = 0;
	for (const target of targets) {
		const state = await port.deleteOwned(target);
		if (state === "deleted") deleted += 1;
		else missing += 1;
	}
	return {
		deleted,
		missing,
		retainedGeoRecords:
			1 +
			dataset.cities.length +
			dataset.cities.reduce((sum, city) => sum + city.districts.length, 0),
	};
}
