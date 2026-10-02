# AMS FINAL MASTER PLAN — «Союз застройщиков»

**Plan ID:** `AMS-SOUZ-HOME-GEO-CATALOG-PLATFORM-BUILD`  
**Version:** `4.1.1-ARCH-v5`
**Date:** `2026-10-01`
**Status:** `APPROVED`
**Original incoming status:** `4.1.1 FINAL CANDIDATE / READY FOR OWNER APPROVAL`  
**Project:** агентство недвижимости «Союз застройщиков»  
**Domain:** `souz-home.ru`  
**Primary geography at launch:** Ростов-на-Дону  
**Geo mode at R1:** `SINGLE_GEO`, только owner-controlled code config  
**First MULTI_GEO activation candidate:** Батайск  
**Primary R1 product:** новостройки + продажа квартир + районные страницы квартир  
**Platform:** `AMS Realty Platform Core Standard 5.5 — Solo + AI`  
**UI:** `AMS UI Core v5.0`  
**Starter:** `neyro-level/ams-realty-baza-starter`  
**Verified starter mirror baseline:** `main@ca1b884d43e808d17e1eb18b05bad70ea358dd1c`  
**Original verified runtime baseline:** Node `>=24.20 <25`, pnpm `11.5.1`, Next.js `16.3.5`, React `19.2.8`, Payload `3.90.1`, Tailwind CSS `4.x`
**Current repo runtime baseline:** Node image `24.21.0`, pnpm `11.28.2`, Next.js `16.3.8`, React `19.2.8`, Payload `3.90.2`, TypeScript lock `5.9.3`, Tailwind CSS lock `4.3.3`
**Latest-stable target snapshot (verified 2026-10-01):** Node `24.21.0`, pnpm `12.8.1`, Next.js `16.3.8`, React/React DOM `19.3.0`, Payload `3.90.2`, TypeScript `7.0.2`, Tailwind CSS `4.3.3`, PostgreSQL `18.6`; exact target is re-resolved and compatibility-gated at implementation time
**Canonical Git contour:** SourceCraft primary  
**GitHub:** one-way mirror only, если owner сохраняет зеркало  
**Secrets:** global `Secret Master` / Infisical  
**Production:** только по отдельной явной owner-команде  
**Semantic snapshot date:** `2026-09-23`

<!-- TASK_MANAGER_SOURCE_IDENTITY_BEGIN -->
Plan ID: AMS-SOUZ-HOME-GEO-CATALOG-PLATFORM-BUILD
Version: v5
Status: APPROVED
Approved version label: 4.1.1-ARCH-v5
<!-- TASK_MANAGER_SOURCE_IDENTITY_END -->

---

# ARCHITECT CONTROL BLOCK — 2026-10-01

**Architect phase:** `APPROVAL RECORDED / POST-AUDIT HANDOFF DEFERRED TO PARENT`
**Night Run Readiness:** `READY_WITH_LIMITS — autonomous implementation may bypass local evidence/external blockers; staging, production, indexing and later owner gates remain excluded`
**Task Manager import:** `APPROVED SNAPSHOT; NOT INITIALIZED OR IMPORTED IN THIS RUN`
**Beads/Task Manager store:** not initialized in this checkout
**Independent repo-vs-plan audit:** `completed 2026-10-01`, evidence in `docs/research/MASTER_PLAN_GAP_AUDIT_2026-10-01.md`
**Loaded by:** AMS Task Manager Architect  

## Baseline loading decision

Although the incoming document was marked as `FINAL CANDIDATE / READY FOR OWNER APPROVAL`, the Task Manager Architect protocol loads any existing master-plan basis as `DRAFT` until the exact current repository, documentation, server and dependency state are reconciled.

## Current factual project state at baseline load

- SourceCraft repo exists: `integrator-p/soyuz-rostov-next`.
- Current working branch: `adapt/soyuz-rostov-client`.
- Client adaptation has been committed and pushed.
- Project identity is already converted from starter/demo to client mode:
  - package: `souz-rostov-realty`;
  - brand: `Союз застройщиков`;
  - final domain: `souz-home.ru`;
  - technical host: `soyuz-rostov.tw1.ru`;
  - primary geo: `rostov-na-donu`.
- Runtime versions in the current repo differ from the incoming plan baseline:
  - Node engine: `>=24.21.0 <25`;
  - pnpm: `11.28.2`;
  - Next.js: `16.3.8`;
  - Payload: `3.90.2`;
  - React: `19.2.8`.
- `src/project/site-profile.config.ts` already encodes `SINGLE_GEO`, Rostov ACTIVE, Bataysk/Aksay PREPARED_OFF, `kvartiry` + `novostroyki` ACTIVE, and `marketCapability` newbuild/secondary ACTIVE.
- Server `szrostov` has been destructively cleaned by owner command:
  - old app/systemd/runtime directories removed;
  - Timeweb PostgreSQL `soyuz_rostov_prod` reset to empty public schema;
  - Docker `29.1.3` and Docker Compose `2.40.3` installed;
  - clean `/opt/souz-rostov`, `/etc/souz-rostov/app.env`, `/opt/souz-rostov/compose.yml` and Nginx placeholder prepared;
  - technical host returns expected `502` until immutable SourceCraft image is released.
- Production release, DNS cutover, migrations and public indexing remain explicit owner gates.

## Baseline reconciliation register

Implementation-open rows below are contracted R1 work or later delivery gates, not unresolved final-audit findings.

| ID | Severity | Status | Finding | Evidence / required resolution |
|---|---|---|---|---|
| ACB-01 | BLOCKER | RESOLVED-IN-v2 | Incoming plan incorrectly claimed readiness against an older repo/server state. | Exact revised plan has now completed the four-pass final audit; current status is owned by the header and §34. |
| ACB-02 | MAJOR | RESOLVED-IN-v4 / IMPLEMENTATION-OPEN | Runtime baseline was stale and owner requires only current stable stack versions. | v4 records current versus latest-stable targets and reopens EPIC-01 as a compatibility-gated uplift; no canary/RC and no launch on a known stale direct stack dependency. |
| ACB-03 | MAJOR | RESOLVED-IN-v1 | Operations described the removed unhealthy systemd contour. | `docs/OPERATIONS.md` now records the Docker-ready clean server baseline. |
| ACB-04 | MAJOR | RESOLVED-IN-v1 | EPIC-00/01/02 ignored already completed repo/bootstrap/client work. | They are marked completed against current SourceCraft evidence. |
| ACB-05 | P1 | OPEN | Generated server-local `REVALIDATE_SECRET` is not canonical in Secret Master. | Canonicalize before staging/release env materialization. |
| ACB-06 | BLOCKER | RESOLVED-IN-v2 | Plan would create duplicate `src/platform/**` ownership although current canon is `src/core/** + packages/**`, composed by `src/project/**`. | Normative tasks/paths now use actual owners; creating a second platform tree is explicitly forbidden. |
| ACB-07 | BLOCKER | PLAN-CONTRACT-RESOLVED-v3 / IMPLEMENTATION-OPEN | Media topology is contradictory: Timeweb S3 is selected, but Payload still uses local filesystem. | Activate S3 through the existing client workflow and align adapter/env/compose before staging. |
| ACB-08 | BLOCKER | PLAN-CONTRACT-RESOLVED-v5 / IMPLEMENTATION-OPEN | Client public provider can expose starter fixture NAP/content when Payload is absent. | EPIC-07/Wave C must fail closed; any starter identity in public output is a release hard stop. |
| ACB-09 | BLOCKER | PLAN-CONTRACT-RESOLVED-v5 / IMPLEMENTATION-OPEN | R2 novostroyki district URLs are already materialized in the R1 SEO/district seeds. | Wave C removes them from R1. Promotion is forbidden without a later owner-approved EPIC-47 activation. |
| ACB-10 | P1 | OWNER-DIRECTION-RESOLVED-v4 / EVIDENCE-OPEN | Legacy, semantic, legal-copy approval and implementation evidence are incomplete. | Owner fixed NAP, visual direction, 24 priority ЖК, Yandex Realty source rights, Excel-first intake and photo minimums. Execution still must collect/verify records, legal texts, media and crawl/semantic evidence before public release. |
| ACB-11 | P1 | RESOLVED-IN-v2 | Source-of-Truth docs contained starter/demo assumptions. | PRD, Architecture, Backlog, Release Checklist, Design, Operations, Project and docs map are reconciled to the client assembly state. |
| ACB-12 | P1 | OPEN | Immutable client image publication/pull-by-digest path is not proven. | Define artifact registry/name/digest/provenance contract before staging. |

## Revision history

| Revision | Date | Status | Source | Summary |
|---|---|---|---|---|
| v4.1.1-ARCH-BASELINE | 2026-10-01 | DRAFT / ARCHITECT ASSEMBLY | Owner supplied plan + current repo/server evidence | Loaded incoming final-candidate plan and recorded initial reconciliation findings. |
| v4.1.1-ARCH-v1 | 2026-10-01 | DRAFT / ARCHITECT ASSEMBLY | Owner reconciliation request | Updated repo/server facts, EPIC-00/01/02/06 status, initial waves and Operations. |
| v4.1.1-ARCH-v2 | 2026-10-01 | REVIEW / ARCHITECT ASSEMBLY | Independent Task Manager Architect repo-vs-plan audit | Reframed plan from greenfield platform build to existing-capability acceptance plus Soyuz client gaps; added finding/decision registers and corrected dependency waves. |
| v4.1.1-ARCH-v3 | 2026-10-01 | REVIEW / ARCHITECT ASSEMBLY | Owner decision packet | Fixed minimal R1 route scope, Timeweb S3, MAX delivery and Yandex Metrica; moved journal/construction beyond R1. UI direction, NAP/legal and tier/source evidence remain open. |
| v4.1.1-ARCH-v4 | 2026-10-01 | REVIEW / FINAL AUDIT | Owner approval-preparation packet + official stack verification | Fixed latest-stable stack policy, approved NAP, Bastion-template visual preservation, 24 priority ЖК, Yandex Realty partner-rights attestation, ≥5 photos per ЖК, Excel-first intake, private provenance and S3 media transfer. Placeholder use is limited to noindex staging and cannot satisfy release Gates. |
| v4.1.1-ARCH-v5 | 2026-10-01 | APPROVED | Four-pass final audit of exact v4 plus deterministic remediation, then explicit owner approval | Removed residual R1 journal/feed/route/model contradictions, fixed executable command names/Windows env syntax, front-loaded remaining decisions/defaults, formalized dependency/autonomy/evidence/delivery contracts and recorded final scorecard. Audit passed with zero open blockers/cycles/before-approval decisions; owner then supplied the exact approval phrase. No production code, Beads, commit/push, deploy, migration or production action was performed. |

## Owner approval record

| Field | Value |
|---|---|
| Exact approved version | `4.1.1-ARCH-v5` |
| Approver | Owner |
| Approval phrase | `план утвержден` |
| Approval date | `2026-10-01` |
| Final audit result | `PASS`; blockers `0`; dependency cycles `0`; before-approval owner decisions `0` |
| Night Run Readiness | `READY_WITH_LIMITS` |
| Result | `APPROVED` |
| Post-audit handoff | Deferred to parent orchestrator; this run did not initialize/import Beads, commit/push or start Developer. |

## Architecture reconciliation v5

Execution planning uses two independent axes:

```text
CAPABILITY_STATE = EXISTING | GAP | NOT_APPLICABLE
CLIENT_EVIDENCE_STATE = PROVEN | PARTIAL | MISSING
```

An existing reusable capability is not proof that the Soyuz client surface is ready. Conversely, missing client data/content does not authorize rebuilding platform schema, DTO, Gateway or resolver layers.

For every `COMPLETE / imported capability` Epic, its legacy `Tasks`/`DoD` text is an acceptance description only. It MUST NOT become implementation work in the future inventory; only an exact-head regression/acceptance task may be created, and a named proven gap reopens the smallest owning scope.

### Current Epic classification

| Classification | Epics | Meaning |
|---|---|---|
| COMPLETE / imported capability | 00, 02, 09, 10, 11, 12, 14, 27, 32, 35 | Do not recreate. Keep exact-head acceptance/regression tasks only. |
| PARTIAL / client completion required | 01, 05, 06, 07, 08, 13, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 29, 31, 33, 36 | Mechanism exists or baseline is prepared; current-stable uplift, named Soyuz evidence, configuration, product or operational gaps remain. |
| MISSING / project evidence or product work | 03, 04, 28, 37, 38, 39, 40, 41, 42, 43, 44, 45 | No complete project artifact/evidence against the Epic DoD. |
| FUTURE / not R1 | 30, 34, 46, 47, 48, 49, 50 | Excluded from R1 execution graph unless owner explicitly promotes scope. |

### Actual reusable architecture accepted from the current repository

```text
src/core/**                    reusable routing, Gate, access, ingest, leads, cache
packages/contracts/**          storage-neutral DTO/contracts
packages/ui/**                 reusable presentation
src/project/**                 Soyuz profile/schema adapters/composition/copy/SEO/runtime
src/app/**                     Next.js route composition
Payload collections/globals    sole schema/auth/Admin owner
migrations/**                  sole schema-change path
```

Dependency direction remains `project -> core`; `core/packages -> project` is forbidden. Historical mentions of `src/platform/**` are conceptual only and do not authorize creating that directory.

### Owner-decision register — before plan approval

| ID | Status | Decision | Fixed outcome / required input |
|---|---|---|---|
| ODR-01 | RESOLVED-v3 | Exact R1 route set. | Minimal R1: keep `/uslugi/`; reviews only with verified source; family mortgage stays under `/ipoteka/`; construction and journal move beyond R1. |
| ODR-02 | RESOLVED-FOR-PLAN-v4 | Approved NAP/legal/trust facts. | Public business facts are fixed in §19.1. EPIC-29 drafts privacy/consent/legal texts and requires owner approval before staging/public indexing; unapproved text remains a noindex-only placeholder. Reviews remain hidden until a verified source exists. |
| ODR-03 | RESOLVED-v3 | Media storage topology. | Activate Timeweb S3; align Payload adapter, runtime env and compose. Local `MEDIA_DIR` is not production canon. |
| ODR-04 | RESOLVED-v3 | Lead channels and terminology. | R1 delivery through MAX. Keep backend canonical `development_price`, map presentation `development`, and add server validation of published Development. |
| ODR-05 | RESOLVED-v3 | Analytics provider. | R1 uses Yandex Metrica with approved non-PII event contract and consent/privacy handling. |
| ODR-06 | RESOLVED-v4 | Soyuz visual direction/design intake. | R1 preserves the current imported Bastion-template appearance exactly; change only brand/name and required factual content. Redesign is a separate post-R1 phase. Internal Atlas provenance is retained and not rewritten as Bastion provenance. |
| ODR-07 | RESOLVED-FOR-PLAN-v4 | Tier priorities and source data/media rights. | The 24 owner-listed ЖК in §10.1 are the R1 priority intake set. Owner attests official Yandex Realty partnership rights to copy factual information and photos without public attribution. Internal provenance/rights/checkedAt remains mandatory; ≥5 photos per ЖК are copied to controlled intake and then Payload-managed Timeweb S3. |

---

# CHANGELOG v4.1.0 → v4.1.1 [PROJECT]

| FIX | Было | Стало | Причина |
|---|---|---|---|
| FIX-01 Geo hub SINGLE_GEO | `/{primaryGeo}/` в v4.1.0 redirect-to-root; generic geo intent менял владельца при MULTI_GEO | `/{primaryGeo}/` всегда `200` registry/Gate candidate; `/{otherGeo}/` в SINGLE = `404`; generic `недвижимость {город}` всегда принадлежит `/{geo}/`, agency/brand — `/` | Убрать mode-cutover интента и сделать geo hub стабильной SEO-поверхностью |
| FIX-02 Trailing slash vs legacy | пример смешивал framework `308` и migration `301` | slash normalization = один `308`; legacy = прямой один-hop `301`; category-first grammar = `404` | Исключить цепочки `308→301` и неоднозначность редиректов |
| FIX-03 Entity vs local catalog | `marketStatus[geo]` мог блокировать глобальную сущность из неактивного города | global entity publication зависит от `categoryStatus + marketCapability + lifecycle`; `geoCategoryStatus/marketStatus` управляют только локальными каталогами/листингами | Глобальные сущности Батайска/Аксая доступны без активации их geo hubs |
| FIX-04 URL builder / guards | URL собирались несколькими слоями; project literals могли попадать в reusable code | фактические owners: `src/core/routing/url-grammar.ts` + `src/project/url-grammar.ts`; proofs: `verify:url-grammar`, `quality:architecture`, `verify:copy-ownership`, `seo:registry:check` | Один источник путей без создания второго `src/platform/**` owner |
| FIX-05 SEO tiers typed config | P1/P2/TEST были описаны как platform defaults | platform хранит только тип/механизм; значения `seoTiers` — `[PROJECT]` Союза; seed `source` получает enum | Рынки могут иметь разные пороги без изменения platform |
| FIX-06 Status enum | использовались только `ACTIVE / PREPARED_OFF / OUT` | единый enum `ACTIVE / NOINDEX_AUTO / PREPARED_OFF / OUT`; Союз R1 `NOINDEX_AUTO` не использует | Не расширять enum платформы позже |
| FIX-07 Developer Gate | developer hub/entity не имели полного числового Gate | geo developers hub: min 5; entity: ≥1 Gate-passed ЖК + описание ≥600 chars with provenance | Закрыть thin developer pages |
| FIX-08 Computed reservedRoot | reserved root задавался вручную | `platformReserved ∪ categorySlugs ∪ projectStaticSlugs`; статические маршруты обязаны быть зарегистрированы | Убрать рассинхронизацию namespace и routes |
| FIX-09 District metadata | один общий `APT_DISTRICT` template | отдельные `APT_DISTRICT_ADMIN` и `APT_DISTRICT_MICRO`, выбор по `district.type` | Корректная русская морфология районов |
| FIX-10 Cache / analytics | отсутствовал единый geo-aware tag/dimension contract | typed cache tags + invalidation graph; analytics dimensions `geo_slug/page_key/category/market` | Предсказуемая инвалидация и мультигородская аналитика |
| FIX-11 Fixture acceptance | fixture matrix проверяла режимы частично | на всех профилях: primary geo=200, breadcrumb parity, inactive-geo entity, URL roundtrip, sitemap/buildUrl/200, category-first=404 | Доказать новую grammar до R1 UI |
| FIX-12 Upstream candidates | перенос platform layer обратно в starter не отслеживался | `docs/UPSTREAM_CANDIDATES.md`, обновляемый каждым `[PLATFORM]` Epic; final R1 guard на отсутствие project literals | Подготовить безопасный upstream в starter v2 |

---

# CHANGELOG v3.1 → v4.1.0 [PROJECT]

| Раздел | Было | Стало | Причина |
|---|---|---|---|
| Product scope | 6 категорий first-wave route capability | `ACTIVE / PREPARED_OFF / OUT`; R1 только novostroyki, kvartiry и сервисные разделы | Сократить R1 до коммерчески и SEO-подтверждённого ядра |
| Geo root v4.0.1 — **SUPERSEDED IN v4.1.1** | root geo запрещён | v4.1.0 вводил redirect-to-root для SINGLE_GEO primary; это правило заменено v4.1.1: primary geo hub всегда `200` registry candidate | Историческая строка; актуальный контракт см. CHANGELOG v4.1.0 → v4.1.1 |
| URL grammar v4.0.1 | category-first `/{category}/{geo}/` | geo-first `/{geo}/{category}/`; global entity URLs остаются без geo | Город становится первым namespace для локальных каталогов, сущности не переезжают при MULTI_GEO |
| Resolver | category namespace определял geo/entity | root resolver: reserved root → published geo → 404; geo resolver: category/zastroyshchiki; global category resolver: entity grammar | Детерминированное разделение geo routes и global entities |
| SINGLE_GEO — **SUPERSEDED IN v4.1.1** | в основном политика category root | v4.1.0 вводил mode-dependent geo root/intent ownership; v4.1.1 оставляет intent ownership стабильным в обоих режимах | Историческая строка; актуальный контракт см. §3.2/§4 |
| Category status | только глобальный `categoryStatus` | `categoryStatus` + `geoCategoryStatus` + `marketStatus` | Можно включать разные категории/рынки по городам независимо |
| City morphology | `nameLocative` | `nameGenitive` + `nameLocative` + `preposition`, owner-approved | Корректные Title/H1: «Ростова-на-Дону», «в Ростове-на-Дону» |
| Agglomeration | nearby-city logic без модели | `City.agglomerationOf → City`; nearby blocks строятся по relation | Детерминированный «Рядом с {city}» и корректные счётчики |
| PLATFORM / PROJECT | граница описана общим текстом | каждый раздел/эпик явно помечен `[PLATFORM]` или `[PROJECT]`; mixed sections разделены | Понятно, что переносится в starter, а что остаётся данными Союза |
| SEO defaults | пороги/Gate числа воспринимались как project-hardcoded | P1/P2/TEST и числовые Gate thresholds = platform defaults, project-overridable | Повторное использование starter в рынках с другой плотностью данных |
| District/facet URLs | `/{category}/{geo}/{sub}/` | `/{geo}/{category}/{sub}/` | Соответствие geo-first grammar |
| Multi-geo verification | MULTI_GEO проверялся фактически в R3 | R0 fixtures: `fixture-multi-geo`, `fixture-newbuild-first`, `fixture-secondary-first` | Multi-geo доказан до клиентского UI |
| EPIC-50 | архитектурная активация MULTI_GEO | configuration-only activation; изменения `src/` запрещены | Если нужен новый код — дефект platform epics |
| Home/geo intent — **SUPERSEDED IN v4.1.1** | `/` всегда владел локальным generic geo intent | v4.1.0 вводил смену owner; v4.1.1: `недвижимость {город}` всегда `/{geo}/`, agency/brand всегда `/` | Историческая строка; cutover интента отменён |
| Development slug | имя ЖК по умолчанию дополнялось geo-suffix | `zhk-{name}`, для КП `kp-{name}`, city suffix только при коллизии entity↔entity | Чистые глобальные entity URL |
| Developments | единый entity + lifecycle | tiers A/B/C, availability, completeness, stale-price policy | Реальный разный уровень наполнения 80–100 ЖК |
| Data ingestion | feed-first | идемпотентный Excel import ЖК до template | Быстрый контролируемый старт без зависимости от фидов |
| Newbuild units | обычный property lifecycle | `market=newbuild` detail = `noindex,follow`, вне sitemap | Индексируем ЖК, а не дублирующие карточки лотов |
| Infrastructure | Managed PG + S3 как target | сначала topology decision; Managed PG/S3 — owner-approved client option | Соответствие `CLONE_ONBOARDING.md` |
| v4.0.1 metadata patch | Master Plan — canonical metadata/Gate source | сохранено; шаблоны параметризованы через city/site-settings data | Убрать hardcoded Ростов/бренд из platform templates |

---

# 0. НАЗНАЧЕНИЕ [PROJECT]

Этот документ — полный исполняемый Master Plan для сборки `souz-home.ru` на базе актуального AMS Realty Baza Starter. Он полностью заменяет v3.1, v4.0, v4.0.1 и v4.1.0 как execution source. v4.1.0 архивируется как historical document со статусом `SUPERSEDED BY v4.1.1`.

## 0.1. Архитектурное кредо [PLATFORM]

Главная задача платформенной части v4.1.1:

```text
сохранить Core starter
→ построить универсальную geo-first category platform
→ разрешить опубликованный geo root без конфликта с reserved root
→ оставить entity URL глобальными и стабильными
→ подготовить data/schema для следующих категорий без публичного включения
→ сначала зафиксировать SEO/URL/data contracts
→ затем backend/contracts/gateway
→ затем UI/routes/content
→ только после gates выпускать индексируемые страницы
```

Ключевой доменный принцип:

```text
GLOBAL INDEXING
×
SITE GRAMMAR
×
CATEGORY STATUS
×
GEO CATEGORY STATUS
×
MARKET STATUS
×
ROUTE REGISTRY
×
ENTITY / DISTRICT / FACET
×
CONTENT GATE
×
LIFECYCLE
```

Geo root **разрешён** только для опубликованного города и всегда проходит root namespace resolver. Reserved root имеет приоритет над geo. Primary geo hub — стабильная SEO-поверхность: `/{primaryGeo}/` отдаёт `200` и получает robots/indexability только из registry + Gate в обоих режимах. В `SINGLE_GEO` другие geo hubs не активируются и возвращают `404`; в `MULTI_GEO` опубликованные ACTIVE geo hubs могут отдавать `200`.

Entity URL (`ЖК`, property, developer) остаются глобальными и не меняются при включении нового города.

## 0.2. Проектный scope «Союза застройщиков» [PROJECT]

R1:

```text
primaryGeo = rostov-na-donu
geoMode = SINGLE_GEO
ACTIVE project surfaces = novostroyki + kvartiry + developers + service/trust/legal
first MULTI_GEO activation candidate = bataysk
```

В v4.1.1 строго разделяются:

- **[PLATFORM] starter/platform capability** — grammar, resolver, guards, Payload/Gateway/DTO, geo model, developments/developers, property taxonomy, tier mechanism, SEO registry engine, Content Gate engine, lifecycle, sitemaps/robots/IndexNow, Excel import;
- **[PROJECT] project config/data** — `SINGLE_GEO`, primaryGeo, `geoCategoryStatus`, `marketStatus`, конкретные районы/ЖК, semantic snapshot, project thresholds/overrides, NAP, legacy decisions, enabled routes, source-rights attestations and public-attribution policy.

Platform layer задаёт типы и механизмы. Project layer задаёт market/geo activation, `seoTiers`, семантические пороги и effective Content Gate values/overrides через typed config/registry без изменения URL grammar или Core boundaries.

---

# 1. АРХИТЕКТУРНЫЕ ИНВАРИАНТЫ [PLATFORM]

## 1.1. Сохраняется из starter/Core без переизобретения [PLATFORM]

- Payload CMS — единственный owner application schema;
- PostgreSQL через Payload adapter; второй ORM/backend/auth запрещён;
- Public UI получает данные только через Public Gateway и DTO;
- `overrideAccess:true` разрешён только именованным System Gateway operations;
- ingest mutations идут через Ingest Gateway / approved SQL boundaries;
- public lead intake остаётся `POST /api/public/leads`;
- feed sources, import runs/issues, jobs, transactional lead outbox, redirects и lifecycle переиспользуются;
- `packages/contracts` и `packages/ui` остаются архитектурной границей;
- Core/security/UI guards не обходятся локальными project hacks;
- schema changes — только migrations;
- production — только explicit owner command.

