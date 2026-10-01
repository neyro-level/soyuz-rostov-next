# Geo-Catalog Platform Contract

Status: `ACTIVE / IMPLEMENTED`

This document is the active reusable contract for geo/catalog URL, page
resolution, profile status and lifecycle semantics. Code, migrations and tests
remain the runtime truth for implementation details.

## 1. Boundary and invariants

- Payload owns schema, migrations, auth and Admin. A second backend, ORM or auth
  contour is forbidden.
- Public reads follow Public Gateway → explicit access/select → DTO → UI.
- Project profile/data may call core pure functions; app composition may use
  project + core + UI; reusable core/packages may not import project.
- Project-owned static routes, brand, domain and geo literals are injected
  explicitly. Reusable core/packages do not contain client-specific literals.
- Raw legacy geo/source data is retained unless a separate owner-approved cleanup
  task says otherwise.
- Removed proof-only runtime paths are not active fallbacks.
- Starter topology remains local PostgreSQL + `MEDIA_DIR`; clone topology is a
  separate project decision.
- Production indexing, release, mirror and tag creation require separate owner
  actions.

## 2. Vocabulary

```text
Status = ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT
GeoMode = SINGLE_GEO | MULTI_GEO
Market = newbuild | secondary
DevelopmentKind = residential_complex | cottage_village
```

Canonical PageKey discriminants:

```text
home
geoHub
categoryRoot
categoryGeo
categoryGeoDistrict
categoryGeoFacet
geoDevelopers
property
development
developerRoot
developer
static
```

`parseUrl` is syntax-only and performs no data access. `buildUrl` is the only
canonical URL builder for PageKey and returns lowercase paths with the canonical
trailing slash where applicable.

## 3. Canonical URL grammar

| PageKey | Canonical URL |
|---|---|
| `home` | `/` |
| `geoHub` | `/{geo}/` |
| `categoryGeo` | `/{geo}/{category}/` |
| `categoryGeoDistrict` / `categoryGeoFacet` | `/{geo}/{category}/{sub}/` |
| `geoDevelopers` | `/{geo}/zastroyshchiki/` |
| `categoryRoot` | `/{category}/` |
| `property` | `/{category}/{semantic}-{publicUrlId}/` |
| `development` / residential complex | `/novostroyki/zhk-{slug}/` |
| `development` / cottage village | `/kottedzhnye-poselki/kp-{slug}/` |
| `developerRoot` | `/zastroyshchiki/` |
| `developer` | `/zastroyshchiki/{slug}/` |
| `static` | explicit project-profile declaration |

Grammar invariants:

- at most three path segments;
- lowercase canonical form;
- property URL is globally stable and contains no geo;
- district parent is data hierarchy, not an additional URL segment;
- one semantic entity maps to one final canonical URL;
- framework/platform roots, catalog surfaces and explicit static routes are
  reserved and cannot be reused as geo or entity slugs.

Property category mapping:

| Domain category | URL surface |
|---|---|
| `apartment` | `kvartiry` |
| `house` | `doma` |
| `land` | `uchastki` |
| `commercial` | `kommercheskaya-nedvizhimost` |
| `room` | `komnaty` |
| `garage` | `garazhi` |

Transliteration baseline: `й→y`, `ё→e`, `ж→zh`, `х→kh`, `ц→ts`,
`ч→ch`, `ш→sh`, `щ→shch`, `ы→y`; soft and hard signs are removed.
Approved room-facet slugs use `dvukhkomnatnye` and `trekhkomnatnye`.

## 4. Deterministic resolution order

1. `/{x}/`: explicit static/platform reserved → category root → published geo
   → not found.
2. `/{geo}/{x}/`: enabled category → geo developers when enabled → not found.
3. `/{category}/{x}/`: entity grammar `zhk-*`, `kp-*` or
   `*-{publicUrlId}` → not found.
4. `/{geo}/{category}/{x}/`: published Payload district enabled for this
   category → project `seoFacets` registry → not found.
