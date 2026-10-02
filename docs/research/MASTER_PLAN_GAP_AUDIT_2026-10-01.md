# Союз Ростов — аудит master plan ↔ фактический репозиторий

Дата аудита: 2026-10-01  
Репозиторий: `integrator-p/soyuz-rostov-next`  
Ветка / HEAD: `adapt/soyuz-rostov-client` / `ee4f948`  
Проверяемый план: `docs/AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md`  
Режим: **READ-ONLY architecture / implementation-gap audit**

## 1. Итоговый вердикт

**Night Run Readiness: `NOT_READY`.**

План нельзя импортировать в Task Manager/Beads и нельзя считать готовым к автономной реализации в текущем виде. Причина не в отсутствии платформы: репозиторий уже содержит большую часть reusable Realty Platform, которую план ошибочно описывает как будущую greenfield-реализацию. Главные незакрытые зоны — проектные evidence/решения, данные и контент, storage/release topology, исключение starter-fixture fallback, согласование реального R1 URL-scope и актуализация документации/графа.

Сводная классификация EPIC-00…EPIC-50:

| Статус | Количество |
|---|---:|
| COMPLETE | 11 |
| PARTIAL | 19 |
| MISSING | 16 |
| STALE-SUPERSEDED | 0 как целый Epic; stale-пункты отмечены внутри EPIC-05/06 и плана |
| FUTURE-NOT-R1 | 5 |
| **Всего** | **51** |

Ключевой вывод: план должен быть переведён из «создать платформу» в «принять существующую платформу, закрыть доказанные клиентские дельты, затем наполнить и выпустить». Это уменьшит лишнюю работу и исключит риск повторной реализации уже существующих owner-границ.

## 2. Scope и метод

Проверено без изменения исходников/документации:

1. фактическая структура `src/core/**`, `src/project/**`, `packages/**`, App Router, Payload schema/migrations;
2. текущий client preset/profile, URL grammar, resolver, Content Gate, Public Gateway, DTO, SEO registry;
3. UI/pages, import/jobs/leads/cache/discovery/security/release surfaces;
4. project docs, ADR/module manifests, deploy blueprints и SourceCraft workflow;
5. каждая задача EPIC-00…EPIC-50 против файлов/символов и отсутствующих evidence-артефактов;
6. зависимости, owner/production gates и готовность к автономному ночному исполнению.

Не выполнялись: server/Secret Master access, migrations, deploy, Beads, production actions, commits, staging/live browser proof.

## 3. Фактическая архитектурная карта

### 3.1 Runtime и delivery baseline

- Node: `>=24.21.0 <25`; pnpm `11.28.2` — `package.json`.
- Next.js `16.3.8`, React `19.2.8`, Payload `3.90.2` — `package.json`.
- Payload + PostgreSQL — единственный backend/schema/auth contour — `payload.config.ts`.
- SourceCraft manual exact-head gates без auto push/PR CI — `.sourcecraft/ci.yaml`.
- Immutable Docker build surface существует — `Dockerfile`, `scripts/release-*`; публикация реального client image ещё не доказана.
- Client identity активен — `src/project/site.config.ts`, `docs/CLIENT_BOOTSTRAP.json`, `docs/CLONE_PROVENANCE.md`.

### 3.2 Dependency/layer ownership

```text
src/app/**
  -> project composition + @ams/realtbase-ui + contracts
src/project/**
  -> client profile/config/schema/adapters/copy/SEO/runtime composition
src/core/**
  -> reusable pure/domain/security/ingest/cache/routing mechanisms
packages/contracts/**
  -> storage-neutral DTO/presentation contracts
packages/ui/**
  -> reusable presentation, без Payload/DB ownership
Payload collections/globals + migrations
  -> единственный schema/data/auth owner
```

Фактическая reusable surface — `src/core/**` + `packages/**`, а не планируемый `src/platform/**`. Это уже закреплено в `docs/03_ARCHITECTURE.md` и `docs/adr/ADR-PLATFORM-LAYOUT.md`. Значительная часть EPIC-08…15, 19, 27, 32, 35 уже реализована именно в этой раскладке.

### 3.3 Schema/data

`payload.config.ts` регистрирует:

- Users, Pages, Regions, Cities, Districts;
- Developers, Developments, Properties;
- FeedSources, ImportRuns, ImportIssues;
- Leads, LeadDeliveries;
- LifecycleEvents, Redirects, Media;
- SiteSettings Global;
- Payload jobs queues/tasks.

Migration history находится в `migrations/`, включая geo hierarchy, property refs/taxonomy, developments, lifecycle/cache, feed-media, Excel, lead context, district categories, IndexNow.

### 3.4 Public boundary

- DTO contracts: `packages/contracts/src/{routing,geo,developer,development,property,listing,seo,nap,shell,lead}.ts`.
- Public Gateway: `src/project/data-access/public/**`.
- Public access marker: `src/project/data-access/public/access-mode.ts`.
- Runtime composition: `src/project/routing/runtime-route.ts`.
- Canonical catch-all: `src/app/(site)/[...segments]/page.tsx`.
- Explicit marketing/home routes remain separate.

### 3.5 URL/SEO/lifecycle

- PageKey/grammar: `src/core/routing/url-grammar.ts`, `src/project/url-grammar.ts`.
- Resolver/page decision: `src/core/routing/resolver.ts`, `page-decision.ts`.
- Project Content Gate: `src/project/routing/content-gate.ts`.
- Site profile: generated `src/project/site-profile.config.ts`.
- Registry owner: `docs/seo/SEO_REGISTRY_SEED.csv`; generated runtime: `src/project/seo/registry-seed.ts`.
- Redirect/lifecycle: `src/proxy.ts`, `src/project/routing/legacy-route-manifest.ts`, `src/project/lifecycle/**`, Redirects/LifecycleEvents collections.
- Discovery: `src/app/sitemap.ts`, `src/app/robots.txt/route.ts`, `src/project/seo/discovery-runtime.ts`, IndexNow jobs.

