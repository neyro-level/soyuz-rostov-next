# Architecture

Статус: `ACTIVE / LIVE OWNER-OPERATED DEMO / CLIENT PRE-PRODUCTION`.

## Профиль

```text
AMS_PROFILE=REALTY_BASE
DELIVERY_PROFILE=COMMERCIAL
Mode=BUILD
Git platform=SOURCECRAFT_PRIMARY_GITHUB_MIRROR
Secrets source=Secret Master / self-hosted Infisical
```

Перед merge в `main` нужен один ручной exact-head SourceCraft Gate. Активного
execution source нет: новые изменения начинаются с Task Contract и отдельного
branch/worktree от актуального SourceCraft `main`. Текущий tag boundary, runtime
versions и live-proof status принадлежат `STARTER_RELEASE_STATE.md`. GitHub
mirror, новый immutable tag и production - отдельные owner actions.

## Delivery baseline

- Canonical repository — SourceCraft; GitHub — mirror-only. Точное равенство
  SHA подтверждается после каждого явно запрошенного mirror.
- Portfolio `PROJECT_CLASS=STANDARD` не меняет project
  `DELIVERY_PROFILE=COMMERCIAL`: template/demo требует review и один ручной
  exact-head SourceCraft Gate перед merge.
- `.sourcecraft/ci.yaml` содержит только manual exact-SHA `merge-standard` и
  `merge-risky`; explicit `paths: []` sentinel блокирует auto push/PR CI.
  Исторические run counts и длительности не являются архитектурным контрактом;
  действующий принцип — один выбранный Gate на exact head без дублирования.
- STANDARD сохраняет template-specific contracts/architecture/clone-readiness
  baseline. RISKY принимает ровно один `risk_scope`: `schema-data`,
  `auth-pii-leads`, `ingest-jobs`, `dependency-runtime` или `ci-governance`.
  PostgreSQL запускается только для первых трёх scope, build — только для
  `dependency-runtime`; каждый RISKY сначала выполняет STANDARD и затем только
  доказательство выбранного риска.
- Один PR закрывается одним exact-head Gate. Несовместимые risk scopes в одном
  batch запрещены.
- Demo release contract уже требует clean exact `main`, immutable Docker image,
  migrations из того же image, один jobs owner, live health/smoke и сохранённый
  previous image/env rollback point. Текущий Dockerfile копирует весь `/app` и
  не использует standalone allowlist; release hardening остаётся отдельной
  RISKY-задачей до первого client production и не выполняется этим inventory.
- Следующий `starter-v2.MINOR.PATCH` выбирается только в отдельном release
  scope и не создаётся ordinary WORK-задачей.

## Stack и ownership

- Next.js App Router, React, TypeScript strict;
- Payload CMS — единственный владелец application schema;
- PostgreSQL через `@payloadcms/db-postgres`; второй ORM запрещён;
- Zod, pnpm, Tailwind CSS 4, shadcn/ui, Lucide;
- Payload Jobs, streaming SAX parser, **local persistent media** (S3 plugin not used by starter), Nginx, SourceCraft.

Текущий lock snapshot: Next.js `16.3.8`, React `19.2.8`, Payload `3.90.2`.
Фактические версии всегда определяют `package.json`, lockfile и runtime files.
Major upgrade требует отдельного решения и targeted proof.

## Hardened current contracts

- `starter-owned.json` schema v2 определяет только обновляемый starter layer;
  clone остаётся snapshot exact tag+SHA, а upgrade — явной conflict-safe
  операцией без runtime dependency.
- Runtime design-system values live in `src/app/globals.css`. Preset schema /
  clone intake remains client-owned input; `src/project/brand.css` is deprecated
  compatibility only and has no runtime design-value authority.
- `src/project/indexing-policy.ts` и canonical resolver/Gate — authority для
  indexability. Tracking registry не участвует в content/canonical/cache и тем
  же списком формирует Yandex `Clean-param`.
- Filtered catalog requests не получают persistent cache identity; unfiltered
  page/sort keys, TTL и invalidation tags ограничены.
