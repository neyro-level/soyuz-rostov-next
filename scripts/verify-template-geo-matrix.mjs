import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const matrixPath = resolve(root, "docs/reference/TEMPLATE_GEO_MATRIX.json");

function readMatrix() {
	return JSON.parse(readFileSync(matrixPath, "utf8"));
}

const expectedAdministrativeDistricts = [
	["Северный", "severnyy", "Северном", "Северного"],
	["Южный", "yuzhnyy", "Южном", "Южного"],
	["Западный", "zapadnyy", "Западном", "Западного"],
	["Восточный", "vostochnyy", "Восточном", "Восточного"],
	["Центральный", "tsentralnyy", "Центральном", "Центрального"],
	["Прибрежный", "pribrezhnyy", "Прибрежном", "Прибрежного"],
	["Лесной", "lesnoy", "Лесном", "Лесного"],
	["Степной", "stepnoy", "Степном", "Степного"],
];

const expectedMicrodistricts = [
	["Солнечный", "solnechnyy", "Солнечном", "Солнечного", "в"],
	["Речной", "rechnoy", "Речном", "Речного", "в"],
	[
		"Старая слобода",
		"staraya-sloboda",
		"Старой слободе",
		"Старой слободы",
		"в",
	],
	["Лесная поляна", "lesnaya-polyana", "Лесной поляне", "Лесной поляны", "на"],
];

function assertSafeguards(matrix) {
	assert.equal(matrix.matrixId, "TEMPLATE_GEO_MATRIX");
	assert.deepEqual(matrix.safeguards, {
		fixtureOnly: true,
		synthetic: true,
		indexing: "noindex",
		clientExportByDefault: false,
		productionSeed: "forbidden",
	});
	assert.deepEqual(matrix.clientIntakePolicy, {
		verifiedClientGeoRequired: true,
		copySyntheticRecords: "forbidden",
		exposeByDefault: false,
	});
}

function assertCapabilities(matrix) {
	assert.deepEqual(matrix.capabilityCoverage.geoModes, [
		"SINGLE_GEO",
		"MULTI_GEO",
	]);
	assert.deepEqual(matrix.capabilityCoverage.publicationStates, [true, false]);
	assert.deepEqual(matrix.capabilityCoverage.behaviors, [
		"morphology",
		"normalization",
		"urlBuilding",
	]);
	assert.deepEqual(matrix.seoPolicy, {
		allowedClassifications: ["P1", "P2", "TEST", "filter-only"],
		publishFromRecordExistence: false,
	});
}

function assertExactGeo(matrix) {
	assert.deepEqual(matrix.city, {
		slug: "testograd",
		nominative: "Тестоград",
		genitive: "Тестограда",
		prepositional: "Тестограде",
		preposition: "в",
	});

	assert.equal(matrix.administrativeDistricts.length, 8);
	assert.equal(matrix.microdistricts.length, 4);

	const administrativeBySlug = new Map(
		matrix.administrativeDistricts.map((district) => [district.slug, district]),
	);
	assert.equal(
		administrativeBySlug.size,
		matrix.administrativeDistricts.length,
	);
	for (const expected of expectedAdministrativeDistricts) {
		const actual = administrativeBySlug.get(expected[1]);
		assert.ok(actual, `Missing administrative district ${expected[1]}`);
		assert.deepEqual(
			[actual.name, actual.slug, actual.locative, actual.genitive],
			expected,
			`Administrative district ${expected[1]} drift`,
		);
		assert.equal(typeof actual.published, "boolean");
	}
	const microdistrictsBySlug = new Map(
		matrix.microdistricts.map((district) => [district.slug, district]),
	);
	assert.equal(microdistrictsBySlug.size, matrix.microdistricts.length);
	for (const expected of expectedMicrodistricts) {
		const actual = microdistrictsBySlug.get(expected[1]);
		assert.ok(actual, `Missing microdistrict ${expected[1]}`);
		assert.deepEqual(
			[
				actual.name,
				actual.slug,
				actual.locative,
				actual.genitive,
				actual.preposition,
			],
			expected,
			`Microdistrict ${expected[1]} drift`,
		);
		assert.equal(typeof actual.published, "boolean");
	}

	const allDistricts = [
		...matrix.administrativeDistricts,
		...matrix.microdistricts,
	];
	assert.equal(new Set(allDistricts.map(({ slug }) => slug)).size, 12);
	assert.deepEqual(
		new Set(allDistricts.map(({ published }) => published)),
		new Set([true, false]),
	);
	assert.deepEqual(
		new Set(allDistricts.map(({ seoClassification }) => seoClassification)),
		new Set(["P1", "P2", "TEST", "filter-only"]),
	);
}

function verify(matrix) {
	assert.equal(matrix.schemaVersion, 1);
	assertSafeguards(matrix);
	assertCapabilities(matrix);
	assertExactGeo(matrix);
}

const matrix = readMatrix();
verify(matrix);

const reorderedMatrix = structuredClone(matrix);
reorderedMatrix.administrativeDistricts.reverse();
reorderedMatrix.microdistricts.reverse();
verify(reorderedMatrix);

const duplicateSyntheticDistrict = structuredClone(matrix);
duplicateSyntheticDistrict.administrativeDistricts.push(
	structuredClone(duplicateSyntheticDistrict.administrativeDistricts[0]),
);
assert.throws(
	() => verify(duplicateSyntheticDistrict),
	undefined,
	"Duplicate synthetic district slug must fail",
);

const unsafeSeed = structuredClone(matrix);
unsafeSeed.safeguards.productionSeed = "allowed";
assert.throws(() => verify(unsafeSeed), undefined, "Production seed must fail");

const exportable = structuredClone(matrix);
exportable.safeguards.clientExportByDefault = true;
assert.throws(
	() => verify(exportable),
	undefined,
	"Default client export must fail",
);

const indexableSynthetic = structuredClone(matrix);
indexableSynthetic.safeguards.indexing = "index";
assert.throws(
	() => verify(indexableSynthetic),
	undefined,
	"Synthetic indexing must fail",
);

const realLookingCity = structuredClone(matrix);
realLookingCity.city.slug = "rostov-na-donu";
assert.throws(
	() => verify(realLookingCity),
	undefined,
	"Non-fictional city must fail",
);

const missingDistrict = structuredClone(matrix);
missingDistrict.administrativeDistricts.pop();
assert.throws(
	() => verify(missingDistrict),
	undefined,
	"Incomplete admin matrix must fail",
);

const publishedOnly = structuredClone(matrix);
for (const district of [
	...publishedOnly.administrativeDistricts,
	...publishedOnly.microdistricts,
]) {
	district.published = true;
}
assert.throws(
	() => verify(publishedOnly),
	undefined,
	"Single publication state must fail",
);

const inferredPublication = structuredClone(matrix);
inferredPublication.seoPolicy.publishFromRecordExistence = true;
assert.throws(
	() => verify(inferredPublication),
	undefined,
	"District existence must not imply page publication",
);

console.log(
	"GENERIC SYNTHETIC CAPABILITY PASS (1 fictional city, stable slug collection semantics, 8 administrative districts, 4 microdistricts, all 4 SEO classes, 5 safeguards, 8 negative cases)",
);