### 3.6 Jobs/import/leads/cache

- Payload jobs configured in `payload.config.ts:80-84` with `shouldAutoRun -> runtimeEnv.JOBS_AUTORUN`.
- Queues and schedules: `src/project/jobs/{queues,registry,tasks}.ts`.
- Feed ingest: `src/core/ingest/**`, project adapter `src/project/ingest/**`.
- Excel developments import: `src/core/ingest/development-excel.ts`, `scripts/generate-development-excel-template.ts`, `scripts/import-developments-excel.ts`.
- Lead intake/outbox/delivery/retention: `src/core/leads/**`, `src/project/data-access/public/leads.ts`, `src/project/jobs/tasks.ts`.
- Authenticated HTTP invalidation: `src/core/cache/**`, `/api/internal/revalidate`.

### 3.7 UI

- Reusable views/components: `packages/ui/**`.
- Home: `src/app/(site)/page.tsx`.
- Canonical catalog/entity pages: one catch-all composition.
- Static marketing routes: `/uslugi`, `/ipoteka`, `/prodat`, `/o-kompanii`, `/kontakty`, legal pages.
- Journal module remains disabled; `/otzyvy/` absent.

### 3.8 Infrastructure state represented in repository

`docs/OPERATIONS.md` local uncommitted revision records a cleaned Docker-ready server and empty DB. Repository deploy example uses one read-only app container with `JOBS_AUTORUN=true`. Current source still uses local `MEDIA_DIR`; S3 plugin is not connected in `payload.config.ts`, while project docs/readiness claim approved object storage. That is an unresolved runtime topology mismatch, not merely documentation wording.

## 4. Master-plan map: what is already platform capability vs client work

### Already present as reusable capability

- normalized geo schema/migrations/guards;
- unified developers/developments and property taxonomy;
- frozen storage-neutral DTO/contracts;
- Public Gateway with explicit access mode and bounded reads;
- code-owned profile/status matrices;
- URL grammar, resolver, Content Gate, trailing slash/legacy routing;
- canonical catch-all route compositions;
- development Excel parser/template/import command;
- property lifecycle/redirect/410 mechanisms;
- sitemap/robots/IndexNow mechanisms;
- HTTP cache invalidation and Payload jobs;
- feed ingest and lead outbox/delivery/retention;
- base UI templates for geo/catalog/development/developer/property.

### Still client-specific and not proven

- complete legacy crawl/redirect decisions;
- real semantic snapshot, demand values, collisions and approvals;
- owner-approved NAP/legal/copy/trust facts;
- full Rostov district/developer/ЖК inventory;
- Tier A/B/C assignment and media rights;
- real workbook delivery/import evidence;
- real feed source/taxonomy/identity onboarding;
- lead channels and development/quiz product acceptance;
- design intake and Soyuz-specific UI acceptance;
- analytics provider/event plan;
- performance/browser/a11y/staging/security/crawl/rehearsal/release evidence.

## 5. EPIC-00…EPIC-50 matrix

Статусы означают состояние против полного DoD Epic, а не наличие отдельных классов/скриптов.