## 1.2. Current imported baseline [PLATFORM]

The clone/import phase is complete. Execution uses the exact current repository, not the historical pre-clone candidate:

```text
SourceCraft repo: integrator-p/soyuz-rostov-next
Starter provenance: docs/CLONE_PROVENANCE.md
Node: >=24.21.0 <25
pnpm: 11.28.2
Next.js: 16.3.8
React: 19.2.8
Payload: 3.90.2
```

`package.json`, `pnpm-lock.yaml`, `Dockerfile` and current provenance files are the factual **installed** version owners. The old `ca1b884d...` / Payload `3.90.1` values remain historical input only.

Owner policy for this client is stricter than merely preserving the imported lock: R1 must use the latest compatible stable stack at the exact uplift/check date. `latest` means stable registry/vendor release only; canary, beta, RC, experimental and prerelease tags are forbidden.

## 1.2.1. Latest-stable compatibility gate — owner decision v4 [PROJECT]

Official-source snapshot checked `2026-10-01`:

| Component | Installed/current repo | Latest stable snapshot | Plan decision |
|---|---:|---:|---|
| Node.js | image `24.21.0`; engine `>=24.21.0 <25` | `24.21.0` on the selected Node 24 LTS line | keep exact image; local/build agents must match |
| pnpm | `11.28.2` | `12.8.1` | upgrade with lockfile/corepack proof |
| Next.js | `16.3.8` | `16.3.8` | already current |
| React / React DOM | `19.2.8` | `19.3.0` | upgrade together |
| Payload / adapters | `3.90.2` | `3.90.2` | already current; all Payload packages remain exact-line aligned |
| TypeScript | lock `5.9.3` | `7.0.2` | major compatibility migration; no bypass of type failures |
| Tailwind CSS / PostCSS adapter | lock `4.3.3` | `4.3.3` | already current |
| PostgreSQL | managed service version must be queried without exposing credentials | `18.6` | require Timeweb availability/compatibility preflight before migrations |

Compatibility evidence already established from official npm metadata:

- Next `16.3.8` accepts React/React DOM `^19.0.0`;
- `@payloadcms/next@3.90.2` accepts Next `>=16.3.3 <17`;
- `@payloadcms/ui@3.90.2` accepts React/React DOM `^19.2.1`, which includes `19.3.0`;
- TypeScript `7`, pnpm `12`, `undici` `8` and any other major direct-dependency uplift remain unproven until the implementation task runs the full targeted checks.

Authoritative current-version sources:

```text
https://registry.npmjs.org/<package>
https://nodejs.org/en/about/previous-releases
https://www.postgresql.org/docs/current/release.html
```

EPIC-01 is reopened only for this bounded stack-currency task. At task start it must re-query every direct dependency and runtime component because registry state can change after this plan snapshot. Apply the smallest coherent upgrade set, update package/lock/Docker/tooling references together, read bundled Next docs for changed APIs, and record official compatibility evidence. If latest stable is not mutually compatible or Timeweb cannot provide the required PostgreSQL line, stop that uplift path and raise an owner decision; do not silently retain a stale version or switch provider.

## 1.3. Imported capability acceptance [PLATFORM]

The current starter snapshot already implements the platform mechanisms that the incoming plan described as future work:

1. Unified `developments`/developers schema, normalized geo/property relations and migrations already exist. EPIC-08/09/10 must close client seed/evidence gaps, not recreate collections or migration history.
2. Contracts, DTO, Public Gateway, URL grammar, resolver, Content Gate, lifecycle, discovery, cache/jobs and Excel import owners already exist. EPIC-11/12/14/27/32/35 are acceptance/regression boundaries.
3. `packages/contracts` remains frozen through the existing diff/lock/freeze workflow; only a proven client gap may change it.
4. Legacy `/obekty/{slug}` handling exists as profile-owned migration/lifecycle capability, but real project rows depend on EPIC-03/28 evidence.
5. Lead backend canonical kind is currently `development_price`; presentation kind `development` maps to it. EPIC-31 must add published-development authority and real product/channel proof, not a second lead backend.
6. Reusable code ownership is `src/core/** + packages/**`; project composition is `src/project/**`. Creating `src/platform/**` is forbidden without a new approved ADR.

---

# 2. PRODUCT RELEASE MODEL [PLATFORM]

## 2.1. Category / geo / market statuses [PLATFORM]

Статусы платформы используют единый enum:

```text
ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT
```

`NOINDEX_AUTO` означает: локальный каталог существует при `≥1` активном объекте, отдаёт `200 noindex,follow`, находится вне sitemap/меню; входящие ссылки допускаются только со страниц сущностей этого geo. В R1 «Союз застройщиков» `NOINDEX_AUTO` не использует.

### `categoryStatus` — platform capability [PLATFORM]

`categoryStatus` отвечает на вопрос: **поддерживает ли платформа категорию как публичную capability вообще**. Тип статуса единый: `ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT`.

#### Souz R1 category capability values [PROJECT]

```text
novostroyki = ACTIVE
kvartiry = ACTIVE

doma = PREPARED_OFF
uchastki = PREPARED_OFF
kommercheskaya-nedvizhimost = PREPARED_OFF
kottedzhnye-poselki = PREPARED_OFF

arenda = OUT
```

`PREPARED_OFF`:

- Payload schema существует;
- Zod/schema validation существует;
- DTO/domain discrimination существует;
- feed mapping существует;
- migrations/tests существуют;
- public routes disabled;
- отсутствует в sitemap/navigation/internal linking;
- не создаётся контент ради заполнения пустой архитектуры.

`OUT`:

```text
/arenda/** → 404
/sdat/ → 404
```

Исключение: proven legacy URL может получить explicit same-intent `301`.

### `marketCapability` — global entity capability [PLATFORM]

`marketCapability` управляет тем, может ли property market существовать как глобальная entity surface независимо от локального city catalog.

Canonical markets:

```text
newbuild
secondary
```

Souz R1 [PROJECT]:

```text
marketCapability:
  newbuild = ACTIVE
  secondary = ACTIVE
```

### `geoCategoryStatus` — project local catalog matrix [PROJECT]

Определяет, какая глобально поддерживаемая категория включена в конкретном geo. Использует тот же enum `ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT`.

R1:

```text
rostov-na-donu:
  novostroyki = ACTIVE
  kvartiry = ACTIVE

bataysk:
  novostroyki = PREPARED_OFF
  kvartiry = PREPARED_OFF

aksay:
  novostroyki = PREPARED_OFF
  kvartiry = PREPARED_OFF
```

`geoCategoryStatus` никогда не может активировать категорию, если глобальный `categoryStatus != ACTIVE`.

Пример будущего MULTI_GEO: Батайск может включить только `kvartiry`, оставив `novostroyki` выключенной.

### `marketStatus` — project local listing matrix [PROJECT]

Определяет, какие markets участвуют в локальных каталогах/фасетах конкретного geo. Использует единый enum `ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT`.

R1:

```text
rostov-na-donu:
  newbuild = ACTIVE
  secondary = ACTIVE

bataysk:
  newbuild = PREPARED_OFF
  secondary = PREPARED_OFF

aksay:
  newbuild = PREPARED_OFF
  secondary = PREPARED_OFF
```

### Entity publication vs local catalog [PLATFORM]

```text
ENTITY (глобальный URL):
  /kvartiry/{slug}-{id}/, /novostroyki/zhk-{slug}/, /zastroyshchiki/{slug}/
  существует, если categoryStatus[category]=ACTIVE
               AND marketCapability[market]=ACTIVE
               AND lifecycle разрешает
  индексация: Gate §16.1 (secondary) / D-10 (newbuild) / development Gate

LOCAL CATALOG (/{geo}/...):
  существует, если categoryStatus=ACTIVE
               AND geo опубликован
               AND geoCategoryStatus[geo][category]=ACTIVE
  marketStatus[geo][market] решает, попадают ли объекты этого рынка
  в листинги и фасеты города (например /{geo}/kvartiry/vtorichka/)
```

Для developer entity применяется тот же принцип глобальной сущности: локальный developer hub города не является prerequisite для существования `/zastroyshchiki/{slug}/`; индексируемость entity определяется developer Gate §11/§16.1 и lifecycle/publication.

`NOINDEX_AUTO` является platform capability для локальных каталогов и не используется в Souz R1 config.

Включение PREPARED_OFF category/geo/market всегда выполняется owner-approved config/registry change с обязательными Gate/sitemap/navigation/tests.

---

## 2.2. House construction service [PROJECT]

Owner decision v3: `/stroitelstvo-domov/` is outside R1 and is not an active service route.

- default R1 behavior = `404`;
- EPIC-03 may assign an exact one-hop `301` only if legacy evidence identifies a real same-intent target;
- generic redirect to `/` or an unrelated property category is forbidden;
- future activation requires a separate owner decision plus service/content/intent evidence.

`doma` as a property category remains `PREPARED_OFF` until R3.

---

# 3. UNIVERSAL URL GRAMMAR [PLATFORM]

## 3.1. Canonical grammar [PLATFORM]

Максимум **3 path segments** после domain:

```text
/                                      # главная

/{geo}/                                # geo hub
/{geo}/{category}/                     # city/category catalog
/{geo}/{category}/{sub}/               # district | facet | metro-{slug}
/{geo}/zastroyshchiki/                 # city developers hub

/{category}/                           # global category root
/novostroyki/zhk-{slug}/               # global development entity
/kottedzhnye-poselki/kp-{slug}/        # future global entity
/kvartiry/{semantic}-{publicUrlId}/    # global property entity
/zastroyshchiki/                       # global developer root
/zastroyshchiki/{slug}/                # global developer entity

/ipoteka/
/prodat/
/o-kompanii/
/otzyvy/
/kontakty/
/journal/**
/legal/**
```

Город присутствует в URL локальных hub/catalog/subpage, но **не входит в URL entity**. Поэтому ЖК, property и developer не «переезжают» при `SINGLE_GEO → MULTI_GEO`.

## 3.2. SINGLE_GEO / MULTI_GEO route behavior [PLATFORM]

| Поверхность | `SINGLE_GEO` | `MULTI_GEO` |
|---|---|---|
| `/{primaryGeo}/` | `200`, кандидат в индекс (registry + Gate) | `200`, кандидат в индекс |
| `/{otherGeo}/` | `404` | опубликован и ACTIVE → `200` |
| `/{category}/`, `/zastroyshchiki/` | `200 noindex,follow`, self-canonical | robots/indexability решает registry |
| geo-switcher | скрыт | виден |
| Хлебные крошки локального каталога | `Главная › {cityName} › {Category}` | так же |
| `недвижимость {город}` | `/{geo}/` | `/{geo}/` |
| `агентство недвижимости {город}`, бренд, риелтор | `/` | `/` |

Primary geo hub не меняет HTTP/intent ownership при `SINGLE_GEO → MULTI_GEO`. ADR-SINGLE-GEO-MODE фиксирует стабильное разделение: generic city realty intent принадлежит `/{geo}/`, agency/brand intent — `/`.

## 3.3. Geo × category [PLATFORM]

Canonical examples:

```text
/rostov-na-donu/novostroyki/
/rostov-na-donu/kvartiry/
/bataysk/kvartiry/
```

Geo может быть registry-approved city/region/municipal district согласно project policy, но R1 public city hubs ограничены проектным registry.

Geo route существует только если effective status проходит §2.1.

## 3.4. Third segment [PLATFORM]

```text
/{geo}/{category}/{district}/
/{geo}/{category}/{facet}/
/{geo}/{category}/metro-{slug}/
```

R1 examples:

```text
/rostov-na-donu/kvartiry/severnyy/
/rostov-na-donu/kvartiry/vtorichka/
```

R2 example:

```text
/rostov-na-donu/novostroyki/sdannye/
```

Запрещено:

```text
district × facet path
facet × facet path
arbitrary CMS-created sub slug
≥4 segments
```

Комбинации остаются query filters и `noindex,follow`.

## 3.5. Global entities [PLATFORM]

```text
/novostroyki/zhk-veresaevo/
/kvartiry/centr-2-komnatnaya-1042/
/zastroyshchiki/pik/
```

Future:

```text
/kottedzhnye-poselki/kp-{slug}/
```

Entity route не содержит geo. Реальный город хранится в данных и используется в metadata/breadcrumb/context.

## 3.6. Root namespace rule [PLATFORM]

Root может принадлежать только:

1. вычисленному reserved category/service/platform namespace;
2. опубликованному geo slug;
3. иначе request = `404`.

Resolver precedence:

```text
reserved root
→ published geo
→ 404
```

`reservedRoot` **вычисляется**, а не поддерживается вручную:

```text
reservedRoot = platformReserved
             ∪ categorySlugs(все статусы, включая PREPARED_OFF/OUT)
             ∪ projectStaticSlugs

platformReserved = admin, api, media, _next, robots.txt, sitemap*, search, poisk, legal, journal
projectStaticSlugs = slugs зарегистрированных статических маршрутов проекта
```

Текущий Souz example [PROJECT]:

```text
categorySlugs:
  novostroyki
  kvartiry
  doma
  uchastki
  kommercheskaya-nedvizhimost
  kottedzhnye-poselki
  arenda

projectStaticSlugs:
  zastroyshchiki
  ipoteka
  prodat
  o-kompanii
  otzyvy
  kontakty
  analitika
  sotrudniki
  stroitelstvo-domov   # only if registered by project route decision
```

Guard падает, если:

- slug города входит в `reservedRoot`;
- slug застройщика входит в `reservedRoot`;
- статический маршрут проекта существует, но не зарегистрирован в `projectStaticSlugs`;
- category slug отсутствует в `categorySlugs`, хотя capability зарегистрирована.

## 3.7. Canonical URL builder / parser [PLATFORM]

```text
src/core/routing/url-grammar.ts + src/project/url-grammar.ts:
  buildUrl(pageKey) → string
  parseUrl(path)    → pageKey | null

Единственный источник путей для:
  меню
  карточек
  breadcrumbs
  canonical
  sitemap
  IndexNow
  JSON-LD
  писем лидов
  redirect targets

Свойство:
  parseUrl(buildUrl(k)) ≡ k
  для всех типов pageKey
```

Ни route UI, ни SEO registry, ни sitemap/cache/lead integration не собирают canonical paths самостоятельно.

---

# 4. SITE GRAMMAR CONFIG [PLATFORM]

Платформенная логика читает code-owned typed config/registry и не выводит архитектуру из количества CMS-записей. Все URL материализуются через §3.7 `buildUrl`.

Canonical platform shape:

```ts
type PublicationStatus = "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT"

siteGrammar = {
  geoMode: "SINGLE_GEO" | "MULTI_GEO",
  primaryGeo: "<project-geo-slug>",

  geoLevels: ["region", "city", "municipal_district"],

  categoryStatus: {
    "<category>": "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
  },

  marketCapability: {
    newbuild: "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
    secondary: "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
  },

  geoCategoryStatus: {
    "<geo>": {
      "<category>": "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
    },
  },

  marketStatus: {
    "<geo>": {
      newbuild: "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
      secondary: "ACTIVE" | "NOINDEX_AUTO" | "PREPARED_OFF" | "OUT",
    },
  },

  entityPrefixes: {
    residentialComplex: "zhk-",
    cottageVillage: "kp-",
  },

  facetWhitelist: { /* typed registry */ },
  projectStaticSlugs: [/* registered project static routes */],
}
```

`reservedRoot` вычисляется по §3.6. `categoryStatus` и `marketCapability` управляют global capability/entity publication; `geoCategoryStatus` и `marketStatus` — local catalog/listing activation.

`NOINDEX_AUTO`: local catalog существует при `≥1` active entity, отдаёт `200 noindex,follow`, вне sitemap/меню; inbound links только со страниц сущностей этого geo. Souz R1 этот статус не использует.

`SINGLE_GEO → MULTI_GEO` изменяется только owner-approved configuration/registry change. Platform behavior обоих режимов обязано быть доказано уже в R0 fixtures (§28 / EPIC-13/14).

## 4.1. SINGLE_GEO behavior [PLATFORM]

```text
/{primaryGeo}/ → 200, registry outcome
global category roots → 200 noindex,follow
geo-switcher → hidden
breadcrumbs → Главная › {City} › {Category}
generic geo intent owner → /{geo}/
brand/agency intent owner → /
```

`/{otherGeo}/` и его local catalogs в SINGLE_GEO возвращают `404`, если они не активированы отдельным platform status contract (`NOINDEX_AUTO` не используется Союзом R1). Global entities из такого geo при этом могут существовать по §2.1.

## 4.2. MULTI_GEO behavior [PLATFORM]

Отличия от SINGLE_GEO:

```text
geo-switcher → visible
global category roots → robots/indexability решает registry
опубликованные ACTIVE geo hubs кроме primary → 200 registry outcome
service geo strategy → OQ-14 / отдельный ADR
```

Primary geo hub, breadcrumbs и intent ownership не меняются при switch режима.

## 4.3. Agglomeration / nearby-city model [PLATFORM]

`City` содержит nullable relation:

```text
agglomerationOf → City
```

Rules:

- relation не может ссылаться на саму себя;
- cycles запрещены guard/validation;
- nearby block для city hub строится только по `city.agglomerationOf = currentCity`;
- объекты/ЖК nearby-city не входят в `{N}` текущего города;
- entity metadata всегда использует реальный city entity;
- связь не активирует geo hub/category route автоматически.

## 4.4. Souz R1 project config [PROJECT]

```text
geoMode = SINGLE_GEO
primaryGeo = rostov-na-donu
first MULTI_GEO activation candidate = bataysk

categoryStatus:
  novostroyki = ACTIVE
  kvartiry = ACTIVE
  doma = PREPARED_OFF
  uchastki = PREPARED_OFF
  kommercheskaya-nedvizhimost = PREPARED_OFF
  kottedzhnye-poselki = PREPARED_OFF
  arenda = OUT

marketCapability:
  newbuild = ACTIVE
  secondary = ACTIVE

geoCategoryStatus:
  rostov-na-donu:
    novostroyki = ACTIVE
    kvartiry = ACTIVE
  bataysk:
    novostroyki = PREPARED_OFF
    kvartiry = PREPARED_OFF
  aksay:
    novostroyki = PREPARED_OFF
    kvartiry = PREPARED_OFF

marketStatus:
  rostov-na-donu:
    newbuild = ACTIVE
    secondary = ACTIVE
  bataysk:
    newbuild = PREPARED_OFF
    secondary = PREPARED_OFF
  aksay:
    newbuild = PREPARED_OFF
    secondary = PREPARED_OFF

Bataysk.agglomerationOf = rostov-na-donu
Aksay.agglomerationOf = rostov-na-donu
```

Вторичка, ЖК и лоты Батайска/Аксая в R1:

- доступны по глобальному entity URL, если `categoryStatus + marketCapability + lifecycle` разрешают, и индексируются по своему Gate/D-10/development Gate;
- не входят в счётчики и local listings Ростова;
- на страницах Ростова видны только в блоке «Рядом с Ростовом» по `agglomerationOf`;
- не активируют `/bataysk/`, `/aksay/` или их local catalog URLs.

Breadcrumb entity из неактивного города:

```text
Главная › {Category root} › {entity}
```

Реальный город выводится текстом без ссылки. Ссылок на `404` geo hub/category быть не должно.

---

# 5. INTENT OWNERSHIP / SEMANTIC SNAPSHOT [PROJECT]

Источник чисел в v4.1.1: semantic snapshot `2026-09-23`, метрика решений — `broad39`.

Intent ownership стабилен между `SINGLE_GEO` и `MULTI_GEO`:

```text
"недвижимость {город}" → /{geo}/
"агентство недвижимости {город}" / brand / realtor intent → /
```

| Intent | broad39 | Owner URL / status |
|---|---:|---|
| `жк ростов` | 50 798 | `/rostov-na-donu/novostroyki/` |
| `новостройки ростов` | 4 066 | `/rostov-na-donu/novostroyki/` |
| `купить квартиру ростов` | 27 964 | `/rostov-na-donu/kvartiry/` — вся продажа квартир |
| `вторичка ростов` | 3 963 | `/rostov-na-donu/kvartiry/vtorichka/` |
| `квартира вторичка ростов` | 3 012 | тот же secondary intent |
| `купить квартиру ростов район` | 1 717 | блок «Квартиры по районам» на city page; district URLs только registry-approved |
| `ипотека ростов` | 3 164 | `/ipoteka/` |
| `агентство недвижимости ростов` | 2 825 | `/` |
| `недвижимость ростов` | measure in EPIC-04 | `/rostov-na-donu/` |
| `купить дом ростов` | 14 061 | `PREPARED_OFF`; R3 candidate |
| `купить квартиру батайск` | 4 043 | R3 MULTI_GEO candidate |

Developer intent:

```text
застройщики ростов
→ /rostov-na-donu/zastroyshchiki/
```

Запрещено:

```text
/rostov-na-donu/kvartiry/novostroyki/
```

Newbuild intent принадлежит `novostroyki`, несмотря на то что конкретные apartment units хранятся в `properties`.

## 5.1. Newbuild unit indexing rule — D-10 [PLATFORM]

```text
property.market = newbuild
→ public detail may exist under /kvartiry/{entity}/
→ noindex,follow
→ self-canonical
→ вне sitemap
```

Индексируемым owner intent является development page ЖК.

Secondary property:

```text
property.market = secondary
→ lifecycle + Content Gate
→ candidate index
```

---

---

# 6. NAMESPACE RESOLUTION [PLATFORM]

## 6.1. Root resolver [PLATFORM]

For:

```text
/{x}/
```

Resolver:

```text
1. x matches computed reservedRoot → reserved handler
2. x matches published/registry-known geo slug:
   - x = primaryGeo → 200 registry outcome in SINGLE and MULTI
   - x != primaryGeo + SINGLE_GEO → 404
   - x != primaryGeo + MULTI_GEO + geo ACTIVE/published → 200 registry outcome
3. otherwise → 404
```

`reservedRoot` always wins over geo. No mode causes primary geo hub to redirect to `/`.

## 6.2. Geo second segment resolver [PLATFORM]

For:

```text
/{geo}/{x}/
```

Resolver:

```text
1. geo must resolve as published/allowed geo
2. x = ACTIVE category in geoCategoryStatus → category geo route
3. x = zastroyshchiki and developer surface enabled for geo → developer geo route
4. otherwise → 404
```

A global `categoryStatus != ACTIVE` always blocks a geo category even if project config is invalidly set ACTIVE.

## 6.3. Geo third segment resolver [PLATFORM]

For:

```text
/{geo}/{category}/{x}/
```

Resolver:

```text
1. geo resolves
2. category passes categoryStatus + geoCategoryStatus
3. x matches district registry of this geo/category
4. x matches facet whitelist registry
5. x matches metro-{slug} if enabled
6. otherwise → 404
```

District and facet share the third-segment namespace; `district ↔ facet` collision is merge-blocking.

`≥4` path segments for geo/category grammar → `404`.

## 6.4. Global category entity resolver [PLATFORM]

For:

```text
/{category}/{x}/
```

Resolver applies only to global entity grammar:

```text
novostroyki:
  zhk-* → residential development

kottedzhnye-poselki:
  kp-* → cottage-village development when category ACTIVE

kvartiry:
  *-{publicUrlId} → property

otherwise → 404
```

District/facet/geo never resolve in this namespace.

## 6.5. Developer namespace [PLATFORM]

For:

```text
/zastroyshchiki/{x}/
```

Resolver:

```text
1. x matches developer slug
2. otherwise → 404
```

Geo developer hub lives only at:

```text
/{geo}/zastroyshchiki/
```

## 6.6. Development slugs [PLATFORM]

```text
zhk-{name}
kp-{name}
```

City suffix is added **only** when a real same-name global entity collision exists:

```text
zhk-estet
zhk-estet-krasnodar   # only if collision contract requires disambiguation
```

City remains mandatory in structured entity context/metadata, not in URL by default.

ЖК ↔ district homonym is **not a URL namespace collision** in v4.1.1 because:

```text
ЖК:      /novostroyki/zhk-{slug}/
район:   /{geo}/kvartiry/{district}/
```

Такая пара остаётся только semantic intent collision и фиксируется в `docs/seo/collisions.csv`.

## 6.7. Property slugs [PLATFORM]

```text
{semantic-part}-{publicUrlId}
```

`publicUrlId`:

- numeric;
- stable;
- public;
- immutable after publish;
- не обязан совпадать с Payload/PostgreSQL id.

## 6.8. Transliteration standard [PLATFORM]

ADR-SLUG-NAMESPACE фиксирует один code-owned transliteration helper + lint.

Default platform convention:

```text
й → y
ё → e
ж → zh
х → kh
ц → ts
ч → ch
ш → sh
щ → shch
ы → y
ь/ъ → omitted
```

Canonical examples:

```text
застройщики → zastroyshchiki
отзывы → otzyvy
семейная → semeynaya
```

Proven legacy spelling сохраняется через explicit KEEP/301 migration contract.

## 6.9. CI collision / grammar guards [PLATFORM]

Merge-blocking namespace checks:

```text
geo ↔ geo
geo ↔ reservedRoot
geo ↔ category
entity ↔ entity
publicUrlId duplicate
district ↔ district within city
district ↔ facet within geo/category
developer ↔ reservedRoot
facet ↔ reserved sub
prefix grammar violations
duplicate canonical
transliteration lint
agglomeration self-reference / cycle
path depth > 3 for canonical platform grammar
```

Mandatory grammar/source proofs use the existing repository owners and scripts:

```text
pnpm verify:url-grammar
  — PageKey/buildUrl/parseUrl roundtrip and invalid grammar matrix

pnpm quality:architecture
pnpm quality:guards
pnpm verify:copy-ownership
  — project -> core/packages dependency direction and no client literals/copy in reusable owners

pnpm seo:registry:check
  — every docs/seo/SEO_REGISTRY_SEED.csv URL must match the project URL builder
```

If these existing checks do not cover a proven literal-path defect, extend the current architecture guard; do not create a parallel guard or `src/platform/**` tree.

Removed as URL collision classes:

```text
geo ↔ entity grammar
ЖК ↔ district
developer ↔ geo
```

Они живут в разных namespace positions. Semantic homonym/conflict продолжает фиксироваться в `docs/seo/collisions.csv`, где это влияет на intent ownership.

---

# 7. TRAILING SLASH CONTRACT [PLATFORM]

Project target:

```ts
trailingSlash: true
```

Canonical URL always ends with `/`. Framework slash normalization и legacy migration — разные механизмы:

```text
/rostov-na-donu/novostroyki
→ 308 → /rostov-na-donu/novostroyki/

/kvartiry-rostova
→ 301 → /rostov-na-donu/kvartiry/
   (один hop, без 308 перед 301)

/novostroyki/rostov-na-donu/
→ 404
   (category-first grammar не существует)
```