- Souz matrix — честный source-backed subset; reusable geo capability
  доказывается отдельной synthetic non-production fixture.
- Development Gate принимает managed media либо allowlisted external HTTPS с
  type/source/rights/checkedAt; construction progress также требует capturedAt.
- Production public origin обязан быть exact approved HTTPS origin без
  credentials, path, query или hash.

## Geo-catalog platform: current and target

Нормативный reusable target-контракт:
`docs/platform/GEO_CATALOG_CONTRACT.md`. Он фиксирует vocabulary, PageKey,
URL/status/profile semantics и cutover invariants. `02_PRODUCT_STRUCTURE.md`
показывает current runtime рядом с target grammar.

Canonical PageKey routes обслуживаются одним catch-all dispatcher;
explicit static routes, Payload Admin/API и security proxy остаются отдельными
framework boundaries. HTML и metadata используют один cached resolution result.
Переход выполнен expand-first:

```text
profile/grammar contracts
  -> additive Payload schema and normalized data
  -> frozen DTO + Public Gateway
  -> resolver + Content Gate + reusable UI
  -> discovery/lifecycle proof
  -> route cutover
  -> guarded cleanup
```

Target dependency direction:

```text
project profile/data -> core pure functions
app composition -> project + core + UI
core/packages -X-> project
```

Канонический platform layout зафиксирован в
`docs/adr/ADR-PLATFORM-LAYOUT.md`: reusable platform surface — `src/core/**` и
`packages/**`; project composition и клиентские значения принадлежат
`src/project/**` и app composition. Guards, которые исторически называли
`src/platform/**`, применяются к фактической reusable surface, а не создают
новый каталог-владелец.

Profile передаётся в reusable core явно. Validated project config полностью
владеет geo/category/market/developer matrices, `filterKeys`, `seoFacets`, SEO
tiers, Gate, static routes и module spaces; reusable core не подставляет
client-specific defaults. Опубликованные Payload districts формируют
кэшируемый registry по `geo×category`; invalidation идёт через tag `registry`,
а `proxy.ts` не выполняет district DB reads.
Project-owned static routes, brand, domain, city literals и будущий literal
denylist не переходят в core/packages.
Public Russian route copy принадлежит generated `src/project/copy.ts`.
Канонический preset определяет routable catalog link; `clone:prepare` и
`copy:generate` детерминированно создают один typed module. Кириллица в
`src/app` и `src/core` запрещена, кроме документированных reusable protocol
cases: transliteration, inbound feed/workbook vocabulary, normalization и
grammatical data contracts. Граница проверяется `verify:copy-ownership`.
`docs/CLONE_PRESET.starter.json` — единственный редактируемый owner starter
SiteProfile. `src/project/site-profile.config.ts` генерируется командой
`pnpm profile:generate`, а `pnpm profile:check` fail-closed обнаруживает drift.
Client preset обязан явно задавать `seoFacets`, `seoTiers` и `staticRoutes`;
география и facets демонстрационных fixtures принадлежат только `src/fixture`.
Payload остаётся единственным schema/auth/Admin owner; public reads продолжают
идти через explicit Public Gateway и storage-neutral DTO. Legacy manifest в
SiteProfile `legacyRoutes`/`legacyPatterns` — единственный data owner прямых
`301` для exact routes и `/obekty/{slug}`;
`src/project/routing/legacy-route-manifest.ts` только компилирует этот contract
для proxy. Соответствующие App Router files остаются fail-closed 404 fallbacks.
Profile-owned legacy preflight выполняется раньше stored Payload redirects и
canonical resolution. `src/proxy.ts` отдельно владеет canonical slash `308`,
потому автоматический Next trailing-slash redirect отключён. Отдельная
proof-only lifecycle HTTP boundary и старые catalog/property/sitemap
presentation owners удалены; rollback — revert cleanup PR, без удаления raw
geo/source данных.

