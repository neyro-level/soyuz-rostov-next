# Contract Feasibility

> Guard document, сохранённый по каноническому пути для contract freeze. Не
> является backlog или заменой runtime tests.

Статус: `VERIFIED`.

Документ отвечает за реализуемость presentation contracts. DTO принадлежат
`packages/contracts`; UI получает их через fixture provider, а после подключения
Payload — через Public Gateway. UI не читает XML/YRL и Payload documents напрямую.

## Зафиксированный входной контракт

- основной источник объектов — XML-фид в формате YRL (Яндекс Недвижимость);
- форма XML-полей и mapping берутся из проверенной реализации Atlas exact
  `main@4fc5d8a2cfcd29b1431ce9541db72ba0280a4cbe`; официальный YRL используется
  после Atlas как compatibility check;
- одно объявление `<offer internal-id="...">` соответствует одному объекту;
- импортируются только реально переданные теги; отсутствующее optional-поле не
  вычисляется и не выдумывается;
- допускаются только технические преобразования: parse XML, проверка enum/unit,
  приведение рублей к integer minor units, безопасная нормализация строки/URL и
  форматирование уже полученного значения для показа;
- `pricePerMeterMinor` — canonical derived exception: ingest вычисляет его из
  `priceMinor / totalArea` с banker rounding; при отсутствующих/невалидных
  входах сохраняется `null`; другие optional business values не выдумываются;
- проект работает в одной валюте `RUB`; Atlas-compatible aliases `RUR/RUB`
  нормализуются в `RUB`, другая валюта получает import issue и не конвертируется;
- изображения из фида остаются `external` по умолчанию; зеркалирование в S3 —
  отдельное будущее решение;
- точный образец клиентского фида подключается на этапе parser fixture. До него
  используется официальный YRL vocabulary и optional-поля скрываются при отсутствии.

Atlas-compatible implementation sources:

- `src/core/ingest/yrl-parser.ts` — streaming XML → normalized offer;
- `src/shared/types/feed-import.ts` — normalized schema;
- `src/project/collections/Properties.ts` — persisted fields;
- `src/core/data-access/public/queries.ts` — Public Gateway mapping/filtering;
- `tests/fixtures/yrl-secondary.xml` и `yrl-newbuild.xml` — точная форма примеров;
- `tests/unit/import-stage1.unit.spec.ts` — proof нормализации.

Официальная YRL compatibility reference:

- https://yandex.ru/support/realty/ru/feed/content-requirements
- https://yandex.ru/support/realty/ru/feed/requirements-sale-housing

## Обозначения стоимости

- `O(1)` — сборка из уже загруженной записи или конфигурации;
- `1 query` — один запрос Payload/PostgreSQL;
- `count query` — отдельный `count` с теми же разрешёнными фильтрами;
- `bounded aggregate` — агрегат по базовому каталогу до ~2 000 активных объектов;
- `presentation only` — состояние URL/UI, БД не нужна.

## Property и Media

