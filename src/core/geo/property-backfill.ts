export type GeoAliasEntity = {
	id: string;
	slug: string;
	title: string;
	morphology?: {
		nominative?: string | null;
		genitive?: string | null;
		prepositional?: string | null;
	} | null;
	status?: "draft" | "published" | "archived" | null;
};

export type BackfillRegion = GeoAliasEntity & {
	shortName?: string | null;
};

export type BackfillCity = GeoAliasEntity & {
	regionId: string;
	morphologyApproved?: boolean | null;
};

export type BackfillDistrict = GeoAliasEntity & {
	cityId: string;
	synonyms?: readonly string[];
	morphologyApproved?: boolean | null;
};

export type PropertyGeoBackfillInput = {
	region?: string | null;
	locality?: string | null;
	district?: string | null;
};

export type PropertyGeoBackfillIssue = {
	code:
		| "GEO_REGION_UNRECOGNIZED"
		| "GEO_REGION_AMBIGUOUS"
		| "GEO_CITY_UNRECOGNIZED"
		| "GEO_CITY_AMBIGUOUS"
		| "GEO_DISTRICT_UNRECOGNIZED"
		| "GEO_DISTRICT_AMBIGUOUS"
		| "GEO_DISTRICT_CITY_REQUIRED";
	field: "region" | "locality" | "district";
	messageRedacted: string;
};

export type PropertyGeoBackfillDecision = {
	regionRef?: string | null;
	cityRef?: string | null;
	districtRef?: string | null;
	issues: PropertyGeoBackfillIssue[];
};

export function normalizeGeoLookupValue(value: string): string {
	return value
		.trim()
		.toLocaleLowerCase("ru-RU")
		.replaceAll("ё", "е")
		.replace(/\s+/g, " ");
}

function aliases(
	entity: GeoAliasEntity,
	approvedMorphology: boolean,
): Set<string> {
	const values = [entity.slug, entity.title];
	if (approvedMorphology && entity.morphology) {
		values.push(
			entity.morphology.nominative ?? "",
			entity.morphology.genitive ?? "",
			entity.morphology.prepositional ?? "",
		);
	}
	return new Set(values.filter(Boolean).map(normalizeGeoLookupValue));
}

function findMatches<T>(
	raw: string,
	entities: readonly T[],
	getAliases: (entity: T) => ReadonlySet<string>,
): T[] {
	const needle = normalizeGeoLookupValue(raw);
	return entities.filter((entity) => getAliases(entity).has(needle));
}

function issue(
	code: PropertyGeoBackfillIssue["code"],
	field: PropertyGeoBackfillIssue["field"],
	kind: "unrecognized" | "ambiguous" | "city-required",
): PropertyGeoBackfillIssue {
	const message =
		kind === "ambiguous"
			? `Canonical ${field} match is ambiguous; raw value omitted.`
			: kind === "city-required"
				? "District matching requires one canonical city; raw value omitted."
				: `No canonical ${field} match exists; raw value omitted.`;
	return { code, field, messageRedacted: message };
}

export function resolvePropertyGeoBackfill(input: {
	property: PropertyGeoBackfillInput;
	regions: readonly BackfillRegion[];
	cities: readonly BackfillCity[];
	districts: readonly BackfillDistrict[];
}): PropertyGeoBackfillDecision {
	const result: PropertyGeoBackfillDecision = { issues: [] };
	const activeRegions = input.regions.filter(
		(entity) => entity.status !== "archived",
	);
	const activeCities = input.cities.filter(
		(entity) => entity.status !== "archived",
	);
	const activeDistricts = input.districts.filter(
		(entity) => entity.status !== "archived",
	);

	let regionId: string | null = null;
	if (input.property.region?.trim()) {
		const matches = findMatches(
			input.property.region,
			activeRegions,
			(entity) => {
				const result = aliases(entity, true);
				if (entity.shortName)
					result.add(normalizeGeoLookupValue(entity.shortName));
				return result;
			},
		);
		if (matches.length === 1) {
			regionId = matches[0].id;
			result.regionRef = regionId;
		} else {
			result.regionRef = null;
			result.issues.push(
				issue(
					matches.length === 0
						? "GEO_REGION_UNRECOGNIZED"
						: "GEO_REGION_AMBIGUOUS",
					"region",
					matches.length === 0 ? "unrecognized" : "ambiguous",
				),
			);
		}
	}

	let cityId: string | null = null;
	if (input.property.locality?.trim()) {
		const candidates = regionId
			? activeCities.filter((entity) => entity.regionId === regionId)
			: input.property.region?.trim()
				? []
				: activeCities;
		const matches = findMatches(input.property.locality, candidates, (entity) =>
			aliases(entity, Boolean(entity.morphologyApproved)),
		);
		if (matches.length === 1) {
			cityId = matches[0].id;
			result.cityRef = cityId;
			if (!input.property.region?.trim())
				result.regionRef = matches[0].regionId;
		} else {
			result.cityRef = null;
			result.issues.push(
				issue(
					matches.length === 0 ? "GEO_CITY_UNRECOGNIZED" : "GEO_CITY_AMBIGUOUS",
					"locality",
					matches.length === 0 ? "unrecognized" : "ambiguous",
				),
			);
		}
	}

	if (input.property.district?.trim()) {
		result.districtRef = null;
		if (!cityId) {
			result.issues.push(
				issue("GEO_DISTRICT_CITY_REQUIRED", "district", "city-required"),
			);
		} else {
			const matches = findMatches(
				input.property.district,
				activeDistricts.filter((entity) => entity.cityId === cityId),
				(entity) => {
					const result = aliases(entity, Boolean(entity.morphologyApproved));
					for (const synonym of entity.synonyms ?? []) {
						result.add(normalizeGeoLookupValue(synonym));
					}
					return result;
				},
			);
			if (matches.length === 1) {
				result.districtRef = matches[0].id;
			} else {
				result.issues.push(
					issue(
						matches.length === 0
							? "GEO_DISTRICT_UNRECOGNIZED"
							: "GEO_DISTRICT_AMBIGUOUS",
						"district",
						matches.length === 0 ? "unrecognized" : "ambiguous",
					),
				);
			}
		}
	}

	return result;
}