Requirements:

- one framework normalization redirect max;
- legacy URL registry resolves directly to normalized canonical target;
- no `308 → 301` chain;
- SEO migration redirects remain explicit `301`;
- category-first paths are invalid grammar and return `404`, unless an exact proven legacy URL has a separate explicit migration decision;
- Payload Admin/API regression proof mandatory;
- cache/sitemap/canonical/redirect registries use normalized trailing-slash form generated by `buildUrl`.

---

# 8. TARGET PAYLOAD MODEL [PLATFORM]

## 8.1. Reuse [PLATFORM]

```text
users
pages
properties
feed-sources
import-runs
import-issues
leads
lead-deliveries
media
redirects
Payload Jobs
```

## 8.2. Imported model acceptance and R1 deltas [PLATFORM]

Already present in the imported repository and not schema-creation tasks:

```text
site-settings       # Global
regions
cities
districts
developers
developments
```

R1 decisions:

- SEO Registry is code/CSV-owned by `docs/seo/SEO_REGISTRY_SEED.csv` plus its append-only approval journal; no Payload Registry collection is added.
- Development Excel history reuses existing `import-runs` / `import-issues` with a typed source kind; no parallel `excel-import-runs` collection is added unless the §33 OQ-12 proven-gap rule later fires.
- `posts` is future EPIC-30 only and is not added/activated in R1.

No duplicate backend or competing source of truth.

## 8.3. Unified development entity [PLATFORM]

```text
developments.kind:
- residential_complex
- cottage_village
```

This intentionally deviates from current disabled novostroyki manifest expecting `residential-complexes`. EPIC-05 updates the manifest/guard before module activation; ADR documents the deviation.

---

# 9. GEO MODEL / DISTRICTS [PLATFORM]

## 9.1. Region [PLATFORM]

Fields:

```text
name
slug
status
sortOrder
seo?
coordinates?
mapBounds?
isPublished
publishedAt?
```

## 9.2. City [PLATFORM]

Fields:

```text
name
slug
nameGenitive
nameLocative
preposition: в | на
type: city | town | settlement | resort_area
region
agglomerationOf? → City
status
sortOrder
seo?
coordinates?
mapBounds?
isPublished
publishedAt?
```

Morphology contract:

- `name` — nominative: `Ростов-на-Дону`;
- `nameGenitive` — genitive: `Ростова-на-Дону`;
- `nameLocative` — locative/prepositional form without preposition: `Ростове-на-Дону`;
- `preposition` — normalized `в | на`;
- все три morphology values owner-approved before metadata freeze;
- template composition never guesses Russian case.

Agglomeration contract:

- nullable `agglomerationOf`;
- self-reference forbidden;
- cycles forbidden;
- used for deterministic nearby-city blocks/count exclusion;
- relation does not activate any public geo route.

## 9.2.1. Souz initial cities [PROJECT]

Initial:

```text
Ростовская область
Ростов-на-Дону
```

Батайск и Аксай добавляются как реальные geo entities, когда нужны для development data.

R1 relation:

```text
Bataysk.agglomerationOf = Rostov-na-Donu
Aksay.agglomerationOf = Rostov-na-Donu
```

Добавление city record само по себе не включает MULTI_GEO public hub/catalog.

---

## 9.3. District [PLATFORM]

Fields:

```text
name
slug
city
type: admin_district | microdistrict
parent?
synonyms[]
nameLocative
preposition: в | на
sortOrder
seo?
isPublished
publishedAt?
```

`district.slug` unique within city.

`districts.parent`:

- nullable for `type=microdistrict`;
- URL district page never depends on `parent`;
- if parent is not confirmed, store `parent=null`;
- a microdistrict crossing several administrative districts, e.g. Центр, keeps `parent=null`;
- breadcrumbs omit parent when it is null.

Source preservation:

```text
property.districtRaw      # import/source text
property.district         # normalized relationship

development.districtRaw? # if source requires
 development.district     # normalized relationship
```

Synonym normalization example:

```text
СЖМ → severnyy
ЗЖМ → zapadnyy
Левенцовский → leventsovka
ЖДР → zheleznodorozhnyy
```

## 9.4. District seed R1 [PROJECT]

Seed and normalize with verified parent relationships; unconfirmed/cross-district microdistricts keep `parent=null`:

**8 administrative districts:** Ворошиловский, Железнодорожный, Кировский, Ленинский, Октябрьский, Первомайский, Пролетарский, Советский.

**Microdistrict/locality layer:** Северный, Западный, Центр, Суворовский, Левенцовка, Темерник, Сельмаш, Александровка, Вересаево, Красный Аксай, Платовский, Нахичевань, Военвед, Левый берег, Стройгородок, Чкаловский, Каменка.

Падежи (`nameLocative`) и предлог owner approves before public metadata freeze.

## 9.5. Public apartment district pages — R1 [PROJECT]

Canonical:

```text
/rostov-na-donu/kvartiry/{district}/
```

### P1 [PLATFORM]

| District | broad39 |
|---|---:|
| Северный | 962 |
| Центр | 851 |
| Суворовский | 731 |
| Западный | 714 |

### P2 — publish only with ≥5 matching active properties [PLATFORM]

```text
Левенцовка
Кировский
Ворошиловский
Темерник
Первомайский
Сельмаш
Советский
Ленинский
Александровка
Вересаево
Красный Аксай
Пролетарский
Платовский
Железнодорожный
Нахичевань
Октябрьский
Военвед
```

### TEST — ≥10 matching active properties [PLATFORM]

```text
Стройгородок
Чкаловский
```

### Filter only — no public path [PLATFORM]

```text
Змиевка
Берберовка
Ленгородок
Каменка
```

## 9.6. Novostroyki × district — R2 [PROJECT]

Create only if all pass:

```text
broad39 "новостройки {район}" >= 100
AND developments in inventory >= 3
AND no ЖК ↔ district intent collision
AND Content Gate pass
```

Administrative district pages for novostroyki are not created from weak demand (snapshot range 8–68).

Collision ownership rule:

- in `/novostroyki/`, collision intent belongs to the ЖК development page;
- district novostroyki page is not created;
- in `/kvartiry/`, secondary district page may exist normally;
- contextual cross-links are allowed.

---

# 10. DEVELOPMENTS [PLATFORM]

Collection:

```text
developments
```

Core fields:

```text
name
slug
kind
region
city
district
districtRaw?
developer
status
publicationStatus
salesStatus
salesAvailability: in_inventory | confirmed | none
address
lat
lng
shortDescription?
description?
heroMedia?
gallery?
videoUrl?
externalIdentities[]
seoTitle
seoDescription?
seoH1
indexable
isPublished
publishedAt?
```

R1 additions:

```text
dataTier: A | B | C
dataSource
priceCheckedAt?
completenessScore        # computed
priceByRooms[]
lotsAvailable?
faq[]
```

Residential-complex conditional fields:

```text
class?
completionStatus?
deadline?
buildingsSummary?
constructionProgress?
```

Cottage-village conditional fields remain prepared in schema only:

```text
communications?
totalArea?
plotsCount?
villageClass?
```

## 10.1. Data tiers [PLATFORM]

### Tier A mechanism [PLATFORM]

Tier A is a data/completeness class, not an automatic indexing flag. Canonical numeric Gate requirements live only in §16.1. A Tier A development becomes an index candidate only when §16.1 passes. The `≈30` figure is a capacity guideline, not a publication commitment.

#### Souz R1 owner-prioritized intake set [PROJECT]

The following 24 developments are the owner-approved R1 priority set and Tier A **candidates**:

```text
Созвездие
Луна
Лайм
Придонье
Октябрь Парк
Донские легенды
Ботаника
Академия
Донской Арбат 2
Город у реки
Royal Towers
Суворовский
Малина-парк
Сезоны
Гринсайд
Локация 9-11
Звезда Столицы 2
Иловайский
Фрейм
Культура
1799
Эстет
Столицыно
Сияние
```

Source discovery starts from the owner-supplied Yandex Realty Rostov new-build catalog:

```text
https://realty.yandex.ru/rostov-na-donu/kupit/novostrojka/
```

Names with possible homonyms or spelling variants must be matched to the exact Yandex Realty development page by address, developer and city before a canonical slug is assigned. Priority does not bypass §16.1: if a record lacks required evidence/completeness, it remains a lower-tier/noindex record until the Gate passes.

Each priority development requires at least five distinct usable photos after deduplication and rights validation. The expected minimum intake is therefore `24 developments × 5 photos = 120 accepted photos`; more may be collected when useful. Binary media is never committed to Git and is never hotlinked from Yandex.

### Tier B mechanism [PLATFORM]

Tier B is a data/completeness class. Canonical numeric Gate requirements live only in §16.1. A Tier B development becomes an index candidate only when §16.1 passes. `Tier A + Tier B ≈60` is the cumulative capacity guideline, not `≈60` additional Tier B pages.

#### Souz Tier B candidates [PROJECT]

No additional fixed Tier B name list is approved for R1. Non-priority developments may enter B/C discovery only from an owner-provided Excel row or another verified source package; they do not block completion of the 24 priority records.

### Tier C mechanism [PLATFORM]

Minimum passport:

- developer;
- city;
- address;
- district or verified `districtRaw` when normalization is pending;
- class if known;
- deadline or completion status;
- sales status;
- coordinates;
- lead form «Узнать цены и наличие».

#### Souz R1 capacity guidance [PROJECT]

`Tier A ≈30`, `Tier A + B ≈60`, total A/B/C catalog `≈80–100` are capacity guidelines, not mandatory counts or release commitments.

Policy:

```text
200
noindex,follow
self-canonical
outside sitemap
```

Automatic C → B eligibility occurs only after confirmed price data and completeness requirements; registry recomputes Gate, no manual SEO guessing.

All A/B/C developments appear in catalog/map if published for discovery. Developments without valid prices sort after priced inventory unless user sort explicitly overrides.

## 10.2. Price freshness — D-14 [PLATFORM]

If:

```text
now - priceCheckedAt > 45 days
```

then:

- price is hidden from public UI;
- `AggregateOffer` removed from structured data;
- robots/indexability does **not** change solely because of stale price.

`priceCheckedAt` remains mandatory internal provenance and freshness input but is not rendered as a public «проверено/обновлено» date in R1.

## 10.3. Development lifecycle [PLATFORM]

`salesStatus`:

```text
on_sale
sales_finished
completed
```

Finished sales:

```text
200
indexable only if Content Gate remains passed
explicit "Продажи завершены"
related active developments
lead CTA
```

No `410` for development without explicit owner decision.

## 10.4. Modifiers [PLATFORM]

Demand modifiers become anchor sections on the development page, not separate URLs:

```text
цены
планировки
ход строительства
отзывы
```

---

# 11. DEVELOPERS [PLATFORM]

Collection:

```text
developers
```

Fields:

```text
name
slug
aliases[]
legalName?
logo?
description?
website?
status
seo?
isPublished
publishedAt?
```

Global and geo routes:

```text
/zastroyshchiki/                 # global root
/{geo}/zastroyshchiki/           # geo developer hub
/zastroyshchiki/{slug}/           # global developer entity
```

Mode behavior:

| Surface | SINGLE_GEO | MULTI_GEO |
|---|---|---|
| `/zastroyshchiki/` | `200 noindex,follow` | `200`, registry outcome |
| `/{primaryGeo}/zastroyshchiki/` | index candidate after Gate | index candidate after Gate |
| `/{otherGeo}/zastroyshchiki/` | `404` unless effective local status explicitly allows it | project matrix + Gate |
| `/zastroyshchiki/{slug}/` | global entity Gate | global entity Gate |

Developer Gate mechanism [PLATFORM], Souz effective values [PROJECT]:

```text
/{geo}/zastroyshchiki/
  inventory = число застройщиков с ≥1 опубликованным ЖК в geo
  min inventory = 5

/zastroyshchiki/{slug}/
  index candidate only if:
    ≥1 ЖК этого developer прошёл development Gate
    AND unique description ≥600 characters
    AND description has source + checkedAt provenance
  otherwise → 200 noindex,follow, outside sitemap

/zastroyshchiki/
  SINGLE_GEO → 200 noindex,follow
```

Developer entity не зависит от активности собственного geo hub. Для entity из неактивного geo breadcrumb не содержит ссылки на 404 geo hub (§4.4).

Demand metric for developer decisions:

```text
max(
  broad39 "{developer} жк",
  broad39 "застройщик {developer}"
)
```

Naked ambiguous brand names do not drive SEO decisions.

---

# 12. PROPERTY TAXONOMY [PLATFORM]

Keep one collection:

```text
properties
```

Core:

```text
market: newbuild | secondary
dealType: sale | rent
category: apartment | house | townhouse | land | commercial
```

Compatibility alternative by ADR remains allowed:

```text
category=house
houseType=house|cottage|townhouse
```

R1 public policy:

```text
category=apartment
 dealType=sale
→ ACTIVE

house/townhouse/land/commercial
→ schema/import/DTO prepared
→ public 404 until category ACTIVE

rent
→ retained in enum
→ public publication blocked
```

Relationships:

```text
region
city
district
development?
```

Raw compatibility during migration:

```text
regionRaw?
localityRaw?
districtRaw?
```

Apartment fields:

```text
rooms
totalArea
livingArea
kitchenArea
floor
floors
```

House family:

```text
totalArea
plotArea
floors
wallMaterial?
houseType?
```

Land:

```text
plotAreaSotka
landCategory?
permittedUse?
communications?
```

Commercial:

```text
commercialType: office | retail | warehouse | free_purpose | other
purpose?
totalArea
floor?
```

Newbuild apartment:

```text
category=apartment
market=newbuild
development=required when mapping known
```

Canonical detail remains under `/kvartiry/{property-slug}/`, but D-10 controls `noindex` for `market=newbuild`.

---

# 13. PUBLIC CONTRACTS / DTO [PLATFORM]

No raw Payload documents in UI.

Add/extend:

```text
RegionDTO
CityDTO
DistrictDTO
DeveloperDTO
DevelopmentCardDTO
DevelopmentDetailsDTO
ApartmentDTO
HouseDTO
LandDTO
CommercialDTO
SEORegistryEntryDTO or equivalent typed server contract
```

Property details use discriminated union.

Development DTO exposes only public facts and computed presentation values:

```text
dataTier
salesAvailability
priceFreshness
priceByRooms
lotsAvailable
completenessScore public projection if needed
updated/checked dates
```

Bounded counts required for:

- district pages;
- facet pages;
- development inventory;
- live Title/H1 facts.

Contract change workflow:

```text
contracts:diff
→ owner/project review
→ implementation
→ contracts:lock/freeze according to starter process
```

---

# 14. SLUG IMMUTABILITY / REDIRECTS [PLATFORM]

Published slugs immutable by default for:

```text
properties
developments
developers
districts
cities
regions
```

Explicit slug change operation:

```text
old canonical
→ create 301
→ new canonical
```

Checks:

```text
no loop
no chain
target canonical 200
old canonical removed from sitemap
```

Do not silently mutate published slug from feeds/import.

---

# 15. SEO FILTER CLASSES [PLATFORM]

## 15.1. Query filters [PLATFORM]

Examples:

```text
?priceFrom=
?priceTo=
?sort=
?page=
?rooms=
?district=
?view=
?query=
```

Default:

```text
noindex,follow
canonical = clean route
```

Pagination has separate rule below.

## 15.2. Path pages [PLATFORM]

Only typed registry entries may resolve as public sub paths:

```text
district
facet
metro- reserved platform grammar
```

No arbitrary CMS-created SEO URL.

Under v4.1.1 path pages live only in geo-first third segment:

```text
/{geo}/{category}/{district-or-facet}/
```

District and facet therefore share one namespace; `district ↔ facet` collision is merge-blocking.

### Apartment facet whitelist — candidates [PROJECT]

| Facet | Status / tier | broad39 | Release |
|---|---|---:|---|
| `vtorichka` | `P1` | 3 963 | R1 |
| `studii` | `PENDING_MEASUREMENT` |  | R1 candidate |
| `odnokomnatnye` | `PENDING_MEASUREMENT` |  | R1 candidate |
| `dvuhkomnatnye` | `PENDING_MEASUREMENT` |  | R1 candidate |
| `trehkomnatnye` | `PENDING_MEASUREMENT` |  | R1 candidate |
| `mnogokomnatnye` | `PENDING_MEASUREMENT` |  | R1 candidate |
| `s-remontom` | `PENDING_MEASUREMENT` |  | R1 candidate |

EPIC-04 measures broad39 for:

```text
купить студию квартиру ростов
купить однокомнатную квартиру ростов
купить двухкомнатную квартиру ростов
купить трёхкомнатную квартиру ростов
купить многокомнатную квартиру ростов
квартира с ремонтом ростов
```

Semantic QA may normalize the exact wording to the natural query form while preserving the requested intent. Tier is assigned by §16.2 and materialized in the seed. If a facet is not measured, it becomes `NONE` and remains filter-only; no frequency is invented.

`vtorichka` SEO-proof is passed; remaining publish conditions are §16.1 Content Gate + §16.2 threshold.

### Novostroyki facet whitelist — R2 [PROJECT]

```text
sdannye
s-otdelkoy
biznes-klass
komfort-klass
studii
odnokomnatnye
dvuhkomnatnye
trehkomnatnye
sdacha-{year}
```

In UI, selecting exactly one approved SEO facet may navigate to its path URL. Multi-filter combinations remain query-state/noindex.

---

# 16. SEO INVENTORY THRESHOLD / CONTENT GATE [PLATFORM]

## 16.1. Content Gate — canonical definition [PLATFORM]

This section is the **single canonical definition** of Content Gate mechanics. Platform owns the Gate schema/evaluator; effective numeric values are versioned typed configuration and must be frozen by the project where the requirement is market-dependent. They cannot be duplicated ad hoc in UI/routes.

### Development — Tier A default [PLATFORM]

Tier A is an index candidate only when **all** conditions pass:

- `developer`, `city`, `address`, coordinates, `class`, `deadline` or `completionStatus`, `salesStatus` are present and source-backed;
- `priceByRooms` has **≥2** rows with fresh `priceCheckedAt` (`≤45 days`) at tier assignment or explicit re-qualification; ongoing price aging follows the 45/120-day degradation rule below;
- **≥8 media** assets are in project-owned storage, including **≥1 layout**;
- **≥1 `constructionProgress`** record; not required for completed developments;
- unique description **≥1,500 characters**, with `source + checkedAt` provenance.

### Development — Tier B default [PLATFORM]

Tier B is an index candidate only when **all** conditions pass:

- the same passport fields are present: `developer`, `city`, `address`, coordinates, `class`, `deadline` or `completionStatus`, `salesStatus`;
- `priceByRooms` has **≥1** fresh row with `priceCheckedAt ≤45 days` at tier assignment or explicit re-qualification; ongoing price aging follows the 45/120-day degradation rule below;
- **≥3 media** assets;
- description **≥600 characters**; factual assembly from structured data is allowed, fabricated copy is forbidden.

### Development — Tier C default [PLATFORM]

Tier C requires the minimum passport defined in §10.1 and renders:

```text
200
noindex,follow
self-canonical
outside sitemap
```

Tier C is not an index candidate merely because the route is public.

### Development price degradation [PLATFORM]

`dataTier` and Gate are separate states.

```text
all prices > 45 days
→ D-14: hide public price / remove AggregateOffer
→ robots unchanged solely by the 45-day rule

all prices > 120 days for Tier A/B
→ Content Gate FAIL
→ noindex,follow
→ outside sitemap
→ dataTier remains A/B
```

After price refresh the Gate is recalculated automatically; no manual tier rewrite is required.

### completenessScore [PLATFORM]

`completenessScore` = share of fulfilled Gate conditions for the development's **assigned tier**. `dataTier` is assigned by import/project rules; `completenessScore` and Gate are computed automatically and do not independently change the assigned tier.

### Listings — geo / district / facet / developer geo [PLATFORM]

Index candidate only when **all** pass:

- inventory threshold §16.2;
- metadata is materialized in `SEO_REGISTRY_SEED.csv` from canonical Master Plan templates §17.3;
- unique introductory text **≥600 characters**;
- listing is server-rendered and exposes crawlable HTML `<a href>` links to entities.

Below threshold or failed Gate for an otherwise valid ACTIVE registry page:

```text
200
noindex,follow
self-canonical
outside sitemap
```

### Developer geo/entity Gate [PLATFORM / PROJECT]

Platform mechanism:

```text
developer geo hub inventory = developers with ≥1 published development in geo
developer entity eligibility = Gate-passed developments + sourced description
```

Souz effective R1 values [PROJECT]:

```text
/{geo}/zastroyshchiki/
  min developers = 5

/zastroyshchiki/{slug}/
  ≥1 development passed development Gate
  AND description ≥600 characters
  AND source + checkedAt
  else → 200 noindex,follow, outside sitemap
```

### Secondary property detail [PLATFORM]

A `market=secondary` property detail can pass Content Gate only with:

- price;
- total area;
- `rooms`;
- factual location: normalized `district` or source-backed `districtRaw`;
- **≥3 photos**;
- non-empty description.

Lifecycle/publication rules still apply in addition to this Gate.

### Manual override [PLATFORM]

Manual Content Gate override is allowed only for role `owner` and must persist an explicit reason/audit record. Override never bypasses `PREPARED_OFF/OUT`, access-control, lifecycle, or provenance rules.

## 16.2. SEO inventory tier config [PLATFORM / PROJECT]

[PLATFORM] задаёт только typed contract, tier assignment mechanism, threshold comparison и `unmeasuredPolicy` behavior. Числовые значения не являются platform defaults.

Souz effective config [PROJECT]:

```ts
seoTiers: {
  bands: { P1: 500, P2: 100, TEST: 50 },        // broad39 lower bounds
  minInventory: { P1: 5, P2: 5, TEST: 10 },
  unmeasuredPolicy: "NONE",                      // "NONE" | "TEST"
  metric: "broad39",
  snapshotDate: "2026-09-23",
}
```

Derived Souz behavior:

```text
P1   broad39 >= 500, min inventory 5
P2   broad39 100–499, min inventory 5
TEST broad39 50–99, min inventory 10
NONE broad39 < 50
unmeasured → NONE
```

For developments, generic listing object-count threshold is replaced by `dataTier` + §16.1 development Gate. Developer pages use the dedicated §16.1 developer Gate.

If a valid registry local page is below effective inventory threshold:

```text
200
noindex,follow
self-canonical
outside sitemap
```

Auto-recompute after import/feed changes. Never return fake 404 for an ACTIVE, valid registry page merely because inventory fell below threshold. `NOINDEX_AUTO` has its own existence rule from §2.1. `PREPARED_OFF/OUT` disables the local route.

Decision rules [PROJECT]:

- use `metric="broad39"` and `snapshotDate=2026-09-23`;
- do not sum overlapping phrases unless semantic QA proves disjoint demand;
- registry stores all target phrases individually;
- tier decision defaults to strongest relevant validated phrase/cluster metric;
- `PENDING_MEASUREMENT` is temporary only during EPIC-04; after QA apply `unmeasuredPolicy`, never invent a number.

---

# 17. SEO METADATA / STRUCTURED DATA [PLATFORM]

## 17.1. Dynamic factual metadata [PLATFORM]

Title/H1 may use live DTO values only when source-backed:

- number of ЖК;
- price from;
- lots/offers count;
- district locative form.

No count in metadata if count is stale/unknown.

`nameLocative` + `preposition` from normalized district data owns Russian case composition.

Canonical starting Title/H1 templates are defined only in §17.3. EPIC-04 materializes them into the seed; EPIC-13 executes them. `SEO_REGISTRY_SEED.csv` is not an independent metadata source.

Terminology: `toponym`, not `topionym`.

## 17.2. Structured data [PLATFORM]

Allowed, only from verified facts:

```text
RealEstateAgent          # home; NAP matches Yandex Business approved data
BreadcrumbList
ApartmentComplex         # development
AggregateOffer           # only fresh prices
numberOfAvailableAccommodationUnits
geo
dateModified             # real update time
Offer                     # secondary property
FAQPage                   # development/mortgage when actual FAQ rendered
```

Forbidden — D-18:

- `Product` with agency as brand for ЖК;
- phrase «официальный сайт» in metadata unless legally/factually true and owner-approved;
- synthetic `lastmod`/`dateModified`;
- ratings/reviews without source;
- aggregate numbers without source/provenance.

## 17.3. Canonical metadata templates [PLATFORM]

Master Plan owns template behavior. `SEO_REGISTRY_SEED.csv` only materializes effective project rows.

City variables:

```text
{cityName}       = City.name
{cityGenitive}   = City.nameGenitive
{cityLocative}   = City.nameLocative
{preposition}    = City.preposition
{brandName}      = site-settings.brandName
```

District variables:

```text
{districtLocative}
{prepositionDistrict}
```

All morphology values must be owner-approved data. Template code never infers Russian case.

Live fragments `{N}` / `{priceFrom}` are inserted only with fresh source-backed DTO/provenance. If unavailable/stale, the entire optional fragment including punctuation is omitted.

| pageKey | URL pattern | Title template | H1 template |
|---|---|---|---|
| `HOME_SINGLE_GEO` | `/` | Агентство недвижимости {preposition} {cityLocative} — «{brandName}» | Агентство недвижимости «{brandName}» {preposition} {cityLocative} |
| `GEO_HUB` | `/{geo}/` | Недвижимость {preposition} {cityLocative} — новостройки и квартиры \| «{brandName}» | Недвижимость {preposition} {cityLocative} |
| `NB_GEO` | `/{geo}/novostroyki/` | Новостройки {cityGenitive} — {N} ЖК[, цены от {priceFrom}] | ЖК и новостройки {cityGenitive} |
| `ZHK` | `/novostroyki/zhk-{slug}/` | ЖК {name} {preposition} {cityLocative} — цены[ от {priceFrom}], планировки, ход строительства | ЖК «{name}» |
| `ZHK_COLLISION` | same global entity route when semantic collision registry requires disambiguation | ЖК {name} ({developer}) {preposition} {cityLocative} — цены и планировки | ЖК «{name}» от {developer} |
| `APT_GEO` | `/{geo}/kvartiry/` | Купить квартиру {preposition} {cityLocative} — [{N} объявлений, ]цены | Квартиры {preposition} {cityLocative} |
| `APT_SECONDARY` | `/{geo}/kvartiry/vtorichka/` | Вторичка {preposition} {cityLocative} — купить квартиру на вторичном рынке | Вторичное жильё {preposition} {cityLocative} |
| `APT_DISTRICT_ADMIN` | `/{geo}/kvartiry/{district}/` | Купить квартиру в {districtLocative} районе {cityGenitive} — цены[, {N} объявлений] | Квартиры в {districtLocative} районе {cityGenitive} |
| `APT_DISTRICT_MICRO` | `/{geo}/kvartiry/{district}/` | Купить квартиру {prepositionDistrict} {districtLocative} {preposition} {cityLocative} — цены | Квартиры {prepositionDistrict} {districtLocative} |
| `DEV_GEO` | `/{geo}/zastroyshchiki/` | Застройщики {cityGenitive} — список, ЖК и новостройки | Застройщики {cityGenitive} |
| `DEV` | `/zastroyshchiki/{slug}/` | Застройщик {name} — ЖК и новостройки {cityGenitive} | Застройщик {name} |
| `MORTGAGE_SINGLE_GEO` | `/ipoteka/` | Ипотека {preposition} {cityLocative} — подбор программы и банка | Ипотека на квартиру {preposition} {cityLocative} |
| `SELL_SINGLE_GEO` | `/prodat/` | Продать квартиру {preposition} {cityLocative} — помощь агентства | Продать недвижимость {preposition} {cityLocative} |