| Field | Source | Computation | Query cost | Base schema | Decision |
|---|---|---|---|---|---|
| `MediaDTO.kind` | тип владельца URL | feed URL → `external`; Payload media → `managed` | `O(1)` | `properties.images`, `media` | VERIFIED |
| `MediaDTO.src` | Atlas YRL `<picture>` или Payload media URL | URL validation/allowlist only | `O(1)` | да | VERIFIED FROM ATLAS |
| `MediaDTO.alt` | `properties.title` + порядковый номер | текстовое форматирование, без нового business value | `O(1)` | derived | VERIFIED |
| `MediaDTO.width` | metadata managed media; feed обычно не передаёт | отсутствует для external, если неизвестно | `O(1)` | optional | VERIFIED |
| `MediaDTO.height` | metadata managed media; feed обычно не передаёт | отсутствует для external, если неизвестно | `O(1)` | optional | VERIFIED |
| `PropertyPriceDTO.priceMinor` | YRL `<price><value>` | decimal RUB → integer kopecks; без конвертации валют | `O(1)` | `properties.priceMinor` | VERIFIED |
| `PropertyPriceDTO.pricePerMeterMinor` | canonical `priceMinor` + `totalArea` | ingest derives minor units per m² with banker rounding; invalid inputs → `null` | `O(1)` | nullable derived field | VERIFIED CORE 5.5 + RUNTIME |
| `PropertyPriceDTO.currency` | YRL `<price><currency>` | `RUR/RUB` → canonical `RUB`; unsupported currency → import issue + offer skip; conversion forbidden | `O(1)` | `properties.currency` | VERIFIED RUNTIME |
| `PropertyPriceDTO.period` | YRL `<price><period>` + deal type | `month` для аренды; `total` для продажи | `O(1)` | derived from stored fields | VERIFIED |
| `PropertyPriceDTO.label` | остальные поля `price` | locale formatting only | `O(1)` | derived | VERIFIED |
| `PropertySummaryItemDTO.key` | whitelist доступных характеристик | выбрать только присутствующие поля | `O(1)` | derived | VERIFIED |
| `PropertySummaryItemDTO.label` | project-owned dictionary по `key` | lookup | `O(1)` | config | VERIFIED |
| `PropertySummaryItemDTO.value` | прямое stored value площади/этажа/комнат | unit/locale formatting only | `O(1)` | да | VERIFIED |
| `PropertyCharacteristicDTO.label` | project-owned dictionary YRL/property field | lookup | `O(1)` | config | VERIFIED |
| `PropertyCharacteristicDTO.value` | прямое stored/imported value | enum/unit formatting only | `O(1)` | да для включённых характеристик | VERIFIED |
| `PropertyCardDTO.id` | Payload document id | string serialization | `O(1)` | document id | VERIFIED |
| `PropertyCardDTO.slug` | immutable `properties.slug` | создаётся один раз из source identity по §29A | `O(1)` | `properties.slug` | VERIFIED |
| `PropertyCardDTO.href` | `slug` | route join `/obekty/{slug}` | `O(1)` | derived | VERIFIED |
| `PropertyCardDTO.title` | Atlas `<name>`, fallback `<type>`, `<category>` | Atlas fallback chain, без внешнего enrichment | `O(1)` | `properties.title` | VERIFIED FROM ATLAS |
| `PropertyCardDTO.category` | YRL `<category>` + `<property-type>` | allowlisted enum mapping | `O(1)` | `properties.category` | VERIFIED |
| `PropertyCardDTO.dealType` | YRL `<type>` | allowlisted `sale/rent` mapping | `O(1)` | `properties.dealType` | VERIFIED |
| `PropertyCardDTO.price` | YRL `<price>` | null only when category contract permits; otherwise invalid offer | `O(1)` | да | VERIFIED |
| `PropertyCardDTO.address` | YRL `<location><address>` | safe public-address normalization | `O(1)` | `properties.publicAddress` | VERIFIED |
| `PropertyCardDTO.city` | YRL `<locality-name>` or parsed new-format address | feed adapter normalization | `O(1)` | `properties.locality` | VERIFIED |
| `PropertyCardDTO.district` | YRL `<sub-locality-name>`/`<district>` | direct optional mapping | `O(1)` | `properties.district` | VERIFIED |
| `PropertyCardDTO.primaryMedia` | первое допустимое Atlas YRL `<picture>` | select first, no copy | `O(1)` | `properties.images` | VERIFIED FROM ATLAS |
| `PropertyCardDTO.summary` | rooms/areas/floor/lot-area | whitelist + formatting, без арифметики | `O(1)` | да | VERIFIED |
| `PropertyCardDTO.badges` | manual/project presentation rules | Base возвращает `[]`; future badge rules need separate approval | `O(1)` | new field не нужен | VERIFIED / EMPTY IN BASE |
| `PropertyDetailsDTO.description` | YRL `<description>` | sanitization and allowed `<br>` only | `O(1)` | `properties.description` | VERIFIED |
| `PropertyDetailsDTO.gallery` | все допустимые Atlas YRL `<picture>` | order-preserving map | `O(1)` | `properties.images` | VERIFIED FROM ATLAS |
| `PropertyDetailsDTO.characteristics` | direct stored YRL characteristics | whitelist + labels | `O(1)` | approved property fields | VERIFIED |
| `PropertyDetailsDTO.location.latitude` | YRL `<latitude>` | numeric validation | `O(1)` | `properties.lat` | VERIFIED |
| `PropertyDetailsDTO.location.longitude` | YRL `<longitude>` | numeric validation | `O(1)` | `properties.lng` | VERIFIED |
| `PropertyDetailsDTO.related` | same category/city, excluding current id | bounded query, stable sort, limit | `1 query` | existing indexed fields | VERIFIED |
| `PropertyListDTO.items` | public properties query | select allowlist + DTO map | `1 query` | approved | VERIFIED |
| `PropertyListDTO.total` | same filter predicate | count | `count query` | approved | VERIFIED |
| `PropertyListDTO.page` | validated URL query | clamp positive integer | `presentation only` | none | VERIFIED |
| `PropertyListDTO.pageSize` | project route config | allowlisted constant | `presentation only` | none | VERIFIED |
| `PropertyListDTO.totalPages` | `total`, `pageSize` | pagination metadata only | `O(1)` | derived | VERIFIED |
| `PropertyListDTO.appliedFilters` | normalized URL query | see filter table | `presentation only` | none | VERIFIED |