5. `/zastroyshchiki/{x}/`: developer → not found.
6. Four or more segments → not found.

Resolution returns a typed result: page, direct redirect, notFound or gone.
Redirect results always point to the final canonical URL; chains and loops are
invalid.

## 5. Profile and availability

SiteProfile is the explicit input to reusable core and contains:

- `geoMode`, `primaryGeo` and per-geo `published` + `hubStatus`;
- `categoryStatus`, `marketCapability`;
- per-geo `geoCategoryStatus` and `marketStatus`;
- root/per-geo `developersSurface`;
- per-surface `filterKeys` and project-owned
  `seoFacets: slug → {geo, category, filter}`;
- SEO tier metric (`broad39 | wordstat | searchDemand`), descending
  `P1 > P2 > TEST >= 0`, inventory minima and unmeasured policy;
- Content Gate thresholds;
- project static routes and module states/reserved spaces;
- entity prefixes `zhk-` and `kp-`.

Missing geo lookup is `PREPARED_OFF`. Reserved roots are composed from platform
roots (`journal`, `legal`, `poisk`, `sotrudniki`, `komplex`, `sitemap*`),
catalog categories, project static roots and module spaces. The profile is the
single project owner; `projectConfig.reservedNamespaces` does not exist.

No reusable module discovers project profile by importing `src/project/**`.
The application layer passes the validated profile explicitly.

Status semantics:

| Status | Route | Robots/discovery |
|---|---|---|
| `ACTIVE` | eligible for page resolution | final indexability is decided by Content Gate |
| `NOINDEX_AUTO` | 200 with at least one active object; not tied to SEO tier minima | `noindex,follow`, self-canonical, absent from sitemap/menu |
| `PREPARED_OFF` | 404 | absent from sitemap/menu/interlinks |
| `OUT` | 404 | absent from sitemap/menu/interlinks |

Availability and indexability are separate decisions. A valid but weak ACTIVE
page returns 200 with `noindex,follow`; Content Gate must not turn weak content
into a false 404. Owner override is audited and cannot bypass lifecycle,
`PREPARED_OFF` or `OUT`.

## 6. Geo-mode rules

| Surface | `SINGLE_GEO` | `MULTI_GEO` |
|---|---|---|
| primary geo hub | registry + Gate | registry + Gate |
| other geo hub | 404 even when the geo entity is published | status-driven |
| other geo local catalog/listing | 404 | profile + registry + Gate |
| global entity from another configured geo | lifecycle + Gate; no link to inactive hub | lifecycle + Gate |
| category/developer roots | 200 `noindex,follow` | registry-driven |
| GeoSwitcher | hidden | visible |

`SINGLE_GEO` requires exactly one routable hub and that hub is `primaryGeo`.
Additional configured cities are valid when their `hubStatus` is
`PREPARED_OFF | OUT`; publication and hub availability are independent fields.

Entity availability may outlive a disabled listing. If an entity is reachable
but its geo hub/listing is not, breadcrumbs render the geo as text rather than a
link to a 404. Nearby aggregation is agglomeration-only and never pollutes one
city's inventory count with another city's records.

Catalog rows and inventory totals use the same `geo + marketStatus + facet`
query contract. `PREPARED_OFF | OUT` markets contribute neither rows nor counts;
unconfigured geo is fail-closed. Runtime inventory is always read from the
active data port and never replaced with a synthetic placeholder.

## 7. SEO Registry and Content Gate

SEO Registry rows bind one PageKey/canonical URL to measured or explicitly
unmeasured evidence, source date, tier, inventory threshold and metadata
templates. Allowed source vocabulary:

```text
wordstat | broad39 | webmaster | fallback_no_data
```

An empty metric is not zero. Synthetic fixture values are labelled synthetic.
Registry validation rejects duplicate intent, URL or canonical ownership and
any URL that differs from `buildUrl(PageKey)`. Unapproved morphology cannot
produce an indexable page.