`src/core/routing/page-decision.ts` и project composition
`src/project/routing/content-gate.ts` образуют единый runtime Content Gate:
resolver отдаёт только структурные факты, а `decidePage` единолично формирует
robots, canonical и eligibility для sitemap, IndexNow, menu и interlinks.
Metadata и discovery используют уже принятое решение; прямой положительный
`index` в app/public data-access блокируется guard. Runtime Gate inputs берутся
из фактических inventory, media, prices, layouts, progress и source timestamps;
schema и persisted data этим этапом не меняются.

SEO template ownership разделён жёстко: `src/core/seo/registry.ts` содержит
только универсальный renderer optional fragments, morphology helpers и русский
plural formatter, а ключи и маркетинговые формулировки принадлежат
`src/project/seo/templates.ts`. Runtime brand читается через публичный
`site-settings` Gateway. Неутверждённая morphology города/района fail-closed
понижает итоговое решение `decidePage` до `noindex,follow` и исключает страницу
из discovery; ручной SEO fallback `safeSeo` в geo-catalog запрещён.

SEO Registry имеет одного editable owner: `docs/seo/SEO_REGISTRY_SEED.csv`.
Команда `pnpm seo:registry:generate` валидирует CSV и детерминированно создаёт
`src/project/seo/registry-seed.ts`, который использует runtime; ручная правка
generated-файла и параллельный registry в Payload запрещены. Drift блокируется
`pnpm seo:registry:check` внутри `verify:daily`; решение закреплено в
`docs/adr/ADR-SEO-REGISTRY-CSV-OWNER.md`.
Измеренный спрос попадает в owner CSV только через
`seo:registry:import-demand`: команда сначала валидирует весь snapshot,
отклоняет неизвестные/повторные URL и смешанные даты, затем атомарно заменяет
файл. Tier и minimum inventory всегда пересчитываются из текущего SiteProfile.

Одобрение измеренной строки выполняет только `seo:registry:approve`.
Append-only журнал `docs/seo/REGISTRY_APPROVALS.csv` хранит actor, reason,
timestamp, scope и SHA-256 выбранной строки; status owner CSV материализуется
из журнала. Guard отклоняет ручную смену status, повторное одобрение и изменение
строки между выбором и commit.
`seo:registry:coverage` строит обязательный набор тем же canonical URL builder,
который использует runtime: home, category roots, опубликованные geo hubs,
ACTIVE/NOINDEX_AUTO geo-category и district routes, facets и developer hubs.
PREPARED_OFF/OUT не создают требования и считаются ineligible, если строка для
них вручную появилась в Registry.

Категория SEO хранится как явный набор `nominativePlural`,
`nominativePluralLower`, `accusativeSingular`, `genitivePlural`, `dealVerb` в
project-owned template inputs. Районные шаблоны получают эти формы и
утверждённые формы города/района как данные; renderer не склоняет слова и не
содержит литералы конкретной категории.

## Client clone boundary

`docs/CLONE_INTAKE.schema.json` задаёт короткий owner-owned вход. Команда
`clone:init` детерминированно компилирует его в preset v3 и отдельный отчёт
применённых значений именованного baseline `REALTY_BASE_CLIENT_V1`. Статусы
разделов, городов и рынков, морфология, legacy и host allowlists всегда
являются решениями intake; compiler не выводит их из названий или выбранного
preset. Повторный запуск с тем же входом обязан быть byte-stable.

`clone:prepare` принимает только утверждённый preset и exact source tag
`starter-v2.MINOR.PATCH`; обычный запуск требует clean checkout и совпадение tag с
`HEAD`. Preset определяет project identity, catalog-first режим,
`SINGLE_GEO | MULTI_GEO`, проверенную морфологию, NAP, indexing, brand/feed и
development Excel readiness. Генерируемые владельцы —
`src/project/site-profile.config.ts` и `docs/CLIENT_BOOTSTRAP.json`.