## Applied filters

Applied filters are request state. They never require separate columns by
themselves. Public Gateway accepts only the allowlist below.

| Field | Source / mapped property | Computation | Query cost | Decision |
|---|---|---|---|---|
| `query` | URL → Atlas `title/addressPublic/district` allowlist | Payload `like` predicates exactly as donor baseline | part of list query | VERIFIED FROM ATLAS |
| `category` | URL → `properties.category` | enum validation | part of list query | VERIFIED |
| `dealType` | URL → `properties.dealType` | enum validation | part of list query | VERIFIED |
| `city` | contract field; Atlas query has no city filter | UI hides until a separate donor-backed mapping exists | none | DEFERRED, NON-BLOCKING |
| `district` | URL → `properties.district` | normalized exact match | part of list query | VERIFIED |
| `rooms` | URL → `properties.rooms` | integer allowlist | part of list query | VERIFIED |
| `isStudio` | contract field; Atlas parser/query has no dedicated mapping | UI hides; do not infer from rooms | none | DEFERRED, NON-BLOCKING |
| `isExclusive` | URL → no approved source | UI hides and Gateway rejects until separately approved | none | DEFERRED, NON-BLOCKING |
| `priceFromMinor` | URL → `properties.priceMinor` | rubles input → kopecks | part of list query | VERIFIED |
| `priceToMinor` | URL → `properties.priceMinor` | rubles input → kopecks | part of list query | VERIFIED |
| `areaFrom` | URL → `properties.totalArea` | decimal validation only | part of list query | VERIFIED |
| `areaTo` | URL → `properties.totalArea` | decimal validation only | part of list query | VERIFIED |
| `kitchenAreaFrom` | contract field; Atlas stores area but does not filter by it | UI hides | none | DEFERRED, NON-BLOCKING |
| `floorFrom` | contract field; Atlas stores floor but does not filter by range | UI hides | none | DEFERRED, NON-BLOCKING |
| `floorTo` | contract field; Atlas stores floor but does not filter by range | UI hides | none | DEFERRED, NON-BLOCKING |
| `lotAreaFrom` | absent from Atlas normalized offer | UI hides | none | DEFERRED, NON-BLOCKING |
| `lotAreaTo` | absent from Atlas normalized offer | UI hides | none | DEFERRED, NON-BLOCKING |
| `buildingType` | Atlas URL → `properties.buildingType` | exact match as donor query | part of list query | VERIFIED FROM ATLAS; feed population optional |
| `renovation` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `landUseType` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `hasElectricity` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `hasGas` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `hasWater` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `hasSewerage` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `commercialType` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `commercialBuildingType` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `entranceType` | absent from Atlas normalized offer/query | UI hides | none | DEFERRED, NON-BLOCKING |
| `sort` | URL | `newest=publishedAt desc`; price sorts direct; `recommended` stable default | same list query | VERIFIED |
| `view` | URL/UI (`grid/list/map`) | presentation only | none; map uses returned coordinates | VERIFIED |