Clone preparation emits registry rows as `draft`. Promotion to `approved` is a
row-level owner decision made only after synthetic/fallback evidence is replaced
with real evidence and the referenced geo/district morphology is approved.
`retired` removes former intent from indexable discovery without reassigning its
canonical URL silently. Generated `src/project/seo/registry-seed.ts` is a
validated runtime projection; the CSV remains the editable source.

Content Gate is the single indexability decision. It consumes profile status,
registry evidence, inventory/content quality and lifecycle. Newbuild lots are
always `noindex,follow` and absent from sitemap; listing, secondary property,
development and developer thresholds are profile-owned.

Runtime composition follows one path: resolver returns structural route facts,
then `decidePage` builds factual Gate input and owns HTTP page status, robots,
canonical, sitemap, IndexNow, menu and interlink eligibility. Resolver and
public DTO builders do not emit a positive indexing decision. Weak but valid
content remains `200 noindex,follow` with a self-canonical URL and is absent
from every discovery surface. Developer eligibility counts only developments
that pass the same Gate. Owner override is audited and cannot bypass profile
`OUT | PREPARED_OFF`, lifecycle or hard-noindex rules.

District routes select `categoryGeoDistrictAdmin` or
`categoryGeoDistrictMicro` from the persisted district type; both share the
same `categoryGeoDistrict` PageKey and URL grammar. Developer root uses the
dedicated `developerRoot` template. A missing or unknown template key fails
closed rather than borrowing metadata from another surface.

## 8. Lifecycle and HTTP semantics

| Entity state | Canonical response |
|---|---|
| missing | 404 |
| active | 200, Gate decides robots |
| archived | 200 `noindex` |
| purged with approved replacement | one direct 301 |
| purged without replacement | 410 |
| canonical slash normalization | one 308 |
| legacy/canonical move | one direct 301 to final URL |

Canonical 301/410 transport is implemented through bounded preflight in
`src/proxy.ts`. `skipTrailingSlashRedirect=true` delegates canonical slash
normalization to that same boundary, preventing Next from inserting a `308`
before a legacy `301`. The former proof-only
`/http/property-lifecycle/[slug]` boundary is removed and guarded against
return.

`/nedvizhimost` and `/obekty/*` belong to the declared legacy manifest and use
one direct `301` to the final canonical URL. A canonical path that differs only
by trailing slash uses one `308`. Redirect chains and loops are invalid.

## 9. Discovery, navigation and cache

- Sitemap groups: static, geo, catalog, districts, facets, developments,
  developers and properties; each shard is at most 50,000 URLs.
- Only published, canonical, Gate-passing indexable pages enter sitemap.
- Sitemap `lastmod` comes from relevant entity/registry updates, never deploy
  time.
- Menu, breadcrumbs and interlinks derive from profile + PageKey + Gate +
  project static routes and never target 404 or redirects.
- Query URLs are not linked when a canonical path owner exists.
- Cache identity is bounded by geo, geo+surface, district, development,
  developer, property public ID and registry targets.
- Published district routes are read from the bounded cached Payload registry
  per geo×category. Admin changes invalidate the `registry` cache tag; the
  security proxy never queries this registry or Payload districts.
- Runtime invalidation continues through the authenticated HTTP facade.
- IndexNow is event-driven for publish, canonical move, archive and gone; key
  material is runtime-only and never enters payloads or logs.

## 10. Implemented transition

```text
current routes/data
  -> pure profile and grammar
  -> additive schema + normalized refs
  -> frozen DTO/Public Gateway
  -> resolver/Gate/UI/discovery/lifecycle proof
  -> public route cutover
  -> guarded contract cleanup
```

Payload Admin/API/security remains outside the public resolver boundary.
`/nedvizhimost` and `/obekty/[slug]` remain bounded redirect-only compatibility
adapters; raw legacy geo/source data remains retained.

## 11. Change control

Changing PageKey vocabulary, URL collision precedence, status semantics,
lifecycle codes or dependency direction requires an explicit approved task
before implementation.
An ADR is created only for a genuinely hard-to-reverse deviation that cannot be
stated unambiguously in Architecture or Clone Onboarding.
