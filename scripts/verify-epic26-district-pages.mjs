import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const districtsCsv = readFileSync('docs/seo/DISTRICTS.csv', 'utf8');
const registryCsv = readFileSync('docs/seo/SEO_REGISTRY_SEED.csv', 'utf8');
const registrySeed = readFileSync('src/project/seo/registry-seed.ts', 'utf8');
const urlGrammar = readFileSync('src/core/routing/url-grammar.ts', 'utf8');
const geoCatalog = readFileSync('src/project/data-access/public/geo-catalog.ts', 'utf8');
const runtimeRoute = readFileSync('src/project/routing/runtime-route.ts', 'utf8');
const templates = readFileSync('src/project/seo/templates.ts', 'utf8');
const templateInputs = readFileSync('src/project/seo/template-inputs.ts', 'utf8');
const districtRegistry = readFileSync('src/project/routing/district-registry.ts', 'utf8');
const collectionGuards = readFileSync('src/project/geo/collection-guards.ts', 'utf8');
const districtsCollection = readFileSync('src/project/collections/Districts.ts', 'utf8');
const propertyBackfill = readFileSync('src/core/geo/property-backfill.ts', 'utf8');

const expectedDistricts = ['leninskiy', 'voroshilovskiy', 'severnyy', 'tsentr'];
for (const district of expectedDistricts) {
  const path = `/rostov-na-donu/kvartiry/${district}/`;
  assert.ok(districtsCsv.includes(`rostov-na-donu,kvartiry,${district}`), `${district} must be in R1 DISTRICTS registry for kvartiry`);
  assert.ok(registryCsv.includes(path), `${path} must be present in SEO registry CSV`);
  assert.ok(registrySeed.includes(`"url": "${path}"`), `${path} must be present in generated registry seed`);
}
assert.equal(/novostroyki,[^\n]*(leninskiy|voroshilovskiy|severnyy|tsentr)/i.test(districtsCsv), false, 'R1 DISTRICTS must not re-enable novostroyki district routes');
assert.equal(registryCsv.includes('/rostov-na-donu/novostroyki/severnyy/'), false, 'R1 registry must not include novostroyki district route');

for (const [district, templateKey] of [['leninskiy', 'categoryGeoDistrictAdmin'], ['voroshilovskiy', 'categoryGeoDistrictAdmin'], ['severnyy', 'categoryGeoDistrictMicro'], ['tsentr', 'categoryGeoDistrictMicro']]) {
  const start = registrySeed.indexOf(`"district": "${district}"`);
  assert.ok(start > 0, `${district} registry block must exist`);
  const end = registrySeed.indexOf('"contentGateRule": "listing"', start) + '"contentGateRule": "listing"'.length;
  const block = registrySeed.slice(start, end);
  assert.ok(block.includes(`"templateKey": "${templateKey}"`), `${district} must use ${templateKey}`);
  assert.ok(block.includes('"contentGateRule": "listing"'), `${district} must be listing-gated`);
}

assert.ok(urlGrammar.includes('case "categoryGeoDistrict"') && urlGrammar.includes('assertDistrict(geo, key.category, key.district)'), 'district URLs must be built only from district registry');
assert.ok(urlGrammar.includes('districtSets.get(`${first}/${second}`)?.has(third)'), 'parser must resolve registered geo/category district third segment');
assert.ok(urlGrammar.includes('District/facet collision'), 'district/facet namespace collision must be merge-blocking');
assert.ok(collectionGuards.includes('District slug collides with an SEO facet'), 'Payload district writes must reject district/facet collisions');
assert.ok(districtsCollection.includes('name: "synonyms"'), 'district collection must store aliases/synonyms');
assert.ok(propertyBackfill.includes('for (const synonym of entity.synonyms ?? [])') && propertyBackfill.includes('result.add(normalizeGeoLookupValue(synonym))'), 'district synonyms must canonicalize source text to the canonical district entity');
assert.ok(urlGrammar.includes('assertDistrict(geo, key.category, key.district)'), 'public district URLs must use canonical district slug, not alias paths');

assert.ok(districtRegistry.includes('collection: "districts"'), 'runtime district registry must read Payload districts');
assert.ok(districtRegistry.includes('profile.filterKeys[category]?.includes("district")'), 'runtime district registry must filter by enabled category');
assert.ok(districtRegistry.includes('{ status: { equals: "published" } }'), 'runtime district registry must include only published districts');
assert.ok(districtRegistry.includes('slug: true') && districtRegistry.includes('categories: true'), 'runtime district registry must select slug/categories');

assert.ok(runtimeRoute.includes('getCachedDistrictRouteRegistry()'), 'runtime route must use cached district route registry');
assert.ok(runtimeRoute.includes('pageKey.kind === "categoryGeoDistrict"'), 'runtime route must handle categoryGeoDistrict');
assert.ok(runtimeRoute.includes('parseCatalogSearchParams(queryString)'), 'district catalog route must use bounded query parser');
assert.ok(runtimeRoute.includes('catalogCanonicalPath(decision.canonicalPath, routeData.query)'), 'district query combinations must canonicalize separately from path route');

assert.ok(geoCatalog.includes('findDistrict(payload, Number(city.id), districtSlug, parsed.surface)'), 'district listing must load district metadata');
assert.ok(geoCatalog.includes('if (districtSlug && !district) return null;'), 'missing district evidence must fail closed before rendering');
assert.ok(geoCatalog.includes('{ status: { equals: "published" } }'), 'public district listings must load only published district evidence');
assert.ok(geoCatalog.includes('district: parsed.district') && geoCatalog.includes('findPublicCatalogPropertiesByGeo'), 'district route must filter catalog inventory by district');
assert.ok(geoCatalog.includes('categoryGeoDistrictMicro') && geoCatalog.includes('categoryGeoDistrictAdmin'), 'district SEO template must select admin vs micro by district type');
assert.ok(geoCatalog.includes('districtMorphology(district)'), 'district metadata must use stored district morphology, not guessed declension');
assert.ok(geoCatalog.includes('districtLinks') && geoCatalog.includes('findPublishedDistricts'), 'city catalog must link back to district pages via published district registry');

assert.ok(templateInputs.includes('categoryGeoDistrictAdmin') && templateInputs.includes('{districtAdjLocative}') && templateInputs.includes('районе'), 'admin district metadata template must exist');
assert.ok(templateInputs.includes('categoryGeoDistrictMicro') && templateInputs.includes('{districtPhrase}'), 'microdistrict metadata template must exist');
assert.ok(templates.includes('requiresDistrict') && templates.includes('isApprovedMorphology(context.district)'), 'district templates must require approved district morphology');
assert.ok(templates.includes('templateKey !== "categoryGeoDistrictAdmin"') && templates.includes('context.districtAdjLocative'), 'admin district template must require approved adjective forms');

console.log('verify:epic26-district-pages passed');
