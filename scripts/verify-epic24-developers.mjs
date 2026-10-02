import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registryCsv = readFileSync('docs/seo/SEO_REGISTRY_SEED.csv', 'utf8');
const registrySeed = readFileSync('src/project/seo/registry-seed.ts', 'utf8');
const profile = readFileSync('src/project/site-profile.config.ts', 'utf8');
const runtimeRoute = readFileSync('src/project/routing/runtime-route.ts', 'utf8');
const contentGate = readFileSync('src/project/routing/content-gate.ts', 'utf8');
const urlGrammar = readFileSync('src/core/routing/url-grammar.ts', 'utf8');
const geoCatalog = readFileSync('src/project/data-access/public/geo-catalog.ts', 'utf8');
const listView = readFileSync('packages/ui/src/views/developer/DevelopersListView.tsx', 'utf8');
const detailView = readFileSync('packages/ui/src/views/developer/DeveloperView.tsx', 'utf8');

assert.ok(registryCsv.includes('/zastroyshchiki/'), 'global developer root must be registered');
assert.ok(registryCsv.includes('/rostov-na-donu/zastroyshchiki/'), 'Rostov developer hub must be registered');
assert.ok(registrySeed.includes('"url": "/zastroyshchiki/"'), 'generated registry must include global developer root');
assert.ok(registrySeed.includes('"url": "/rostov-na-donu/zastroyshchiki/"'), 'generated registry must include Rostov developer hub');
const developerRootStart = registrySeed.indexOf('"kind": "developerRoot"');
const developerRootEnd = registrySeed.indexOf('"templateKey": "developerRoot"', developerRootStart);
assert.ok(developerRootStart > 0 && developerRootEnd > developerRootStart, 'generated registry must include developerRoot block');
const developerRootBlock = registrySeed.slice(developerRootStart, developerRootEnd);
assert.ok(developerRootBlock.includes('"defaultRobots": "noindex,follow"'), 'global developer root must remain noindex in SINGLE_GEO');
assert.ok(registrySeed.includes('"contentGateRule": "developerGeo"'), 'developer hubs must use developerGeo Content Gate');
assert.ok(profile.includes('"developersSurface"'), 'project profile must own developer surface statuses');
assert.ok(profile.includes('"root": "ACTIVE"'), 'developer root route must be enabled in the project profile');
assert.ok(registryCsv.includes('/zastroyshchiki/') && registryCsv.includes('"noindex,follow"'), 'developer root noindex must be owned by SEO registry defaults');
assert.ok(profile.includes('"developerGeoMin": 5'), 'developer geo hub must keep min-5 Gate threshold');
assert.ok(profile.includes('"developerDescMinChars": 600'), 'developer entity must keep sourced description length Gate');

assert.ok(urlGrammar.includes('case "developerRoot"') && urlGrammar.includes('"/zastroyshchiki/"'), 'developer root must have its own namespace');
assert.ok(urlGrammar.includes('case "geoDevelopers"') && urlGrammar.includes('/zastroyshchiki/'), 'geo developer hub must have its own namespace');
assert.ok(urlGrammar.includes('case "developer"') && urlGrammar.includes('/zastroyshchiki/${assertEntitySlug'), 'developer entity must resolve only under /zastroyshchiki/{slug}/');
assert.ok(urlGrammar.includes('reservedRoots') && urlGrammar.includes('zastroyshchiki'), 'zastroyshchiki must remain reserved from naked entity slugs');

assert.ok(runtimeRoute.includes('parsePageSearchParams(queryString)'), 'developer entity must only accept bounded page query');
assert.ok(runtimeRoute.includes('getDeveloperRouteFacts(payload, pageKey.slug)'), 'developer route must load sourced description facts');
assert.ok(runtimeRoute.includes('listDevelopmentGateFactsForCities'), 'developer routes must evaluate development Gate facts');
assert.ok(runtimeRoute.includes('passingDevelopmentDeveloperIds'), 'developer routes must derive developers with Gate-passed ЖК');
assert.ok(runtimeRoute.includes('hasPassingDevelopment: passingDeveloperIds.has(developer.id)'), 'developer entity must expose Gate-passed ЖК state');
assert.ok(runtimeRoute.includes('descriptionSource: developerFacts.descriptionSource'), 'developer entity must pass description source to Gate');
assert.ok(runtimeRoute.includes('descriptionCheckedAt: developerFacts.descriptionCheckedAt'), 'developer entity must pass description checkedAt to Gate');
assert.ok(contentGate.includes('kind: "developerGeo"') && contentGate.includes('developersWithPassingDevelopment'), 'runtime content gate must evaluate developer geo hubs');
assert.ok(contentGate.includes('kind: "developer"') && contentGate.includes('hasPassingDevelopment'), 'runtime content gate must evaluate developer entity pages');

const developerFactsStart = geoCatalog.indexOf('export async function getDeveloperRouteFacts');
const developerListStart = geoCatalog.indexOf('export async function listDevelopments');
assert.ok(developerFactsStart > 0 && developerListStart > developerFactsStart, 'developer route facts function must exist');
const developerFacts = geoCatalog.slice(developerFactsStart, developerListStart);
assert.ok(developerFacts.includes('source: true') && developerFacts.includes('checkedAt: true'), 'developer route facts must read source and checkedAt for sourced-description Gate');
assert.equal(
  developerFacts.includes(`overrideAccess: ${'true'}`),
  false,
  'developer facts must use public gateway access policy, not raw override',
);

const cardStart = geoCatalog.indexOf('function toDeveloperCardDTO');
const detailsStart = geoCatalog.indexOf('function toDeveloperDetailsDTO');
const listingStart = geoCatalog.indexOf('function listingDTO');
assert.ok(cardStart > 0 && detailsStart > cardStart && listingStart > detailsStart, 'developer DTO mappers must exist');
const cardMapper = geoCatalog.slice(cardStart, detailsStart);
const detailsMapper = geoCatalog.slice(detailsStart, listingStart);
for (const forbidden of ['checkedAt', 'source:', 'sourceUrl', 'rating', 'reviews']) {
  assert.equal(cardMapper.includes(forbidden), false, `developer card DTO must not expose ${forbidden}`);
}
for (const forbidden of ['checkedAt', 'source:', 'sourceUrl', 'rating', 'reviews']) {
  assert.equal(detailsMapper.includes(forbidden), false, `developer details DTO must not expose ${forbidden}`);
}
assert.ok(detailsMapper.includes('legalName') && detailsMapper.includes('website'), 'developer details must include factual legal/site fields when available');

for (const [name, source] of [['list view', listView], ['detail view', detailView]]) {
  for (const forbidden of ['рейтинг', 'Рейтинг', 'отзыв', 'Отзыв', 'Проверено:', 'checkedAt', 'sourceUrl']) {
    assert.equal(source.includes(forbidden), false, `${name} must not render fabricated ratings/reviews or private source dates (${forbidden})`);
  }
}
assert.ok(listView.includes('Проектов: {developer.developmentsCount}'), 'developer list must show factual project count');
assert.ok(detailView.includes('Проекты застройщика'), 'developer detail must show published developments section');
assert.ok(detailView.includes('Сайт застройщика'), 'developer detail must render verified website when available');

console.log('verify:epic24-developers passed');
