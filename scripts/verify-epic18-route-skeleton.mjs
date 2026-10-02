import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(path, 'utf8');
const manifestPath = 'docs/research/EPIC_18_ACTIVE_ROUTE_SKELETON_2026-10-02.json';
assert.ok(existsSync(manifestPath), 'EPIC-18 route manifest proof is missing');
const manifest = JSON.parse(read(manifestPath));

for (const route of ['/', '/rostov-na-donu/', '/novostroyki/', '/rostov-na-donu/novostroyki/', '/kvartiry/', '/rostov-na-donu/kvartiry/', '/rostov-na-donu/kvartiry/vtorichka/', '/uslugi/', '/prodat/', '/ipoteka/', '/ipoteka/semeynaya/', '/o-kompanii/', '/kontakty/']) {
  assert.ok(manifest.activeRoutes.includes(route), `${route} must be listed as active R1 skeleton`);
}
for (const route of ['/sdat/', '/nedvizhimost/', '/otzyvy/', '/stroitelstvo-domov/', '/journal/', '/journal/**']) {
  assert.ok(manifest.failClosedRoutes.includes(route), `${route} must be listed as fail-closed`);
}

const profile = read('src/project/site-profile.config.ts');
assert.ok(profile.includes('"path": "/ipoteka/semeynaya"'), 'family mortgage route must be in static profile');
assert.ok(profile.includes('"indexable": false'), 'family mortgage must remain safe/noindex until content gate');
assert.equal(profile.includes('"path": "/sdat"'), false, '/sdat must not be an active static route when arenda is OUT');
assert.equal(profile.includes('"from": "/nedvizhimost"'), false, 'generic /nedvizhimost redirect must be absent');

const failClosedFiles = [
  'src/app/(site)/sdat/page.tsx',
  'src/app/(site)/nedvizhimost/page.tsx',
  'src/app/(site)/otzyvy/page.tsx',
  'src/app/(site)/stroitelstvo-domov/page.tsx',
];
for (const file of failClosedFiles) {
  assert.ok(existsSync(file), `${file} must exist for explicit fail-closed behaviour`);
  assert.ok(read(file).includes('notFound()'), `${file} must call notFound()`);
}

for (const reserved of ['src/app/(site)/journal/page.tsx', 'src/app/(site)/journal/[...segments]/page.tsx']) {
  assert.equal(existsSync(reserved), false, `${reserved} must not occupy reserved /journal namespace`);
}

for (const forbidden of ['src/app/(site)/doma/page.tsx', 'src/app/(site)/uchastki/page.tsx', 'src/app/(site)/kommercheskaya-nedvizhimost/page.tsx', 'src/app/(site)/arenda/page.tsx', 'src/app/(site)/kottedzhnye-poselki/page.tsx']) {
  assert.equal(existsSync(forbidden), false, `${forbidden} must not exist in R1`);
}

console.log('verify:epic18-route-skeleton passed');
