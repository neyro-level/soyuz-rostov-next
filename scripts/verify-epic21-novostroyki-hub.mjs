import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const registryCsv = readFileSync('docs/seo/SEO_REGISTRY_SEED.csv', 'utf8');
const registrySeed = readFileSync('src/project/seo/registry-seed.ts', 'utf8');
const districtsCsv = readFileSync('docs/seo/DISTRICTS.csv', 'utf8');
const profile = readFileSync('src/project/site-profile.config.ts', 'utf8');
const geoCatalog = readFileSync('src/project/data-access/public/geo-catalog.ts', 'utf8');
const nav = readFileSync('src/core/navigation/builders.ts', 'utf8');

assert.ok(registryCsv.includes('/novostroyki/'), 'global novostroyki root must be registered');
assert.ok(registryCsv.includes('/rostov-na-donu/novostroyki/'), 'Rostov novostroyki geo hub must be registered');
for (const forbidden of [
  '/rostov-na-donu/novostroyki/leninskiy/',
  '/rostov-na-donu/novostroyki/voroshilovskiy/',
  '/rostov-na-donu/novostroyki/severnyy/',
  '/rostov-na-donu/novostroyki/tsentr/',
]) {
  assert.equal(registryCsv.includes(forbidden), false, `${forbidden} must remain excluded from R1 registry`);
  assert.equal(registrySeed.includes(forbidden), false, `${forbidden} must remain excluded from generated registry seed`);
}
assert.equal(/novostroyki,[^\n]*district/i.test(districtsCsv), false, 'DISTRICTS.csv must not re-enable novostroyki district routes');
assert.ok(profile.includes('"novostroyki": "ACTIVE"'), 'novostroyki must be ACTIVE in project profile');

const cardStart = geoCatalog.indexOf('function toDevelopmentCardDTO');
const detailsStart = geoCatalog.indexOf('function toDevelopmentDetailsDTO');
assert.ok(cardStart > 0 && detailsStart > cardStart, 'development card/details functions must exist');
const cardSource = geoCatalog.slice(cardStart, detailsStart);
for (const forbidden of ['checkedAt', 'priceCheckedAt', 'sourceUrl', 'source:']) {
  assert.equal(cardSource.includes(forbidden), false, `listing card DTO must not expose ${forbidden}`);
}
assert.ok(geoCatalog.includes('function freshDevelopmentPrices'), 'fresh price helper must exist');
assert.ok(geoCatalog.includes('isFreshDevelopmentPrice(row.priceCheckedAt'), 'development prices must be freshness-filtered');
assert.ok(geoCatalog.includes('function findNearbyCities'), 'nearby city helper must exist');
assert.ok(geoCatalog.includes('agglomerationOf'), 'nearby cities must be based on agglomerationOf');
assert.ok(
  geoCatalog.includes('projectNavigationLinks') && geoCatalog.includes('findNearbyCities(payload, city)'),
  'nearby links must go through safe navigation',
);
assert.ok(nav.includes('function activeGeo') && nav.includes('definition?.published && isActive(definition.hubStatus)'), 'safe navigation must reject inactive geo hubs');
console.log('verify:epic21-novostroyki-hub passed');