| Epic | Status | Фактическое evidence | Gap / обязательное действие | Gate/dependency |
|---|---|---|---|---|
| EPIC-00 SourceCraft repo | **COMPLETE** | repo/branch/HEAD evidence; plan assembly block; `.sourcecraft/ci.yaml` | Не создавать второй repo. В плане оставить actual repo name `soyuz-rostov-next`. | none |
| EPIC-01 starter baseline | **COMPLETE** | `docs/CLONE_PROVENANCE.md`: `starter-v2.1.0`, source SHA `29ba847…`; current package/lock versions | Удалить исторические `ca1b…`/3.90.1 как execution baseline; использовать только provenance/current lock. | exact baseline frozen |
| EPIC-02 client activation | **COMPLETE** | `site.config.ts` client; generated bootstrap/provenance/profile/copy; package `souz-rostov-realty` | Не повторять clone preparation; legal/facts относятся к 07/29, не переоткрывают 02. | none |
| EPIC-03 legacy snapshot | **MISSING** | Нет `docs/migration/**`; только два bootstrap redirect rows + `/obekty/{slug}` pattern в profile | Crawl старого live, создать полный URL manifest/decisions/snapshot/selections; решить reviews/family mortgage/construction/uslugi/sdat. | HARD для 04, 19 project rows, 28, 41/42; OWNER decisions |
| EPIC-04 semantic/URL freeze | **MISSING** | Нет `docs/seo/SEMANTIC_SNAPSHOT_2026-09-23/**` и `collisions.csv`; registry rows все `fallback_no_data`, `tier=NONE`, `draft`; approvals CSV пуст | Получить/QA raw semantic evidence, collisions, measured tiers, exact URL decisions; затем materialize/approve registry. | HARD/CONTRACT для public page scope and indexing |
| EPIC-05 docs/ADR/governance | **PARTIAL** | `AGENTS.md`, `PROJECT.md`, new Operations partly client-aware; `ADR-PLATFORM-LAYOUT`, SEO registry ADR, module manifests exist | Переписать Epic на `src/core + packages`; актуализировать `01_PRD`, `03_ARCHITECTURE`, `04_BACKLOG`, `05_RELEASE_CHECKLIST`, `DESIGN`; map requested ADRs to existing equivalents instead of duplicating. | Depends 03/04 decisions; blocks plan approval |
| EPIC-06 infrastructure | **PARTIAL** | cleaned server/DB baseline documented; Docker/Nginx/compose/env baseline; no image deployed | Split topology closure from release. Canonicalize revalidate secret; decide/activate real storage; prove backup/monitoring rather than boolean claims. Image/migrations/live proof belong to staging/release Epics. | OWNER topology; production actions prohibited now |
| EPIC-07 site settings | **PARTIAL** | `SiteSettings` Global + `findPublicNap` DTO exist | Populate owner-approved NAP/legal/social/requisites; remove client fallback exposure. `src/fixture/site-settings.ts:5-17` still AMS demo placeholders and provider returns it on missing Payload. | OWNER NAP/legal; before 20/29/public proof |
| EPIC-08 geo model/seed | **PARTIAL** | schema, relations, validation, migrations and seed script exist | Client seed contains only 4 Rostov districts, not 8 + verified locality layer. `docs/seo/DISTRICTS.csv` also only 4 identities per category. Validate morphology/parents/categories with owner evidence. | 04 semantic + OWNER morphology |
| EPIC-09 developments/developers | **COMPLETE** | collections, migrations, slug/lifecycle/completeness/tier/media/price fields, guards | Treat as platform acceptance, not implementation. Real client data is EPIC-23. | regression checks only |
| EPIC-10 property taxonomy/geo/feed mapping | **COMPLETE** | Properties has category/market/raw + normalized refs, needsReview, development identity; core feed taxonomy/ingest and migrations | Do not recreate. Real source mapping/onboarding belongs 34. | regression/integration acceptance |
| EPIC-11 contracts/DTO | **COMPLETE** | Region/City/District, Developer, Development, discriminated Property and routing/listing DTOs in contracts package | Freeze current contract; only add proven client gaps via normal diff/freeze. | contract acceptance |
| EPIC-12 Public Gateway/counts | **COMPLETE** | server-only project gateway, explicit public read access, DTO mapping, catalog/geo/entity/count reads | Use current APIs; profile/data proof remains downstream. | architecture regression |
| EPIC-13 SEO registry/Gate | **PARTIAL** | typed profile/status matrices, registry renderer, Gate, structured-data safeguards and fixture tests exist | Client registry is bootstrap-only and unapproved. Persisted owner override/audit requirement needs explicit keep/remove decision and evidence. Remove R2 novostroyki-district rows from R1 or activate only in R2. | 04 CONTRACT; real inventory/content facts |
| EPIC-14 resolver/namespace/slash | **COMPLETE** | grammar/resolver/page decision/proxy; verified five-profile roundtrip/collision/redirect matrix | Correct plan paths from `src/platform` to actual owners; no reimplementation. | profile/registry data only |
| EPIC-15 Excel ЖК import | **PARTIAL** | five-sheet template (`Застройщики`, `ЖК`, `Цены`, `Медиа`, `Тексты`), dry-run/apply, validation, relation and slug checks exist | Generate and deliver actual workbook; decide/import-history model; run isolated DB idempotency/error proof on current exact head; no owner data loaded yet. | 07/08/23 data inputs; DB gate |
| EPIC-16 UI intake | **MISSING** | generic starter UI audits exist; `DESIGN.md` still cites Primorsk/Atlas representative pages | Produce Soyuz design intake/inventory, REUSE/VARIANT/CREATE map, representative Rostov pages and owner-approved visual direction. | OWNER design/evidence; before page adaptation |
| EPIC-17 navigation shell | **PARTIAL** | typed navigation builder and shell DTO exist | Current menu builds global category roots, includes `/uslugi`, lacks the exact geo-first menu model. Reconcile route decisions and ensure no unapproved/off links. | 03/04 route freeze + 07 NAP |
| EPIC-18 active skeleton | **PARTIAL** | catch-all supports geo/category/facet/developer/development/property; explicit service routes exist | Missing `/otzyvy/` and journal; project static list includes `/uslugi`; bootstrap registry includes R2 novostroyki-district paths. Freeze true R1 skeleton first. | 03/04/13/14 |
| EPIC-19 redirect/lifecycle | **PARTIAL** | executable legacy manifest compiler, stored redirects, proxy 301/308/410 and lifecycle collections exist | Project rows are not based on a real legacy crawl. Fill only from EPIC-03/28; prove no chains. | 03 HARD; 28 data |
| EPIC-20 home | **PARTIAL** | home composition and structured data exist | Current composition is generic starter service/process/trust flow; missing required Soyuz novostroyki/apartment/district/developer/journal facts and approved NAP/trust evidence. | 07, 16, 23, page data |
| EPIC-21 novostroyki hub | **PARTIAL** | route/listing/geo/development UI infrastructure exists | Missing real catalog, map/nearby/district/developer/quiz composition and source-backed timestamps/data. Avoid R2 district URL activation. | 08, 13, 16, 23 |
| EPIC-22 development template | **PARTIAL** | `DevelopmentDetailsView`, DTO/Gateway, stale-price presentation, schema JSON-LD, lead form exist | Needs real Tier data/media/rights, map, documents/related/reviews decisions and browser acceptance. Server must validate development lead context. | 23, 31, 16 |
| EPIC-23 Tier A/B/C data | **MISSING** | only starter fixture datasets; production DB documented empty | Obtain authoritative developer/ЖК inventory, rights, prices, checkedAt, tier rules; import/report/owner review. | OWNER data/media; 07/08/15 |
| EPIC-24 developers pages | **PARTIAL** | root/geo/entity resolver, Gateway/DTO and views exist | No real developers, company facts, semantic approvals or minimum inventory proof. | 04, 23 |
| EPIC-25 apartment roots/facet | **PARTIAL** | roots/geo/facet grammar, catalog query, filters and Gate exist | Registry has only `vtorichka`, all rows unmeasured/draft; no real inventory/feed; product composition not accepted. | 04, 34 |
| EPIC-26 district pages | **PARTIAL** | district resolver/templates/threshold mechanism exists | Only 4 district candidates; no real demand/inventory/collision proof; no owner-approved full district taxonomy. | 04, 08, 34 |
| EPIC-27 property detail | **COMPLETE** | category-aware property DTO/view/runtime, central URL identity and active/archive/redirect/410 behavior exist | Do not recreate; validate with real secondary data and R1 status profile. | real-data acceptance |
| EPIC-28 legacy apartment migration | **MISSING** | no old URL/entity table or import artifacts | Build per-entity mapping after EPIC-03 and verify 301/archive/410 without bulk category redirect. | 03 HARD + data access |
| EPIC-29 service/trust/legal | **PARTIAL** | `/prodat`, `/ipoteka`, `/o-kompanii`, `/kontakty`, privacy/consent routes exist | `/otzyvy` absent; family/construction unresolved; `/uslugi` active without plan decision; legal marked approved but evidence absent; copy is starter-derived. | OWNER copy/legal/trust + 03/04 |
| EPIC-30 journal | **MISSING** | frozen journal DTO and disabled module manifest only; no Posts collection/routes | Decide whether journal is truly R1. If yes: schema/migration/Gateway/routes/content migration/rights. If no: remove from R1 DoD/navigation/crawl matrix. | OWNER scope; 03 legacy evidence |
| EPIC-31 lead price/quiz | **PARTIAL** | existing intake/outbox/idempotency/delivery; backend has `development_price` and `quiz`; UI maps `development` to it | Plan name `zhk_price_request` conflicts with current `development_price`. Development context is not server-validated like property; city/region/dataTier context absent; real delivery channel unproven; quiz UI/product flow absent. | OWNER channel/form scope; security DB tests |
| EPIC-32 sitemap/robots/IndexNow | **COMPLETE** | sharded discovery, robots policy, Gate eligibility, IndexNow queue/task/transitions implemented | Re-run acceptance after final registry/data. Current global `noindex` must remain. | 04/13 final data; indexing OWNER gate |
| EPIC-33 internal linking | **PARTIAL** | safe navigation/breadcrumb/sub-links framework exists | No complete R1 content graph/orphan report; journal absent; menu currently differs from target. | final pages/data |
| EPIC-34 feed onboarding | **MISSING** | reusable ingest engine exists, but no real approved feed/source mapping/baseline run evidence | Choose one source, document host/taxonomy/geo/development identity, run safe baseline in isolated/staging environment. | OWNER source/access; 10, 23 |
| EPIC-35 cache | **COMPLETE** | HTTP revalidation facade, allowlists, entity invalidation, tags, batching/tests exist | Validate Excel/feed bulk behavior on real client data; no new cache architecture. | staging evidence |
| EPIC-36 analytics | **PARTIAL** | typed non-PII core events exist; `src/project/analytics.ts` is noop | Event names/dimensions differ from plan; no provider selected; no funnel/reporting acceptance. Decide canonical event contract and provider (e.g. Yandex only if approved). | OWNER analytics/privacy |
| EPIC-37 performance | **MISSING** | generic build/guards and bounded query code exist | No Soyuz R1 baseline, browser CWV/LCP/CLS/INP or real DB query-count evidence. | after representative UI/data |
| EPIC-38 UI/a11y QA | **MISSING** | reusable starter a11y/UI scripts exist | No Soyuz representative route/browser matrix; several required routes/data do not exist. | after 16–37 |
| EPIC-39 security/architecture audit | **MISSING** | security guards/suites exist | No independent final audit report for exact candidate, storage and real channels/data. | after implementation freeze |
| EPIC-40 staging | **MISSING** | server baseline only; technical host expected 502 | Build/pull immutable image, same-image migrations, app/storage/admin/jobs/leads/feed/restart/backup proof under noindex. | explicit staging/release command; 06 closure |
| EPIC-41 old/new crawl | **MISSING** | no old crawl; no running staging app | Produce full crawl diff only after 03 + 40. | 03 + 40 |
| EPIC-42 rehearsal | **MISSING** | lifecycle mechanisms exist, no replay artifact | Replay full legacy manifest against exact staging candidate; no production action. | 03/28/40/41 |
| EPIC-43 release candidate | **MISSING** | release scripts and manual gates exist | No exact candidate SHA/image digest, full evidence ledger, restore proof or P0/P1 audit closure. | 39–42; exact-head gate |
| EPIC-44 production cutover | **MISSING** | documented procedure only | Remains explicit OWNER/PRODUCTION gate. No action before exact RC approval. | explicit owner command only |
| EPIC-45 post-launch | **MISSING** | monitoring config claimed in readiness, no deployed runtime | Only after 44; create Day 1/3/7/14/30 evidence and new semantic snapshot. | production-sequenced |
| EPIC-46 R2 feeds | **FUTURE-NOT-R1** | base feed/development platform exists | Keep out of R1 graph. | owner R2 trigger |
| EPIC-47 R2 newbuild district/facets | **FUTURE-NOT-R1** | grammar can support districts/facets | Remove current novostroyki district rows/categories from R1 materialization; activate later only by evidence. | owner R2 + semantic/inventory thresholds |
| EPIC-48 R2 analytics content | **FUTURE-NOT-R1** | no `/analitika/` product/data model | Keep out of R1. | owner R2 trigger |
| EPIC-49 R3 houses | **FUTURE-NOT-R1** | schema/profile supports PREPARED_OFF | No public activation in R1. | explicit owner activation |
| EPIC-50 R3 MULTI_GEO | **FUTURE-NOT-R1** | profile/resolver tests already prove multi-geo mechanics | Keep only as future config/data activation; no R1 code. | explicit owner activation |