`GEO_HUB` действует в обоих geo modes. `HOME_SINGLE_GEO` не забирает generic `недвижимость {город}`: главная отвечает за agency/brand intent.

Выбор district template выполняется только по `district.type`:

```text
admin_district → APT_DISTRICT_ADMIN
microdistrict → APT_DISTRICT_MICRO
```

Example [PROJECT]:

```text
Купить квартиру на Северном в Ростове-на-Дону — цены
```

For global service routes in `MULTI_GEO`, city-specific fragments are removed unless a separate future geo-service ADR/route exists (OQ-14).

Description for each registry row:

```text
search intent
+ source-backed facts from DTO
+ relevant CTA
```

Description must not contain «официальный сайт» or unverified numbers/facts.

## 17.4. Souz R1 metadata materialization [PROJECT]

R1 project data supplies:

```text
brandName = site-settings.brandName
cityName = Ростов-на-Дону
cityGenitive = owner-approved value
cityLocative = owner-approved value
preposition = owner-approved value
```

Exact morphology values are frozen only after OQ morphology approval. No hardcoded `Ростов-на-Дону` or brand string is allowed inside platform template code.

---

# 18. PAGINATION [PLATFORM]

Catalog page 2+ must be discoverable via server-rendered HTML `<a href>` without JS dependency.

Policy:

```text
?page=2+
→ noindex,follow
→ self-canonical
```

Do not canonical page 2 to page 1.

Entities must be discoverable through HTML pagination and/or sitemap; map/infinite-scroll alone is insufficient.

---

# 19. SITE SETTINGS [PLATFORM]

Payload Global:

```text
site-settings
```

Fields:

```text
brandName
legalName?
inn?
founderOrLeader?
logo
phone
email?
address
workingHours?
telegram?
whatsapp?
requisites?
socialLinks?
```

Remove starter placeholders. Public access only via Gateway/DTO.

## 19.1. Souz NAP approval [PROJECT]

Owner-approved public business data for `site-settings`, contact surfaces and `RealEstateAgent`:

```text
brandName: Союз застройщиков
legalName: Индивидуальный предприниматель Мормуль Екатерина Владимировна
inn: 940400159853
email: szrostov-promo@yandex.com
phoneLabel: +7 (988) 555 20 27
phoneHref: tel:+79885552027
address: г. Ростов-на-Дону, переулок Доломановский, 19, 1 этаж, офис 1
workingHoursWeekdays: Пн–Пт 09:00–18:00
workingHoursWeekend: Сб–Вс 09:00–18:00
publicOrigin: https://souz-home.ru
founderAndDirector: Мормуль Екатерина Владимировна
```

Do not invent OGRNIP, bank details, coordinates, social accounts, ratings, reviews or other missing requisites. Coordinates may be geocoded during EPIC-07 but require address-match verification before publication. For public wording, EPIC-29 may normalize `founderAndDirector` to legally appropriate «основатель и руководитель» without changing the person.

Privacy, consent and personal-data-operator texts are drafted in EPIC-29 from the approved legal identity and must receive owner approval before staging/public indexing. Until then only clearly marked internal/staging placeholders are allowed; they cannot satisfy Content Gate, release checklist or indexing eligibility.

---

# 20. LEGACY MIGRATION POLICY [PROJECT]

Legacy snapshot is evidence-driven and happens before final SEO/URL freeze.

Per URL actions:

```text
KEEP
REDIRECT_301
ARCHIVE
GONE_410
REVIEW
```

Forbidden:

```text
bulk → /
bulk expired → category hub without same-intent proof
```

For every old indexable URL capture:

```text
status
canonical
robots
title
description
h1
traffic evidence if available
backlink evidence if available
migrationAction
targetCandidate
reason
```

Starter donor routes are not legacy production URLs by default.

Specific decisions in EPIC-03:

```text
/prodat/
/sdat/
/uslugi/
/nedvizhimost/
/obekty/**
/sotrudniki/**
/stroitelstvo-domov/
/reviews/ or /otzyvy/
family mortgage legacy route
```

Expected old apartment URLs, if proven live:

```text
/kvartiry-rostova/
→ /rostov-na-donu/kvartiry/

/kvartiry-rostova/{legacy-slug}/
→ /kvartiry/{canonical-slug}/
```

No redirect table is final until crawl snapshot complete.

---

# 21. CONTENT PROVENANCE [PLATFORM]

Variable claims publish only with:

```text
source
checkedAt
owner-approved wording
```

Applies to, among others:

```text
309 отзывов
5.0
10 лет на рынке
23 000+ объектов
12 банков-партнёров
ставки/ипотека от X%
prices
availability
construction status
```

No source → block hidden or neutral wording.

`source` and `checkedAt` are internal audit/freshness fields. They must not be exposed by the Public Gateway or rendered merely because they exist. Owner explicitly requested that verification dates not appear in R1 UI.

### 21.1. Yandex Realty partner-source decision [PROJECT]

Owner attests that «Союз застройщиков» is an official Yandex Realty partner and is authorized to copy and use factual development information and photos from the supplied Yandex Realty catalog without public source attribution. The implementation may therefore omit visible «Источник: Яндекс.Недвижимость» labels.

This public-attribution decision does not remove internal governance:

- each development keeps its exact Yandex Realty canonical source URL, collection timestamp and owner rights attestation in private/admin provenance;
- each media item keeps `rightsStatus=owner_attested_partner_rights`, source URL/key, internal `checkedAt`, checksum and target development;
- identity matching uses name + developer + address/city; ambiguous matches stop for review;
- uncontrolled hotlinking is forbidden;
- copied files pass format/size/duplicate/basic integrity checks and receive factual alt text;
- public DTO/UI excludes source URL, rights note and checkedAt unless a future explicit product decision changes that policy.

### 21.2. Photo intake and S3 transfer [PROJECT]

For every priority ЖК:

1. collect at least five distinct usable photos into a private ephemeral intake workspace outside Git;
2. write a manifest with development slug, original URL, filename, checksum, dimensions, rights status, internal checkedAt, alt candidate and sort order;
3. reject duplicates, broken files, unrelated listings and unresolved identity matches;
4. import approved files through the Payload Media workflow so Payload remains the media record owner and Timeweb S3 is the storage owner;
5. verify hero/gallery rendering, stable URLs and restart persistence on noindex staging;
6. delete temporary local binaries after manifest/import verification according to the intake runbook.

Final public media keys/URLs are produced by the activated Payload S3 adapter; the Excel workbook and Git repository do not become binary media stores.

Media from other sources follows the same rights/source rule. Feed external images are permitted only by an exact approved host contract.

---

# 22. EXCEL IMPORT CONTRACT FOR DEVELOPMENTS [PLATFORM]

New R1 import before development template content rollout.

## 22.1. Principles [PLATFORM]

```text
idempotent
key = development slug
Zod validation by sheet
dry-run first
repeat upload is normal operation
history retained
no public API mutation
Ingest/System Gateway only
```

Sheets are processed in this order:

```text
Застройщики
ЖК
Цены
Медиа
Тексты
```

Dry-run report:

```text
new
changed
unchanged
errors
warnings
collision candidates
```

## 22.2. Workbook column template [PLATFORM]

### Sheet `Застройщики` — processed first [PLATFORM]

```text
slug*
name*
aliases?
legalName?
website?
logoKey?
source*
checkedAt*
```

`ЖК.developerSlug` must resolve to a developer loaded/known from this sheet or existing canonical data. Unknown `developerSlug` → import `error`; no developer is guessed or auto-created from a free-text name.

### Sheet `ЖК` [PLATFORM]

```text
slug*
name*
searchAliases?
kind*
dataTier*
developerSlug*
regionSlug*
citySlug*
districtSlug?
address*
lat?
lng?
class?
completionStatus?
deadline?
salesStatus*
salesAvailability*
dataSource*
lotsAvailable?
published?
```

### Sheet `Цены` [PLATFORM]

```text
developmentSlug*
roomsLabel*
priceFromMinor?
priceToMinor?
lotsAvailable?
priceCheckedAt*
source*
```

### Sheet `Медиа` [PLATFORM]

```text
developmentSlug*
mediaType*             # hero | gallery | layout | construction_progress | document | video
sourceUrlOrKey*
roomsLabel?            # layout only
area?                  # layout only
capturedAt*            # construction_progress only
alt?
sortOrder?
rightsStatus*
source*
checkedAt*
```

`mediaType` is a strict enum. `layout` may carry `roomsLabel`/`area`; `construction_progress` requires factual `capturedAt`.

### Sheet `Тексты` [PLATFORM]

```text
developmentSlug*
shortDescription?
description?
faqQuestion?
faqAnswer?
source*
checkedAt*
```

`*` = required per sheet contract.

Unknown enum/geo → error or `needsReview`; unknown `developerSlug` → `error`; no guessing.

Excel import never changes the slug of a published development (§14). Attempted published-slug mutation → row/import `error`.

`searchAliases` are site-search aliases only; they do not create SEO URLs, metadata variants, or canonical aliases.

Price row owns `priceCheckedAt`.

EPIC-15 creates a command that exports an `.xlsx` workbook template with all sheets, headers and enum hints. The generated template must be delivered to owner **before** production data collection starts.

R1 has no XML feed. The operational source package is the generated Excel workbook populated from the 24 priority Yandex Realty development pages plus any owner-provided developer rows. `source`/`checkedAt` remain internal columns and are not public presentation requirements. Media binaries stay outside the workbook; the `Медиа` sheet references the controlled intake manifest/source key and the final Payload import result.

Developer/XML feeds are deferred until a real feed exists and reuse the existing SAX ingest; their absence does not block Excel-based R1.

---

# 23. SEO REGISTRY [PLATFORM]

## 23.1. Registry contract [PLATFORM]

Canonical seed output:

```text
docs/seo/SEO_REGISTRY_SEED.csv
```

Columns:

```text
pageKey
urlPattern
entityRef
targetPhrases
broad39
snapshotDate
tier
minObjects
release
robotsDefault
titleTemplate
h1Template
descriptionTemplate
source               # enum: broad39 | webmaster | fallback_no_data
contentGateRule
```

Registry is executable input for Content Gate, not a spreadsheet-only reference. The Master Plan remains authoritative: seed rows materialize §17.3 metadata templates and §16.1 Gate references; seed must not redefine Title/H1/Description or Content Gate independently.

## 23.2. Souz R1 registry coverage [PROJECT]

R1 registry must cover:

- `/`;
- `/{geo}/` mode behavior + MULTI_GEO candidate rows;
- global category roots;
- novostroyki geo-first catalogs;
- developments A/B/C policy;
- developers geo/entities;
- kvartiry geo-first catalogs;
- `vtorichka`;
- district P1/P2/TEST candidates;
- secondary property indexing class;
- mortgage/service and retained static pages where SEO-approved.

Journal rows are excluded from the R1 registry. The platform type may remain reusable, but EPIC-30 activation is future-only.

---

# 24. SITEMAPS / ROBOTS / INDEXNOW MODEL [PLATFORM]

Logical sitemaps for R1:

```text
static
geo-hubs
novostroyki-geo
developments
developers
kvartiry-geo
districts
facets
properties-secondary
```

The platform can support a future `posts` sitemap, but journal/posts are excluded from the R1 sitemap set while EPIC-30 is `FUTURE-NOT-R1`.

Every sitemap URL is generated through `buildUrl` and must return `200` in the same fixture/config state.

Global entity inclusion:

```text
published
AND canonical
AND lifecycle allows
AND categoryStatus / marketCapability allows entity
AND entity-specific Gate/indexing rule passes
AND global project indexing = public
```

Therefore secondary properties/developments/developers from a geo whose local hub/catalog is inactive **may be present in sitemap** if their global entity Gate passes. `geoCategoryStatus` / `marketStatus` do not block global entity sitemap entries. Newbuild property units remain excluded by D-10. Tier C remains excluded.

Local geo/catalog/facet inclusion:

```text
route resolves 200
AND local effective status allows surface
AND registry + Content Gate says indexable
AND global project indexing = public
```

`/{geo}/` попадает в sitemap, если он отдаёт `200` и registry/Gate разрешают индексацию. В `SINGLE_GEO` primary geo hub может находиться в sitemap; inactive other geo hubs (`404`) — нет.

Do not generate local maps for `PREPARED_OFF/OUT`; `NOINDEX_AUTO` local surfaces are outside sitemap by definition.

IndexNow event candidates:

```text
publish
canonical update
unpublish/archive
material indexability change
```

IndexNow paths are generated through `buildUrl`. Implementation must be bounded/retry-safe and never leak private or `404` local URLs.

---

# 25. SOURCE OF TRUTH [PROJECT]

Reading order for implementation:

1. `AGENTS.md`;
2. `AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md`;
3. `AMS UI Core v5.0`;
4. this Master Plan v4.1.1;
5. frozen ADR/URL grammar/data contracts produced by EPIC-04/05;
6. `docs/seo/SEO_REGISTRY_SEED.csv` + semantic snapshot;
7. `docs/PROJECT.md` / `docs/03_ARCHITECTURE.md` / `docs/02_PRODUCT_STRUCTURE.md`;
8. module manifests after v4.1.1 reconciliation;
9. actual code/runtime truth.

Priority on conflict:

```text
ACTUAL CODE/RUNTIME TRUTH
→ CORE 5.5
→ APPROVED PROJECT ADR/CONTRACT
→ v4.1.1 MASTER PLAN
→ IMPLEMENTATION DETAIL
```

If a v4.1.1 requirement conflicts with Core or verified starter code and cannot be reconciled safely, do not guess: use §33 deterministic defaults/stop rules; only a genuinely unresolved product/architecture exception is escalated to the owner and recorded by ADR.

---

# 26. STARTER FOUNDATION — DO NOT REBUILD [PLATFORM]

Reuse and extend:

```text
Payload CMS
PostgreSQL
Payload Jobs
Public Gateway
System Gateway
Ingest Gateway
Safe Outbound
properties
pages
media
redirects
feed-sources
import-runs
import-issues
leads
lead-deliveries
XML/YRL ingest
manual ownership
safe deactivation
multi-feed isolation
lead intake
transactional outbox
delivery state machine
property lifecycle
HTTP cache invalidation
packages/contracts
packages/ui
architecture/security/SEO/UI guards
clone/client/release readiness
```

No Prisma, second backend, second auth, speculative Redis/Meilisearch without measured trigger.

---

# 27. SOURCECRAFT DELIVERY CONTRACT [PLATFORM]

SourceCraft = canonical Git contour.

Every open implementation Epic:

```text
fresh SourceCraft main
→ one independent stream
→ one registered branch + worktree
→ implementation
→ targeted tests
→ docs
→ self-review
→ Pull Request
→ delivery according to declared mode
→ post-delivery proof
→ safely detach Task Manager store link before worktree removal, when present
→ next Epic
```

One independent stream = one branch/worktree = one Pull Request. One open implementation Epic = one PR; completed baseline evidence and future/production-only Epics do not create empty PRs. Wave lanes never authorize a shared multi-Epic branch.

Default delivery mode is `PR_ONLY`: create and verify the PR, do not merge. `MERGE_AFTER_GATE` applies only when a later exact plan/inventory explicitly marks that delivery task; it requires review plus one risk-based exact-head SourceCraft Gate. Direct push to `main` is forbidden. Every open implementation Epic ends with a delivery task carrying one of those modes.

Small service/content surfaces may be grouped only where this Master Plan explicitly defines one coherent Epic before import; ad-hoc grouping after approval is forbidden.

GitHub, if retained, is one-way mirror only.

---

# 28. STANDARD GATES [PLATFORM]

STANDARD:

```bash
pnpm verify:merge-standard
```

UI:

```bash
pnpm verify:ui-core
pnpm verify:merge-standard
```

RISKY uses one exact scope and must never be invoked as a bare command. Canonical Windows syntax (run with `pwsh`, not legacy Windows PowerShell):

```powershell
$env:RISK_SCOPE = "<schema-data|auth-pii-leads|ingest-jobs|dependency-runtime|ci-governance>"
pnpm verify:merge-risky
Remove-Item Env:RISK_SCOPE
```

The selected scope is recorded in the task/PR evidence. Canonical mapping: EPIC-01/06/11/14 = `dependency-runtime`; EPIC-07/08/09/12/13/27/28/42/49/50 = `schema-data`; EPIC-10/15/23/34/35/46 = `ingest-jobs`; EPIC-31/39 = `auth-pii-leads`; EPIC-40 = `ci-governance`. If an Epic would require two incompatible scopes, stop and split the implementation into separately approved independent streams rather than weakening a gate. Per-Epic shorthand `pnpm verify:merge-risky` below always means this scoped wrapper.

Schema proof, when applicable:

```bash
pnpm verify:schema
```

`verify:merge-risky` для geo/SEO/resolver scope обязан прогонять platform fixture matrix:

```text
fixture-single-geo
fixture-multi-geo          # Rostov + Bataysk
fixture-newbuild-first
fixture-secondary-first
```

На каждом профиле проверяются как минимум:

```text
resolver
namespace/collision/grammar guards
categoryStatus
marketCapability
geoCategoryStatus
marketStatus
Content Gate
robots/indexability
sitemap eligibility
breadcrumbs/BreadcrumbList
```

Обязательная cross-profile acceptance matrix:

- `/{primaryGeo}/` → `200`, self-canonical, robots из registry/Gate;
- хлебные крошки локального каталога и `BreadcrumbList` используют одну и ту же иерархию `Главная › {City} › {Category}` в SINGLE и MULTI;
- global entity из неактивного города → `200` по lifecycle/Gate и не содержит ссылок на его `404` geo hub/local catalog;
- для всех типов pageKey: `parseUrl(buildUrl(k)) ≡ k`;
- каждый URL sitemap построен через `buildUrl` и в этом профиле отдаёт `200`;
- category-first пути вида `/novostroyki/rostov-na-donu/` и `/kvartiry/rostov-na-donu/` → `404`.

`fixture-single-geo` дополнительно доказывает: secondary entity Батайска может быть `200`/index candidate по Gate, тогда как `/bataysk/` и `/bataysk/kvartiry/` = `404` и ссылок на них нет.

`fixture-multi-geo` доказывает geo switcher visibility и отсутствие изменения global entity URL. `fixture-newbuild-first` / `fixture-secondary-first` доказывают, что platform не предполагает одинаковый market/category mix для каждого клиента.

Final R1 candidate:

```bash
pnpm verify
pnpm verify:schema
pnpm verify:integration:required
pnpm verify:ui-core
pnpm verify:client-readiness
```

Любой новый guard v4.1.1 становится частью appropriate STANDARD/RISKY gate до того, как на него опирается release.

---

# EPIC-00 — SOURCECRAFT REPOSITORY / WORKSPACE [PROJECT]

**Release:** R0  
**Risk:** STANDARD  
**Branch:** `epic/00-sourcecraft-workspace`

## Assembly status — 2026-10-01 [PROJECT]

`COMPLETED / ADAPTED TO CURRENT SOURCECRAFT REPO`

Evidence:

- SourceCraft private repo exists as `integrator-p/soyuz-rostov-next`.
- Canonical branch `main` exists.
- Initial bootstrap commit exists: `b8e124c Initial commit`.
- Bootstrap PR was merged to `main`: `29ba847 Bootstrap from AMS Realty Baza Starter (!1)`.
- Current work continues in isolated branch `adapt/soyuz-rostov-client`.

Plan delta:

- Historical target name `souz-home` is superseded by actual repo `soyuz-rostov-next`.
- No new repository/workspace creation remains for this epic.


## Acceptance-only scope [PROJECT]

- retain the existing private SourceCraft client repository `integrator-p/soyuz-rostov-next`;
- keep starter repository untouched and provenance recorded;
- confirm canonical SourceCraft remote/main and isolated workspace;
- keep GitHub mirror optional and one-way only.

No repository creation or migration task may be generated for this completed Epic.

## DoD [PROJECT]

- private repo exists;
- `main` exists;
- canonical remote = SourceCraft;
- local client workspace isolated from starter.

## Checks [PROJECT]

```bash
git status
git remote -v
```

---

# EPIC-01 — CURRENT STARTER BASELINE IMPORT [PROJECT]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/01-starter-baseline`

## Assembly status — 2026-10-01 [PROJECT]

`PARTIAL — IMPORT COMPLETE / LATEST-STABLE COMPATIBILITY UPLIFT OPEN`

Evidence:

- Starter content was imported from SourceCraft starter into this client repo without copying `.git`.
- Bootstrap branch was merged to `main` at `29ba847`.
- Current client branch contains post-bootstrap adaptation at `4420525` and server-prep docs at `2ddffc5`.
- Clone provenance exists in `docs/CLONE_PROVENANCE.md` and generated outputs are recorded.
- Current runtime baseline is the factual repository baseline:
  - Node `>=24.21.0 <25`;
  - pnpm `11.28.2`;
  - Next.js `16.3.8`;
  - React `19.2.8`;
  - Payload `3.90.2`.

Plan delta:

- Incoming `ca1b884d...` and Payload `3.90.1` remain historical starter evidence, not the execution baseline for this client branch.
- Owner requires latest compatible stable versions for the R1 runtime/toolchain.
- Official snapshot and compatibility constraints are recorded in §1.2.1; exact versions are re-resolved at task start.

## Tasks [PROJECT]

Completed import scope:

- import exact approved starter baseline without copying `.git`;
- preserve clone provenance and generated-output hashes;
- activate client mode.

Open stack-currency scope:

- query official vendor/npm stable releases for every direct root/workspace dependency and runtime component;
- exclude prerelease/canary/RC tags;
- read the bundled Next docs and official migration notes for every changed major/version-sensitive API;
- upgrade the smallest coherent set, including package manifests, lockfile, Corepack/Docker pins and direct overrides;
- keep all Payload packages on one exact release line;
- prove Next × React × Payload peer compatibility;
- confirm Timeweb managed PostgreSQL version/upgrade path before migrations without printing connection details;
- classify any incompatible latest-stable combination as an owner blocker rather than silently keeping stale packages;
- record exact checked date, sources, installed/target versions and deviations.

## DoD [PROJECT]

- provenance still records exact starter commit/tag;
- every direct dependency is either on latest compatible stable or has an explicit owner-approved compatibility exception;
- Node/pnpm/Docker/lockfile/tooling pins agree;
- Payload package lines agree exactly;
- PostgreSQL target/actual compatibility is documented before schema migration;
- dependency-runtime verification passes on the updated exact head.

## Checks [PROJECT]

```powershell
node --version
pnpm --version
pnpm install --frozen-lockfile
pnpm verify:dependency-security
pnpm verify:daily
pnpm build
$env:RISK_SCOPE = "dependency-runtime"
pnpm verify:merge-risky
Remove-Item Env:RISK_SCOPE
```

Stop conditions: unsupported peer range, required API migration not covered by official docs, lockfile non-reproducibility, failed build/typecheck/integration, or unavailable PostgreSQL target without owner-approved exception.

---

# EPIC-02 — CLIENT ACTIVATION / CLONE HYGIENE [PROJECT]

**Release:** R0  
**Risk:** STANDARD  
**Branch:** `epic/02-client-activation`

## Assembly status — 2026-10-01 [PROJECT]

`COMPLETED / CLIENT MODE ACTIVE`

Evidence:

- `clone:prepare` was executed for the Soyuz client.
- Package identity is `souz-rostov-realty`.
- `src/project/site.config.ts` is in client mode.
- `docs/CLIENT_BOOTSTRAP.json`, `docs/CLONE_PROVENANCE.md` and `docs/CLONE_GENERATED_OUTPUTS.json` exist.
- Project config now records:
  - brand `Союз застройщиков`;
  - domain `souz-home.ru`;
  - technical host `soyuz-rostov.tw1.ru`;
  - primary geo `rostov-na-donu`.
- Starter-only demo deploy/scripts were removed by clone preparation.

Remaining non-blocking follow-up:

- Keep this epic closed unless final audit finds a missing clone artifact.
- Legal content remains owner-review-sensitive before public indexing, even though preset marks it approved.


## Tasks [PROJECT]

Set client identity:

```text
projectKind=client
brand=Союз застройщиков
domain=souz-home.ru
locale=ru-RU
currency=RUB
```

- run client clone preparation;
- remove only starter-only proof/demo assets safe to remove;
- preserve Core, packages, guards, migrations, feeds, leads, jobs;
- mark v3.1/v4.0/v4.0.1/v4.1.0 project plans `SUPERSEDED BY v4.1.1` in client docs if imported.

## DoD [PROJECT]

- client identity no longer uses starter placeholders;
- clone is clean and idempotent;
- foundation remains operational.

## Checks [PROJECT]

```bash
pnpm verify:clone-bootstrap
pnpm verify:client-readiness
pnpm verify:merge-standard
```

---

# EPIC-03 — LEGACY LIVE SNAPSHOT + STARTER ROUTE DECISIONS [PROJECT]

**Release:** R0  
**Risk:** STANDARD  
**Branch:** `epic/03-legacy-snapshot`

## Tasks [PROJECT]

Crawl old production before URL freeze:

```text
robots
sitemaps
all internal links
commercial pages
catalogs
property details
journal
SEO selections
legal
company/reviews/contacts
mortgage
construction service
```

Create:

```text
docs/migration/LEGACY_URL_MANIFEST.json
docs/migration/LEGACY_URL_DECISIONS.md
docs/migration/LEGACY_SEO_SNAPSHOT.md
docs/migration/LEGACY_SELECTIONS.md
```