## Filter options and facets

| Field | Source | Computation | Query cost | Base schema | Decision |
|---|---|---|---|---|---|
| `PropertyFilterOptionDTO.value` | distinct normalized stored value | stable URL serialization | bounded aggregate | existing field | VERIFIED |
| `PropertyFilterOptionDTO.label` | project dictionary or stored public label | lookup | `O(1)` after options query | config | VERIFIED |
| `PropertyFilterOptionDTO.parentValue` | district → locality relationship | map from same aggregate rows | bounded aggregate | existing location fields | VERIFIED |
| `categories` | distinct active `category` | options query | bounded aggregate | yes | VERIFIED |
| `dealTypes` | distinct active `dealType` | options query | bounded aggregate | yes | VERIFIED |
| `cities` | distinct active `locality` | options query | bounded aggregate | yes | VERIFIED |
| `districts` | distinct active `district` grouped by locality | options query | bounded aggregate | yes | VERIFIED |
| `rooms` | distinct active `rooms` | sort numeric | bounded aggregate | yes | VERIFIED |
| `priceMinor.min` | active `priceMinor` | min aggregate, no synthetic value | bounded aggregate | yes | VERIFIED |
| `priceMinor.max` | active `priceMinor` | max aggregate, no synthetic value | bounded aggregate | yes | VERIFIED |
| `buildingTypes` | distinct Atlas `buildingType` when populated | options query | bounded aggregate | donor field exists | VERIFIED FROM ATLAS / EMPTY OTHERWISE |
| `renovations` | no Atlas source/query | return `[]` | `O(1)` | new field not required | VERIFIED / EMPTY IN BASE |
| `landUseTypes` | no Atlas source/query | return `[]` | `O(1)` | new field not required | VERIFIED / EMPTY IN BASE |
| `commercialTypes` | no Atlas source/query | return `[]` | `O(1)` | new field not required | VERIFIED / EMPTY IN BASE |
| `commercialBuildingTypes` | no Atlas source/query | return `[]` | `O(1)` | new field not required | VERIFIED / EMPTY IN BASE |
| `entranceTypes` | no Atlas source/query | return `[]` | `O(1)` | new field not required | VERIFIED / EMPTY IN BASE |
| `applied` | normalized request state | reuse validated object | `presentation only` | none | VERIFIED |
| `total` | current filter predicate | count | `count query` | yes | VERIFIED |
| `resultLabel` | `total` | Russian plural formatting only | `O(1)` | derived | VERIFIED |

Facet counts per option are not part of the current DTO. Base performs bounded
option aggregates only. A dedicated `facet-cache` is added solely after a measured
latency/capacity trigger.

## Shell, navigation and SEO