## 6. Cross-cutting requirement-to-code matrix

| Requirement | Code/doc evidence | State | Required revision/action |
|---|---|---|---|
| SourceCraft primary, zero auto CI | `.sourcecraft/ci.yaml` manual workflows + `paths: []` | complete | Preserve; final Gate exact SHA only. |
| Current versions | `package.json`, `pnpm-lock.yaml`, `Dockerfile`, CI images | complete | Plan must remove old runtime baseline as active target. |
| Payload-only schema/auth | `payload.config.ts`; no Prisma dependency | complete | Keep invariant. |
| Core/project dependency direction | `src/core`, `src/project`, packages; ADR layout; dependency-cruiser | complete | Replace every normative `src/platform/**` instruction. |
| Client clone identity | site config/generated bootstrap/provenance | complete | No repeat clone. |
| Normalized geo | collections/migrations/guards | platform complete / seed partial | Complete Rostov owner-approved seed. |
| Unified developments/developers | collections/migrations/contracts/Gateway | platform complete | Load real client data. |
| Property taxonomy/feed mapping | Properties + core ingest | platform complete | Validate real feed mappings. |
| DTO/Public Gateway | contracts + project gateway | complete | Do not bypass with raw Payload docs. |
| SINGLE/MULTI profile | profile schema/generated config + fixture verification | complete mechanism | R1 remains SINGLE; Bataysk/Aksay off. |
| URL grammar/resolver | core routing + project grammar + proxy | complete | Keep max-depth and canonical tests. |
| Content Gate | core Gate + project composition + runtime route | complete mechanism / project evidence missing | Approve registry/content/inventory facts. |
| SEO registry | CSV + generated TS + checks | bootstrap only | Replace fallback rows with real measured/approved evidence. |
| Legacy migration | two bootstrap redirects only | missing | Full old-site manifest/crawl. |
| Lifecycle 301/308/410 | proxy/lifecycle collections/runtime | complete mechanism | Prove with old manifest. |
| Sitemaps/robots/IndexNow | discovery runtime/routes/jobs | complete mechanism | Final data/noindex/live proof pending. |
| Home/page UI | app + UI views | reusable partial | Client content/design adaptation required. |
| Journal | disabled module + DTO only | missing | Decide R1 inclusion. |
| Excel import | parser/template/import/integration scripts | platform complete / delivery missing | Generate owner workbook and run client evidence. |
| Feed ingest | SAX/parser/jobs/gateway | platform complete / source missing | One real feed onboarding. |
| Lead intake/outbox | API, core lead engine, delivery jobs | substantial partial | Fix name/context validation/product flow; prove channel. |
| Cache/jobs | Payload autoRun + HTTP invalidator | complete mechanism | Live exactly-one owner proof pending. |
| Analytics | typed core + noop project adapter | partial | Select provider/event contract or explicitly defer. |
| Media storage | local Media adapter vs object-storage declaration | contradictory | Activate S3 adapter or explicitly approve and mount persistent local storage; do not leave current hybrid. |
| Release artifact | Dockerfile/release scripts/manual CI gate | partial | Prove external build/publish/digest and same-image migration. |
| Server/staging | Operations/server prep docs | baseline only | 502 until exact image; no staging proof. |
| Indexing safety | `productionIndexing=noindex`, robots/Nginx plan | correct | Preserve until explicit cutover/index owner command. |