Clone preparation удаляет только starter-specific demo/development artifacts;
Core 5.5, `packages/**`, migrations, guards и общие security/data contracts
сохраняются byte-for-byte. Storage topology не скрыта внутри preparation:
`clone:activate-timeweb-storage` остаётся отдельным idempotent шагом после
client topology decision. Runtime с `projectKind=client` и отсутствующими
Payload records возвращает пустой результат и никогда не подмешивает starter
fixtures.

`starter-owned.json` — единственный manifest границы обновляемой платформы.
Он включает reusable core, packages, migrations, guards и точечно названные
platform scripts/docs; project preset, copy, brand, app composition и
`docs/seo/**` остаются client-owned. `clone:prepare` записывает
`.starter-version` с source tag/SHA, версией manifest и воспроизводимыми
SHA-256 каждого starter-owned файла. Traversal, overlap, неизвестные пути и
symlink-escape блокируются до записи.

`starter:upgrade` принимает только bounded JSON-архив с embedded released
manifest, exact tag/SHA и hashes всех файлов. Локально изменённый
starter-owned файл не перезаписывается: создаются `.rej` и conflict report,
а версия не меняется. Clean update сначала пишет backup и pending journal,
использует atomic file replace и поддерживает явный `--recover`; migrations
могут только добавляться. `verify:starter-drift` работает в `warn`, `fail` и
`report` режимах, причём клиентская daily-проверка использует не блокирующий
`warn`.

### Режим обновления starter

Клиентский clone — самостоятельный snapshot, а не runtime-зависимость от
starter. Фоновое и автоматическое обновление запрещены: ни запуск приложения,
ни deploy, ни daily-проверка не вызывают `starter:upgrade`. Обновление начинает
только явная команда владельца с проверенным архивом; после конфликта владелец
разрешает его явно, а не повторным автоматическим запуском.

## Version-sensitive framework boundaries

