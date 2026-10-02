import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registryCsv = readFileSync('docs/seo/SEO_REGISTRY_SEED.csv', 'utf8');
const registrySeed = readFileSync('src/project/seo/registry-seed.ts', 'utf8');
const profile = readFileSync('src/project/site-profile.config.ts', 'utf8');
const urlGrammar = readFileSync('src/core/routing/url-grammar.ts', 'utf8');
const geoCatalog = readFileSync('src/project/data-access/public/geo-catalog.ts', 'utf8');
const runtimeRoute = readFileSync('src/project/routing/runtime-route.ts', 'utf8');
const contentGate = readFileSync('src/project/routing/content-gate.ts', 'utf8');
const navigation = readFileSync('src/core/navigation/builders.ts', 'utf8');
const dto = readFileSync('src/project/data-access/public/dto.ts', 'utf8');

for (const route of ['/kvartiry/', '/rostov-na-donu/kvartiry/', '/rostov-na-donu/kvartiry/vtorichka/']) {
  assert.ok(registryCsv.includes(route), `${route} must be present in SEO registry CSV`);
  assert.ok(registrySeed.includes(`"url": "${route}"`), `${route} must be present in generated registry seed`);
}
const kvartiryRootStart = registrySeed.indexOf('"url": "/kvartiry/"');
const kvartiryRootEnd = registrySeed.indexOf('"templateKey": "categoryRoot"', kvartiryRootStart);
assert.ok(kvartiryRootStart > 0 && kvartiryRootEnd > kvartiryRootStart, 'generated registry must include /kvartiry/ categoryRoot block');
const kvartiryRootBlock = registrySeed.slice(kvartiryRootStart, kvartiryRootEnd);
assert.ok(kvartiryRootBlock.includes('"defaultRobots": "noindex,follow"'), '/kvartiry/ must remain noindex in SINGLE_GEO');
assert.ok(registryCsv.includes('/kvartiry/') && registryCsv.includes('"noindex,follow"'), '/kvartiry/ noindex must be encoded in registry CSV');

const vtorichkaStart = registrySeed.indexOf('"facet": "vtorichka"');
const vtorichkaEnd = registrySeed.indexOf('"contentGateRule": "listing"', vtorichkaStart) + '"contentGateRule": "listing"'.length;
assert.ok(vtorichkaStart > 0 && vtorichkaEnd > vtorichkaStart, 'generated registry must include vtorichka categoryGeoFacet block');
const vtorichkaBlock = registrySeed.slice(vtorichkaStart, vtorichkaEnd);
assert.ok(vtorichkaBlock.includes('"url": "/rostov-na-donu/kvartiry/vtorichka/"'), 'vtorichka must resolve to geo-first facet URL');
assert.ok(vtorichkaBlock.includes('"contentGateRule": "listing"'), 'vtorichka must be owned by listing Content Gate');
assert.equal(registrySeed.includes('/rostov-na-donu/kvartiry/novostroyki/'), false, 'novostroyki apartment facet must not be generated');
assert.equal(registryCsv.includes('/rostov-na-donu/kvartiry/novostroyki/'), false, 'novostroyki apartment facet must not be in CSV registry');

assert.ok(profile.includes('"kvartiry": "ACTIVE"'), 'kvartiry must be ACTIVE in project profile');
assert.ok(profile.includes('"vtorichka"'), 'vtorichka SEO facet must be configured');
assert.ok(profile.includes('"category": "kvartiry"'), 'vtorichka must belong to kvartiry category');
assert.ok(profile.includes('"key": "market"') && profile.includes('"value": "secondary"'), 'vtorichka must map to secondary market filter');
assert.equal(profile.includes('"facet": "novostroyki"'), false, 'novostroyki facet must not be configured for apartments');

assert.ok(urlGrammar.includes('case "categoryRoot"') && urlGrammar.includes('return `/${key.category}/`;'), 'category root URL builder must exist');
assert.ok(urlGrammar.includes('case "categoryGeo"') && urlGrammar.includes('assertConfiguredGeo(key.geo)'), 'geo category URL builder must require configured geo');
assert.ok(urlGrammar.includes('case "categoryGeoFacet"') && urlGrammar.includes('assertFacet(geo, key.category, key.facet)'), 'facet URLs must be built only from facet whitelist');
assert.ok(urlGrammar.includes('if (facetSets.get(`${first}/${second}`)?.has(third))'), 'parser must resolve whitelisted geo/category facet third segment');
assert.equal(urlGrammar.includes('kind: "categoryGeoFacet"') && urlGrammar.includes('facet: "novostroyki"'), false, 'grammar must not hard-code novostroyki as apartment facet');

assert.ok(runtimeRoute.includes('pageKey.kind === "categoryGeoFacet"'), 'runtime route must handle categoryGeoFacet');
assert.ok(runtimeRoute.includes('parseCatalogSearchParams(queryString)'), 'catalog and facet routes must use bounded catalog query parser');
assert.ok(runtimeRoute.includes('catalogFilterKeysForQuery(catalogQuery)'), 'runtime must reject disabled filter keys');
assert.ok(runtimeRoute.includes('catalogCanonicalPath(decision.canonicalPath, routeData.query)'), 'query combinations must canonicalize separately from path facets');
assert.ok(contentGate.includes('kind: "listing"') && contentGate.includes('inventory: data.value.total'), 'facet/listing pages must be evaluated by listing Content Gate and inventory');

assert.ok(geoCatalog.includes('catalogQueryForSeoFacet(profile, parsed.geo, parsed.surface, parsed.facet)'), 'listings must resolve facet paths through configured SEO facets');
assert.ok(geoCatalog.includes('if (parsed.facet && !facetResolution) return null;'), 'unknown/unmeasured facet must fail closed');
assert.ok(geoCatalog.includes('facet.filter.key === "market"') && geoCatalog.includes('facet.filter.value === "secondary"'), 'vtorichka facet must support secondary market filter');
assert.ok(geoCatalog.includes('facetLinks') && geoCatalog.includes('Object.entries(profile.seoFacets)'), 'catalog shell must expose path navigation only from configured SEO facets');
assert.ok(geoCatalog.includes('if (!markets.includes("newbuild") || input.facet) return 0;'), 'newbuild units may list in apartments geo but not under apartment facets');
assert.ok(geoCatalog.includes('facetResolution?.query') || geoCatalog.includes('facetResolution?.market'), 'facet resolution must affect listing query/inventory');

assert.ok(navigation.includes('case "categoryGeoFacet"'), 'safe navigation must support categoryGeoFacet links');
assert.ok(dto.includes('/rostov-na-donu/kvartiry/') && dto.includes('/rostov-na-donu/novostroyki/'), 'home/category DTO must keep separate apartments and novostroyki links');
assert.equal(dto.includes('/rostov-na-donu/kvartiry/novostroyki/'), false, 'public DTO must not expose forbidden apartments/novostroyki facet link');

console.log('verify:epic25-apartments passed');