## 7. Stale/contradictory plan and repository findings

### B-01 — Plan assumes `src/platform/**`, repository canon is `src/core/** + packages/**`

**Severity: blocker for execution graph.**

EPIC-05/14/43 require new `src/platform/**`, but `docs/03_ARCHITECTURE.md` and `ADR-PLATFORM-LAYOUT.md` explicitly make `src/core/**` and packages reusable owners. Creating `src/platform` would introduce duplicate ownership and violate the current architecture. Rewrite all path-level acceptance around actual owners.

### B-02 — EPIC-08…15 and later platform Epics are mostly already in the imported starter

**Severity: blocker for Task Manager import.**

The plan sequences schema → contracts → Gateway → resolver as future implementation, while migrations/collections/contracts/Gateway/grammar/Gate/import are already present. Task Manager would otherwise create duplicate modules/migrations or refactor stable code without a proven trigger. Replace those Epics with exact-head acceptance/gap tasks and only create defect tasks for confirmed deltas.

### B-03 — Storage topology is internally inconsistent

**Severity: release blocker.**

Evidence:

- `client-readiness.config.ts:26` says `approved-object-storage`;
- `docs/PROJECT.md` says S3/object storage is client canon;
- `payload.config.ts` has no S3 plugin;
- `Media.ts` uses `ensureMediaDirectory()` from local FS;
- runtime storage requirements fall back to `MEDIA_DIR` because readiness is not exactly `timeweb-s3`;
- compose is `read_only: true` and has no media volume mount.

Current container topology is therefore not a proven writable-media production topology. Choose one explicit option: activate the pinned Timeweb S3 adapter, or amend topology and compose to a persistent writable volume under an approved local-storage decision. Project intent currently points to S3.

### B-04 — Client runtime can surface starter NAP/content when Payload is unavailable

**Severity: release blocker.**

`src/project/data-access/public/provider.ts:61-63,252-262,288-290` returns `fixtureNap`/fallback pages without Payload. `src/fixture/site-settings.ts:5-17` contains `AMS Realty Baza Starter`, zero phone, `example.test`, demo address. This contradicts `docs/03_ARCHITECTURE.md`: client with absent Payload records should not mix starter fixtures. The catch-all has an empty-client fail-closed branch, but home/shell/marketing providers do not. Client should fail closed or use an explicitly client-owned safe placeholder never eligible for public release.

### B-05 — R2 novostroyki-district URLs are already materialized in the R1 bootstrap seed

**Severity: R1 scope/indexing blocker.**

`docs/seo/SEO_REGISTRY_SEED.csv:12-15` contains `/rostov-na-donu/novostroyki/{district}/`, while EPIC-47 and the Future section reserve such pages for R2. `docs/seo/DISTRICTS.csv` maps the same four districts to `novostroyki`. `Districts.categories` defaults to all category surfaces, and clone seed does not override it. Once seeded, these paths can become valid 200/noindex surfaces instead of remaining absent. Remove them from R1 project data/coverage, or explicitly change the master-plan R1 scope with owner approval.

### B-06 — Current R1 route set does not match the plan

**Severity: owner decision required.**

- `/uslugi` is active/indexable in profile but not in R1 page responsibility matrix.
- `/otzyvy/` is required by plan but absent.
- `/journal/` is required by plan but module is disabled and no routes/schema exist.
- family mortgage and `/stroitelstvo-domov/` are unresolved.
- `/sdat/` file exists as compatibility/fail-closed route but is not active in profile, consistent with OUT if no legacy redirect.