- Next.js `16.3.8` intentionally uses `src/proxy.ts` with the named
  `export function proxy`. The former `src/middleware.ts` convention is
  deprecated in this Next line and is forbidden in this project. Pinned
  reference: [Next.js 16 Proxy](https://nextjs.org/docs/16/app/api-reference/file-conventions/proxy).
- Canonical entity pages belong to the catch-all resolver. `src/proxy.ts`
  returns real `301/308/410` responses before rendering. Legacy redirects are
  SiteProfile-owned and compiled by the manifest; legacy App Router pages are
  404-only fallbacks and never own
  metadata or a visual gone state. The former
  `/http/property-lifecycle/[slug]` proof route is forbidden by guards.
- Payload `jobs.autoRun` cron `* * * * *` is only the queue polling/execution
  ticker. It is not a business schedule. Business cadence is owned by the task
  registry: `dispatchDueFeeds` = `*/5 * * * *`; `jobsJanitor`,
  `leadRetentionCleanup`, `catalogLifecycle` and `recoverLeadDeliveries` =
  `*/15 * * * *`. Static queues keep `disableScheduling=false`; programmatic
  queues keep `disableScheduling=true`. `enableConcurrencyControl=true` remains
  mandatory. Changing the ticker requires exact Payload-version evidence.

## Модули, ownership и dependency direction

| Область | Владелец / путь | Разрешённая граница |
|---|---|---|
| Presentation contracts | `packages/contracts` | storage-neutral DTO; без Payload/DB imports |
| Reusable UI | `packages/ui` | contracts/view models; без persistence и Next app imports |
| Public reads composition | `src/project/data-access/public` | Payload/project adapters compose reusable core rules and emit DTO output |
| Privileged operations | `src/core/data-access/system` | именованные system operations; `overrideAccess: true` только здесь |
| Feed mutation | `src/core/data-access/ingest` | ingest gateway и утверждённые atomic SQL operations |
| Project schema/config | `src/project/collections`, `src/project/env.ts`, `src/project/jobs` | Payload остаётся единственным backend/schema owner |
| Generic access helpers | `src/core/access` | переиспользуемые роли без project-specific schema |
| Payload migration history | `migrations` | канонический корневой каталог, заданный в `payload.config.ts` |
| Cache invalidation | `src/core/cache` | `invalidatePublicCache` — единственный live facade и всегда выполняет authenticated HTTP self-call; `invalidateInProcessCacheTargets` вызывается только Route Handler после auth, rate limit и allowlist |

```text
public UI
  -> presentation contracts / DTO
  -> Public Gateway
  -> Payload Local API with explicit access mode
  -> Payload-owned schema
```

Reusable UI не импортирует Payload, DB clients или persistence types. Configurable outbound HTTP проходит через Safe Outbound Client; raw anonymous business REST закрывается на edge и Payload boundary. Project-aware Public Gateway composition: `src/project/data-access/public`. Reusable rules stay in `src/core`; System Gateway: `src/core/data-access/system`. Dependency direction is `project -> core`, while `core/packages -> project` is forbidden by architecture and Dependency Cruiser guards.

`src/project/indexing-policy.ts` остаётся глобальным разрешением публикации:
Starter fail-closed возвращает `noindex`, а client использует явное owner
decision `public | noindex` из client-readiness config. Для canonical runtime
страниц единственный semantic owner индексируемости — `decidePage`; глобальная
политика не повышает его решение. Она определяет root metadata robots и
`/robots.txt`; starter Nginx фиксирует matching
`X-Robots-Tag: noindex, nofollow`, а client blueprint требует явной подстановки
соответствующего header/его отсутствия.

## Env и runtime config

`src/project/env.ts` — единственный владелец typed schema, определения режима и списка обязательных runtime-полей. Второго compatibility re-export в `src/core` нет. Режимы: `build`, `development`, `migrate`, `runtime`, `test`; build не требует production secrets, а runtime fail-fast выполняется через instrumentation до обслуживания трафика.

Прямое чтение `process.env` в runtime-коде допускается только для framework mode (`NODE_ENV`) и изолированных test-only переключателей (`AMS_ALLOW_TEST_DESTINATIONS`, `AMS_TEST_APPROVED_ORIGINS`). Остальные project runtime knobs читаются через `runtimeEnv`.

## Access modes

| Режим | Контракт |
|---|---|
| Public Gateway | `overrideAccess: false`, `user: null`, context marker `public-read`, collection access filters published/public rows, output только DTO |
| User/Admin | Payload request user и collection access; Local API вызов обязан явно указывать access mode |
| System Gateway | `systemOverrideAccess(<named operation>)`; whitelist операций находится в `src/core/data-access/system/overrides.ts` |
| Ingest Gateway | feed-owned mutation через ingest repository; manual field overrides и published slug не перезаписываются |

Lead access следует Core 5.5 и `docs/adr/ADR-LEAD-ACCESS-MODEL.md`: generic
lead create и delivery create/update доступны только именованным System Gateway;
lead/PII read-update-delete, delivery read/delete и manual retry доступны только
owner. Роль admin не наследует эти capability. Manual retry после owner auth
выполняет state transition через `owner-lead-delivery-retry`, а не generic Admin
mutation.

Anonymous generic Payload REST для deny-list/system-only collections возвращает
404; публичный приём лида существует только как `POST /api/public/leads`.
Architecture guard и Dependency Cruiser запрещают обход этих границ.

## Approved SQL и numeric invariants

Runtime raw SQL разрешён только в двух manifest-backed слоях:

- `src/core/data-access/ingest/sql/index.ts` — atomic feed claims, heartbeat,
  bounded bulk touch/deactivation, one-time approval и terminal import transition;
- `src/core/data-access/system/sql/index.ts` — atomic claim строки lead delivery.

Остальной runtime SQL запрещён `scripts/quality/sql-governance.mjs`; migrations
остаются разрешённым schema path. Денежные значения — неотрицательные integer
minor units до `Number.MAX_SAFE_INTEGER`. Площади — `0..99_999_999.99` м² с
точностью не более двух знаков. Эти правила проверяются на write boundary и
PostgreSQL constraints из migration `20260919_120900`.

## Data, jobs и cache

Persistent Public Gateway route cache имеет конечную identity-модель: для
catalog routes кэшируются только канонические `page` (1..10000) и четыре
значения `sort`, для developer route — только `page`, для остальных routes —
единственный query-free вариант. Filter keys сначала сверяются с whitelist
текущего `SiteProfile`, но запросы с filter values обходят persistent cache:
произвольные пользовательские значения не могут расширять cache key space или
случайно разделить один key между разными результатами.

- schema любого deployed contour меняется только migrations;
- деньги хранятся integer minor units, площади — в квадратных метрах;
- один mutating import на feed source;
- queue registry: `system`, `imports`, `maintenance`, `lead-deliveries`, `index-now`;
- static tasks: `dispatchDueFeeds`, `jobsJanitor`, `leadRetentionCleanup`,
  `catalogLifecycle`, `recoverLeadDeliveries`; programmatic tasks:
  `importFeed`, `deliverLead`, `submitIndexNow`;
- `index-now` is programmatic and event-driven after the route cutover. Its jobs
  contain only event ID, same-origin URLs and attempt number; the runtime key is
  read only from environment and never enters a job payload or diagnostic output;
- imports queue имеет `limit: 1`; один application runtime является jobs owner;
- `REALTY_BASE`: один application runtime с `JOBS_AUTORUN=true`;
- jobs `autoRun` every-minute cron is an execution ticker; task registry cron is
  the business schedule described in the version-sensitive boundary above;
- cache mode — `http`: jobs отправляют bounded authenticated requests на
  `/api/internal/revalidate`; маршрут валидирует secret, allowlisted paths/tags и
  только затем вызывает Next in-process invalidator;
- отсутствие HTTP cache config или rejected request возвращает warning и
  фиксируется для stale-data SLA; silent in-process claim запрещён.
- consent UI и server authority используют `src/project/legal.config.ts`;
  browser version является только consistency signal, accepted version и
  timestamp принадлежат серверу;
- retry identity лида — `lead:<requestAttemptId>` с browser UUID одной попытки:
  exact retry переиспользует lead, новая осознанная отправка создаёт новый lead;
- property relation и canonical PageKey source Public Gateway получает из
  published property, а не из client title/slug;
- `clientReadinessConfig.leadRetentionDays` — versioned owner decision,
  `projectConfig` только проецирует его в runtime; второго retention env knob нет.

## Verification surfaces

- `pnpm verify:merge-standard` — docs/UI/обычная логика без PostgreSQL suite;
- `RISK_SCOPE=<scope> pnpm verify:merge-risky` — STANDARD плюс один targeted
  proof; safe isolated `DATABASE_URI_TEST` обязателен только для DB-bound scope,
  а build выполняется только для `dependency-runtime`;
- `pnpm verify:integration:required` — fail-closed DB prerequisite и обязательные
  Payload/PostgreSQL suites;
- `pnpm verify:ui-core` — design literals, token integrity, primitive/font/client
  ownership, a11y и SEO contracts;
- `pnpm quality:architecture` + `pnpm quality:guards` — dependency direction,
  access/SQL/cache boundaries и negative fixtures.

## Starter vs client clone

Starter (этот репозиторий, `start-baza.ams24.ru`):

```text
hosting: AMS Server
database: local PostgreSQL, migrations only, PAYLOAD_DB_PUSH=false
storage: persistent MEDIA_DIR, no S3 runtime
jobs: exactly one JOBS_AUTORUN=true
cache: http
indexing: noindex
```

ADR: `docs/adr/ADR-LOCAL-STARTER-STORAGE.md`.

Этот репозиторий остаётся демо на local PostgreSQL + MEDIA_DIR. Отдельный клиентский контур, если появится, принимает собственное topology decision вне этого репозитория. S3 и Managed PostgreSQL сюда не возвращаются.

Production starter release использует immutable artifact из clean `main`. Процедуры — `OPERATIONS.md`.

Текущее project-specific состояние определяют этот документ, `PROJECT.md`, ADR
и код.
