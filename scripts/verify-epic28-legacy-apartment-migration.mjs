import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const migration = JSON.parse(readFileSync('docs/migration/LEGACY_APARTMENT_MIGRATION.json', 'utf8'));
const source = JSON.parse(readFileSync('docs/migration/LEGACY_URL_MANIFEST.json', 'utf8'));
const profile = readFileSync('src/project/site-profile.config.ts', 'utf8');
const legacyManifest = readFileSync('src/project/routing/legacy-route-manifest.ts', 'utf8');
const preflight = readFileSync('src/project/data-access/public/property-lifecycle-preflight.ts', 'utf8');
const proxy = readFileSync('src/proxy.ts', 'utf8');
const redirectGraph = readFileSync('src/core/lifecycle/redirect-graph.ts', 'utf8');

const sourceApartment = source.urls.filter((row) => row.path.startsWith('/kvartiry-rostova/'));
assert.equal(migration.summary.total, sourceApartment.length, 'all legacy apartment URLs must be accounted for');
assert.equal(migration.decisions.length, sourceApartment.length, 'decision table must cover every legacy apartment URL');
assert.equal(migration.summary.total, 49, 'EPIC-03 snapshot must expose 49 apartment URLs');
assert.equal(migration.summary.rootRedirect, 1, 'only the apartment root may use explicit category redirect');
assert.equal(migration.summary.unresolvedIsolated, 48, 'all detail URLs must remain isolated without entity proof');
assert.equal(migration.summary.approvedEntityRedirects, 0, 'no per-entity redirect may be fabricated');
assert.equal(migration.summary.approved410, 0, 'no 410 may be fabricated without lifecycle proof');

const paths = new Set();
for (const decision of migration.decisions) {
  assert.equal(paths.has(decision.legacyPath), false, `duplicate legacy path: ${decision.legacyPath}`);
  paths.add(decision.legacyPath);
  assert.ok(sourceApartment.some((row) => row.path === decision.legacyPath), `${decision.legacyPath} must come from source manifest`);
  if (decision.legacyPath === '/kvartiry-rostova/') {
    assert.equal(decision.decision, 'ROOT_EXPLICIT_PROFILE_REDIRECT');
    assert.equal(decision.target, '/rostov-na-donu/kvartiry/');
  } else {
    assert.equal(decision.decision, 'UNRESOLVED_ISOLATED', `${decision.legacyPath} must stay isolated`);
    assert.equal(decision.target, null, `${decision.legacyPath} must not have fabricated target`);
    assert.ok(decision.publicAction.includes('404'), `${decision.legacyPath} must be isolated as 404 until proof`);
  }
}

assert.ok(profile.includes('"from": "/kvartiry-rostova"') && profile.includes('"to": "/rostov-na-donu/kvartiry/"'), 'root explicit profile redirect must exist');
assert.equal(profile.includes('/kvartiry-rostova/{slug}'), false, 'profile must not contain mass detail redirect pattern');
assert.ok(legacyManifest.includes('legacyApartmentPath') && legacyManifest.includes('kind: "legacyApartment"'), 'legacy apartment detail route must be routed through entity lookup');
assert.ok(preflight.includes('lookupLegacyApartmentLifecyclePreflight') && preflight.includes('findPublicPropertyLifecycleBySlug(payload, slug)'), 'legacy apartment preflight must use entity lookup');
assert.ok(preflight.includes('return { kind: "notFound", statusCode: 404 };'), 'unresolved legacy apartment details must fail closed');
assert.ok(proxy.includes('lookupLegacyApartmentLifecyclePreflight') && proxy.includes('createEntityGoneResponse'), 'proxy must handle redirect/410/404 lifecycle decisions');
assert.ok(redirectGraph.includes('Redirect destination must be canonical, not another redirect source') && redirectGraph.includes('Redirect source must not extend an existing redirect chain'), 'redirect graph must prevent chains');

console.log('verify:epic28-legacy-apartment-migration passed');