For every URL store status/canonical/robots/title/description/H1/evidence/action/target/reason.

Explicitly decide:

```text
/prodat/
/sdat/
/uslugi/
/nedvizhimost/
/obekty/**
/sotrudniki/**
/stroitelstvo-domov/
/reviews/ vs /otzyvy/
/semeinaya-ipoteka/ vs /ipoteka/semeynaya/
```

`/sdat/` default = OUT/404 unless legacy evidence requires same-intent 301.

## DoD [PROJECT]

- every known old indexable URL has explicit row;
- no bulk homepage/category redirects;
- legacy spelling/transliteration evidence captured;
- construction/family mortgage/reviews decisions recorded.

## Checks [PROJECT]

- duplicate URL/canonical report;
- redirect target sanity;
- crawl completeness vs sitemap/internal links.

---

# EPIC-04 — SEMANTIC QA + SEO / URL FREEZE [PROJECT]

**Release:** R0  
**Risk:** STANDARD  
**Branch:** `epic/04-semantic-seo-freeze`

## Tasks [PROJECT]

Import semantic snapshot into:

```text
docs/seo/SEMANTIC_SNAPSHOT_2026-09-23/
```

Perform Semantic QA:

- remeasure exact for A/B/E/F groups without minus-words;
- treat `exact=0` with high broad as measurement artifact until verified;
- measure broad39 for `недвижимость ростов` and materialize owner `GEO_HUB → /rostov-na-donu/`;
- remeasure developers as `{dev} жк` and `застройщик {dev}`;
- remeasure `жк {name} ростов` for homonym-other-city candidates and `Эстет`;
- verify district/development semantic collisions → `docs/seo/collisions.csv`;
- repeat demand dynamics for Tier A developments and district P1/P2;
- measure broad39 for apartment facet intents: `купить студию квартиру ростов`, `купить однокомнатную квартиру ростов`, `купить двухкомнатную квартиру ростов`, `купить трёхкомнатную квартиру ростов`, `купить многокомнатную квартиру ростов`, `квартира с ремонтом ростов`; normalize wording only as part of documented Semantic QA;
- assign each measured facet tier by §16.2; if measurement is absent/unreliable, apply `seoTiers.unmeasuredPolicy`;
- generate/update `docs/seo/SEO_REGISTRY_SEED.csv`, materializing `titleTemplate`, `h1Template`, `descriptionTemplate`, `source`, `contentGateRule` from §§17.3 and 16.1;
- `source` must be one of `broad39 | webmaster | fallback_no_data`;
- every seed URL must pass `registry-url`: `url === buildUrl(row)`;
- materialize Description by `intent + source-backed DTO facts + CTA`;
- any change to canonical §17.3 starting templates requires evidence/reason plus a Master Plan CHANGELOG entry.

Freeze:

- URL grammar max 3 segments;
- `buildUrl/parseUrl` pageKey contract;
- canonical transliteration standard;
- unified status enum + project matrices;
- `marketCapability`;
- `SINGLE_GEO` project mode;
- primary geo;
- stable intent ownership (`недвижимость {город}` → geo hub; agency/brand → `/`);
- district registry candidates;
- facet whitelist candidates;
- project `seoTiers`;
- family mortgage canonical;
- legacy route mappings;
- computed reservedRoot inputs (`categorySlugs`, `projectStaticSlugs`).

## DoD [PROJECT]

- all R1 canonical URLs fit grammar and are generated by `buildUrl`;
- primary geo hub = `200` registry candidate in SINGLE_GEO;
- other inactive geo hubs = `404` in fixture-single-geo;
- no intent-owner cutover exists between SINGLE and MULTI;
- SEO registry seed exists with metadata/Gate materialization columns and typed `source`;
- every apartment facet is resolved to effective tier after measurement/unmeasured policy;
- collision register exists;
- no unresolved SEO-threshold placeholder for R1;
- legacy exceptions are explicit.

## Checks [PROJECT]

- URL grammar lint against seed;
- `registry-url` guard;
- duplicate intent ownership report;
- duplicate canonical report;
- broad39 snapshot date validation.

---

# EPIC-05 — DOCS-FIRST + ADR + MODULE GOVERNANCE RECONCILIATION [PLATFORM]

**Release:** R0  
**Risk:** STANDARD  
**Branch:** `epic/05-docs-adr`

## Tasks [PLATFORM]

Update active docs:

```text
AGENTS.md
docs/README.md
docs/PROJECT.md
docs/02_PRODUCT_STRUCTURE.md
docs/03_ARCHITECTURE.md
docs/DESIGN.md
docs/OPERATIONS.md
docs/04_BACKLOG.md
docs/05_RELEASE_CHECKLIST.md
docs/modules/novostroyki.md
```

Create/update ADR:

```text
ADR-URL-GRAMMAR.md
ADR-SLUG-NAMESPACE.md
ADR-SINGLE-GEO-MODE.md
ADR-DISTRICTS.md
ADR-DEVELOPMENTS-UNIFIED-ENTITY.md
ADR-DEVELOPMENT-TIERS.md
ADR-CATEGORY-STATUS-PREPARED-OFF.md
ADR-PROPERTY-TAXONOMY.md
ADR-TRAILING-SLASH.md
ADR-SEO-REGISTRY-CONTENT-GATE.md
```

`ADR-SINGLE-GEO-MODE.md` must state:

```text
/{primaryGeo}/ = 200 registry candidate in SINGLE and MULTI
недвижимость {город} → /{geo}/ in both modes
agency / brand / realtor intent → / in both modes
mode switch does not cut over intent ownership
```

Implemented platform/project source layout:

```text
src/core/**             # reusable mechanisms
packages/contracts/**   # storage-neutral contracts/DTO
packages/ui/**          # reusable presentation
src/project/**          # client profile/config/schema adapters/text/composition
src/app/**              # Next.js route composition
```

Rules:

- dependency direction is `src/project/** -> src/core/**`; `src/core/**` and `packages/**` must not import `src/project/**`;
- URL grammar is owned by `src/core/routing/url-grammar.ts` with project composition in `src/project/url-grammar.ts`;
- client brand/domain/city/marketing literals are forbidden in reusable `src/core/**` and `packages/**` owners;
- project route/static slugs enter reusable mechanisms only through typed config/registry;
- historical `src/platform/**` wording is conceptual and never authorizes creating a second platform tree.

Create `docs/UPSTREAM_CANDIDATES.md`:

```text
module/path | owner epic | status(candidate|ready|upstreamed) | notes
```

Every Epic changing reusable `[PLATFORM]` capability must append/update its `src/core/**` or `packages/**` candidates in this file.

Critical starter reconciliation:

- change novostroyki manifest from `residential-complexes/buildings/layouts/developers` expectation to approved `developments/developers` R1 contract;
- update `module-governance` markers so unified model is valid;
- define activation order: docs/governance first, runtime route later;
- do not mark runtime module enabled before schema/gateway prerequisites are ready; extend governance model explicitly if current boolean state is insufficient.

## DoD [PLATFORM]

- source-of-truth chain consistent with v4.1.1;
- active docs describe primary geo hub as `200` registry candidate and contain no geo-hub redirect-to-root contract;
- ADR-SINGLE-GEO-MODE contains no intent-owner cutover;
- `src/core/** + packages/**` / `src/project/**` dependency direction is explicit and guarded;
- `docs/UPSTREAM_CANDIDATES.md` exists;
- module guard and manifest agree with unified developments;
- all architectural deviations recorded.

## Checks [PLATFORM]

```bash
pnpm quality:guards
pnpm verify:merge-standard
```

---

# EPIC-06 — INFRASTRUCTURE TOPOLOGY DECISION / SECRET MASTER [PROJECT]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/06-infrastructure`

## Assembly status — 2026-10-01 [PROJECT]

`PARTIALLY COMPLETED / SERVER BASELINE READY / TOPOLOGY CLOSURE PENDING`

Completed evidence:

- Server alias/scope confirmed: `szrostov`, Secret Master `szrostov-server/prod`.
- Timeweb PostgreSQL connectivity from server using Secret Master credentials: PASS.
- Old server runtimes were removed by owner-approved destructive cleanup.
- DB `soyuz_rostov_prod` was reset to an empty public schema; table count verified as `0`.
- Docker `29.1.3` and Docker Compose `2.40.3` installed and active.
- Clean directories created:
  - `/opt/souz-rostov`;
  - `/etc/souz-rostov`;
  - `/var/log/souz-rostov`;
  - `/opt/souz-rostov/shared/media`.
- Root-only env file exists at `/etc/souz-rostov/app.env` with `DATABASE_URI` + compatibility `DATABASE_URL`.
- Nginx placeholder enabled for `soyuz-rostov.tw1.ru` and `souz-home.ru`, with noindex safeguards.
- Compose placeholder exists at `/opt/souz-rostov/compose.yml` and validates with a sample image.

Remaining before this epic can close:

- Canonicalize `REVALIDATE_SECRET` in Secret Master and define safe env materialization.
- Implement resolved ODR-03: activate Timeweb S3; persistent local media is not an approved production fallback.
- Make Payload media adapter, runtime required env and compose volumes consistent with that one choice.
- Record backup/monitoring ownership and proof route without claiming live proof yet.

Image publication, same-image migrations, jobs-owner live proof, technical-host health and DNS/indexing are not EPIC-06 closure criteria; they belong to EPIC-40/43/44.


## Tasks [PROJECT]

Before provisioning, record owner topology decision in `docs/PROJECT.md` according to `CLONE_ONBOARDING.md`.

Owner-selected client topology:

```text
Timeweb VPS
Timeweb Managed PostgreSQL
Timeweb S3-compatible storage
Nginx
one jobs-active runtime
```

- use Secret Master only;
- staging and production secrets separate;
- activate S3 through the existing `clone:activate-timeweb-storage` workflow and verify Payload/env/compose consistency;
- do not duplicate DB/server resources that already exist and are approved.

## DoD [PROJECT]

- topology decision explicit;
- secrets source explicit;
- no credential in git/docs;
- readiness config, Payload media adapter, runtime env requirements and compose topology reflect the same chosen storage;
- image/migration/live rollout remains deferred to EPIC-40/43/44.

## Checks [PROJECT]

```bash
pnpm verify:client-readiness --mode=fixture-client
pnpm verify:merge-risky
```

---

# EPIC-07 — SITE SETTINGS [PROJECT]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/07-site-settings`

## Tasks [PROJECT]

Create/configure `site-settings` Global with the owner-approved §19.1 brand/contact/NAP/legal identity.

- remove starter phone/logo/NAP placeholders and fail closed when client records are missing;
- add or map legal name, INN and founder/leader fields through Payload migration/types where the current schema is insufficient;
- expose only approved public values through Gateway/DTO;
- distinguish source-backed public facts from editable marketing copy;
- geocode the office only with an address-match verification; do not invent coordinates;
- keep privacy/consent drafts staging-only until owner approval.

## DoD [PROJECT]

- shell/header/footer/contact/legal surfaces render the exact approved phone, email, address and hours without hardcoded starter data;
- legal name and INN are represented once from Payload-owned settings;
- NAP source is explicit and `RealEstateAgent` parity is verified;
- missing client data never falls back to starter fixture identity;
- unapproved legal placeholders cannot satisfy release/indexing gates;
- no private fields leak publicly.

## Checks [PROJECT]

```bash
pnpm verify:schema
pnpm verify:public-gateway
pnpm verify:merge-risky
```

---

# EPIC-08 — GEO MODEL + DISTRICTS SEED [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/08-geo-districts`

## Assembly status — 2026-10-01 [PLATFORM / PROJECT]

`PARTIAL`: geo schema/migrations/guards and seed tooling exist; Soyuz seed is incomplete. Remaining scope is owner-approved 8 administrative districts, verified microdistricts, morphology/parents and explicit R1 category membership.

## Tasks [PLATFORM]

Create `regions`, `cities`, `districts`.

Implement:

- geo slug uniqueness rules;
- city-scoped district slug uniqueness;
- district type/nullable-parent/synonyms/nameLocative/preposition;
- microdistrict URL independence from parent and parent-null breadcrumbs;
- `City.nameGenitive`, `City.nameLocative`, `City.preposition`;
- nullable `City.agglomerationOf → City`;
- self/cycle validation for agglomeration;
- slug immutability;
- reserved-root/geo/category collision guard;
- synonym normalizer.

## Project seed [PROJECT]

Seed:

- Ростовская область;
- Ростов-на-Дону;
- 8 administrative districts;
- listed microdistrict/locality layer with verified parent relations; unconfirmed/cross-district microdistricts use `parent=null`;
- Bataysk/Aksay only where verified development data needs them;
- `Bataysk.agglomerationOf = Rostov-na-Donu`;
- `Aksay.agglomerationOf = Rostov-na-Donu`.

Owner approves city `nameGenitive/nameLocative/preposition` and district morphology before public metadata freeze.

## DoD [PLATFORM]

- normalized geo model exists;
- city morphology fields exist and are never guessed;
- agglomeration relation is deterministic and cycle-safe;
- synonyms resolve to one district entity;
- seed mechanism idempotent;
- microdistrict `parent` nullable and does not affect canonical district URL;
- breadcrumbs omit unconfirmed parent;
- geo records never auto-activate public routes;
- published geo root may resolve only through the root resolver/mode contract.

## Checks [PLATFORM]

```bash
pnpm payload:generate:types
pnpm verify:schema
pnpm verify:merge-risky
```

---

# EPIC-09 — DEVELOPMENTS + DEVELOPERS [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/09-developments-developers`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Collections, migrations, contracts and guards exist. Keep only exact-head regression acceptance; real Soyuz inventory belongs to EPIC-23.

## Tasks [PLATFORM]

Create `developers` and unified `developments`.

Implement:

- `kind=residential_complex|cottage_village`;
- slug prefixes `zhk-` / `kp-`;
- `searchAliases` for on-site search only;
- aliases for developers;
- Tier A/B/C;
- salesAvailability;
- priceCheckedAt;
- computed completenessScore;
- priceByRooms/lotsAvailable/faq;
- canonical Tier Gate evaluation per §16.1;
- development lifecycle;
- no automatic 410.

Prepared cottage-village fields exist, but public category remains OFF.

## DoD [PLATFORM]

- migrations generated/applied in test DB;
- unified entity passes module governance;
- development/developer slugs guarded;
- lifecycle represented.

## Checks [PLATFORM]

```bash
pnpm payload:generate:types
pnpm verify:schema
pnpm verify:merge-risky
```

---

# EPIC-10 — PROPERTY TAXONOMY + GEO RELATIONS + FEED MAPPING [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/10-property-taxonomy`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Property taxonomy, normalized relations, raw source preservation and feed mapping exist. Real source onboarding belongs to EPIC-34.

## Tasks [PLATFORM]

Extend existing `properties`, preserving feed identity/manual ownership/lifecycle.

Migration strategy:

```text
expand raw + relation fields
→ backfill normalized region/city/district
→ validate
→ switch reads/filtering to relations
→ retain raw source fields for ingest evidence
```

Add/normalize category-specific schemas for apartment/house/townhouse/land/commercial.

Keep `dealType=rent` compatibility but block public publication in project policy.

Create explicit feed mapping:

```text
YRL category/property-type/commercial-type
→ category
→ market
→ subtype
→ publication eligibility
```

Unknown taxonomy → `needsReview` + import issue. No guessing.

## DoD [PLATFORM]

- all PREPARED_OFF categories structurally supported;
- only apartment/sale can become ACTIVE in R1;
- normalized relations usable by queries;
- import ownership unchanged.

## Checks [PLATFORM]

```bash
pnpm verify:feed-parser
pnpm verify:feed-ingest
pnpm verify:manual-ownership
pnpm verify:schema
pnpm verify:merge-risky
```

---

# EPIC-11 — CONTRACTS / DISCRIMINATED DTO [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/11-contracts`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Storage-neutral discriminated DTO/contracts exist and remain frozen. Reopen only for a named client gap through the current contract workflow.

## Tasks [PLATFORM]

Extend frozen contracts through standard diff process.

Add:

```text
RegionDTO
CityDTO
DistrictDTO
DeveloperDTO
DevelopmentCardDTO
DevelopmentDetailsDTO
ApartmentDTO
HouseDTO
LandDTO
CommercialDTO
```

Preserve compatibility where practical; do not expose Payload types.

Add presentation support for:

- `dataTier`;
- price freshness;
- district metadata;
- developer/development context;
- category-aware href generation.

## DoD [PLATFORM]

- contract diff reviewed;
- UI can consume new entities storage-neutrally;
- no raw persistence imports in contracts/UI.

## Checks [PLATFORM]

```bash
pnpm contracts:diff
pnpm contracts:check
pnpm quality:architecture
pnpm verify:merge-risky
```

---

# EPIC-12 — PUBLIC GATEWAY + BOUNDED COUNTS [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/12-public-gateway`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Public Gateway, explicit access mode, DTO mapping and bounded reads/counts exist. Project data/evidence remains downstream.

## Tasks [PLATFORM]

Add public reads for:

```text
geo
districts
developers
developments
geo×category properties
district/facet catalogs
secondary property details
sitemap registry inputs
```

Add bounded aggregate/count reads for:

- district inventory;
- facet inventory;
- development lots;
- live metadata counts.

All reads:

```text
server-only
overrideAccess:false
user:null
explicit select
depth bounded
limit bounded
published predicates
DTO output
```

## DoD [PLATFORM]

- no public raw Payload doc path introduced;
- counts have bounded queries/index support;
- PREPARED_OFF publication is not exposed through gateway route composition.

## Checks [PLATFORM]

```bash
pnpm verify:public-gateway
pnpm quality:architecture
pnpm verify:merge-risky
```

---

# EPIC-13 — SEO REGISTRY + CONTENT GATE + INDEXING ENGINE [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/13-seo-engine`

## Assembly status — 2026-10-01 [PLATFORM / PROJECT]

`PARTIAL`: registry renderer, Content Gate, structured-data/discovery machinery and checks exist. Current client CSV is bootstrap-only (`fallback_no_data`, `NONE`, `draft`) and is not SEO evidence.

## Tasks [PLATFORM]

Implement typed registry/config for:

```text
home
geo root
static/service
global category root
geo×category
district
facet
development
developer root/geo/entity
property
journal  # future-capability type only; no R1 registry rows
```

Implement:

- unified status enum `ACTIVE | NOINDEX_AUTO | PREPARED_OFF | OUT`;
- `categoryStatus`;
- `marketCapability`;
- `geoCategoryStatus`;
- `marketStatus`;
- SINGLE_GEO/MULTI_GEO owner config;
- typed `seoTiers` mechanism with project-supplied values;
- development/listing/secondary-property/developer Gate from §16.1;
- owner-only Gate override with persisted reason/audit;
- D-10 newbuild unit noindex;
- D-14 stale-price behavior;
- D-18 structured-data safeguards;
- sitemap eligibility separated for global entities vs local catalogs;
- structured-data eligibility;
- metadata live-fact safeguards;
- stable generic geo vs agency/brand intent ownership;
- mode-aware global service metadata per OQ-14.

Rules:

```text
GLOBAL project indexing must be public
AND route/status/registry/Gate/lifecycle pass
→ page may index

SINGLE_GEO primary /{geo}/ → 200 registry outcome
SINGLE_GEO other inactive /{geo}/ → 404
MULTI_GEO published ACTIVE /{geo}/ → 200 registry outcome
global category root in SINGLE_GEO → 200 noindex
valid geo category + threshold + Gate → index candidate
NOINDEX_AUTO local catalog with ≥1 active entity → 200 noindex, outside sitemap/menu
valid but thin ACTIVE registry page → 200 noindex
Tier C ЖК → 200 noindex
market=newbuild property detail → 200/noindex where global entity is public
PREPARED_OFF/OUT local route → disabled/404
global entity can remain public even when its geo local catalog is inactive
```

## Fixture profiles [PLATFORM]

All SEO/indexing tests run against:

```text
fixture-single-geo
fixture-multi-geo
fixture-newbuild-first
fixture-secondary-first
```

Resolver, sitemap and Content Gate suites run for **every** fixture profile inside `verify:merge-risky`; acceptance includes full §28 matrix, including inactive-city entity publication and `buildUrl/parseUrl` roundtrip.

## DoD [PLATFORM]

- no UI page decides indexing independently;
- global indexing policy and page eligibility are composed, not duplicated;
- local catalog statuses cannot suppress valid global entities;
- registry seed cannot bypass typed platform rules;
- inventory/content/price freshness recompute eligibility deterministically;
- all four fixture profiles pass §28 acceptance.

## Checks [PLATFORM]

```bash
pnpm verify:seo-contracts
pnpm verify:schema
pnpm verify:merge-risky
```

---

# EPIC-14 — ROUTE RESOLVER + NAMESPACE GUARD + TRAILING SLASH [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/14-url-resolver`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. URL grammar, resolver, page decision, proxy redirects and profile fixture matrix exist in current owners. Do not create `src/platform/**`.

## Tasks [PLATFORM]

Accept and, only for proven gaps, extend the existing `src/core/routing/url-grammar.ts` + `src/project/url-grammar.ts` owners:

```text
buildUrl(pageKey) → canonical normalized path
parseUrl(path) → pageKey | null
parseUrl(buildUrl(k)) ≡ k
```

Implement v4.1.1 resolver exactly as §6:

```text
/{x}/
  computed reservedRoot → primary/published geo by mode → 404

/{geo}/{x}/
  ACTIVE/NOINDEX_AUTO effective geo category | zastroyshchiki → 404

/{geo}/{cat}/{x}/
  district → facet → metro-* → 404

/{cat}/{x}/
  zhk-* | kp-* | *-{publicUrlId} → 404

/zastroyshchiki/{x}/
  developer slug → 404

≥4 segments → 404
```

Accept the existing merge-blocking proof surface from §6.9 **before** public route skeletons, extending it only for a demonstrated gap:

```text
verify:url-grammar
quality:architecture + quality:guards
verify:copy-ownership
seo:registry:check
geo ↔ reservedRoot
geo ↔ category
developer ↔ reservedRoot
district ↔ facet
entity ↔ entity
publicUrlId duplicate
prefix/transliteration/canonical rules
agglomeration cycle
```

ЖК ↔ district homonym is not a URL collision; semantic conflicts remain in `collisions.csv`.

Implement stable `publicUrlId`. Set/prove `trailingSlash=true`.

## Mandatory test matrix [PLATFORM]

Run on every fixture profile:

```text
primary root geo SINGLE → 200, self-canonical, robots from registry
primary root geo MULTI → 200, self-canonical, robots from registry
other inactive geo SINGLE → 404
other published ACTIVE geo MULTI → 200 registry outcome
reservedRoot beats geo
unknown root → 404
ACTIVE geo category → registry outcome
NOINDEX_AUTO geo category with inventory → 200 noindex
geoCategoryStatus PREPARED_OFF/OUT → 404
marketStatus controls local listings but does not suppress global entity
PREPARED_OFF global category → 404 where route disabled
/arenda/** → 404
/sdat/ → 404 unless legacy redirect registry
valid district third segment → 200 registry outcome
district ↔ facet collision → merge-blocking failure
district × facet extra path → 404
facet × facet → 404
global zhk entity resolves without geo
global property entity resolves without geo
developer entity resolves only under /zastroyshchiki/{slug}/
entity from inactive geo → 200 by entity Gate and no href to its 404 geo hub
invalid entity prefix → 404
≥4 segments → 404
category-first /novostroyki/rostov-na-donu/ → 404
category-first /kvartiry/rostov-na-donu/ → 404
legacy URL without slash → exactly one direct redirect to normalized target
redirect registry has no 308→301 chains
normal canonical without slash → exactly one 308
parseUrl(buildUrl(k)) ≡ k for all pageKey variants
all sitemap URLs are buildUrl-derived and return 200
Payload Admin/API unaffected
```

## DoD [PLATFORM]

- resolver deterministic;
- maximum canonical path depth enforced;
- geo root supported only for published/registry-known geo; primary geo = 200 in both modes;
- no geo-hub redirect-to-root exists;
- three FIX-04 guards are merge-blocking;
- redirect graph separates 308 normalization from direct legacy 301;
- all four R0 fixture profiles pass resolver + sitemap + Content Gate verification.

## Checks [PLATFORM]

```bash
pnpm verify:seo-contracts
pnpm quality:guards
pnpm verify:merge-risky
```

---

# EPIC-15 — EXCEL IMPORT ЖК [PLATFORM]

**Release:** R0  
**Risk:** RISKY  
**Branch:** `epic/15-development-excel-import`

## Assembly status — 2026-10-01 [PLATFORM / PROJECT]

`PARTIAL`: five-sheet template generator, validation, dry-run/apply and import integration exist. Remaining work is client workbook delivery, Yandex Realty priority-data/media manifest intake, isolated idempotency/error proof and accepted import report.

## Tasks [PLATFORM]

Implement idempotent workbook import using contract in section 22.

- workbook parser;
- run the actual repository command `pnpm payload:development-excel:template` to export the owner workbook `.xlsx` before data collection;
- template contains `Застройщики`, `ЖК`, `Цены`, `Медиа`, `Тексты`, headers and enum hints;
- process `Застройщики` first; unknown `developerSlug` in `ЖК` → error;
- per-sheet Zod schemas;
- dry-run mode;
- new/changed/unchanged/error report;
- upload/import history;
- slug-keyed upsert;
- priceCheckedAt per row;
- developer/geo/district resolution;
- strict `mediaType` enum + layout/construction-progress conditional validation;
- `searchAliases` as non-SEO search data;
- reject published development slug mutation;
- rights/media validation using the owner-attested Yandex Realty partner-rights status;
- bind `Медиа` rows to a controlled intake manifest while keeping binaries outside Git/Excel;
- keep source URL, rights status and checkedAt private/admin-only;
- no public mutation endpoint;
- Ingest/System Gateway boundary only.

## DoD [PLATFORM]

- owner receives generated workbook template before production data collection;
- re-upload same workbook creates no unintended mutations;
- published development slug cannot be changed by import;
- bad rows do not corrupt good rows;
- unknown relations fail/needsReview predictably;
- audit history available;
- dry-run covers all 24 priority ЖК and reports ambiguous name/address/developer matches instead of guessing;
- every accepted priority row has at least five validated media records ready for Payload/S3 import, or remains unpublished with an explicit intake error.

## Checks [PLATFORM]

- parser fixtures per sheet;
- idempotency integration test;
- transaction/error isolation test;
- `pnpm verify:merge-risky`.

---

# EPIC-16 — UI INTAKE [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/16-ui-intake`

## Tasks [PROJECT]

Owner decision for R1: preserve the current imported template appearance, referred to by the owner as the **Bastion template**, exactly. This is a content/brand adaptation, not a redesign.