Freeze this set after legacy/semantic/product decisions; do not build all listed routes by inertia.

### B-07 — SEO seed is not semantic evidence

**Severity: indexing blocker.**

All current registry rows are `targetPhrases=client skeleton`, `source=fallback_no_data`, empty value, `tier=NONE`, `status=draft`, `defaultRobots=noindex`. `REGISTRY_APPROVALS.csv` contains header only. The generated bootstrap proves machinery, not SEO readiness. The plan must not mark EPIC-04/13 complete from these rows.

### B-08 — Geo seed is incomplete and over-broad by category

**Severity: product/SEO blocker.**

Bootstrap includes only Leninskiy, Voroshilovskiy, Severnyy, Tsentr; plan requires eight administrative districts plus verified microdistrict/locality layer. Default district `categories` include every surface, which is unsuitable for R1. Seed must explicitly set approved category membership and verified morphology/parent.

### B-09 — NAP/legal/readiness booleans overstate evidence

**Severity: release blocker.**

`legalContent="approved"`, `automaticBackup=true`, `externalMonitoring=true` are configuration assertions, not evidence. NAP in bootstrap is a zero placeholder and fallback is starter identity. Require owner-approved content and operational proof artifacts before release, while retaining noindex.

### B-10 — Lead Epic naming and authority differ from current implementation

**Severity: contract decision.**

Plan asks `zhk_price_request`; code uses backend `development_price`, presentation `development`. That mapping can be canonical, but the plan must say so. More importantly, only property context receives canonical server validation; development context is accepted as a normalized string. Add canonical published-development validation before release of this flow. Quiz backend enum exists, but no complete product/UI flow is evidenced.

### B-11 — Docs still describe starter/demo state

**Severity: plan approval blocker.**

- `docs/03_ARCHITECTURE.md` status and final “Starter vs client clone” section still say this repo remains starter demo/local PG/MEDIA_DIR.
- `docs/04_BACKLOG.md` says next action is create a client clone and release starter demo.
- `docs/DESIGN.md:113` uses `/primorsk/kvartiry/` and starter/Atlas references.
- `docs/01_PRD.md` contains demo/client-preproduction wording.
- `docs/05_RELEASE_CHECKLIST.md` remains starter-oriented.

The current Source-of-Truth chain is inconsistent despite updated `PROJECT.md` and local `OPERATIONS.md`.

### B-12 — EPIC-06 mixes topology decision with staging/release execution

**Severity: dependency defect.**

Its task/DoD is topology + Secret Master, but assembly “remaining” includes image publish, production migrations and live jobs proof, which are EPIC-40/43 concerns. Close EPIC-06 on repository/server topology readiness; keep immutable artifact/migrations/live proof in staging/release wave behind explicit gates.

### B-13 — Release image publication path is not proven

**Severity: staging blocker.**

SourceCraft workflows run verification only. Release scripts/Dockerfile exist, but no evidence shows an image registry target, publish procedure, digest retention and server pull for this client. Define this before EPIC-40; production host must not build from Git.

### B-14 — Local toolchain is below required Node minimum

**Severity: acceptance caveat.**

All sampled checks passed, but local Node is `v24.15.0` against required `>=24.21.0 <25`; every pnpm command emitted an engine warning. Final Gate must run the pinned compliant runtime.

### B-15 — Current uncommitted plan has whitespace errors and client drift is reported

**Severity: non-release blocker now; must resolve before exact-head Gate.**

`git diff --check` reports trailing whitespace in master-plan lines 18–19. `verify:client-readiness` passes but reports `starter drift: DRIFT (15 files)`. The drift may be expected client ownership, but the plan/evidence should classify it instead of ignoring it.

## 8. Corrected dependency graph

### 8.1 Dependency types

- **HARD** — output is technically required before successor starts.
- **CONTRACT** — URL/schema/DTO/SEO decision must be frozen before dependent composition.
- **SOFT** — safe parallel work if it consumes stable existing interfaces.
- **OWNER** — product/factual decision cannot be invented by agent.
- **PRODUCTION** — requires separate explicit owner command.

### 8.2 Corrected graph

```text
BASELINE ACCEPTED
  EPIC-00 + 01 + 02 [COMPLETE]

PLAN RECONCILIATION
  platform acceptance: 09,10,11,12,14,27,32,35
  -> EPIC-05 current architecture/docs rewrite [HARD for plan approval]

EVIDENCE TRACKS (parallel)
  EPIC-03 legacy crawl/route decisions [OWNER]
  EPIC-04 semantic QA starts broad research,
       but final URL/redirect freeze depends on 03 [CONTRACT]
  EPIC-07 NAP/legal/trust facts [OWNER]
  EPIC-16 design intake [OWNER]
  EPIC-23 data/media inventory [OWNER]
  EPIC-06 topology/storage/secret closure [OWNER, no deploy]

PROFILE/PROJECT BASELINE CLOSURE
  03 + 04 -> exact R1 route matrix + registry + collision register
  04 + owner morphology -> EPIC-08 project seed completion
  04 + current Gate capability -> EPIC-13 project registry acceptance
  03 + current lifecycle capability -> EPIC-19 project redirect rows
  07 -> safe SiteSettings seed/bootstrap; remove starter fallback
  06 -> S3 activation or approved persistent storage composition

DATA PIPELINE
  08 + current EPIC-15 capability -> generate owner workbook
  workbook + 23 evidence -> client developments/developers import
  10 capability + approved source -> EPIC-34 feed onboarding
  03 + source entity data -> EPIC-28 legacy apartment mapping

PUBLIC PRODUCT (parallel by stable route/DTO contracts)
  16 + 07 + route freeze -> EPIC-17 shell
  route freeze + current resolver -> EPIC-18 skeleton cleanup
  07 + 16 + 23 -> EPIC-20/21/22/24
  04 + 08 + real property data -> EPIC-25/26
  03/04 + 07/16 -> EPIC-29
  EPIC-30 only if owner keeps journal in R1
  EPIC-31 after exact form naming/context/channel decisions
  EPIC-33 after all retained R1 pages exist
  EPIC-36 after provider/event owner decision

SYSTEM ACCEPTANCE
  current EPIC-32/35 mechanisms + final profile/data -> discovery/cache regression
  EPIC-37 after representative pages/data
  EPIC-38 after page/performance completion
  EPIC-39 exact-head independent security/architecture audit

DELIVERY
  EPIC-40 staging [requires 06 + implementation + immutable image]
  EPIC-41 crawl [requires 03 + 40]
  EPIC-42 rehearsal [requires 03/19/28 + 40/41]
  EPIC-43 exact RC [requires 37/38/39/40/41/42]
  OWNER APPROVAL
  EPIC-44 [PRODUCTION, explicit command only]
  EPIC-45 [after launch]

FUTURE
  EPIC-46/47/48 R2; EPIC-49/50 R3
```

