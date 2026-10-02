import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dto = readFileSync('src/project/data-access/public/dto.ts', 'utf8');
const page = readFileSync('src/app/(site)/page.tsx', 'utf8');
const homeView = readFileSync('packages/ui/src/views/home/StarterHomePageView.tsx', 'utf8');
const structured = readFileSync('src/project/seo/structured-data-builders.ts', 'utf8');
const templates = readFileSync('src/project/seo/templates.ts', 'utf8');

for (const required of [
  '/rostov-na-donu/novostroyki/',
  '/rostov-na-donu/kvartiry/',
  '/rostov-na-donu/zastroyshchiki/',
  '/ipoteka/',
  '/prodat/',
]) {
  assert.ok(dto.includes(`href: "${required}"`), `home must link active R1 surface ${required}`);
}
for (const forbidden of ['/sdat/', '/otzyvy/', '/stroitelstvo-domov/', '/journal/']) {
  assert.equal(dto.includes(forbidden), false, `home DTO must not link ${forbidden}`);
  assert.equal(homeView.includes(forbidden), false, `home UI must not hardcode ${forbidden}`);
}
for (const forbiddenClaim of ['лет', '№', 'клиентов', 'сделок']) {
  assert.equal(homeView.toLowerCase().includes(forbiddenClaim), false, `home UI must not contain unsourced claim token ${forbiddenClaim}`);
}
assert.ok(page.includes('getPublicHomePage'), 'home must use public Gateway provider');
assert.ok(page.includes('buildOrganizationJsonLd(home.nap)'), 'RealEstateAgent JSON-LD must use approved NAP');
assert.ok(structured.includes('"@type": "RealEstateAgent"'), 'organization JSON-LD type must remain RealEstateAgent');
assert.ok(templates.includes('homeSingleGeo'), 'home template must remain separate from geo hub template');
assert.ok(templates.includes('geoHub'), 'geo hub template must remain present');
assert.ok(dto.includes('projectHomeSeoTemplateKey(siteProfile.geoMode)'), 'home must use home SEO template key');
assert.ok(homeView.includes('Gateway DTO'), 'home visible copy must document DTO-backed previews');
console.log('verify:epic20-home passed');
