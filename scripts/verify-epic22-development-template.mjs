import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const view = readFileSync('packages/ui/src/views/development/DevelopmentDetailsView.tsx', 'utf8');
const presentation = readFileSync('packages/ui/src/views/development/development-presentation.ts', 'utf8');
const geoCatalog = readFileSync('src/project/data-access/public/geo-catalog.ts', 'utf8');
const urlGrammar = readFileSync('src/core/routing/url-grammar.ts', 'utf8');
const structuredData = readFileSync('src/project/seo/structured-data-builders.ts', 'utf8');

assert.ok(urlGrammar.includes('zhk-') && urlGrammar.includes('novostroyki'), 'development detail canonical route must remain /novostroyki/zhk-{slug}/');
assert.ok(view.includes('DevelopmentDetailsView'), 'development details view must exist');
assert.equal(view.includes('Проверено:'), false, 'development detail UI must not render a public verification/check date');
assert.equal(view.includes('checkedAt'), false, 'development detail UI must not expose checkedAt fields');
assert.equal(view.includes('sourceUrl'), false, 'development detail UI must not expose sourceUrl fields');
assert.equal(view.includes('source:'), false, 'development detail UI must not expose source labels');
assert.ok(presentation.includes('DEVELOPMENT_PRICE_FRESHNESS_MS'), 'development price presentation must define freshness boundary');
assert.ok(presentation.includes('sales_finished'), 'development presentation must hide prices for finished sales');

const detailsStart = geoCatalog.indexOf('function toDevelopmentDetailsDTO');
const developerStart = geoCatalog.indexOf('function toDeveloperCardDTO');
assert.ok(detailsStart > 0 && developerStart > detailsStart, 'development detail DTO mapper must exist');
const detailsMapper = geoCatalog.slice(detailsStart, developerStart);
assert.ok(detailsMapper.includes('gallery:'), 'development detail DTO must map gallery');
assert.ok(detailsMapper.includes('mediaItems:'), 'development detail DTO must map media items');
assert.ok(detailsMapper.includes('isObjectRelation<Media>(item.media)'), 'development media must come from Payload Media relations');
assert.ok(detailsMapper.includes('kind: "managed" as const') || detailsMapper.includes('kind: "managed"'), 'development media must be emitted as managed media');
assert.equal(detailsMapper.includes('kind: "external"'), false, 'development detail DTO must not emit external/hotlinked media');
assert.equal(detailsMapper.includes('sourceUrl'), false, 'development detail DTO must not emit media sourceUrl');
assert.equal(detailsMapper.includes('sourceRights'), false, 'development detail DTO must not emit media rights/provenance');
assert.ok(detailsMapper.includes('freshDevelopmentPrices(development)'), 'development detail prices must use fresh-price filter');
assert.ok(detailsMapper.includes('projectObjectBreadcrumbs'), 'development detail breadcrumbs must use safe project breadcrumbs');
assert.ok(structuredData.includes('freshDevelopmentPrices') || structuredData.includes('priceByRooms'), 'structured data must remain price-data aware');
console.log('verify:epic22-development-template passed');