Run current UI audits and classify components:

```text
REUSE → VARIANT only when factual content requires it → CREATE only for missing functional state
```

Preserve AMS UI Core v5.0, existing layout, visual hierarchy, typography, component styling and responsive behavior. Change only:

- brand/name/logo assets supplied or approved for Soyuz;
- owner-approved NAP/legal/content;
- real catalog/development/developer data;
- functional states required by the approved R1 scope.

Identify and retain reusable catalog controls, map frame, cards, shell/navigation, lead forms, galleries, breadcrumbs and legal/corporate views. Do not remove or visually modernize components merely because a later redesign is planned. Internal Atlas donor/provenance evidence remains historical implementation evidence and is not renamed.

## DoD [PROJECT]

- no second design system and no unapproved visual redesign;
- representative Soyuz pages preserve the current Bastion-template visual baseline at canonical viewports;
- only brand/factual/content differences are intentional and documented;
- dead token/component report is review-only unless removal is independently proven safe;
- post-R1 redesign remains a separate owner-approved program.

## Checks [PROJECT]

```bash
pnpm ui:clone-audit
pnpm tokens:report --dead-only
pnpm verify:ui-core
```

---

# EPIC-17 — NAVIGATION SHELL [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/17-navigation`

## Tasks [PROJECT]

Header `SINGLE_GEO`:

- geo-switcher hidden;
- links use primary geo catalogs directly;


```text
Новостройки → /rostov-na-donu/novostroyki/
Квартиры → /rostov-na-donu/kvartiry/
  Вторичка → /rostov-na-donu/kvartiry/vtorichka/
  По районам → anchor/block on city catalog
Застройщики → /rostov-na-donu/zastroyshchiki/
Ипотека → /ipoteka/
Продать → /prodat/
О компании → /o-kompanii/
Контакты → /kontakty/
```

`MULTI_GEO` uses the same navigation model with a visible geo-switcher; selected geo changes only geo-local catalog/hub links. Global entity/service links remain global.

Do not show homes/land/commercial/cottage villages/rent.

Footer contains only published ACTIVE/service/legal routes.

## DoD [PROJECT]

- PREPARED_OFF absent from nav/footer;
- links use canonical trailing-slash policy;
- mobile/desktop shell aligned.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:merge-standard
```

---

# EPIC-18 — ACTIVE ROUTE SKELETON [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/18-route-skeleton`

## Tasks [PROJECT]

Create only ACTIVE/service route skeletons:

```text
/
/{geo}/                              # primary: 200 in SINGLE/MULTI; other geo: mode/status-aware
/novostroyki/
/rostov-na-donu/novostroyki/
/novostroyki/zhk-{slug}/
/zastroyshchiki/
/rostov-na-donu/zastroyshchiki/
/zastroyshchiki/{slug}/
/kvartiry/
/rostov-na-donu/kvartiry/
/rostov-na-donu/kvartiry/vtorichka/
/rostov-na-donu/kvartiry/{district}/
/kvartiry/{property-slug}/
/uslugi/
/prodat/
/ipoteka/
/ipoteka/semeynaya/
/o-kompanii/
/kontakty/
/legal routes
```

`/otzyvy/` is created only after a verified review source exists; otherwise it remains hidden and `404`. `/stroitelstvo-domov/` and `/journal/**` remain `404` in R1, except an evidence-backed exact legacy redirect/archive decision that does not activate either product surface.

Do not create public route skeletons for PREPARED_OFF categories.

## DoD [PROJECT]

- skeleton resolver uses registry/status config;
- all pages default safe/noindex until gate/content ready;
- `/{geo}/` route exists only for published/registry-known geo and follows §3.2 mode behavior.

## Checks [PROJECT]

```bash
pnpm typecheck
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-19 — REDIRECT / LIFECYCLE REGISTRY [PLATFORM]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/19-routing-lifecycle`

## Assembly status — 2026-10-01 [PLATFORM / PROJECT]

`PARTIAL`: redirect/lifecycle/301/308/410 mechanisms exist. Project redirect rows and no-chain proof require the real legacy crawl and entity mapping from EPIC-03/28.

## Tasks [PLATFORM]

Create executable registry separating:

```text
framework trailing slash → 308
SEO migration → 301
property lifecycle
development lifecycle
legacy route compatibility
```

Adapt starter `/obekty/{slug}` lifecycle compatibility to category canonical without losing real 410 semantics.

## DoD [PLATFORM]

- no loops/chains;
- every legacy redirect target exists or is intentionally staged;
- KEEP URLs not redirected;
- category canonical owns new property detail.

## Checks [PLATFORM]

- lifecycle integration tests;
- redirect graph test;
- 301 vs 308 test.

---

# EPIC-20 — HOME [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/20-home`

## Tasks [PROJECT]

Home intent ownership is stable in both modes:

```text
агентство недвижимости {primaryCity}
brand / realtor / agency intent
→ /

недвижимость {primaryCity}
→ /{primaryGeo}/
```

Structure:

- strong agency/value hero;
- novostroyki preview;
- apartments preview;
- district discovery;
- developers preview;
- mortgage;
- seller CTA;
- verified trust/process;
- lead CTA.

Home не дублирует `GEO_HUB` metadata/intent. `RealEstateAgent` schema only from approved NAP.

## DoD [PROJECT]

