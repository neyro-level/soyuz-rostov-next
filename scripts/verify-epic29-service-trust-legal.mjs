import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const requiredRoutes = [
  ['src/app/(site)/uslugi/page.tsx', 'uslugi'],
  ['src/app/(site)/prodat/page.tsx', 'prodat'],
  ['src/app/(site)/ipoteka/page.tsx', 'ipoteka'],
  ['src/app/(site)/ipoteka/semeynaya/page.tsx', 'ipoteka/semeynaya'],
  ['src/app/(site)/o-kompanii/page.tsx', 'o-kompanii'],
  ['src/app/(site)/kontakty/page.tsx', 'kontakty'],
  ['src/app/(site)/politika-konfidencialnosti/page.tsx', 'politika-konfidencialnosti'],
  ['src/app/(site)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx', 'soglasie-na-obrabotku-personalnyh-dannyh'],
];
const profile = readFileSync('src/project/site-profile.config.ts', 'utf8');
const readiness = readFileSync('src/project/client-readiness.config.ts', 'utf8');
const legalConfig = readFileSync('src/project/legal.config.ts', 'utf8');
const seoContracts = readFileSync('scripts/verify-seo-contracts.mjs', 'utf8');
const reviews = readFileSync('src/app/(site)/otzyvy/page.tsx', 'utf8');
const construction = readFileSync('src/app/(site)/stroitelstvo-domov/page.tsx', 'utf8');
const provider = readFileSync('src/project/data-access/public/provider.ts', 'utf8');
const pages = readFileSync('src/project/data-access/public/pages.ts', 'utf8');

for (const [file, slug] of requiredRoutes) {
  assert.ok(existsSync(file), `${file} must exist`);
  const source = readFileSync(file, 'utf8');
  assert.ok(source.includes(`generateMarketingMetadata("${slug}")`), `${file} must generate metadata for ${slug}`);
  assert.ok(source.includes(`<MarketingRoute slug="${slug}" />`), `${file} must render marketing page ${slug}`);
}
for (const path of ['/uslugi', '/prodat', '/ipoteka', '/ipoteka/semeynaya', '/o-kompanii', '/kontakty', '/politika-konfidencialnosti', '/soglasie-na-obrabotku-personalnyh-dannyh']) {
  assert.ok(profile.includes(`"path": "${path}"`), `${path} must be in staticRoutes`);
}
assert.ok(profile.includes('"path": "/politika-konfidencialnosti"') && profile.includes('"indexable": false'), 'privacy page must remain noindex/static excluded from sitemap');
assert.ok(profile.includes('"path": "/soglasie-na-obrabotku-personalnyh-dannyh"') && profile.includes('"indexable": false'), 'consent page must remain noindex/static excluded from sitemap');
assert.ok(profile.includes('"path": "/ipoteka/semeynaya"') && profile.includes('"indexable": false'), 'family mortgage subpage must stay noindex until evidence gate');
assert.ok(readiness.includes('legalContent') && readiness.includes('"approved"'), 'client readiness must carry explicit legal content approval state');
assert.ok(legalConfig.includes('currentConsentVersion') && legalConfig.includes('consentHref: "/soglasie-na-obrabotku-personalnyh-dannyh/"'), 'lead consent must use project legal config');
assert.ok(provider.includes('getPublicMarketingPage') && provider.includes('fallbackPublicPage(slug'), 'marketing routes must render DTO/fallback without hardcoded starter copy');
assert.ok(pages.includes('status: { equals: "published" }') && pages.includes('publishedAt: { exists: true }'), 'Payload marketing pages must be published before public rendering');
assert.ok(reviews.includes('notFound()'), '/otzyvy/ must remain hidden until verified review source');
assert.ok(construction.includes('notFound()'), '/stroitelstvo-domov/ must remain outside R1');
assert.ok(seoContracts.includes('src/app/(site)/politika-konfidencialnosti/page.tsx') && seoContracts.includes('src/app/(site)/soglasie-na-obrabotku-personalnyh-dannyh/page.tsx'), 'SEO contracts must cover legal route files');

console.log('verify:epic29-service-trust-legal passed');