### 8.3 Corrected execution waves

#### Wave A — Plan and baseline acceptance

- lock 00/01/02 complete;
- convert already-implemented platform Epics to acceptance records;
- update 05 and active Source-of-Truth docs;
- remove `src/platform` creation requirements;
- keep plan `DRAFT / ARCHITECT ASSEMBLY`.

#### Wave B — Independent evidence and owner decisions

Run in parallel where safe:

- legacy snapshot (03);
- semantic research/registry evidence (04);
- NAP/legal/trust and route/product choices (07/29/30/31/36);
- design intake (16);
- data/media/source inventory (23/34);
- topology/storage decision (06).

No production/deploy action.

#### Wave C — Project baseline hardening

- client seed/profile/registry/redirect fixes (08/13/19);
- remove starter fallback;
- close storage adapter/compose consistency;
- exact R1 route matrix;
- generate client workbook from existing importer.

#### Wave D — Data and public product streams

Parallel streams, each branch/worktree/PR:

1. developments/developers data;
2. secondary feed/data + legacy migration;
3. shell/home/catalog/development/developer pages;
4. service/legal pages;
5. leads/channels;
6. journal only if retained;
7. analytics only after provider contract.

#### Wave E — Integration quality

- internal linking/discovery/cache acceptance;
- performance baseline;
- Soyuz browser/a11y matrix;
- security/architecture audit.

#### Wave F — Staging and release

- immutable exact-SHA image;
- same-image migrations;
- noindex staging live proof;
- old/new crawl + migration rehearsal;
- exact RC + rollback evidence;
- explicit owner production gate;
- post-launch monitoring.

## 9. Concrete master-plan revision recommendations

1. **Replace the current Epic status model with two axes:**
   - `CAPABILITY_STATE = EXISTING | GAP | NOT_APPLICABLE`;
   - `CLIENT_EVIDENCE_STATE = PROVEN | PARTIAL | MISSING`.
   This prevents “existing platform code” from being confused with “client launch ready”.

2. **Mark 09/10/11/12/14/27/32/35 as imported baseline capabilities**, with exact files/checks and no implementation tasks unless a named gap appears.

3. **Split EPIC-08, 13, 15, 19 into platform capability vs Soyuz project completion:**
   - platform capability already present;
   - only seed/registry/workbook/manifest evidence remains.

4. **Rewrite EPIC-05 paths:** `src/core/**`, `src/project/**`, `packages/**`; never create `src/platform/**`.

5. **Split EPIC-06:**
   - 06A topology/Secret Master/storage decision and source configuration;
   - 40/43 own image, migrations, live jobs, backup/restore and staging proof.

6. **Add explicit release blockers to the plan:**
   - no starter fixture fallback in client runtime;
   - media storage topology exactly matches Payload adapter + compose;
   - SiteSettings seeded with approved NAP;
   - no R2 routes in R1 registry/district categories;
   - all readiness booleans backed by evidence.

7. **Replace current linear final order with the corrected graph/waves.** A strict 00→45 linear chain loses autonomy and serializes independent evidence/UI/data work.

8. **Make EPIC-03 and EPIC-04 hard contract gates**, but allow their research collection to run concurrently; only final route/SEO freeze depends on complete legacy evidence.

9. **Decide journal R1 scope now.** If no approved content/migration source exists, move EPIC-30 to R2 and remove journal from R1 route/QA/release matrices.

10. **Normalize lead terminology:** retain code canonical `development_price` or rename through an approved migration, but document one backend owner and explicit presentation mapping. Add server authority check for canonical published Development.

11. **Add a project bootstrap task** for approved SiteSettings/Pages data and explicitly forbid fixture/demo identity in client output.

12. **Update EPIC-17/18/29 route lists** after owner decisions: `/uslugi`, `/otzyvy`, family mortgage, construction, journal.

13. **Remove novostroyki-district rows from current R1 seed** unless owner explicitly promotes EPIC-47 into R1 with evidence; default district categories must be explicit, not all surfaces.

14. **Update all active docs in one architecture PR** after decisions; do not create duplicate ADRs where current ADR already owns the decision. Use a mapping table from requested ADR name to existing ADR/section.

15. **Add exact artifact contract before staging:** registry, image name, exact SHA label, immutable digest, publish/pull commands, manifest checksum and same-image migration command. No server-side build.

16. **Keep plan status DRAFT.** Do not set `READY_FOR_OWNER_APPROVAL` until all four final audits are rerun on the revised exact version and all unresolved owner decisions affecting R1 are either closed or explicitly removed from scope.

## 10. Missing Soyuz-specific decisions/evidence

### Owner decisions

1. Exact R1 public route set:
   - retain `/uslugi/` or remove;
   - canonical reviews route and source of reviews;
   - family mortgage canonical;
   - construction service KEEP/redirect/OUT;
   - journal R1 vs future.