| Field | Source | Computation | Query cost | Base schema | Decision |
|---|---|---|---|---|---|
| `SiteNavItemDTO.label` | fixture/project navigation config | none | `O(1)` | no new collection | VERIFIED |
| `SiteNavItemDTO.href` | route map | URL validation | `O(1)` | none | VERIFIED |
| `SiteNavItemDTO.external` | navigation config | default false | `O(1)` | none | VERIFIED |
| `SiteNavItemDTO.children` | navigation config | recursive map | `O(n)` bounded menu | none | VERIFIED |
| `SiteHeaderDTO.brandName` | project identity | none | `O(1)` | config | VERIFIED |
| `SiteHeaderDTO.homeHref` | route map | none | `O(1)` | config | VERIFIED |
| `SiteHeaderDTO.logo` | project asset/media | MediaDTO map | `O(1)` | `media` optional | VERIFIED |
| `SiteHeaderDTO.navigation` | navigation config | map | `O(n)` bounded menu | none | VERIFIED |
| `SiteHeaderDTO.phone.label` | project contact config | none | `O(1)` | config | VERIFIED |
| `SiteHeaderDTO.phone.href` | same phone | `tel:` normalization | `O(1)` | derived | VERIFIED |
| `SiteHeaderDTO.primaryAction.label` | page/site config | none | `O(1)` | config | VERIFIED |
| `SiteHeaderDTO.primaryAction.href` | route/anchor config | URL validation | `O(1)` | config | VERIFIED |
| `SiteFooterGroupDTO.title` | navigation config | none | `O(1)` | config | VERIFIED |
| `SiteFooterGroupDTO.links` | navigation config | SiteNavItemDTO map | `O(n)` bounded menu | none | VERIFIED |
| `SiteFooterDTO.brandName` | project identity | none | `O(1)` | config | VERIFIED |
| `SiteFooterDTO.logo` | project asset/media | MediaDTO map | `O(1)` | `media` optional | VERIFIED |
| `SiteFooterDTO.groups` | navigation config | map | `O(n)` bounded menu | none | VERIFIED |
| `SiteFooterDTO.contacts` | project contact config | map | `O(n)` bounded | none | VERIFIED |
| `SiteFooterDTO.legalLinks` | canonical legal route map | map | `O(n)` bounded | `pages` or route files | VERIFIED |
| `SiteFooterDTO.copyright` | brand + current year | presentation formatting | `O(1)` | config | VERIFIED |
| `BreadcrumbItemDTO.label` | route/page/property title | none | `O(1)` | existing source | VERIFIED |
| `BreadcrumbItemDTO.href` | route hierarchy | URL join | `O(1)` | derived | VERIFIED |
| `BreadcrumbDTO.items` | route hierarchy | bounded ordered map | `O(depth)` | none | VERIFIED |
| `PageSEOContract.title` | page SEO fields or property title | template formatting | `O(1)` | `pages`/property | VERIFIED |
| `PageSEOContract.description` | page SEO fields or property description excerpt | safe truncation only | `O(1)` | `pages`/property | VERIFIED |
| `PageSEOContract.canonicalPath` | canonical route map + slug | URL join | `O(1)` | derived | VERIFIED |
| `PageSEOContract.indexing` | route policy + publication status | allowlisted rule | `O(1)` | existing status/config | VERIFIED |
| `PageSEOContract.following` | route policy | allowlisted rule | `O(1)` | config | VERIFIED |
| `PageSEOContract.openGraph.title` | explicit page field or SEO title | fallback selection | `O(1)` | existing source | VERIFIED |
| `PageSEOContract.openGraph.description` | explicit page field or SEO description | fallback selection | `O(1)` | existing source | VERIFIED |
| `PageSEOContract.openGraph.image` | explicit page media or primary property image | fallback selection | `O(1)` | existing source | VERIFIED |

## Lead presentation context

`LeadConsentField` из `@ams/realtbase-ui` рендерит checkbox, ссылку на
версионированный текст и presentation metadata из `LeadFormContext`. Public
intake уже работает через `POST /api/public/leads`; generic Payload create для
лидов закрыт. Сервер выбирает authoritative consent version и timestamp, а
client values используются только для consistency/UX validation.