- no invented metrics;
- all ACTIVE previews use Gateway DTO;
- no PREPARED_OFF teaser implying active inventory;
- `/` and `/rostov-na-donu/` have distinct intent ownership and self-canonicals.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-21 — NOVOSTROYKI ROOT + ROSTOV GEO HUB [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/21-novostroyki-hub`

## Tasks [PROJECT]

Routes:

```text
/novostroyki/                       # 200 noindex in SINGLE_GEO
/rostov-na-donu/novostroyki/        # primary SEO/catalog owner
```

Geo hub UX:

- search/filter;
- all published ЖК A/B/C;
- lazy map;
- ЖК cards with factual price/update state;
- mortgage payment in card only from approved rate facts;
- quiz selection → lead;
- districts block;
- developers block;
- completed developments block;
- «Рядом с Ростовом» only for cities with `agglomerationOf = rostov-na-donu`;
- internal freshness state controls stale-price behavior; no public verification/update date is rendered in R1;
- FAQ/CTA where sourced.

Nearby-city ЖК are selected only by `City.agglomerationOf`. They do not increment Rostov `{N}`. Cards and metadata use the real city. Global development URLs do not change. Local catalog breadcrumb is identical in both modes: `Главная › Ростов-на-Дону › Новостройки`; BreadcrumbList uses the same hierarchy. Nearby-city global entities never link to an inactive city hub.

## DoD [PROJECT]

- all tiers discoverable;
- no stale price displayed after 45 days;
- Tier C cards degrade gracefully to price-request CTA;
- map lazy-loaded.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-22 — DEVELOPMENT TEMPLATE — ЖК [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/22-development-template`

## Tasks [PROJECT]

Canonical:

```text
/novostroyki/zhk-{slug}/
```

Sections:

- metadata Title/H1 uses the development's real city via §17.3;
- global entity breadcrumb is mode-aware and never changes entity URL;
- in `SINGLE_GEO`: `Главная › Новостройки {primaryCity} › ЖК`;
- in `MULTI_GEO`, if the entity's city has an active geo/category hub: `Главная › {city} › Новостройки › ЖК`; otherwise fallback to a valid global/primary discovery parent without fabricating a disabled geo route;
- hero/gallery;
- factual sales/construction status without a public source/check/update date;
- geo/address;
- developer;
- fresh prices by room;
- availability;
- class/deadline;
- factual description;
- characteristics;
- layouts/units if available;
- map;
- construction progress if sourced;
- mortgage;
- documents if rights/source valid;
- anchor sections for prices/layouts/progress/reviews;
- FAQ;
- related developments;
- lead CTA.

Tier C uses presentation flow `development`, mapped to canonical backend kind `development_price`; no duplicate `zhk_price_request` backend kind is created.

Structured data according to section 17.

## DoD [PROJECT]

- A/B indexability follows canonical §16.1 Gate;
- nearby-city development uses the same Gate;
- C noindex;
- stale prices hidden + AggregateOffer omitted;
- collision page metadata uses approved template.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-23 — DEVELOPMENT DATA: TIER A + B/C CATALOG [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/23-development-data`

## Tasks [PROJECT]

- create exact identity map for all 24 §10.1 priority ЖК using the owner-supplied Yandex Realty catalog;
- for every ЖК capture the canonical Yandex page URL, verified name, developer, address/city, district when proven, coordinates when proven, class/status/deadline, factual descriptions and price/availability fields available at collection time;
- populate the generated Excel workbook; no XML feed is expected for R1;
- collect at least five distinct usable photos per priority ЖК into the private intake workflow from §21.2;
- verify checksums, dimensions, file integrity, deduplication, factual alt text and `owner_attested_partner_rights` status;
- import approved media through Payload to Timeweb S3; never hotlink or commit binaries;
- load any additional B/C passport records only from owner-provided or separately verified rows;
- verify internal price source and checkedAt while keeping dates/source labels out of public UI;
- calculate `completenessScore` against §16.1 conditions for the assigned tier;
- assign dataTier from explicit import/project rules;
- ensure non-Rostov records retain their real city.

No guessing missing facts. Missing fields use typed null/omitted state or clearly marked noindex staging placeholders; placeholders never become factual public content and never pass Content Gate.

## DoD [PROJECT]

- all 24 priority ЖК have unambiguous source identity and an Excel import result;
- each published priority ЖК has at least five accepted S3-backed Payload media records (`≥120` accepted images across the set if all 24 publish);
- Tier A records have publish-ready passports where evidence exists; incomplete records remain noindex/unpublished without fake content;
- source URLs, rights attestation, checksums and checkedAt exist internally but no Yandex attribution or check date is rendered publicly;
- import/media reports are clean enough for owner review;
- all published rows have provenance and restart-persistent S3 media.

## Checks [PROJECT]

- Excel dry-run + idempotency rerun;
- per-development media-count assertion (`>=5` for publish eligibility);
- checksum/duplicate and broken-image report;
- Payload Media → Timeweb S3 upload/read/restart proof;
- Public Gateway proof that internal source/rights/checkedAt fields do not leak;
- Content Gate report;
- stale price fixture;
- `pnpm verify:merge-risky`.

---

# EPIC-24 — DEVELOPERS PAGES [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/24-developers`

## Tasks [PROJECT]

Implement:

```text
/zastroyshchiki/                     # noindex SINGLE_GEO
/rostov-na-donu/zastroyshchiki/     # index candidate
/zastroyshchiki/{slug}/             # §11/§16.1 developer entity Gate
```

Developer entity page:

- factual company card;
- aliases only for matching/search, not keyword stuffing;
- published developments;
- verified website/legal info if available;
- related CTA.

## DoD [PROJECT]

- ambiguous naked brand terms not used as SEO evidence;
- developer page is `200 noindex,follow` and disappears from sitemap if Gate fails;
- geo hubs and developer entities use distinct namespace positions; reserved/developer guards pass.

## Checks [PROJECT]

```bash
pnpm verify:seo-contracts
pnpm verify:ui-core
pnpm verify:merge-standard
```

---

# EPIC-25 — APARTMENTS ROOT + GEO + VTORICHKA + FACET FRAMEWORK [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/25-apartments`

## Tasks [PROJECT]

Routes:

```text
/kvartiry/                           # noindex SINGLE_GEO
/rostov-na-donu/kvartiry/           # all sale apartments, mixed newbuild + secondary
/rostov-na-donu/kvartiry/vtorichka/
```

City catalog:

- entire sale apartment inventory allowed by publication policy;
- block «Квартиры по районам»;
- approved filters;
- path navigation only for one active registry facet;
- all combinations query/noindex.

Never create `/rostov-na-donu/kvartiry/novostroyki/`.

## DoD [PROJECT]

- vtorichka SEO proof state encoded;
- threshold/Gate owns robots;
- newbuild units may list but detail remains D-10 noindex;
- secondary inventory remains index candidate.

## Checks [PROJECT]

```bash
pnpm verify:seo-contracts
pnpm verify:ui-core
pnpm verify:merge-standard
```

---

# EPIC-26 — DISTRICT PAGES — KVARTIRY [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/26-district-pages`

## Tasks [PROJECT]

Implement registry-backed:

```text
/rostov-na-donu/kvartiry/{district}/
```

- P1 list from section 9;
- P2 requires ≥5 active matching objects;
- TEST requires ≥10;
- NONE/filter-only never resolves as public SEO path;
- metadata selects `APT_DISTRICT_ADMIN` or `APT_DISTRICT_MICRO` by `district.type`;
- district aliases always canonicalize to one slug;
- link back to city catalog;
- cross-link relevant ЖК without changing intent ownership.

## DoD [PROJECT]

- P1/P2/TEST behavior deterministic;
- semantic collisions from `collisions.csv` do not produce duplicate-intent novostroyki district pages;
- inventory drop converts valid page to noindex, not 404.

## Checks [PROJECT]

- synonym canonical tests;
- threshold tests;
- collision fixtures;
- `pnpm verify:seo-contracts`.

---

# EPIC-27 — PROPERTY DETAILS BY CATEGORY [PLATFORM]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/27-property-details`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Category-aware property DTO/view/runtime and lifecycle behavior exist; only real-data acceptance remains.

## Tasks [PLATFORM]

ACTIVE R1:

```text
/kvartiry/{semantic}-{publicUrlId}/
```

Lifecycle:

```text
secondary active → 200/index candidate
secondary retained archived → 200/noindex
newbuild unit → 200/noindex
purged with explicit replacement → 301
purged no replacement → real 410
```

Prepare shared template/data discriminants for house/land/commercial behind category status, without public routes.

`/obekty/{slug}/` remains compatibility route only according to migration registry.

## DoD [PLATFORM]

- real HTTP lifecycle semantics preserved from starter;
- category canonical generated centrally;
- PREPARED_OFF details are unreachable publicly/404.

## Checks [PLATFORM]

```bash
pnpm verify:product-regression
pnpm verify:seo-contracts
pnpm verify:merge-risky
```

---

# EPIC-28 — LEGACY APARTMENT MIGRATION [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/28-legacy-apartments`

## Tasks [PROJECT]

Migrate proven legacy apartment URLs individually.

Decision matrix:

```text
active entity → 301 category canonical
archived retained → lifecycle decision
purged replacement → 301
no replacement → 410
```

No mass redirect to city catalog.

## DoD [PROJECT]

- all legacy apartment URLs accounted for;
- no chain through `/obekty/`;
- target semantics match old intent/entity where possible.

## Checks [PROJECT]

- old→new status table;
- redirect-chain test;
- sitemap exclusion old canonicals.

---

# EPIC-29 — SERVICE + TRUST + LEGAL PAGES [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/29-service-trust-legal`

## Tasks [PROJECT]

Build retained R1 routes:

```text
/uslugi/
/prodat/
/ipoteka/
/ipoteka/semeynaya/
/o-kompanii/
/kontakty/
privacy/consent/legal pages
```

- mortgage rates require internal source + checkedAt, neither rendered as a public attribution/check date by default;
- `/otzyvy/` remains hidden/`404` until a verified review source exists, then may be enabled through the same Gate;
- `/stroitelstvo-domov/` and `/journal/**` remain outside R1;
- proven legacy variants may receive only explicit same-intent redirect/archive outcomes from EPIC-03/04.

## DoD [PROJECT]

- no placeholder legal/factual copy in release;
- lead contexts correct;
- canonical slug transliteration consistent.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-30 — JOURNAL [PROJECT]

**Release:** R2 / FUTURE
**Risk:** RISKY  
**Branch:** `epic/30-journal`

## Assembly status — owner decision 2026-10-01 [PROJECT]

`FUTURE-NOT-R1`. Journal remains disabled in R1. Legacy article URLs are still inventoried in EPIC-03 and receive explicit keep/redirect/archive decisions; they do not activate a journal module automatically.

## Future tasks [PROJECT]

Activate `posts` module and reconcile module governance only after a separate owner trigger and approved content/media source.

Routes:

```text
/journal/
/journal/category/{slug}/
/journal/{slug}/
```

- migrate useful legacy articles/URLs;
- audit media rights;
- copy approved media to own storage;
- link contextually to commercial pages;
- no uncontrolled hotlinks.

## DoD [PROJECT]

- journal manifest/module state consistent;
- legacy kept/redirected explicitly;
- media provenance valid.

## Checks [PROJECT]

```bash
pnpm quality:guards
pnpm verify:seo-contracts
pnpm verify:merge-risky
```

---

# EPIC-31 — LEADS: ЖК PRICE REQUEST + QUIZ [PLATFORM]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/31-leads`

## Tasks [PLATFORM]

Reuse existing lead engine/outbox/idempotency/access.

Canonical backend kinds for R1:

```text
development_price
quiz
```

Presentation kind `development` maps to backend `development_price`; do not add a duplicate `zhk_price_request` backend kind.

Preserve current backend forms:

```text
property_request
callback
consultation
generic
```

Update presentation→intake mapping explicitly; do not create a parallel lead taxonomy.

Extend safe relational context:

```text
property?
development?
district?
city?
region?
dataTier?
```

`development_price` requires server-side canonical validation of a published Development; a normalized client string is not authority.

R1 delivery channel is MAX. Its credentials/destination ownership remain in Secret Master and require safe outbound/retry proof.

`quiz` stores only necessary selected preferences; raw PII rules unchanged.

Yandex Metrica receives only approved non-PII events/dimensions after consent. No PII in analytics/logs.

## DoD [PLATFORM]

- existing lead retries/idempotency unchanged;
- forms persist through the same System Gateway/outbox;
- MAX delivery is proven with no secrets/PII in logs;
- Development context is canonical and server-validated;
- owner-only PII/access contract preserved.

## Checks [PLATFORM]

```bash
pnpm verify:lead-intake
pnpm verify:lead-outbox
pnpm verify:lead-delivery-state
pnpm verify:security-boundaries
pnpm verify:merge-risky
```

---

# EPIC-32 — SITEMAPS / ROBOTS / INDEXNOW [PLATFORM]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/32-sitemaps`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. Sitemap/robots/IndexNow mechanisms exist. Final acceptance reruns after measured registry/data while global noindex remains active.

## Tasks [PLATFORM]

Implement logical maps from section 24.

- local surfaces: effective ACTIVE + registry/Gate; `NOINDEX_AUTO` outside sitemap; PREPARED_OFF/OUT excluded;
- global entities: categoryStatus/marketCapability + lifecycle + entity Gate, independent of inactive local geo catalog;
- exclude Tier C;
- exclude newbuild units;
- global category roots excluded in SINGLE_GEO;
- primary `/{geo}/` included when registry/Gate indexable;
- no synthetic lastmod;
- robots respects project production indexing and per-page engine;
- IndexNow publish/unpublish/update events bounded and retry-safe.

## DoD [PLATFORM]

- sitemap count/content deterministic;
- no disabled URL leaks;
- robots project-level and page-level policies do not conflict.

## Checks [PLATFORM]

```bash
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-33 — INTERNAL LINKING [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/33-internal-linking`

## Tasks [PROJECT]

Graph:

```text
Home → novostroyki geo / kvartiry geo / developers geo
Novostroyki geo → developments / developers / approved sections
Development → novostroyki geo / developer / related / apartment units
Kvartiry geo → vtorichka / district pages / secondary entities
District → city catalog / secondary properties / relevant developments
Developer → developments
Property → city/district / development if linked
Retained service/trust pages → relevant commercial pages
```

No mass link spam. No PREPARED_OFF links. Journal links are forbidden in R1 while EPIC-30 is disabled.

## DoD [PROJECT]

- no orphan index candidates;
- breadcrumbs follow intent hierarchy;
- collision cross-links do not blur canonical ownership.

## Checks [PROJECT]

- crawl graph/orphan report;
- internal canonical target validation.

---

# EPIC-34 — FEED ONBOARDING [PROJECT]

**Release:** R2 / FUTURE
**Risk:** RISKY  
**Branch:** `epic/34-feed-onboarding`

## Assembly status — owner decision 2026-10-01 [PROJECT]

`FUTURE-NOT-R1`. R1 is Excel-first and no approved XML feed currently exists. Feed absence cannot block the 24-priority-ЖК R1 path.

## Future tasks [PROJECT]

Only after the owner supplies/approves a real feed contract, use the existing ingest:

- explicit taxonomy mapping from EPIC-10;
- geo text → normalized relations;
- external complex identity → Development where confidently mapped;
- unknown → needsReview;
- first successful run establishes baseline and cannot mass-deactivate.

Developer-specific newbuild feed expansion remains EPIC-46.

## DoD [PROJECT]

- one safe real feed can ingest without corrupting manual/Excel development data;
- unknown categories never silently fallback.

## Checks [PROJECT]

```bash
pnpm verify:feed-parser
pnpm verify:feed-ingest
pnpm verify:feed-lifecycle
pnpm verify:manual-ownership
pnpm verify:merge-risky
```

---

# EPIC-35 — CACHE [PLATFORM]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/35-cache`

## Assembly status — 2026-10-01 [PLATFORM]

`COMPLETE / IMPORTED CAPABILITY`. HTTP invalidation, tags, allowlists, batching and jobs integration exist; real-data staging proof remains in EPIC-40.

## Tasks [PLATFORM]

Extend existing HTTP invalidation allowlists/targets for all canonical pageKeys and use URL builder output only.

Canonical cache tags:

```text
geo:{slug}
geo:{slug}:cat:{category}
district:{citySlug}:{slug}
development:{slug}
developer:{slug}
property:{publicUrlId}
```

On publish/archive/material change of an entity invalidate as applicable:

```text
entity tag
its geo:{slug}
its geo:{slug}:cat:{category}
its district:{citySlug}:{slug}
linked development:{slug}
linked developer:{slug}
```

Inactive local geo route does not become revalidation target merely because a global entity from that geo changed. Tag invalidation may still update aggregations/nearby blocks that legally reference the entity.

Avoid revalidation explosion after bulk import: bounded target/tag batching and coalescing. Deny arbitrary targets outside grammar/allowlists.

## DoD [PLATFORM]

- all ACTIVE/global entity data changes invalidate required canonical surfaces;
- geo/category/district/development/developer/property tag graph tested;
- denied arbitrary targets remain blocked;
- bulk Excel import has bounded cache strategy.

## Checks [PLATFORM]

```bash
pnpm quality:guards
pnpm verify:merge-risky
```

---

# EPIC-36 — ANALYTICS [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/36-analytics`

## Tasks [PROJECT]

Provider: Yandex Metrica, activated only after consent/privacy configuration. Events:

```text
home_view
geo_hub_view
novostroyki_catalog_view
kvartiry_catalog_view
district_view
facet_view
filter_apply
map_open
development_open
developer_open
property_open
quiz_start
quiz_complete
lead_open
lead_submit
phone_click
messenger_click
```

Every event receives canonical non-PII dimensions where applicable:

```text
geo_slug
page_key
category
market
```

Additional non-PII dimensions may include:

```text
dataTier
district_slug
source_surface
```

No raw names/phones/emails/messages/IP in analytics. `geo_slug` is factual entity/page context, not derived from raw IP.

## DoD [PROJECT]

- Yandex Metrica adapter is wired through the approved consent path;
- conversion funnel measurable;
- event schema documented;
- required four dimensions covered by contract/tests;
- PII review passed and event payloads contain no source URLs, checkedAt, names, phones, emails or free text.

## Checks [PROJECT]

- analytics fixture/event contract test;
- security/log review.

---

# EPIC-37 — PERFORMANCE [PLATFORM]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/37-performance`

## Tasks [PLATFORM]

Measure:

```text
RSC/client boundaries
catalog JS
HTML crawlability
pagination
map lazy loading
galleries
image strategy
fonts
LCP
CLS
INP
DB query counts
bounded aggregates
cache behavior
```

Pay special attention to:

- all-ЖК map;
- district/facet counts;
- development galleries;
- dynamic metadata counts.

No Redis/Meilisearch without measured trigger.

## DoD [PLATFORM]

- baseline recorded;
- critical regressions fixed;
- expensive queries indexed/bounded.

## Checks [PLATFORM]

```bash
pnpm build
pnpm verify:merge-standard
```

---

# EPIC-38 — UI / ACCESSIBILITY QA [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/38-ui-a11y`

## Representative ACTIVE pages [PROJECT]

```text
/
/rostov-na-donu/novostroyki/
/novostroyki/zhk-example/
/rostov-na-donu/zastroyshchiki/
/zastroyshchiki/example/
/rostov-na-donu/kvartiry/
/rostov-na-donu/kvartiry/vtorichka/
/rostov-na-donu/kvartiry/severnyy/
/kvartiry/example-1001/
/ipoteka/
/prodat/
/o-kompanii/
/kontakty/
404
410
```

PREPARED_OFF pages are tested as 404, not visually QA’d as public templates.

## Tasks [PROJECT]

- desktop/mobile/tablet;
- keyboard/focus;
- modal/map/gallery behavior;
- breadcrumbs;
- form errors/consent;
- contrast/semantics;
- no unapproved visual drift from the current Bastion-template baseline or UI Core;
- brand/content substitutions do not alter layout beyond factual-length responsive fixes.

## DoD [PROJECT]

- UI Core/a11y gates green;
- representative matrix signed off.

## Checks [PROJECT]

```bash
pnpm verify:ui-core
pnpm verify:a11y-starter
pnpm verify:merge-standard
```

---

# EPIC-39 — SECURITY / ARCHITECTURE AUDIT [PLATFORM]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/39-security-audit`

## Tasks [PLATFORM]

Audit:

```text
Payload ownership
Gateway/DTO boundaries
overrideAccess
private fields
raw REST
migrations
jobs
ingest + Excel import
taxonomy mapping
SSRF
image hosts
secrets
lead PII/rate limit/webhooks
storage
staging
backup
cache
slug namespace
category-status bypass
SEO registry injection
```

P0/P1 = 0 required.

## DoD [PLATFORM]

- audit report exists;
- all P0/P1 closed or release blocked;
- no public bypass around PREPARED_OFF.

## Checks [PLATFORM]

```bash
pnpm verify:security-boundaries
pnpm quality:architecture
pnpm quality:guards
pnpm verify:merge-risky
```

---

# EPIC-40 — STAGING [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/40-staging`

## Tasks [PROJECT]

Deploy chosen owner-approved topology.

Prove:

```text
DB migrations
media storage chosen topology
Payload Admin
geo/districts
developments/developers
Excel import
ACTIVE category routes
PREPARED_OFF 404
property lifecycle
leads/jobs/feeds/cache
backup
restart
staging noindex
```

If Timeweb Managed PG/S3 selected, prove real upload/migration/restore. If another approved topology selected, equivalent proof applies.

## DoD [PROJECT]

- staging exact SHA known;
- no production indexing;
- operational recovery works.

## Checks [PROJECT]

```bash
pnpm verify:client-readiness
pnpm verify:integration:required
```

---

# EPIC-41 — SEO CRAWL OLD / NEW [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/41-seo-crawl`

## Tasks [PROJECT]

Compare old production and staging:

```text
status
canonical
robots
title
description
H1
indexing
redirects/chains
orphans
pagination
sitemaps
robots
breadcrumbs
structured data
query filters
facets
districts
category statuses
newbuild unit noindex
Tier C noindex
```

Every old indexable URL explicit.

## DoD [PROJECT]

- migration gaps = 0 unresolved critical;
- no disabled category leaks;
- canonical graph stable.

## Checks [PROJECT]

- crawl diff report;
- sitemap-vs-crawl diff;
- structured data validation report.

---

# EPIC-42 — MIGRATION REHEARSAL [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/42-migration-rehearsal`

## Tasks [PROJECT]

Simulate:

```text
OLD URL
→ ACTION
→ NEW URL
→ STATUS
→ CANONICAL
→ ROBOTS
```

Verify separately:

- 301 migrations;
- 308 slash normalization;
- real 410;
- KEEP routes;
- `/obekty/` compatibility;
- category status 404.

No production action.

## DoD [PROJECT]

- rehearsal artifact complete;
- no redirect chain;
- rollback assumptions documented.

## Checks [PROJECT]

- automated redirect graph test;
- old URL sample/full manifest replay.

---

# EPIC-43 — RELEASE CANDIDATE [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Branch:** `epic/43-release-candidate`

## Tasks [PROJECT]

Run full verification and freeze exact candidate SHA/artifact.

Require:

```text
SEO crawl PASS
namespace/grammar guard PASS
Content Gate PASS
category-status PASS
district threshold PASS
Tier/stale-price PASS
lifecycle PASS
legacy manifest PASS
secret scan PASS
staging PASS
backup/restore PASS
performance baseline
UPSTREAM_CANDIDATES current
architecture/copy ownership guards PASS for src/core + packages
P0/P1=0
```

## DoD [PROJECT]

- exact SourceCraft SHA;
- immutable artifact;
- rollback point;
- owner release package ready;
- `docs/UPSTREAM_CANDIDATES.md` актуален для всех `[PLATFORM]` modules;
- reusable `src/core/**` + `packages/**` contain 0 client brand/domain/city marketing literals under existing architecture/copy guards;

## Checks [PROJECT]

```bash
pnpm verify
pnpm verify:schema
pnpm verify:integration:required
pnpm verify:ui-core
pnpm verify:client-readiness
```

---

# EPIC-44 — PRODUCTION CUTOVER [PROJECT]

**Release:** R1  
**Risk:** RISKY  
**Trigger:** explicit owner command only  
**Branch:** `epic/44-production-cutover` or release procedure branch according to SourceCraft policy

## Sequence [PROJECT]

```text
freeze legacy manifest
→ backup
→ verify exact SHA/artifact
→ deploy
→ migrations
→ jobs owner handover
→ Nginx/DNS
→ smoke
→ 301 checks
→ 308 checks
→ lifecycle checks
→ lead forms
→ sitemaps/robots
→ IndexNow readiness
→ owner approval
→ public indexing only if approved config = public
```

No feature work during cutover.

## DoD [PROJECT]

- production matches release candidate;
- rollback available;
- critical routes/forms verified;
- indexing state intentional.

## Checks [PROJECT]

- production smoke checklist;
- exact SHA proof;
- post-deploy crawl sample.

---

# EPIC-45 — POST-LAUNCH MONITORING + 30-DAY SEMANTIC SNAPSHOT [PROJECT]

**Release:** R1  
**Risk:** STANDARD  
**Branch:** `epic/45-post-launch-monitoring` only for code/docs changes; monitoring itself operational

## Monitor [PROJECT]

```text
404
410
301
308
indexation
canonical selection
sitemaps
Yandex Webmaster
Google Search Console if connected
novostroyki geo
developments
developers
kvartiry geo
districts
facets
secondary properties
lead delivery
```

Windows:

```text
Day 1
Day 3
Day 7
Day 14
Day 30
```

At ~Day 30 repeat semantic snapshot for:

- Tier A/B developments;
- district P1/P2/TEST;
- developers;
- Bataysk;
- home/novostroyki/kvartiry core intents.

No major architecture change from 1–2 days of SERP movement.

## DoD [PROJECT]

- monitoring report complete;
- 30-day semantic delta stored;
- follow-up decisions use evidence.

## Checks [PROJECT]

- Day 1/3/7/14/30 monitoring checklist;
- indexation/canonical/sitemap delta report;
- 30-day semantic snapshot diff against `2026-09-23`;
- unresolved critical production incidents = 0 before closing the Epic.

---

# EPIC-46 — R2: TIER B EXPANSION + DEVELOPER FEEDS [PROJECT]

**Release:** R2  
**Risk:** RISKY  
**Branch:** `epic/46-r2-development-feeds`

## Tasks [PROJECT]

- promote confirmed C→B based on price/completeness evidence;
- onboard selected developer feeds through existing SAX ingest;
- map source identities to developments/buildings/layouts where justified;
- preserve Excel/manual ownership rules;
- no silent overwrite of manual facts;
- extend Tier A/B inventory based on confirmed data.

## DoD [PROJECT]

- source ownership deterministic;
- feeds do not create duplicate developments;
- price freshness sourced automatically where possible.

## Checks [PROJECT]

```bash
pnpm verify:feed-ingest
pnpm verify:manual-ownership
pnpm verify:merge-risky
```

---

# EPIC-47 — R2: NOVOSTROYKI × DISTRICTS + NOVOSTROYKI FACETS [PROJECT]

**Release:** R2  
**Risk:** STANDARD  
**Branch:** `epic/47-r2-novostroyki-seo-expansion`

## Tasks [PROJECT]

Enable only registry candidates passing:

```text
novostroyki district:
 broad39 >=100
 developments >=3
 no development collision
 Gate pass

novostroyki facet:
 whitelist
 semantic proof
 inventory threshold
 unique content
 Gate pass
```

Known collision developments keep intent ownership; no duplicate district route.

## DoD [PROJECT]

- no auto-generated combinatorial URLs;
- all new pages in sitemap/internal linking only after Gate.

## Checks [PROJECT]

```bash
pnpm verify:seo-contracts
pnpm verify:merge-standard
```

---

# EPIC-48 — R2: PRICE ANALYTICS `/analitika/` [PROJECT]

**Release:** R2  
**Risk:** RISKY  
**Branch:** `epic/48-analytics-content`

## Tasks [PROJECT]

Create analytics section only from stored, time-bounded, source-backed data.

Potential route:

```text
/analitika/
```

Scope:

- market/development price statistics;
- period comparisons;
- methodology;
- source dates;
- no synthetic market claims.

Do not infer this page is indexable until separate semantic/Gate evidence.

## DoD [PROJECT]

- metric methodology documented;
- stale/insufficient datasets fail closed;
- no PII/source leakage.

## Checks [PROJECT]

- calculation fixtures;
- SEO/content Gate;
- performance query review.

---

# EPIC-49 — R3: ENABLE HOUSES PREPARED_OFF → ACTIVE [PROJECT]

**Release:** R3  
**Risk:** RISKY  
**Branch:** `epic/49-enable-houses`

## Trigger [PROJECT]

Owner-approved activation based on commercial/data/SEO readiness. Known semantic candidate: `купить дом ростов` broad39 **14 061** (`2026-09-23`).

## Tasks [PROJECT]

- change `doma` status to ACTIVE;
- semantic/registry refresh;
- activate root + geo routes;
- enable house detail public canonical;
- Content Gate/thresholds;
- sitemap/navigation/internal linking;
- representative UI tests;
- ensure construction-service intent remains separate.

## DoD [PROJECT]

- full PREPARED_OFF activation checklist completed in one controlled PR series/defined Epic;
- no accidental activation of land/commercial/KP.

## Checks [PROJECT]

```bash
pnpm verify:schema
pnpm verify:seo-contracts
pnpm verify:ui-core
pnpm verify:merge-risky
```

---

# EPIC-50 — R3: MULTI_GEO BATAYSK ACTIVATION [PROJECT]

**Release:** R3  
**Risk:** RISKY  
**Branch:** `epic/50-multigeo-bataysk`

## Trigger [PROJECT]

Explicit owner decision after R1 evidence. Initial semantic candidate: `купить квартиру батайск` broad39 **4 043** (`2026-09-23`).

## Tasks [PROJECT]

Configuration/data/registry activation only:

```text
geoMode: SINGLE_GEO → MULTI_GEO
publish/approve Bataysk geo data
set geoCategoryStatus for Bataysk
set marketStatus for Bataysk
materialize Bataysk SEO registry rows
update semantic evidence
enable geo-switcher via existing mode behavior
```

Activate only approved Bataysk surfaces. Example: `kvartiry=ACTIVE` may be enabled while `novostroyki=PREPARED_OFF`.

Expected route effects from already-shipped platform code:

```text
/rostov-na-donu/ → remains 200, self-canonical, same intent owner
/bataysk/ → 200 registry outcome after activation
/bataysk/kvartiry/ → 200 registry outcome if ACTIVE
/rostov-na-donu/kvartiry/ → unchanged canonical
/novostroyki/zhk-{slug}/ → unchanged global entity URL
/kvartiry/{semantic}-{publicUrlId}/ → unchanged global entity URL
```

No data rewrite for existing Bataysk developments/properties. No intent ownership migration for `/` or `/rostov-na-donu/`.

## Hard constraint [PLATFORM]

EPIC-50 must not require changes in platform `src/`. If activation requires resolver, sitemap, Content Gate, breadcrumb, entity URL, indexing-engine, URL builder/parser or status-enum code changes, EPIC-50 is blocked and defect returns to responsible R0 platform Epic.

## DoD [PROJECT]

- Батайск включён без изменений в `src/`: только данные, конфиг, registry и семантика;
- `/rostov-na-donu/` до и после activation остаётся `200` и сохраняет canonical/intent ownership;
- `/bataysk/` becomes `200` only by project activation;
- global entity URLs unchanged;
- nearby/agglomeration blocks and city counts remain semantically correct;
- fixture-multi-geo behavior matches real activation.

## Checks [PROJECT]

```bash
pnpm verify:seo-contracts
pnpm verify:ui-core
pnpm verify:merge-risky
```

---

# 29. FUTURE / NOT R1 [PROJECT]

Not part of R1 unless activated by explicit Epic/owner decision:

```text
MULTI_GEO beyond Bataysk
public novostroyki district pages
novostroyki SEO facets
buildings/layouts/chessboard as independent public module
rent / arenda
employee module /sotrudniki/**
houses category activation
land category activation
commercial category activation
cottage villages activation
advanced market analytics
search engine / Meilisearch
Redis
```

Schema readiness is not public activation.

---

# 30. PAGE RESPONSIBILITY MATRIX — R1 [PROJECT]

| Page / pattern | Role | Effective R1 behavior |
|---|---|---|
| `/` | agency / brand / realtor owner | index after Gate; does not own generic `недвижимость Ростов` |
| `/rostov-na-donu/` | primary geo hub / `недвижимость Ростов` owner | `200`, self-canonical, registry + Gate |
| `/bataysk/` | inactive other geo hub | `404` in R1 SINGLE_GEO |
| `/novostroyki/` | global category root | `200 noindex,follow`, outside sitemap |
| `/rostov-na-donu/novostroyki/` | primary Rostov newbuild/ЖК catalog | index after Gate |
| `/novostroyki/zhk-{slug}/` Tier A/B | global development entity | index after development Gate even when own local geo hub is inactive |
| `/novostroyki/zhk-{slug}/` Tier C | global discovery/passport entity | `200 noindex,follow`, outside sitemap |
| `/zastroyshchiki/` | global developer root | `200 noindex,follow` in SINGLE_GEO |
| `/rostov-na-donu/zastroyshchiki/` | Rostov developers hub | index after min-5 + listing Gate |
| `/zastroyshchiki/{slug}/` | global developer entity | index only by developer entity Gate §11/§16.1 |
| `/kvartiry/` | global apartment root | `200 noindex,follow`, outside sitemap |
| `/rostov-na-donu/kvartiry/` | all locally allowed sale apartment inventory | index after Gate |
| `/rostov-na-donu/kvartiry/vtorichka/` | secondary apartments | index after tier + Gate |
| `/rostov-na-donu/kvartiry/{district}/` | district apartment intent | P1/P2/TEST project registry |
| `/kvartiry/{secondary-slug}/` | global secondary property entity | lifecycle + Gate; may index for Bataysk/Aksay even while their hubs are 404 |
| `/kvartiry/{newbuild-unit-slug}/` | global newbuild unit | `200 noindex,follow`; outside sitemap by D-10 |
| `/ipoteka/` | global service route; primary-city metadata in SINGLE_GEO | index after Gate; MULTI strategy OQ-14 |
| `/ipoteka/semeynaya/` | family mortgage subservice under the mortgage owner | R1 candidate after evidence/Gate; exact legacy variants redirect here only after EPIC-03 proof |
| `/prodat/` | global seller acquisition route | index after Gate; MULTI strategy OQ-14 |
| `/stroitelstvo-domov/` | future construction service | R1 `404`; exact legacy redirect only to a proven same-intent target |
| `/o-kompanii/` | company | index after Gate |
| `/otzyvy/` | reviews/trust | source-backed content + Gate |
| `/kontakty/` | contacts/NAP | index after Gate |
| `/journal/**` | future journal module | R1 `404` unless an exact legacy URL receives an explicit redirect/archive decision; module activation moves to R2 |
| `doma/**` | prepared schema only | `404` |
| `uchastki/**` | prepared schema only | `404` |
| `kommercheskaya-nedvizhimost/**` | prepared schema only | `404` |
| `kottedzhnye-poselki/**` | prepared schema only | `404` |
| `/arenda/**` | OUT | `404` unless explicit legacy 301 |
| `/sdat/` | OUT | `404` unless explicit legacy 301 |

Geo hub is a stable supported platform surface. Primary `/rostov-na-donu/` is already `200` in R1 SINGLE_GEO and does not change ownership/status merely because MULTI_GEO is enabled later.

---

# 31. DEFINITION OF DONE — v4.1.1 R1 [PROJECT]

## Repository / delivery [PROJECT]

- [ ] private SourceCraft client repository;
- [ ] starter provenance pinned;
- [ ] latest-compatible-stable direct stack snapshot rechecked on implementation date;
- [ ] EPIC-01 stack uplift/compatibility proof complete with exact Node/pnpm/Docker/lock alignment;
- [ ] Next/React/Payload/TypeScript/Tailwind and PostgreSQL compatibility verified from official sources;
- [ ] no canary/RC/prerelease dependency in the approved stack;
- [ ] client activation complete;
- [ ] one independent open Epic = one branch/worktree/PR;
- [ ] every delivery task declares `PR_ONLY` or explicitly approved `MERGE_AFTER_GATE`;
- [ ] exact-head gates are used only where merge/release policy requires them.

## Architecture [PROJECT]

- [ ] max-3-segment URL grammar implemented;
- [ ] primary `/{geo}/` = `200` registry candidate in SINGLE/MULTI; inactive other geo = `404` in SINGLE;
- [ ] `siteGrammar` code-owned config implemented;
- [ ] owner-controlled `SINGLE_GEO`;
- [ ] unified status enum `ACTIVE/NOINDEX_AUTO/PREPARED_OFF/OUT` enforced centrally;
- [ ] `geoCategoryStatus` enforced per geo;
- [ ] `marketCapability` enforced for global market entities;
- [ ] `marketStatus` enforced only for local geo market listings;
- [ ] SINGLE_GEO/MULTI_GEO mode matrix implemented;
- [ ] `buildUrl/parseUrl` is the single URL source; roundtrip property passes;
- [ ] resolver deterministic;
- [ ] transliteration helper/lint frozen;
- [ ] namespace/collision, URL grammar, architecture direction, copy ownership and SEO registry checks are merge-blocking through existing project scripts;
- [ ] trailing slash = one 308;
- [ ] SEO 301 kept separate from 308.

## Starter compatibility [PROJECT]

- [ ] novostroyki manifest/governance reconciled with unified `developments`;
- [ ] frozen contracts changed only through contract workflow;
- [ ] existing Public/System/Ingest Gateway boundaries preserved;
- [ ] `/obekty` lifecycle migrated without losing real 410 semantics;
- [ ] lead outbox/idempotency/access preserved.

## Geo / districts [PROJECT]

- [ ] regions/cities/districts exist;
- [ ] City `nameGenitive/nameLocative/preposition` implemented and owner-approved before metadata;
- [ ] City `agglomerationOf` implemented with self/cycle guard;
- [ ] district nullable-parent/type/synonyms/cases implemented;
- [ ] microdistrict URL does not depend on parent; unconfirmed/cross-district parent may be null;
- [ ] 8 admin districts + required microdistrict seed loaded;
- [ ] source raw geo text retained where needed;
- [ ] apartment district pages use P1/P2/TEST rules;
- [ ] filter-only districts do not resolve as SEO path;
- [ ] ЖК ↔ district homonyms handled only as semantic intent collisions in `collisions.csv`; district↔facet namespace guard implemented.

## Developments / developers [PROJECT]

- [ ] unified `developments` collection;
- [ ] `zhk-` / `kp-` grammar;
- [ ] city suffix only on real global entity↔entity collision;
- [ ] Tier A/B/C implemented with capacity guidance A≈30, A+B≈60, total≈80–100;
- [ ] §16.1 owns Gate mechanics; effective project numbers/config are typed/frozen where market-dependent;
- [ ] all published tiers visible in discovery catalog/map;
- [ ] Tier C noindex;
- [ ] 45-day stale-price rule enforced;
- [ ] >120-day all-stale A/B prices fail Gate without changing dataTier;
- [ ] fresh structured data only;
- [ ] developer geo hub min 5 and developer entity Gate (≥1 Gate-passed ЖК + ≥600 chars sourced description) implemented;
- [ ] no automatic development 410.

## Excel import [PROJECT]

- [ ] 5-sheet workbook schema documented/implemented, including `Застройщики`;
- [ ] workbook template export command produces `.xlsx` with headers + enum hints before data collection;
- [ ] per-sheet Zod validation including media conditional fields;
- [ ] unknown developerSlug is an error;
- [ ] published development slug mutation is rejected;
- [ ] dry-run report;
- [ ] idempotent slug-keyed upsert;
- [ ] import history;
- [ ] priceCheckedAt per price row;
- [ ] no public mutation API;
- [ ] unknown relations fail/needsReview, never guessed.

## Properties [PROJECT]

- [ ] single properties collection preserved;
- [ ] all target categories represented in schema/DTO/mapping;
- [ ] only apartment/sale ACTIVE in R1;
- [ ] rent publication blocked;
- [ ] normalized geo/development relations;
- [ ] category canonical for apartment detail;
- [ ] secondary details lifecycle/indexing correct;
- [ ] newbuild unit D-10 noindex/outside sitemap;
- [ ] PREPARED_OFF detail routes return 404.

## SEO [PROJECT]

- [ ] semantic snapshot stored with `snapshotDate=2026-09-23`;
- [ ] exact QA/collision QA completed;
- [ ] `SEO_REGISTRY_SEED.csv` exists with metadata/source/Gate columns; `source` enum = `broad39|webmaster|fallback_no_data`; every URL passes `registry-url`;
- [ ] §17.3 contains canonical Title/H1 for all specified R1 pageKey;
- [ ] Description materialization follows intent + DTO facts + CTA;
- [ ] typed `seoTiers` mechanism implemented; Souz numeric values live in `[PROJECT]` config, not platform defaults;
- [ ] all apartment facets resolved from `PENDING_MEASUREMENT` to measured tier or `NONE` in EPIC-04;
- [ ] no unresolved R1 SEO-threshold placeholder;
- [ ] vtorichka ownership frozen;
- [ ] apartment facet whitelist typed;
- [ ] novostroyki R2 whitelist typed but inactive;
- [ ] valid thin ACTIVE pages = 200/noindex;
- [ ] PREPARED_OFF/OUT = 404;
- [ ] query filters noindex;
- [ ] pagination crawlable + self-canonical;
- [ ] sitemap ACTIVE/Gate-only;
- [ ] no newbuild units/Tier C in sitemap;
- [ ] no synthetic lastmod/dateModified;
- [ ] structured data policy enforced;
- [ ] IndexNow bounded and safe.
- [ ] `fixture-single-geo`, `fixture-multi-geo`, `fixture-newbuild-first`, `fixture-secondary-first` pass resolver/sitemap/Gate matrix;
- [ ] global entity URLs remain unchanged across fixture modes;
- [ ] inactive-geo secondary entity fixture = 200 by Gate while its geo hub/catalog = 404 and unlinked;
- [ ] all sitemap URLs are buildUrl-derived and return 200;
- [ ] category-first paths return 404;
- [ ] `docs/UPSTREAM_CANDIDATES.md` is current; reusable `src/core/**` + `packages/**` contain no client project literals;

## Content / trust [PROJECT]

- [ ] variable facts have internal source + checkedAt; neither leaks to public UI by default;
- [x] NAP/legal identity approved for planning in §19.1;
- [ ] privacy/consent/legal text drafted and owner-approved before staging/indexing;
- [ ] reviews/ratings source-backed or hidden;
- [ ] all 24 priority ЖК identity-matched to canonical source pages;
- [ ] every publish-eligible priority ЖК has `>=5` validated Payload/S3 photos;
- [ ] owner-attested Yandex Realty partner rights recorded internally;
- [ ] no public source attribution required for the approved Yandex Realty package;
- [ ] media rights audited, binaries absent from Git and no uncontrolled hotlinks;
- [ ] placeholders remain noindex staging-only and cannot satisfy Content Gate;
- [ ] no fake statistics/prices/availability.

## Leads [PROJECT]

- [ ] existing public intake path retained;
- [ ] canonical backend `development_price` implemented and presentation kind `development` maps to it without a duplicate lead kind;
- [ ] `quiz` implemented;
- [ ] dataTier/development context safe;
- [ ] PII absent from analytics/logs;
- [ ] owner-only PII capability unchanged;
- [ ] outbox/delivery state tests green.

## Infrastructure / operations [PROJECT]

- [x] topology decision written by owner (Timeweb VPS + managed PostgreSQL + Payload-managed Timeweb S3);
- [ ] Secret Master only;
- [ ] one jobs owner;
- [ ] staging isolated/noindex;
- [ ] selected DB/storage topology proven;
- [ ] automatic backup + restore drill;
- [ ] monitoring ready.

## Release [PROJECT]

- [ ] legacy manifest complete;
- [ ] old/new SEO crawl pass;
- [ ] migration rehearsal pass;
- [ ] P0/P1 = 0;
- [ ] performance baseline;
- [ ] full verification pass;
- [ ] exact SourceCraft SHA;
- [ ] immutable artifact;
- [ ] rollback point;
- [ ] explicit owner production command.

---

# 31.1. CORRECTED DEPENDENCY WAVES — FINAL AUDIT v5 [PROJECT]

These waves replace the old linear greenfield sequence. They do not import Beads and do not authorize production. Dependency types:

- `HARD` — technical output required before successor;
- `CONTRACT` — URL/schema/DTO/SEO decision must be frozen;
- `SOFT` — safe parallel work on stable interfaces;
- `OWNER` — business/factual decision cannot be invented;
- `PRODUCTION` — separate explicit owner command.

## Wave A — plan and imported-baseline acceptance

- lock EPIC-00/02 as completed and preserve the completed import part of EPIC-01;
- complete the reopened EPIC-01 latest-stable compatibility uplift before feature implementation;
- accept existing capabilities in EPIC-09/10/11/12/14/27/32/35 instead of rebuilding them;
- complete EPIC-05 Source-of-Truth/ADR/module reconciliation against actual owners;
- classify starter drift and remove obsolete paths/checks from the plan.

Exit: one coherent client architecture and no duplicate platform owner. This is a `HARD` boundary for downstream feature implementation, not for architecture approval: dependency upgrades and code reconciliation occur only after owner approval/handoff.

## Wave B — independent evidence and owner decisions

Safe parallel tracks:

- EPIC-03 legacy crawl and route decisions (`EXTERNAL`, then `CONTRACT`; inaccessible URLs are recorded and do not block unrelated work);
- EPIC-04 semantic evidence/collisions/registry measurements (`EXTERNAL`, final freeze depends only on relevant EPIC-03 URL evidence);
- EPIC-07 apply fixed NAP and prepare owner-reviewed legal/consent text (`CONTRACT`; owner approval required before staging/indexing, not before safe implementation);
- EPIC-16 preserve the fixed Bastion-template visual baseline (`CONTRACT`);
- EPIC-23 collect/verify the fixed 24-ЖК Yandex Realty/Excel/media package (`EXTERNAL` source availability with per-record skip/unpublish fallback);
- EPIC-06 fixed topology/storage/secret closure (`CONTRACT` + `EXTERNAL` account availability, no deploy and no secret values in evidence);
- execute the fixed ODR-01..07 decisions; no before-approval owner choice remains in this register.

Research collection may run concurrently. Final URL/redirect/indexing freeze cannot complete before relevant owner/evidence decisions.

## Wave C — project baseline hardening

- complete EPIC-08 Soyuz district/morphology/category seed using existing schema;
- complete EPIC-13 measured/approved client SEO registry using existing Gate mechanism;
- complete EPIC-19 project redirect rows from the real legacy manifest;
- generate and deliver the client workbook through existing EPIC-15 capability;
- remove starter fixture fallback from client public runtime;
- remove R2 novostroyki-district rows/categories from R1 project data;
- activate selected storage topology so Payload adapter, env and compose agree;
- canonicalize release secrets in Secret Master without printing values.

Exit: exact R1 profile/route/data bootstrap is safe, noindex and testable. Storage/fixture/R2 leakage are `HARD` release blockers.

## Wave D — data and public product streams

Parallel lanes on frozen contracts; every numbered lane contains serial one-Epic streams, and every independent Epic uses its own branch/worktree/PR:

1. 24 priority developments/developers + Yandex Realty photo intake + Payload/S3 import — EPIC-15/23;
2. secondary data + legacy migration — EPIC-28; EPIC-34 feed onboarding is excluded until a real owner-approved feed exists;
3. shell/home/catalog/development/developer pages — EPIC-17/18/20/21/22/24/25/26;
4. service/trust/legal pages — EPIC-29;
5. development-price/quiz and approved channels — EPIC-31;
6. journal — EPIC-30 excluded from R1 by owner and retained as R2/future work;
7. analytics — EPIC-36 implements the fixed Yandex Metrica non-PII/consent contract;
8. internal linking — EPIC-33 after the retained page set exists.

Existing DTO/Gateway/resolver/Gate interfaces are `CONTRACT` dependencies; a real gap reopens only the smallest owning capability.

## Wave E — integration quality

- final discovery/cache regression through existing EPIC-32/35 capabilities;
- EPIC-37 performance on representative pages and real-size data;
- EPIC-38 Soyuz browser/a11y matrix;
- EPIC-39 independent exact-head security/architecture audit;
- P0/P1 closure and evidence ledger.

## Wave F — staging and release

- EPIC-40 immutable exact-SHA image, pull by digest, same-image migrations, noindex technical-host proof;
- EPIC-41 old/new crawl after EPIC-03 + staging;
- EPIC-42 migration rehearsal after legacy/entity mapping;
- EPIC-43 exact release candidate with rollback and restore proof;
- EPIC-44 production cutover only after explicit owner command (`PRODUCTION`);
- EPIC-45 post-launch monitoring after cutover.

## Future waves — not R1

EPIC-30/34/46/47/48 are R2/future. EPIC-49/50 are R3. They do not enter the R1 Task Manager graph unless the owner explicitly changes scope. In particular, EPIC-47 URLs/data must not leak into R1 registry or district seeds.

# 32. EPIC ID INVENTORY — NOT A LINEAR EXECUTION ORDER [PROJECT]

The list below preserves stable Epic IDs and names. Execution follows §31.1 dependency waves, not numeric serialization.

## R0 / R1 [PROJECT]

```text
EPIC-00  SourceCraft repo / workspace
EPIC-01  Current starter baseline import
EPIC-02  Client activation / clone hygiene
EPIC-03  Legacy snapshot + starter route decisions
EPIC-04  Semantic QA + SEO / URL freeze
EPIC-05  Docs + ADR + module governance reconciliation
EPIC-06  Infrastructure topology decision / Secret Master
EPIC-07  Site settings
EPIC-08  Geo model + districts seed
EPIC-09  Developments + developers
EPIC-10  Property taxonomy + geo relations + feed mapping
EPIC-11  Contracts / discriminated DTO
EPIC-12  Public Gateway + bounded counts
EPIC-13  SEO registry + Content Gate + indexing engine
EPIC-14  Resolver + namespace guard + trailing slash
EPIC-15  Excel import ЖК
EPIC-16  UI intake
EPIC-17  Navigation shell
EPIC-18  ACTIVE route skeleton
EPIC-19  Redirect / lifecycle registry
EPIC-20  Home
EPIC-21  Novostroyki global root + Rostov geo-first catalog
EPIC-22  Development template — ЖК
EPIC-23  Development data: Tier A + B/C catalog
EPIC-24  Developers pages
EPIC-25  Apartments global root + geo-first catalog + vtorichka + facets
EPIC-26  District pages — kvartiry
EPIC-27  Property details by category
EPIC-28  Legacy apartment migration
EPIC-29  Service + trust + legal pages
EPIC-30  Journal
EPIC-31  Leads: ЖК price request + quiz
EPIC-32  Sitemaps / robots / IndexNow
EPIC-33  Internal linking
EPIC-35  Cache
EPIC-36  Analytics
EPIC-37  Performance
EPIC-38  UI / accessibility QA
EPIC-39  Security / architecture audit
EPIC-40  Staging
EPIC-41  SEO crawl old / new
EPIC-42  Migration rehearsal
EPIC-43  Release candidate
EPIC-44  Production cutover — owner command only
EPIC-45  Post-launch monitoring + 30-day semantic snapshot
```

## R2 [PROJECT]

```text
EPIC-30  Journal activation
EPIC-34  Feed onboarding after a real approved feed exists
EPIC-46  Tier B expansion + developer feeds
EPIC-47  Novostroyki × districts + novostroyki facets
EPIC-48  Price analytics /analitika/
```

## R3 [PROJECT]

```text
EPIC-49  Enable houses PREPARED_OFF → ACTIVE
EPIC-50  MULTI_GEO — Bataysk configuration activation
```

R2/R3 do not block R1 release.

---

# 33. EXECUTION DECISION REGISTER [PROJECT]

There are **zero decisions required before approval of this plan**. The rows below are deterministic execution evidence gates or later owner/production gates; they do not authorize guessing and do not block unrelated ready work.

Resolved architecture decisions:

- `OQ-01`: installed baseline is owned by current `docs/CLONE_PROVENANCE.md`, package/lockfile, Dockerfile and SourceCraft history.
- `OQ-02`: Timeweb S3 is the production media topology; local `MEDIA_DIR` is not a production fallback.
- `OQ-04`: family mortgage canonical is `/ipoteka/semeynaya/`; proven legacy variants may redirect to it.
- `OQ-05`: construction service is outside R1 and defaults to `404`.
- `OQ-07`: owner-approved NAP/legal identity is fixed in §19.1; privacy/consent wording has a later owner approval gate.
- `OQ-09`: the 24 named §10.1 ЖК are the R1 priority set; tier/indexability remains evidence-derived.
- `OQ-11`: canonical CSV + append-only approval journal own the SEO Registry; no Payload duplicate.
- `OQ-12`: R1 reuses existing `import-runs`/`import-issues`; a dedicated Excel history model is forbidden unless an isolated test proves a missing required field and an ADR approves the smallest additive change.
- `OQ-13`: R1 keeps current boolean module governance. A new staged state model is forbidden unless the existing guard demonstrably cannot represent the fixed activation order.

| ID | Type / deadline | Deterministic rule | Fallback / stop condition |
|---|---|---|---|
| OQ-03 reviews legacy spelling | `EXTERNAL`, before affected redirect/release | `/otzyvy/` stays hidden/`404` until a verified review source exists. `/reviews/` gets an exact same-intent `301` only when the target is publishable. | If source/intent proof is absent, record explicit archive/`410` or retained-old-site outcome; never redirect to home or fabricate reviews. |
| OQ-06 morphology | `OWNER`, before affected metadata/indexing | Store owner-approved city/district forms as data; code never guesses declension. | Missing approval keeps only affected page `noindex`/unpublished and does not block other epics. |
| OQ-08 semantic raw evidence | `EXTERNAL`, before affected Registry approval | Preserve raw measurement, method and date; `fallback_no_data` cannot become indexable evidence. | Missing/unreliable measurement resolves to project `unmeasuredPolicy`/`NONE` and noindex; continue other clusters. |
| OQ-10 homonyms | `EXTERNAL`, before affected slug/intent publication | Match exact entity/intent from address, developer, city and semantic evidence. | Ambiguity is `needsReview`; do not create the disputed SEO route and continue unrelated records. |
| OQ-14 multi-geo service metadata | `OWNER`, before EPIC-50/future activation | Out of R1. A later ADR must remove primary-city targeting from global service metadata or introduce an approved geo-service model. | Keep `SINGLE_GEO`; no R1 task may activate MULTI_GEO. |
| OD-L1 legal/privacy wording | `OWNER`, before staging/indexing | EPIC-29 drafts against approved §19.1 identity; owner approves exact text/version. | Protected noindex placeholders may support implementation only; staging/release/indexing stop. |
| OD-S1 stack exception | `OWNER`, only if compatibility gate fails | Use latest mutually compatible stable components resolved on the task date; no prerelease. | Do not upgrade the incompatible component, do not silently keep stale software, do not switch provider; record evidence and continue independent work. |
| OD-Y1 priority-source exception | `OWNER`, only if a named ЖК cannot be completed from the approved source | All 24 remain required intake targets. Exact source identity and at least five accepted photos are required for publication. | Mark the record blocked/unpublished, continue the other 23 and request an approved alternative/exclusion only after evidence of source absence or ambiguity. |
| OD-STG/PROD | `OWNER/PRODUCTION`, before staging, production, DNS or indexing respectively | Each action uses its separate explicit command and exact immutable candidate. | No command means no environment mutation; repository work may continue. |

No unresolved SEO-threshold/category/geo/market-status placeholder is allowed for R1 release. Content/legal/data placeholders are allowed only on protected noindex staging, visibly/admin-marked, outside sitemap/indexing, and cannot satisfy Content Gate or release readiness.

---

# 34. FINAL AUDIT — EXACT `4.1.1-ARCH-v5` [PROJECT]

## 34.1. MASTER PLAN MAP

**Primary goal:** deliver `souz-home.ru` R1 from the already imported Realty/Payload platform as a safe client adaptation, with Rostov geo-first catalogs, global stable entities, verified client data/content and immutable noindex-first delivery.

**Non-goals:** R1 redesign; journal; construction service; XML feed without a real contract; public MULTI_GEO; R2/R3 categories/facets/analytics; second backend/ORM/auth; automatic merge, production, DNS or indexing.

**Major outcomes:** latest-compatible-stable runtime proof; current architecture acceptance without duplicate owners; exact route/SEO contracts; approved NAP and fail-closed client data; 24 Excel-first priority ЖК with controlled media; Timeweb S3; MAX leads; Yandex Metrica non-PII; preserved Bastion-template appearance; exact-SHA immutable staging/release evidence.

**Epics:** R0/R1 planning and implementation = EPIC-00..29, 31..33, 35..43; completed imported capability is accepted rather than rebuilt. EPIC-30/34/46..50 are future. EPIC-44/45 are production/post-launch and excluded from autonomous Developer execution.

**Shared foundations:** `src/core/**`, `packages/contracts/**`, `packages/ui/**`; client composition in `src/project/**` and `src/app/**`; Payload collections/globals/migrations are sole schema/auth/Admin owner.

**Data/schema:** existing normalized geo/development/property/leads model; only additive proven gaps through Payload migrations; Excel import is the R1 development intake; provenance stays private; binary intake stays outside Git.

**External integrations:** Yandex Realty source package, Timeweb managed PostgreSQL/S3/server, MAX, Yandex Metrica, SourceCraft registry/artifact path. Every critical external has preflight, fallback and stop rule below.

**Security-sensitive areas:** lead PII/outbox/MAX, Secret Master env materialization, S3 rights/provenance, Public Gateway private-field exclusion, server-side Development authority, noindex/indexing promotion.

**Infrastructure/release boundary:** implementation ends at PR/evidence; staging requires an explicit command and immutable digest; production/DNS/migration/indexing require separate exact owner authorization. No server-side Git build.

**Fixed owner decisions:** ODR-01..07 and §19.1; no before-approval decision remains.

## 34.2. FINAL FINDING REGISTER

| ID | Severity | Pass | Finding / evidence | Resolution | Owner decision | Status |
|---|---|---|---|---|---|---|
| FA-01 | BLOCKER | Logic | R1 sections still listed `/journal/`, journal blocks and `posts` sitemap despite EPIC-30 future. | Removed journal from R1 skeleton/home/linking/monitoring/registry/sitemap; explicit `404` preserved. | no | RESOLVED-v5 |
| FA-02 | MAJOR | Logic/dependency | EPIC-34 feed onboarding remained R1 although owner fixed Excel-first/no current XML feed. | Reclassified EPIC-34 as R2/future and removed it from R1 waves/inventory. | no | RESOLVED-v5 |
| FA-03 | BLOCKER | Logic/evidence | Route lists could build reviews/construction unconditionally and development UI could expose public update dates. | Fixed minimal R1 routes, verified-source reviews rule, construction `404`, and private checkedAt/source policy. | no | RESOLVED-v5 |
| FA-04 | MAJOR | Executability | Plan referenced nonexistent `verify:clone-readiness`, a hypothetical Excel command and POSIX-only env syntax. | Bound to actual package scripts and canonical `pwsh` `RISK_SCOPE` syntax/mapping. | no | RESOLVED-v5 |
| FA-05 | BLOCKER | Dependency/delivery | “one Epic = one PR” did not fully state one-worktree discipline or explicit delivery mode; waves could be read as multi-Epic branches. | One stream/branch/worktree/PR invariant and default `PR_ONLY` delivery tasks added; production excluded. | no | RESOLVED-v5 |
| FA-06 | BLOCKER | Autonomy | External Yandex collection lacked a complete per-record preflight/fallback/continue rule. | OD-Y1 requires exact identity + ≥5 accepted photos, blocks only the record, continues other work and stops publication on missing evidence. | only if exception later | RESOLVED-v5 |
| FA-07 | MAJOR | Architecture/delivery | Latest-stack/PostgreSQL target needed an explicit exact-date provider/compatibility stop boundary. | §1.2.1 + OD-S1 require re-resolution, peer/provider preflight, no silent stale fallback/provider switch and no migration before proof. | only if exception later | RESOLVED-v5 |
| FA-08 | MAJOR | Executability | Remaining open questions mixed architectural choices with later evidence. | OQ-12/13 decided; all remaining rows now have type, deadline, default, fallback and scoped stop. | no before approval | RESOLVED-v5 |
| FA-09 | MAJOR | Delivery | Wave A incorrectly called post-approval stack/code work hard for plan approval. | Reclassified as hard only for downstream implementation; architecture phase performs no dependency upgrade/code write. | no | RESOLVED-v5 |
| FA-10 | MINOR | Consistency | Lead DoD still named duplicate `zhk_price_request`. | Canonical backend remains `development_price`; presentation maps `development`. | no | RESOLVED-v5 |
| FA-11 | BLOCKER | Architecture/data | Target model still listed R1 `posts`, optional Payload SEO Registry and undecided `excel-import-runs`, contradicting fixed scope/owners. | Accepted current collections, kept journal future, fixed CSV Registry ownership and chose existing import history. | no | RESOLVED-v5 |

Final-audit blockers: **0 open**. Major findings: **0 open**. Baseline ACB implementation gaps remain explicit task/release gates, not hidden plan uncertainties.

## 34.3. FOUR DISTINCT PASSES

### Pass 1 — Logic / completeness: PASS

- Every R1 outcome maps to an Epic/wave; completed capabilities are not rebuilt.
- Minimal route scope is internally consistent: `/uslugi/` and mortgage retained; reviews conditional; construction/journal/feed future.
- Placeholder, source attribution and public checkedAt policies are consistent across data, UI, Gate and release clauses.
- Future R2/R3 and production/post-launch work is separated from autonomous R1 implementation.

### Pass 2 — Architecture / data / security: PASS

- Actual repository owners (`core + packages -> project composition -> app`) replace greenfield assumptions; no `src/platform/**` owner is created.
- Payload/PostgreSQL remains the sole schema/auth/Admin path; Public/System/Ingest Gateway boundaries remain intact.
- Timeweb S3 is storage owner while Payload Media remains record/workflow owner; local FS and hotlinks are not production fallbacks.
- Private provenance/rights/checkedAt and lead PII have explicit non-leak acceptance; Secret Master and server-side Development validation remain hard gates.
- Stack and PostgreSQL changes are implementation-time compatibility work, never architecture-phase upgrades.

### Pass 3 — Dependencies / autonomy: PASS

- Directed graph cycles: **0**.
- HARD dependencies are limited to exact contract/data/release boundaries; research collection and unrelated UI/foundation work remain parallel.
- Local external/data blockers release the claim and allow the next independent ready task.
- Shared schema/profile/Registry/contracts have one owner and freeze point; parallel lanes cannot mutate the same contract before freeze.
- Production is not in the Developer ready loop.

### Pass 4 — Executability / evidence / delivery: PASS

- Each open Epic already contains tasks, measurable DoD and checks; §34.4 adds entry/exit, dependency, fallback, rollback and delivery semantics for grouped execution.
- Actual package script names and `pwsh` env syntax are recorded; runtime suites are not claimed as executed by this audit.
- Promise/evidence levels are explicit: existing code needs exact-head regression; wired surfaces need reachable route/job/import proof; staging/live claims require immutable runtime proof.
- Default delivery is `PR_ONLY`; staging, production, migrations, DNS and indexing remain owner gates.

## 34.4. DEPENDENCY / AUTONOMY MATRIX

| Scope / outcome | Depends on | Type / minimum blocking scope | Entry → exit evidence | Fallback / parallel-safe work | Wave / critical path |
|---|---|---|---|---|---|
| Completed baseline 00/02/09/10/11/12/14/27/32/35 | exact repo/provenance | `CONTRACT`; regression task only | current files + checks → accepted exact-head evidence | reopen only smallest owning defect | A / no |
| EPIC-01 compatible stable stack | official releases, current lock, Timeweb PG offering | `EXTERNAL + HARD` only for downstream code/migration | exact-date matrix → aligned pins, peer/build/gate proof | OD-S1 stop; continue docs/evidence/UI analysis | A / yes |
| EPIC-05 docs/governance | actual owners + fixed plan | `CONTRACT` | synchronized canon → no competing owner/drift | no code dependency; parallel with 01/03/04 | A / yes |
| EPIC-03 legacy evidence | old live availability | `EXTERNAL`; blocks only affected redirect rows | crawl inventory → explicit KEEP/301/410 rows | record inaccessible URL; no generic redirect; continue other URLs | B / yes for migration only |
| EPIC-04 semantic/Registry | measurement source; relevant 03 rows | `EXTERNAL + CONTRACT`; blocks only affected indexable rows | raw dated evidence → approved typed Registry/collisions | `NONE`/noindex for missing evidence | B/C / yes for indexing only |
| EPIC-06 storage/secrets topology | selected S3, account/env availability | `CONTRACT + EXTERNAL`; no deploy | adapter/env/compose contract → static/integration proof, names only | no local-media production fallback; continue non-storage work | B/C / yes before staging |
| EPIC-07/08 client settings/geo | fixed NAP; morphology evidence | `CONTRACT/OWNER-later` at affected metadata only | fail-closed seed → exact NAP/geo parity and no fixture leak | affected page noindex/unpublished | B/C / yes for affected pages |
| EPIC-13/15/19 profile, Excel, redirects | 03/04 contracts, existing mechanisms | `CONTRACT`; task-level boundaries | measured R1 rows/workbook/manifest → checks/idempotency/no-chain | invalid row/URL isolated; no R2 materialization | C / yes |
| EPIC-16 visual acceptance | imported baseline + fixed owner direction | `CONTRACT`, no redesign | baseline viewports → documented brand/factual-only delta | missing real data uses noindex state, not redesign | B/D / no |
| EPIC-23 24-ЖК package/media | 15 template, S3 path, Yandex pages | `EXTERNAL`; per-record block, aggregate Content Gate | identity/media preflight → workbook import + ≥5 S3 media per published ЖК | OD-Y1 blocked/unpublished record; continue others | D / yes for catalog completeness |
| EPIC-17/18/20..26/29 public product | frozen route/DTO/Gate + relevant approved data | `CONTRACT`; page task waits only for its inputs | reachable route/state → browser/SEO/UI acceptance | hide optional/unsourced sections; never fabricate | D / yes |
| EPIC-28 secondary legacy migration | relevant 03 entity map + current lifecycle | `HARD` only per mapped entity | old→new identity → 301/410/no-chain proof | unresolved entity remains unmigrated and blocks only itself/release manifest | D / yes for full migration |
| EPIC-31 leads/MAX | published Development authority + Secret Master destination | `CONTRACT + EXTERNAL`; channel proof task only | canonical context → persistence/outbox/retry/MAX proof without leaks | disable form/channel; continue non-lead work | D / yes before release |
| EPIC-33/36 links/analytics | retained page set; consent | `SOFT/CONTRACT` | route graph/event schema → orphan + non-PII provider proof | analytics stays disabled; pages still testable | D/E / no |
| EPIC-37/38/39 quality | representative data/pages exact head | `HARD` only for final acceptance | frozen candidate → performance/browser/a11y/security evidence, P0/P1=0 | fix via owning Epic; unrelated streams continue | E / yes |
| EPIC-40..43 staging/RC | implementation PRs, immutable registry path, explicit staging command | `EXTERNAL + OWNER + HARD`; staging task only | clean main SHA/digest → same-image migration, noindex runtime, crawl/rehearsal/rollback | no command/digest/secret = no deploy; repository evidence work continues | F / yes |
| EPIC-44/45 production/post-launch | explicit production/indexing commands + exact RC | `PRODUCTION`; excluded from Developer graph | owner authorization → live proof/monitoring | no authorization = stop without mutation | owner release / outside night run |
| EPIC-30/34/46..50 future | separate owner activation/input | `OWNER/FUTURE`; no R1 edge | new approved revision → separately audited graph | remain disabled/404 | future / no |

**Shared-file/contract serialization:** `package.json`/lock/Docker = EPIC-01 owner; Payload schema/migrations = smallest schema Epic; profile/route config = EPIC-13/18 after EPIC-04 freeze; SEO CSV/journal = EPIC-04/13; contracts = EPIC-11 workflow only; S3/env/compose = EPIC-06; legal config = EPIC-29 after OD-L1. A second writer waits for the owning PR or consumes a frozen contract.

**Rollback/recovery default:** documentation/config/code uses exact PR revert; additive schema/data work requires pre-migration backup and tested restore/forward-fix path; Excel import uses dry-run, isolated error handling and idempotent replay; artifact delivery retains previous digest/env checksum/DB restore point. No rollback step may silently perform production work.

## 34.5. AUDIT SCORECARD

| Area | Result |
|---|---|
| Logic/completeness | blockers `0`; major `0`; all fixed R1 outcomes mapped |
| Architecture/data/security | blockers `0`; major `0`; one schema/auth owner; private data boundaries explicit |
| Dependency/autonomy | cycles `0`; hard groups `8`; softened/localized edges `11`; independent initial lanes `5`; production edges isolated |
| Executability/evidence | open R1 epics with task + DoD + verification `100%`; grouped entry/exit/fallback/delivery coverage `100%`; live claims without reachableVia `0 accepted` |
| Owner decisions | before approval open `0`; later conditional/staging/production gates `6` |
| Task Manager import | exact snapshot is `APPROVED`; import was not performed in this run and is deferred to the parent-controlled handoff |

## 34.6. NIGHT RUN READINESS

**Result: `READY_WITH_LIMITS`.**

Independent ready lanes after approval/import: stack/docs acceptance; legacy evidence; semantic evidence; NAP/legal draft + visual baseline; 24-ЖК source intake. If one record, source, account or task blocks, the worker records the blocker, releases the claim and continues another lane.

Unavoidable limits that cannot be safely removed in architecture:

1. Yandex pages/media are external; a missing/ambiguous priority record must remain unpublished until an approved source exception.
2. Latest stable peer ranges and Timeweb PostgreSQL offering must be re-resolved on the implementation date; incompatibility needs owner exception rather than a guessed version/provider.
3. Exact legal/privacy text needs owner approval before staging/indexing.
4. Timeweb S3/Secret Master/image registry and staging require real external availability and an explicit staging command.
5. Production, migrations, DNS and indexing are deliberately excluded and always require separate owner commands.

Expected safe stops: no compatible stable set; ambiguous/missing source identity; fewer than five accepted photos for a publish candidate; missing secret/account without printing values; image/SHA mismatch; unsafe DB identity/backup; P0/P1; any placeholder or private provenance leak. None prevents progress on an independent ready task unless all lanes are exhausted.

**Owner decisions remaining before plan approval:** `0`; approval has now been recorded for exact `4.1.1-ARCH-v5`.

**Exact next instruction:** the parent-controlled post-audit stage may create the docs checkpoint, build inventory schema v2 from exact `4.1.1-ARCH-v5 APPROVED`, then run `Validate → Init → Import → Reconcile` and hand off to Developer only after reconciliation is clean. This audit run performed none of those actions. Deploy, migrations, secrets, production, DNS and indexing remain separately gated.

---

# 35. FINAL FORMULA [PROJECT]

```text
AMS REALTY BAZA STARTER
+
CORE 5.5 / UI CORE 5.0
+
SOURCECRAFT DELIVERY
+
CODE-OWNED SITE GRAMMAR
+
RESERVED ROOT + PUBLISHED GEO ROOT
+
SINGLE_GEO / MULTI_GEO MODE CONTRACT
+
CATEGORY STATUS
+
GEO CATEGORY STATUS
+
MARKET STATUS
+
GEO-FIRST LOCAL CATALOGS
+
GLOBAL STABLE ENTITY URLS
+
NORMALIZED REGION / CITY / DISTRICT + MORPHOLOGY
+
AGGLOMERATION RELATIONS
+
UNIFIED DEVELOPMENTS
+
TIER A / B / C DATA QUALITY
+
DEVELOPERS
+
UNIVERSAL PROPERTIES
+
SECONDARY INDEXING / NEWBUILD UNIT NOINDEX
+
SEMANTIC SEO REGISTRY
+
CONTENT GATE MECHANISM + TYPED PROJECT CONFIG
+
EXCEL DEVELOPMENT IMPORT
+
MULTI-GEO R0 FIXTURE PROOF
+
EXISTING FEEDS / LEADS / JOBS / SECURITY
+
OWNER-DECIDED INFRASTRUCTURE
=
SOUZ-HOME.RU R1
```

Final principles:

> Geo root разрешён только для published/registry-known geo; reserved root имеет приоритет, а коллизии блокируются merge guard.

> Primary `/{geo}/` — `200` registry candidate уже в `SINGLE_GEO`; при переходе в `MULTI_GEO` его canonical и generic city intent ownership не меняются.

> Локальные каталоги используют `/{geo}/{category}/`; global entity URLs не содержат город и не меняются при включении новых geo.

> `categoryStatus` и `marketCapability` определяют global capability/entity publication; `geoCategoryStatus` и `marketStatus` управляют local catalogs/listings. Local OFF не скрывает валидную global entity.

> PREPARED_OFF означает «схема/механизм готов, продукт выключен»: публичный URL не активируется и отсутствует в sitemap/navigation.

> ЖК — global development entity с качеством данных A/B/C; индексируемость определяется Content Gate, а не наличием записи.

> Район и facet делят third-segment namespace и защищены collision guard. ЖК ↔ район — только semantic intent collision, не URL collision.

> SEO registry, URL grammar, statuses и Content Gate создаются до page templates.

> Platform задаёт typed SEO/Gate mechanisms; `seoTiers` и market-dependent effective numbers принадлежат project config/registry.

> MULTI_GEO поведение доказывается в R0 fixtures; EPIC-50 не имеет права требовать изменения platform `src/`.

> Каждый open implementation Epic = отдельный stream/branch/worktree/PR. Default delivery = `PR_ONLY`; merge возможен только для явно отмеченного `MERGE_AFTER_GATE` delivery-task после exact-head SourceCraft Gate. Production в Developer graph не входит.

# END [PROJECT]