2. Approved NAP: legal/public name, phone, email, address, hours, social/messengers, requisites, map coordinates.
3. Approved legal text and consent version; current “approved” flag alone is insufficient.
4. Final storage topology: Timeweb S3 adapter vs explicitly approved persistent local media.
5. Lead channels (MAX/custom webhook/etc.), destination ownership and retention confirmation.
6. Analytics provider and event contract, or explicit R1 deferral.
7. Design/reference direction and Soyuz-specific representative pages.
8. Tier A priority list and rules for B/C.
9. Whether Bataysk/Aksay records are retained only as off data in R1.
10. Exact public-indexing/cutover command later; current decision remains noindex.

### Evidence required

- old-site crawl, robots/sitemaps/internal links and URL decisions;
- raw semantic snapshot, Wordstat methodology/date, collision register and approvals;
- all 8 Rostov administrative districts + verified microdistricts/morphology/parents;
- developer/ЖК/property inventory with provenance;
- price source + checkedAt and media rights;
- generated owner workbook delivery and import report;
- real feed specification and first baseline run;
- backup/restore and monitoring proof;
- immutable image/digest and exact-SHA provenance;
- staging health/jobs/media/admin/leads/feed/cache proof;
- browser UI/a11y/performance evidence;
- old/new crawl and migration rehearsal.

## 11. Findings register

| ID | Severity | Finding | Release impact |
|---|---|---|---|
| F-01 | P1 | master plan would recreate already-owned platform layers | blocks Beads import |
| F-02 | P1 | object-storage declaration vs local FS runtime/read-only compose | blocks staging/release |
| F-03 | P1 | starter NAP/content fallback in client home/shell/marketing | blocks public runtime |
| F-04 | P1 | R2 novostroyki district URLs present in R1 bootstrap registry/data | blocks R1 URL freeze |
| F-05 | P1 | legacy/semantic/data/NAP/media evidence absent | blocks owner approval/release |
| F-06 | P1 | no immutable client image/staging/live proof | blocks staging/release |
| F-07 | P2 | active route set differs from plan (`uslugi`, `otzyvy`, journal) | owner decision required |
| F-08 | P2 | geo seed incomplete and categories over-broad | blocks content/SEO acceptance |
| F-09 | P2 | development lead context lacks canonical server validation | blocks that form release |
| F-10 | P2 | core docs remain starter/demo oriented | blocks Source-of-Truth consistency |
| F-11 | P2 | analytics is noop and plan event contract differs | funnel not measurable |
| F-12 | P2 | local Node version below required engine | final evidence must be rerun |
| F-13 | P3 | trailing whitespace in parent-owned plan diff | clean before commit |
| F-14 | P3 | starter drift count 15 not classified in evidence | review before exact-head Gate |

## 12. Night Run Readiness

### Verdict

`NOT_READY`

### Why autonomous execution is unsafe now

- exact master-plan graph is materially stale against imported code;
- several unresolved choices determine public routes, schema/module scope and content;
- legacy/semantic/NAP/data/media inputs cannot be invented;
- storage composition is contradictory;
- first tasks generated from current plan could duplicate platform owners;
- no APPROVED plan snapshot or Beads store exists;
- staging/production require explicit owner commands.

### What can safely run before owner approval

Only bounded, non-production evidence/documentation work after the master-plan revision is accepted as a DRAFT working direction:

- read-only legacy crawl/research and semantic evidence collection;
- repository-only architecture/docs reconciliation;
- unit/guard verification on existing platform;
- preparation of owner decision packets;
- isolated test fixtures, only after an implementation command and Task Contract.

Do **not** initialize/import Beads, deploy, migrate DB, publish an image, touch DNS/indexing or claim `READY_FOR_OWNER_APPROVAL` from this audit alone.

## 13. Safe exact next actions

1. Parent architect reviews this report and merges accepted status classifications into a new master-plan assembly version.
2. Rewrite dependency waves around existing capabilities; remove `src/platform` and duplicated implementation tasks.
3. Add explicit blockers F-02/F-03/F-04 to Wave C.
4. Present one owner decision packet for route scope, journal, NAP/legal, storage, leads, analytics and design/data sources.
5. In parallel, collect EPIC-03 and EPIC-04 evidence without changing production.
6. After decisions, finalize project seed/profile/registry/redirect scope and exact R1 backlog.
7. Run the four required independent audits on that exact plan version: logic, architecture, dependency/autonomy, evidence.
8. Only then move exact version to `READY_FOR_OWNER_APPROVAL`; only explicit owner phrase “План утверждён” permits APPROVED snapshot and Beads import.

## 14. Validation evidence

Commands executed in this read-only audit:

| Command | Result | Summary |
|---|---|---|
| `pnpm verify:site-profile` | PASS with engine warning | 5 fixtures, explicit matrices, invalid paths; generated config drift guard passed. |
| `pnpm verify:url-grammar` | PASS with engine warning | all PageKey/profile roundtrips + collision matrix. |
| `pnpm verify:resolver` | PASS with engine warning | five profiles + page/redirect/404/410 + no-chain matrix. |
| `pnpm verify:content-gate` | PASS with engine warning | five profiles + listing/property/development/developer/override matrix. |
| `pnpm verify:public-gateway` | PASS with engine warning | public gateway architecture check passed. |
| `pnpm verify:client-readiness --mode=fixture-client` | PASS with caveat | static Timeweb contract only; live providers not proven; starter drift count 15. |
| `pnpm verify:starter-drift` | WARN | `DRIFT (15 files)`, no file classification printed. |
| `git diff --check` | FAIL on parent-owned diff | two trailing-whitespace lines in master plan; Operations LF/CRLF warning. |
| `git status --short` / `git diff --cached --name-only` | PASS | parent changes preserved; staged set empty. |

All pnpm commands warned that local Node `v24.15.0` is below project engine `>=24.21.0 <25`.

## 15. Audit integrity

- Source/docs in repository changed by this audit: **none**.
- Only permitted write: this report artifact.
- Tests added/updated: none.
- Commits/staging: none.
- Server/Secret Master/DB/deploy/Beads accessed: none.
- Existing parent changes were not modified.