| Field | Source | Computation | Query cost | Base schema | Decision |
|---|---|---|---|---|---|
| `LeadPropertyContextDTO.id` | current `PropertyDetailsDTO.id` | none | `O(1)` | property id | VERIFIED |
| `LeadPropertyContextDTO.slug` | current `PropertyDetailsDTO.slug` | none | `O(1)` | `properties.slug` | VERIFIED |
| `LeadPropertyContextDTO.title` | current `PropertyDetailsDTO.title` | none | `O(1)` | `properties.title` | VERIFIED |
| `LeadFormContext.formKind` | owning form component/route | enum validation | `presentation only` | persisted mapping in TASK-02-03 | VERIFIED SOURCE |
| `LeadFormContext.sourcePage` | canonical current pathname | normalize internal path | `presentation only` | persisted mapping in TASK-02-03 | VERIFIED SOURCE |
| `LeadFormContext.property` | current property route context | copy id/slug/title | `O(1)` | relation mapping in TASK-02-03 | VERIFIED SOURCE |
| `LeadFormContext.consentVersion` | versioned published consent config | none | `O(1)` | `leads.consentVersion` approved | VERIFIED SOURCE |
| `LeadFormContext.consentHref` | canonical legal route config | URL validation | `O(1)` | versioned text source; proof in TASK-02-03 | VERIFIED SOURCE |
| `LeadFormContext.consentRequired` | form policy | boolean; must be true for PII forms | `O(1)` | `leads.consentAccepted` mapping | VERIFIED SOURCE |

### UI → lead persistence mapping

| UI / trusted context | Server validation | Persisted lead field | Rule |
|---|---|---|---|
| checked `consentAccepted` | value must equal `true` when `consentRequired=true` | `leads.consentAccepted=true` | unchecked PII form is rejected before transaction |
| `consentVersion` | must equal the current published server-side consent version | `leads.consentVersion` | client value is never trusted as authority |
| successful validated intake | server timestamp inside lead transaction | `leads.consentedAt` | browser timestamp is not accepted |
| `formKind` | enum allowlist | `leads.formKind` | stored with every lead |
| `sourcePage` | canonical internal pathname allowlist | `leads.sourcePage` | external/arbitrary URL rejected |
| `property.id` | existing public property lookup; optional outside property forms | `leads.property` relation | `slug/title` are display context, not duplicate persisted truth |
| `consentHref` | must resolve to the published legal route for `consentVersion` | versioned consent content source, not lead row | legal text is not duplicated per lead |

`LeadConsentField` exposes context as presentation metadata for inspection, while
current intake receives authoritative context from trusted server configuration
and validates any submitted form value. This prevents a modified browser request
from choosing an obsolete consent version or arbitrary source page.

Юридический текст и production `consentVersion` остаются owner/legal decision в
`PROJECT.md`. Это не блокирует доказанную форму UI и persistence mapping.

## Geo-catalog contract 2.0.0

Ниже зафиксирована реализуемость geo-catalog presentation DTO. Public Gateway
queries, grammar, Content Gate and bounded composition are current runtime
contracts without a hidden schema/runtime owner.

| Contract | Source / composition | Query budget | Decision |
|---|---|---|---|
| `PageKeyDTO`, `PageLinkDTO` | pure URL grammar | presentation only | VERIFIED RUNTIME |
| `RegionDTO`, `CityDTO`, `DistrictDTO` | published geo collections; approved morphology only | one selected read or bounded relation join | VERIFIED SCHEMA + FIXTURE |
| `GeoHubDTO` | city + bounded category/district/developer counts | bounded aggregate set, no per-card queries | VERIFIED CONTRACT |
| `DeveloperCardDTO/DetailsDTO` | published developer + bounded development count | selected read + bounded aggregate | VERIFIED SCHEMA + FIXTURE |
| `DevelopmentCardDTO/DetailsDTO` | unified development; only kind-valid fields | selected read with fixed depth/limits | VERIFIED SCHEMA + FIXTURE |
| `PropertyCardDTO.publicUrlId` | immutable sequence identity | included in existing selected read | VERIFIED RUNTIME |
| `PropertyCardDTO.pageKey/href` | category mapping + slug + publicUrlId → `buildUrl` | `O(1)` | VERIFIED FIXTURE |
| `PropertyCategoryDetailsDTO` | allowlisted persisted fields | `O(1)` mapping after selected read | VERIFIED SCHEMA + TYPECHECK |
| `SeoMetaDTO` | explicit content/registry values and Content Gate decision | presentation only after source read | VERIFIED CONTRACT |
| `BreadcrumbDTO` hrefs | ordered PageKeys → `buildUrl` | bounded `O(depth)` | VERIFIED FIXTURE |
| `ListingPageDTO.items/total` | selected listing read + matching count | one page query + one count query | VERIFIED CONTRACT |
| `ListingPageDTO.pagination` | validated page/pageSize/total | `O(1)` | VERIFIED FIXTURE |
| `ListingPageDTO.subLinks/nearby` | Gate-eligible PageKeys; nearby only from approved agglomeration | bounded aggregate, no cross-city count pollution | VERIFIED CONTRACT |
| `ListingPageDTO.robots/canonical` | Content Gate + canonical URL grammar | presentation only | VERIFIED CONTRACT |

Fixture acceptance covers a region, two configured geos, district, developer,
residential development, category-aware property and listing. The verifier
rebuilds every fixture link through the real project grammar, checks property
category discriminants and asserts listing canonical/SEO consistency. Synthetic
fixture values are not demand research and cannot authorize indexability.

## Journal namespace

Journal остаётся отдельным draft namespace и не входит в Base contract freeze.
Модуль выключен, collection `posts` заранее не создаётся. Его draft fields уже
имеют карту, но не создают dependency для Base.

| Field | Future source | Computation | Query cost | Base schema | Decision |
|---|---|---|---|---|---|
| `JournalArticleCardDTO.slug` | future `posts.slug` | immutable public slug | `O(1)` | отсутствует намеренно | DRAFT / MODULE OFF |
| `JournalArticleCardDTO.href` | future article slug | route join | `O(1)` | derived | DRAFT / MODULE OFF |
| `JournalArticleCardDTO.title` | future `posts.title` | none | `O(1)` | отсутствует намеренно | DRAFT / MODULE OFF |
| `JournalArticleCardDTO.excerpt` | future explicit excerpt | safe text normalization | `O(1)` | отсутствует намеренно | DRAFT / MODULE OFF |
| `JournalArticleCardDTO.publishedAt` | future publication timestamp | ISO serialization | `O(1)` | отсутствует намеренно | DRAFT / MODULE OFF |
| `JournalListDTO.items` | future public posts query | select allowlist + DTO map | `1 query` | отсутствует намеренно | DRAFT / MODULE OFF |
| `JournalListDTO.total` | future posts filter predicate | count | `count query` | отсутствует намеренно | DRAFT / MODULE OFF |

## Отложенные вопросы владельцу

Эти ответы улучшают parser fixture, но не блокируют UI extraction:

1. Первый реальный каталог содержит только квартиры или также комнаты, дома,
   участки, гаражи и коммерцию?
2. Прислать один обезличенный реальный XML/YRL-файл или URL фида, когда он будет
   доступен: проверим vendor extensions и фактические optional tags.
3. Подтвердить правило по цене за м²: если её нет отдельным значением в источнике,
   поле не показываем. До ответа именно это принято безопасным default.
4. Частоту обновления и правило снятия исчезнувших объявлений определить перед
   реализацией ingest; до этого они не влияют на UI-контракт.

## Итог gate

- все поля Base DTO имеют источник, стоимость и schema decision;
- отсутствующие в Atlas функции отключены, а не опираются на неутверждённую схему;
- UI extraction не заблокирован;
- consent proof и визуальная проверка fixture-сайта пройдены в
  `research/FIXTURE_ACCEPTANCE.md`; contract freeze разблокирован.
