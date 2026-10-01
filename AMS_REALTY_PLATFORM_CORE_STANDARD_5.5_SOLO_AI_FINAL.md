# AMS REALTY PLATFORM CORE STANDARD 5.5 — SOLO + AI

**Статус:** канонический архитектурный стандарт AMS для типовых сайтов и каталогов недвижимости. Применяется по умолчанию ко всем новым клиентским Realty-проектам.

**Модель:** solo owner / project manager + AI.

**Базовый профиль нагрузки:** до ~2 000 активных объектов инвентаря, несколько XML/YRL feed sources, обновление каждого источника по собственному интервалу (типично раз в 30–60 минут), низкая/средняя посещаемость.

**Стек:** Next.js App Router · TypeScript strict · Payload CMS · PostgreSQL · Tailwind CSS 4.x · shadcn/ui · pnpm.

**Repository:** SourceCraft. **Production:** Timeweb Cloud VPS + Timeweb Managed PostgreSQL + Timeweb S3-compatible Object Storage.

> Это **основная** конфигурация AMS Realty. Она намеренно минимальна по production-компонентам, но не ослабляет data/security boundaries.
>
> Расширенная конфигурация включается только по доказанному триггеру (раздел 22).

---

# 0. НАЗНАЧЕНИЕ

Стандарт покрывает типовые сайты и каталоги агентств недвижимости:

```text
15–50 страниц
~300–2 000 объектов в базовом профиле
несколько XML / YRL feed sources
обновление обычно раз в 30–60 минут
Payload Admin для редких правок
1–2 admin users
формы заявок
опциональные модули без смены стека
```

Архитектурная цель:

```text
дизайн отделён от движка
+
данные отделены от представления
+
минимум production-компонентов
+
жёсткие data/security boundaries
+
безопасный multi-feed import
+
надёжная доставка лидов
+
модульное расширение без смены стека
```

## 0.1 Профиль проекта

Каждый проект обязан объявить:

```text
AMS_PROFILE=REALTY_BASE
или
AMS_PROFILE=REALTY_EXTENDED
```

Профиль фиксируется также в `docs/PROJECT.md`.

| Область | REALTY_BASE | REALTY_EXTENDED |
|---|---|---|
| Jobs topology | один jobs-active Next/Payload runtime с `autoRun` | dedicated queue-scoped runner(s) по §22 |
| Cache invalidation | `http` default; `in-process` только после proof | `http` |
| Inventory baseline | до ~2 000 active records как типовой профиль | project-proven; десятки тысяч допустимы после capacity proof |
| Feed sources | несколько XML/YRL штатно | несколько XML/YRL/API, тяжёлый ingest |
| Collections | базовые + активированные модули §22A | базовые + активированные модули |
| Redis/broker/search engine | нет | только по отдельному trigger/ADR |
| UI/DTO/security model | одинаковый | одинаковый |

Переход:

```text
REALTY_BASE
→ доказанный trigger §22
→ REALTY_EXTENDED
```

Переход профиля меняет topology / operational model, но не отменяет Hard Contract и не требует переписывать UI/DTO/domain boundaries.

## 0.2 Что НЕ является личным кабинетом

Клиентские функции без серверного пользовательского состояния:

```text
избранное в localStorage / URL
сравнение в localStorage / URL
```

не являются личным кабинетом и допустимы в `REALTY_BASE` по §12.

---

# 1. HARD CONTRACT

Инварианты не ослабляются ради скорости, дизайна или прохождения проверки.

**Движок и данные**

1. Payload CMS — единственный владелец application schema. Второй ORM запрещён.
2. Payload Admin — основной административный кабинет. Custom cabinet не создаётся без отдельного доказанного trigger.
3. Public UI не получает raw Payload document.
4. Public data проходит через Public Gateway → explicit select → DTO.
5. Каждый Local API call в application-коде имеет явный access mode.
6. `overrideAccess: true` допустим только внутри System Gateway для whitelist system operations.
7. Production schema меняется только migrations. `push` запрещён.
8. Деньги хранятся integer minor units. Площади нормализованы в m².
9. Private fields защищены access rules, а не только DTO.

**Импорт и jobs**

10. Плохой, оборванный или suspicious feed не имеет права очистить каталог.
11. Import идемпотентен: unchanged business data не переписывается.
12. Каждая bulk operation имеет явный source scope.
13. Feed A не деактивирует Feed B и не перезаписывает manual/foreign-owned fields.
14. Manual ownership переживает следующий import.
15. Один mutating import на один feed source.
16. Interrupted import не деактивирует inventory и не обновляет baseline.
17. Configurable outbound HTTP идёт только через Safe Outbound Client.
18. В любой момент времени, включая rollout, ровно один runtime имеет право на автоматическое scheduling/running jobs для данной queue/topology.

**UI и дизайн**

19. Один проект = один Design System. Новая страница — новая композиция, а не новый дизайн.
20. Фактические значения дизайна — цвета, радиусы, ритм, типографические размеры/веса, easing — определяются только в `src/app/globals.css`. Любой другой CSS использует эти значения через `var(--*)` и не создаёт второй набор design literals.
21. shadcn/ui — единственная primitive foundation. Второй Button/Input/Dialog/Card не создаётся.
22. Server Components по умолчанию; `"use client"` — только на интерактивном leaf.
23. Reusable UI не импортирует Payload, DB clients и persistence types.
24. Accessibility не ломается ради визуала.

**Production и PII**

25. Каждый production-проект использует Timeweb Managed PostgreSQL.
26. Каждый production-проект использует Timeweb S3-compatible Object Storage.
27. Manual media хранится в S3; VPS disk не является production source of truth для media.
28. Production имеет automatic backup и external uptime monitoring.
29. Secrets не попадают в Git, business DB, logs, docs или browser bundle, кроме явно утверждённого encrypted-secret exception через ADR.
30. Leads/PII не попадают в public DTO, обычные logs или analytics; retention policy обязательна и исполняется автоматически.
31. Staging обязателен перед migration, parser/source-identity change, auth/access change и major upgrade.
32. URL schema фиксируется до production и меняется только с redirect plan.
33. Новая infrastructure не добавляется без реального trigger.
34. При равной безопасности выбирается решение, которое проще обслуживать одному owner + AI.

**Lead delivery**

35. Lead сначала синхронно сохраняется в собственной БД. Доставка во внешние каналы всегда асинхронна; недоступность messenger/CRM не приводит к потере лида и не меняет successful form response после подтверждённого local save.
36. Каждая доставка имеет отдельную `lead-delivery` запись: channel, state, attempts, timing и redacted error.
37. Delivery идемпотентна по `(leadId, channelId)` / `idempotencyKey`; повтор после timeout не должен создавать дубль там, где destination поддерживает idempotency/external lookup. Для канала без такой гарантии adapter обязан реализовать safe duplicate mitigation и зафиксировать residual risk.
38. Destination host allowlist является privacy/trust boundary. Новый host — решение owner с фиксацией в `PROJECT.md`.
39. Channel secrets задаются через `credentialRef` / env secret. Tokens, webhook credentials и API keys запрещены в job input и logs. Хранение rotating refresh-token вне secret storage допускается только как encrypted exception с ADR.

---

# 2. SOURCE OF TRUTH И ПОВЕДЕНИЕ AI

## 2.1 Приоритет источников

| Область | Source of truth |
|---|---|
| Код | exact commit в SourceCraft |
| Версии | `package.json`, `pnpm-lock.yaml` |
| Schema | Payload collections/config + `migrations/` |
| Project profile | `AMS_PROFILE` + `docs/PROJECT.md` |
| Design values | `src/app/globals.css` |
| Design policy | `docs/DESIGN.md` |
| Client/project config | `docs/PROJECT.md` |
| Operations | `docs/OPERATIONS.md` |
| Architecture | этот Core Standard |
| Production fact | deployed artifact/image + DB/runtime state |

Figma/references — вход, не normative source. Memory/chat не подменяют фактическое состояние проекта.

## 2.2 Порядок работы AI

```text
прочитать Hard Contract + релевантные sections
→ проверить фактический project state
→ проверить AMS_PROFILE
→ version-sensitive API сверить с official docs
→ REUSE → VARIANT → CREATE
→ выполнить только реальные relevant checks
→ честный отчёт
```

AI не пишет «проверено», если proof фактически не запускался.

## 2.3 Без отдельного решения owner AI не делает

```text
смену stack
второй ORM
Redis / broker / Elasticsearch / PostGIS / Kubernetes
отдельный backend
multitenancy
custom auth / MFA
вторую UI-библиотеку
обход access rules
overrideAccess как shortcut
schema push в production
секреты в code/business DB/logs/docs/browser
переписывание работающих областей «заодно»
ослабление проверок ради green CI
```

Модуль из §22A не считается сменой stack или расширенной topology, если не добавляет новый production component.

---

# 3. КАНОНИЧЕСКИЙ СТЕК

```text
Runtime:     Next.js App Router · React · TypeScript strict
CMS:         Payload CMS · @payloadcms/db-postgres
DB:          Timeweb Managed PostgreSQL
Validation:  Zod
Package:     pnpm
Styling:     Tailwind CSS 4.x (CSS-first, без tailwind.config.*)
Primitives:  shadcn/ui
Icons:       Lucide
Jobs:        Payload Jobs + autoRun в основном runtime
Storage:     Timeweb S3-compatible Object Storage через Payload upload adapter
Parser:      streaming SAX XML parser
Proxy:       Nginx
Repo:        SourceCraft
```

Обязательная jobs-конфигурация:

```ts
jobs: {
  enableConcurrencyControl: true,
  // tasks / schedules / autoRun — по разделу 10
}
```

`enableConcurrencyControl: true` — часть канонического контракта. Без него `concurrency.key` / `exclusive` не считаются работающей защитой.

Timeweb Managed PostgreSQL и Timeweb S3-compatible Object Storage обязательны для каждого production-проекта и не считаются опциональной инфраструктурой.

Точные версии определяются `package.json` и lockfile. Новый major не становится каноном автоматически:

```text
stable release
→ official docs / compatibility review
→ targeted proof
→ explicit adoption
```

По умолчанию не используются:

```text
Redis
broker
отдельный jobs runner
второй backend
search engine
PostGIS
imgproxy
GraphQL/tRPC
вторая UI-библиотека
второй icon pack
```

Новая инфраструктура включается только по доказанному trigger.

---

# 4. PRODUCTION TOPOLOGY

Core Standard фиксирует логическую production topology, но не дублирует delivery/runbook.

```text
Internet
  ↓
Nginx
  ↓
application runtime:
Next.js + Payload + Payload Jobs autoRun
  ↓
Timeweb Managed PostgreSQL

Timeweb S3-compatible Object Storage
  ← Payload manual media
```

Базовые production-инварианты:

```text
Timeweb Managed PostgreSQL
+
Timeweb S3-compatible Object Storage
+
Nginx
+
ровно один jobs-active application runtime:
JOBS_AUTORUN=true
```

Managed PostgreSQL и S3 обязательны для каждого клиентского Realty-проекта и не отключаются для малых проектов.

## 4.1 Single jobs-active runtime

Одновременное существование двух runtime во время rollout допустимо только при сохранении единственного jobs owner.

Каноническая логика handover:

```text
old runtime
  JOBS_AUTORUN=true

new runtime
  JOBS_AUTORUN=false

→ new runtime проходит readiness/live proof без jobs
→ old runtime выводится из эксплуатации
→ подтверждается отсутствие jobs-active runtime
→ new runtime перезапускается с JOBS_AUTORUN=true
→ проверяется jobs health
```

`JOBS_AUTORUN` считается startup configuration. Переключение `false → true` выполняется через controlled restart/recreate runtime, а не «живым» изменением неизвестного механизма.

Пропуск одного dispatcher interval во время handover допустим. Дублирование mutating import недопустимо.

В любой момент времени **не более одного runtime имеет право автоматически планировать и исполнять jobs**.

Blue-green, rolling или иной rollout не имеет права нарушать этот инвариант.

## 4.2 Delivery boundary

Конкретные process supervisor, artifact/image format, delivery commands, migration order, restart strategy, staging promotion и rollback определяются:

```text
AMS production deploy skill
+
docs/OPERATIONS.md
```

Core Standard не дублирует эти процедуры.

---

# 5. СТРУКТУРА РЕПОЗИТОРИЯ

Пустые директории не создаются.

Каноническая folder-form:

```text
src/
  app/
    (site)/
    (payload)/
    api/
      public/
      internal/

  core/
    access/
    data-access/
      public/
      system/
      ingest/
    dto/
    query/
    cache/
    security/
      outbound-http/
      redaction/
    ingest/
      parsers/
    media/
    observability/
    lib/

  project/
    collections/
    globals/
    fields/
    ingest/
    modules/
    project.config.ts
    env.ts

  ui/
    primitives/
    layout/
    shared/
    domain/
    pages/<page>/

  app/globals.css

docs/
  PROJECT.md
  OPERATIONS.md
  DESIGN.md

migrations/
tests/
scripts/
```

Dependency direction:

```text
project → core
app     → core / project / ui
ui      → contracts / DTO

core -X→ ui
ui   -X→ Payload / DB / project persistence
```

## 5.1 Допустимые формы изоляции представления

Инвариант «reusable UI не импортирует Payload, DB clients и persistence types» реализуется одной из двух форм.

### FOLDER FORM

```text
src/ui
+
src/core/dto
```

Изоляция обеспечивается architecture guards.

### PACKAGE FORM — предпочтительна

Допустимы workspace packages:

```text
packages/ui
packages/contracts
```

`packages/ui/package.json` не содержит в dependencies:

```text
payload
@payloadcms/*
pg
ORM/DB clients
project persistence packages
```

`packages/contracts` содержит только serializable contracts/types и минимально необходимый validator dependency.

Package form предпочтительна, потому что запрещённый dependency становится неразрешимым import boundary, а не только обнаруживаемым drift.

### Ограничение monorepo

Monorepo packages в канонической модели допускаются для:

```text
presentation
contracts
```

Core/ingest/access/project не дробятся на отдельные shared packages без ADR: Payload остаётся единым schema/application owner.

Guard при PACKAGE FORM проверяет dependency graph `packages/ui` и `packages/contracts`.

---

# 6. РАЗДЕЛЕНИЕ ДИЗАЙНА И ДВИЖКА

Это центральный принцип стандарта. Три слоя, три ответственности:

```text
ДАННЫЕ        Payload collections, импорт, миграции, доступ
КОНТРАКТ      src/core/dto — единственная точка стыка
ПРЕДСТАВЛЕНИЕ src/ui + globals.css

```

Два правила проверки разделения:

```text
Смена дизайна не должна требовать ни одной миграции.
Смена источника данных не должна требовать переписывания компонентов.

```

Практические следствия:

- Компонент `ui/**` принимает только DTO или примитивные props. Он не знает слов `payload`, `collection`, `depth`, `where`.
- В `ui/**` запрещены импорты из `payload`, `@payloadcms/*`, `src/project/**`, `src/core/data-access/**`.
- DTO именуются от смысла представления, а не от коллекции: `PropertyCardDTO`, `PropertyDetailsDTO`, `PropertyListDTO`, `PropertyFilterDTO`.
- Дизайнерские значения не появляются в TSX. Цвет, радиус, ритм секций, типографика — только через токены и roles.
- Компонент никогда не решает, откуда взять данные. Данные приходят сверху, из страницы или секции-контейнера.

Типовая цепочка страницы:

```text
page.tsx (server)
  → Public Gateway (server)
    → DTO
      → <PropertySection items={dto} />   ui, без знания о Payload
        → <PropertyCard {...item} />

```

---

# 7. ГРАНИЦЫ ДОСТУПА К ДАННЫМ

## 7.1 Public Gateway

```text
src/core/data-access/public
```

Обязательно в каждой public function:

```text
'server-only'
overrideAccess: false
explicit depth
explicit select
explicit limit
publication predicate
validated input
output = DTO
```

Raw Payload document наружу не возвращается.

## 7.2 System Gateway

```text
src/core/data-access/system
```

Единственное место, где допустим `overrideAccess: true`, и только для whitelist system operations:

```text
bootstrap первого owner
controlled maintenance
system jobs
migration helpers
trusted inspection payload-jobs
version-pinned emergency payload-jobs recovery
```

`payload-jobs` по умолчанию не является обычной business collection. Диагностика и recovery не размазываются по handlers/scripts.

Generic CRUD по `payload-jobs` не используется как нормальный application path.

## 7.3 Ingest Gateway

```text
src/core/data-access/ingest
```

Bulk upsert inventory.

Допустим batch-path, если соблюдены:

```text
Zod normalization до write
bounded batches
transaction там, где действительно нужна
unique (feedSource, externalId)
idempotent upsert
explicit source scope
no external HTTP inside transaction
```

CRUD users и обычные user operations через low-level DB запрещены.

## 7.4 Dispatcher Claim

Atomic/conditional claim `feed-source` выполняется через Payload application path, а не raw SQL по умолчанию.

Минимальный contract:

```text
conditional update:
  id = sourceId
  enabled = true
  nextDueAt <= now

→ проверить фактический updated result
→ только один successful claimer продолжает enqueue
```

Реализация может использовать Local API conditional update / supported adapter primitive, если он даёт проверяемую semantics affected-result.

Raw SQL для dispatcher claim не является default и требует отдельного доказанного trigger.

## 7.5 Optimized Read Gateway

По умолчанию **не создаётся**.

Для базового профиля до ~2 000 объектов обычный Payload read path — default. Optimized Read Gateway появляется только после измеренного bottleneck.

## 7.6 Private fields

Типично приватны:

```text
unit number
cadastral number
owner contact
internal comment
diagnostic data
lead fields
```

Защита — field-level/access rules. DTO — второй эшелон, не единственная защита.

---

# 8. МОДЕЛЬ ДАННЫХ

## 8.1 Collections

Создаются в базовой конфигурации:

```text
users
pages
properties
feed-sources
import-runs
import-issues
media
leads
lead-deliveries
redirects
```

Не создаются в базовой конфигурации, но легитимны при активации соответствующего модуля §22A:

```text
residential-complexes
buildings
layouts
developers
agents
posts
```

Не создаются без отдельного решения owner:

```text
seo-landings
facet-cache
price-history
phone-reveals
reviews
offices
```

### Pre-create rule

Pre-create обязателен только для данных, которые могут быть невосстановимы при отложенном решении.

```text
feed-derived identity
→ сохраняется с первого import

authored content
→ не pre-create
→ активируется expand-migration без исторического backfill
```

Поэтому `market` и external grouping identity входят в base schema, а `posts` — нет.

Для imported inventory:

```text
versions = off
drafts = off
document locking = off
```

## 8.2 `properties`

```text
Identity
  feedSource
  externalId
  origin: feed | manual
  importHash
  firstSeenAt
  lastSeenAt
  lastImportRun

External grouping
  externalComplexId: text | null
  externalComplexName: text | null
  externalBuildingId: text | null
  externalLayoutId: text | null

Lifecycle
  status: active | archived
  deactivatedAt
  deactivatedByRun
  needsReview
  publishedAt
  slug

Classification
  market: secondary | newbuild        # NOT NULL, default secondary, index
  category: apartment | house | land | commercial
  dealType: sale | rent

Money
  priceMinor: integer
  currency
  pricePerMeterMinor: integer | null

Parameters
  rooms
  totalArea
  livingArea
  kitchenArea
  floor
  floors

Location
  region
  locality
  district
  street
  house
  publicAddress
  lat
  lng

Content
  title
  description
  images

Private
  unitNumber
  cadastralNumber
  internalComment
  ownerContact
```

### Market ownership

Для imported inventory:

```text
properties.market = feedSource.market
```

Parser не переопределяет market источника. Для `origin=manual` market задаётся явно.

### Money normalization

`pricePerMeterMinor` считается только в ingest:

```text
if priceMinor != null AND totalArea > 0
→ banker's rounding(priceMinor / totalArea)
else
→ NULL
```

Площади нормализуются в `decimal(10,2)`.

Минимально рассматриваемые indexes:

```text
(feedSource, externalId) unique
status
market
category
dealType
priceMinor
rooms
district
externalComplexId
externalBuildingId
externalLayoutId
```

### Newbuild readiness

Base не создаёт collections новостроек заранее, но сохраняет feed-derived grouping identity с первого import.

```text
feed отдаёт externalLayoutId
→ сохранить

feed не отдаёт layout identity
→ externalLayoutId = NULL
```

При активации newbuild module mapping может строиться по `complex/building + rooms + area + source-specific attributes`; ambiguity → `needsReview`. Auto-merge только по близкой площади запрещён.

```text
layout
→ тип планировки

property/unit
→ конкретная единица inventory
```

Смешение layout/unit — blocking data-model defect.

## 8.3 `feed-sources`

Несколько XML/YRL sources — штатный сценарий `REALTY_BASE`.

```text
code
title
parser
market: secondary | newbuild
feedUrlRef
enabled

refreshIntervalMinutes
nextDueAt
lastAttemptAt
lastSuccessfulRunAt
lastFullRunAt

safetyThresholdPercent
maxDeactivationsPerRun
lastOfferCount

lastEtag
lastModified
lastFeedHash

deactivationApproval:
  runId
  approvedBy
  approvedAt
  expiresAt
  consumedAt
```

`market` обязателен и является authoritative source для `properties.market` imported records.

`nextDueAt` для enabled source — NOT NULL/default now или миграционно нормализуется.

```text
minimumSafeCount =
  lastOfferCount * (1 - safetyThresholdPercent / 100)

count < minimumSafeCount
→ suspicious
```

`maxDeactivationsPerRun` — независимый absolute ceiling.

Approval одноразовый:

```text
runId == currentRun
approvedAt != null
expiresAt > now
consumedAt == null
```

после применения `consumedAt = now`.

## 8.4 `leads`

Самый чувствительный PII.

```text
create = public create-only endpoint
read/update/delete = owner only
public DTO = forbidden
```

В `PROJECT.md` обязательны `leadRetentionDays` и retention mode.

## 8.5 `lead-deliveries`

Одна запись на `(leadId, channelId)`.

```text
lead                  relation -> leads
channelId
channelKind: messenger | crm

status:
  pending | sending | delivered | failed | abandoned

attempts
nextAttemptAt
deliveredAt
idempotencyKey
externalRef
lastErrorRedacted
claimedAt
heartbeatAt

attemptLog[]:
  attemptedAt
  safeCode
  outcome
  redactedNote
```

`attemptLog` компактный; raw payload/response, PII и secrets запрещены.

Access:

```text
read = owner only
create/update = system paths
public access = deny
public DTO = never
```

Retention синхронен с lead:

```text
lead delete → deliveries delete
lead anonymize → linked diagnostics anonymize
```

---

# 9. ИМПОРТ XML / YRL

Импорт — критическая часть платформы. Базовая конфигурация поддерживает несколько независимых XML/YRL feed sources.

## 9.1 Pipeline

```text
static dispatcher schedule
→ claim due feed-source
→ create import-run(status=queued)
→ enqueue importFeed(queue='imports')
→ Safe Outbound Client
→ conditional GET
→ streaming source parser
→ Zod normalization
→ Ingest Gateway
→ safe deactivation gate
→ cache invalidation adapter
→ import-run report
```

Parser выбирается server-side registry по `feedSource.parser`.

Source-specific parser не протекает в UI и не импортирует внутренности другого parser.

## 9.2 Conditional GET и baseline

Conditional GET обязателен там, где source его поддерживает.

```text
If-None-Match / If-Modified-Since
304
→ run = unchanged
→ 0 inventory business writes

200
→ sha256 body
→ hash == lastFeedHash
→ run = unchanged
→ 0 inventory business writes

иначе
→ parse
```

State rules:

```text
lastAttemptAt
  обновляется при каждом attempt

lastSuccessfulRunAt
  обновляется при success И unchanged

lastFullRunAt
  обновляется только после полного успешно дочитанного run

lastOfferCount
  обновляется только после полного successful run,
  прошедшего structural/safety checks

unchanged
  не меняет lastOfferCount
```

Alert freshness опирается на `lastSuccessfulRunAt`.

## 9.3 Safe Outbound Client

Никаких прямых `fetch` по конфигурируемому URL.

Минимум:

```text
https default
http только для явно approved source
host allowlist
localhost deny
private/link-local deny, если destination не approved
timeout
max response size
redirect destination re-check
единый DNS/address safety mechanism
```

Credential URL не хранится в job input, logs или обычных business fields.

## 9.4 Parser safety

Каждый XML parser:

```text
streaming
не загружает весь документ в память
DTD disabled
external entities disabled
max response/file size
разумные structural limits
timeout/cancellation
локальный bad offer → skip + import-issue
critical structural anomaly → suspicious
```

## 9.5 Idempotency

`importHash` считается от normalized offer.

```text
same importHash
→ business fields не переписываются
→ offer = unchanged
```

`lastSeenAt` допускается обновлять как operational marker.

Для unchanged offers:

```text
lastSeenAt
→ bulk update на batch/source scope
```

Такой технический bulk touch не считается significant business write: при совпадающем `importHash` business data не переписываются.

## 9.6 Field ownership

Приоритет:

```text
manual
→ explicit field owner
→ owning feed
→ empty field
```

Feed A не перезаписывает manual-owned или Feed B-owned fields.

## 9.7 Safe deactivation

Mass archive разрешена только если одновременно доказано:

```text
stream дочитан полностью
нет critical structural error
source enabled
offer identity корректна
run не interrupted
source scope доказан
count >= minimumSafeCount
plannedDeactivations <= maxDeactivationsPerRun
```

где:

```text
minimumSafeCount =
  lastOfferCount * (1 - safetyThresholdPercent / 100)
```

Первый полный run:

```text
lastOfferCount отсутствует
→ baseline создаётся
→ mass deactivation не выполняется
```

Если нарушен percentage или absolute gate:

```text
run = suspicious
automatic deactivation = forbidden
previous catalog remains available
```

### One-time approval

Owner может разрешить deactivation только для конкретного suspicious run:

```text
deactivationApproval.runId == importRun.id
approvedAt != null
expiresAt > now
consumedAt == null
```

После применения:

```text
consumedAt = now
```

Approval не переносится на следующий run.

AI не отключает safety gates как shortcut.

## 9.8 Concurrency и source isolation

Обязательный framework-level setting:

```ts
jobs: {
  enableConcurrencyControl: true
}
```

Каждый `importFeed` получает:

```text
concurrency key:
  import:feed:<feedSourceId>

exclusive:
  true
```

Разные sources имеют разные keys.

Суммарный throughput одного runner считается version-sensitive. `autoRun.limit` не трактуется как доказанный parallel-worker count без проверки конкретной версии Payload.

## 9.9 `import-runs` lifecycle

`import-run` создаётся dispatcher'ом до enqueue:

```text
status = queued
feedSource
queuedAt
jobId = после успешного enqueue
```

Статусы:

```text
queued
→ running
→ success | unchanged | suspicious | interrupted | failed
```

Переход `queued → running` выполняется **conditional update**.

Handler начинает ingest только если transition успешен.

Если run уже:

```text
interrupted
failed
success
unchanged
suspicious
```

или иным образом не `queued`, job завершается **до первого inventory write**.

Это защищает от race «janitor закрыл run, а старый pending job позже проснулся».

После unstuck/interrupted run считается terminal и больше не может быть повторно активирован тем же job.

### Orphan queued detection

Janitor проверяет:

```text
queued run
старше orphan threshold
AND нет живого связанного job
```

→ `interrupted`

Pending job с валидным будущим `waitUntil` не считается orphan.

## 9.10 Heartbeat

Пока mutating import работает:

```text
handler
→ периодически обновляет importRun.heartbeatAt
```

Критический инвариант:

> heartbeat должен быть виден другим процессам/запросам **до завершения ingest transaction**.

Heartbeat update выполняется **вне ingest transaction**:

```text
отдельный Local API call
без передачи transactional req
или disableTransaction: true
```

Точный implementation проверяется на pinned Payload version.

Обязательный targeted proof до первого production и после relevant Payload/DB upgrade:

```text
запустить долгий controlled import
→ во время его работы внешний независимый read
→ видит увеличивающийся heartbeatAt
```

Если proof не проходит — recovery model считается недоказанной и release блокируется.

## 9.11 Feed images

Feed images по умолчанию остаются external URLs.

Массовое копирование feed images в S3 не выполняется без отдельного решения.

Remote image patterns ограничиваются approved hosts.

---

# 10. JOBS

Payload Jobs используется без Redis/broker.

`REALTY_BASE`: scheduling + running выполняет один jobs-active application runtime.

## 10.1 Canonical jobs config

Обязательно:

```ts
jobs: {
  enableConcurrencyControl: true,

  autoRun: [
    {
      cron: '* * * * *',
      queue: 'system',
      limit: 5,
      disableScheduling: false,
    },
    {
      cron: '* * * * *',
      queue: 'imports',
      limit: 5,
      disableScheduling: true,
    },
    {
      cron: '* * * * *',
      queue: 'maintenance',
      limit: 5,
      disableScheduling: false,
    },
    {
      cron: '* * * * *',
      queue: 'lead-deliveries',
      limit: 10,
      disableScheduling: true,
    },
  ],

  shouldAutoRun: async () =>
    process.env.JOBS_AUTORUN === 'true',
}
```

Exact config API version-sensitive и проверяется по official Payload docs.

### Queue-scoped scheduling rule

```text
disableScheduling=false
⇔ в queue есть static schedules

disableScheduling=true
⇔ queue получает только programmatic enqueue
```

Default:

```text
system            false  # dispatchDueFeeds
maintenance       false  # janitor / retention / lifecycle
imports           true   # dispatcher enqueue
lead-deliveries   true   # form/delivery state machine enqueue
```

Ни одна queue не планируется двумя mechanisms одновременно:

```text
autoRun schedule handling
+
bin handle-schedules
```

для одной queue запрещены.

## 10.2 Feed dispatcher

Tasks:

```text
dispatchDueFeeds
importFeed
```

Default:

```text
dispatcherCron = */5 * * * *
dispatcherIntervalMinutes = 5
queue = system
```

Dispatcher interval фиксируется в `PROJECT.md`.

Due:

```text
enabled = true
AND nextDueAt <= now
```

Claim выполняется conditional application operation.

Следующий due:

```text
nextDueAt =
  max(
    now + refreshInterval,
    previousNextDueAt + refreshInterval
  )
```

То есть missed intervals не догоняются.

Порядок:

```text
conditional claim
→ create import-run queued
→ enqueue importFeed:
     queue='imports'
     input={feedSourceId, importRunId}
→ save jobId
```

Implicit `default` queue запрещён.

## 10.3 `importFeed`

```text
queue='imports'
retries=0

concurrency:
  key = import:feed:<feedSourceId>
  exclusive = true
  supersedes = false
```

До первого inventory write:

```text
import-run queued → running
```

через conditional transition.

Если transition не удался — job завершается без ingest.

## 10.4 Import janitor / recovery

Source of truth:

```text
importRun.heartbeatAt
```

Stale:

```text
max(
  15 minutes,
  3 × max observed successful duration
)
```

Heartbeat пишется вне ingest transaction по §9.

Janitor:

```text
stale running → interrupted
mass deactivation forbidden
baseline unchanged
```

Orphan queued threshold:

```text
max(
  15 minutes,
  3 × dispatcherIntervalMinutes
)
```

Pending job с валидным future `waitUntil` не orphan.

## 10.5 Trusted `payload-jobs` recovery

Весь trusted inspection/recovery:

```text
src/core/data-access/system/jobs
```

`overrideAccess: true` допустим здесь как whitelist system operation.

Generic business CRUD по `payload-jobs` запрещён.

Read-only diagnostics owner можно открыть через `jobsCollectionOverrides`, если pinned Payload version это поддерживает:

```text
read: owner only
admin.hidden=false
create/update/delete generic access = deny
```

Emergency unstuck — только:

```text
stale heartbeat доказан
→ System Gateway
→ version-pinned Local API recovery
→ terminal/interrupted state
→ redacted log
```

Raw SQL не default.

Manual procedure обязательна в `OPERATIONS.md`.

## 10.6 Maintenance jobs

Static schedules в `maintenance`:

```text
jobsJanitor
leadRetentionCleanup
catalogLifecycle
recoverLeadDeliveries
```

`leadRetentionCleanup` применяет policy §8.4/§8.5.

`catalogLifecycle` применяет §15.

`recoverLeadDeliveries` возвращает stale `sending` delivery в retry state по §14A.

## 10.7 Manual operations

Payload Admin:

```text
manual import конкретного feed
approve конкретного suspicious run
read-only jobs diagnostics owner
manual retry abandoned lead-delivery owner
```

Unstuck internal Payload job выполняется только System Gateway maintenance action/script.

Public jobs endpoint не создаётся.

---

# 11. КЭШ И ИНВАЛИДАЦИЯ

## 11.1 Adapter обязателен с первого дня

```text
src/core/cache/invalidator.ts
```

Контракт:

```ts
invalidate(targets: CacheTarget[]): Promise<void>
```

Реализации:

```text
in-process
http
```

Выбор:

```text
CACHE_INVALIDATION_MODE
```

### No top-level `next/cache`

`src/core/cache/invalidator.ts` не импортирует `next/cache` на module top-level.

Допустимый in-process implementation использует lazy import:

```ts
const { revalidateTag, revalidatePath } =
  await import('next/cache')
```

только внутри approved branch.

Guard запрещает top-level `next/*` в:

```text
src/core/ingest/**
job handlers
src/core/cache/**
```

кроме явно разрешённого lazy dynamic import.

## 11.2 In-process mode — только после proof

Next официально гарантирует `revalidateTag` / `revalidatePath` для Server Functions и Route Handlers. AutoRun job handler не считается автоматически доказанным request/server-function context.

Поэтому:

```text
CACHE_INVALIDATION_MODE=in-process
```

разрешён только после targeted proof на pinned Next/Payload versions:

```text
autoRun import
→ data changed
→ invalidator called
→ следующий public request получает fresh data
→ no invariant/request-store error
```

Если proof не пройден или не запускался:

```text
CACHE_INVALIDATION_MODE=http
```

становится default для проекта.

## 11.3 HTTP invalidation

HTTP mode не требует отдельной инфраструктуры.

```text
job handler
→ POST internal revalidation Route Handler
→ Next runtime
→ revalidateTag / revalidatePath
```

Обязательно:

```text
REVALIDATE_SECRET
POST only
validated target allowlist
Nginx/application rate limit
secret-safe logs
internal endpoint не используется как public API
```

Этот режим совместим и с single-runtime autoRun, и с будущим dedicated jobs runner.

## 11.4 Cache targets

Targets создаются typed constructors.

После successful import:

```text
catalog group
affected filter slices
affected property pages
```

Запрещено:

```text
for every property:
  synchronous revalidate(...)
```

## 11.5 Failure policy

Cache invalidation failure:

```text
не откатывает уже корректно записанный inventory
фиксируется как operational issue
может retry controlled mechanism
поднимает alert при превышении project stale-data SLA
```

Import report различает:

```text
data success
cache invalidation warning/failure
```

---

# 12. СТРАНИЦЫ: СТАТИКА ПРОТИВ CMS

Страница по умолчанию живёт в code composition.

```text
STATIC ROUTE
  route в src/app/(site)
  composition из sections
  изменения через commit

CMS PAGE
  только если клиент реально редактирует страницу
  fixed schema
  без universal page-builder
```

Типовой `REALTY_BASE`:

```text
static:
  главная
  услуги
  о компании
  ипотека
  продать/сдать
  контакты
  legal
  404

CMS:
  редкие текстовые pages
  redirects

dynamic:
  catalog
  property pages
  enabled module pages
```

Journal/blog в Base не входит; это module §22A.

## 12.1 Избранное и сравнение

Допустимы при client-only state:

```text
localStorage / URL
нет server writes
нет auth
нет cross-device sync
public DTO по ids
```

Это не личный кабинет.

## 12.2 Server performance budget

```text
catalog list data path p95 ≤ 300 ms
property detail data path p95 ≤ 200 ms
```

Fail → query/select/index/cache analysis → только затем новая infrastructure.

---

# 13. UI CORE

## 13.1 Порядок работы

```text
REUSE → VARIANT → CREATE
```

Поиск:

```text
existing project component
→ variant
→ shadcn primitive
→ new local component
```

## 13.2 Design values

`src/app/globals.css` — единственный source of truth **значений** design system:

```text
semantic colors
surface values
typography scales
radii
section rhythm
easing
container tokens
```

Это не означает запрет CSS-файлов вне globals.

### Page-level layout CSS

Допустим CSS уровня страницы/крупной секции, если он:

```text
содержит layout geometry:
  grid
  flex
  positioning
  sizing relationships
  responsive composition

не содержит literal design values:
  hex/rgb/hsl/named brand colors
  literal font-size
  literal font-weight
  literal design radii
  literal section rhythm values

берёт design values через var(--*)
не дублирует без причины то, что ясно выражается Tailwind
```

Разрешённые structural values включают, где уместно:

```text
%
fr
auto
aspect-ratio
grid line / span
intrinsic layout keywords
```

Component-specific CSS внутри `globals.css` запрещён.

Направление:

```text
globals.css design values
→ page/section CSS consumes var(--*)
```

а не наоборот.

## 13.3 Typography

Roles:

```text
text-h1 ... text-h4
text-body-lg
text-body
text-body-sm
text-label
text-caption
```

HTML semantics и visual role разделены.

## 13.4 Containers / rhythm

```text
containers:
  narrow
  site
  wide

section rhythm:
  sm
  md
  lg
  hero
```

`Container` отвечает за horizontal layout, `Section` — за vertical rhythm. Отклонение от `Section` допускается только для page-level grid/composition, где стандартный section rhythm технически не выражает макет; исключение фиксируется в `DESIGN.md`.

## 13.5 Primitives

shadcn/ui — единственная primitive foundation.

Variants canonical primitives живут в одном owner component/CVA.

## 13.6 Server/client boundary

```text
SERVER SECTION
└── CLIENT INTERACTIVE LEAF
```

`"use client"` только для hooks/local state/browser API/gallery/filter/menu/map/form UX.

## 13.7 Theme

Dark theme по умолчанию отключена, если project design не требует её.

## 13.8 Motion / icons

Default:

```text
CSS/Tailwind transitions
transform/opacity
prefers-reduced-motion
Lucide icons
```

Вторая motion/icon ecosystem не добавляется без trigger.

## 13.9 Media / performance

Обязательны:

```text
осознанный LCP candidate
sizes
lazy loading below critical area
image fallback
stable aspect ratio
```

Target:

```text
mobile LCP ≤ 2.5 s
CLS ≤ 0.1
```

## 13.10 Accessibility

Минимум:

```text
semantic HTML
one logical H1
heading hierarchy
keyboard
visible focus
labels/errors
alt
contrast
accessible overlays
status not only color
touch targets
reduced motion
```

---

# 14. ФОРМЫ И ЛИДЫ

Один canonical `LeadForm` на проект.

```text
UI:
  fields
  UX validation
  consent
  states

Engine:
  server validation
  anti-spam
  transactional local persistence
  async delivery enqueue
  analytics without PII
```

## 14.1 Transactional outbox

Lead и применимые `lead-deliveries` создаются **в одной DB transaction**:

```text
validate
→ BEGIN
    insert lead
    insert lead-deliveries(status=pending)
      для всех active channels
  COMMIT
→ enqueue delivery jobs
→ return success
```

Инвариант:

> committed lead не существует без delivery-records для всех активных применимых каналов.

External CRM/messenger request внутри form transaction запрещён.

Enqueue идёт после commit. Если процесс падает между commit и enqueue:

```text
lead сохранён
pending deliveries существуют
recoverLeadDeliveries выполняет orphan sweep
```

Form success зависит от local commit, а не от availability внешних каналов.

PII form не выпускается без privacy/consent contract.

---

# 14A. ДОСТАВКА ЛИДОВ

Lead delivery — core subsystem.

## 14A.1 Каналы

```text
messenger:
  telegram
  max

crm:
  amocrm
  bitrix24
  custom-webhook
```

Активные channels и routing фиксируются в `PROJECT.md`.

## 14A.2 Port / adapter

```text
LeadDeliveryChannel
LeadDeliveryPayload

result:
  { externalRef?: string }

error:
  retryable
  safeCode
  redactedMessage
  deliveryCertainty:
    not-delivered | unknown | delivered
```

Adapter отвечает за protocol mapping/transport; routing policy — project config.

## 14A.3 State machine

```text
pending
→ sending
→ delivered
```

Retryable:

```text
sending
→ pending
→ nextAttemptAt
→ requeue
```

Exhausted/permanent:

```text
→ abandoned
```

## 14A.4 `deliverLead`

```text
queue = lead-deliveries

concurrency key =
  delivery:<leadId>:<channelId>

exclusive = true
supersedes = false
retries = 0
```

AMS управляет backoff через `waitUntil`.

Default:

```text
attempt 1 → immediately
attempt 2 → +1m
attempt 3 → +5m
attempt 4 → +15m
attempt 5 → +60m
attempt 6 → +240m
```

Project может изменить schedule в `PROJECT.md`.

### Retryable failure

Обрабатывается внутри handler:

```text
increment attempts
append safe attemptLog
compute nextAttemptAt
status = pending
enqueue deliverLead(waitUntil=nextAttemptAt)
→ handler завершается УСПЕШНО
```

Retryable error наружу не `throw`.

При `retries=0` throw сделал бы текущий Payload job terminal и потерял controlled next attempt.

State update и enqueue следующей попытки не выполняются внутри транзакции, которая откатывается из-за этой же outbound error.

Unexpected/unclassified error может оставить state `sending`; его подхватывает stale recovery.

## 14A.5 Claim / heartbeat / recovery

Перед outbound:

```text
pending → sending
```

conditional transition.

Fail transition → exit без HTTP.

### Stale sending

```text
sending + stale heartbeat
→ pending
→ recovery log
→ controlled requeue
```

### Orphan pending sweep

`recoverLeadDeliveries` также ищет:

```text
status = pending
AND nextAttemptAt <= now
AND нет живого связанного job
AND возраст >= orphan threshold
```

Порог:

```text
max(
  5 minutes,
  2 × maintenanceIntervalMinutes
)
```

→ controlled requeue.

Это закрывает crash между outbox commit и enqueue, а также между retry-state update и retry enqueue.

## 14A.6 Idempotency / duplicate policy

Canonical key:

```text
lead:<leadId>:channel:<channelId>
```

### CRM

Высокая стоимость duplicate.

Использовать где возможно:

```text
native idempotency
externalRef lookup
destination-specific duplicate check
```

`externalRef` сохраняется сразу после подтверждённого remote create.

### Messenger

Timeout может означать:

```text
deliveryCertainty = unknown
```

то есть сообщение могло уйти.

Default:

```text
unknown timeout
→ более консервативная следующая задержка
→ residual duplicate risk фиксируется
```

Telegram/MAX не считаются имеющими native idempotency без proof актуальной provider API.

## 14A.7 Secrets / outbound

```text
Safe Outbound Client
+
per-channel allowlist
```

Job input содержит только stable non-secret ID (`leadDeliveryId`).

Запрещены в job input:

```text
token
secret webhook URL
refresh token
raw PII payload
```

Bitrix24 webhook URL = high-sensitivity credential.

amoCRM OAuth credentials не хранятся в business records; encrypted app storage для rotating refresh token только по ADR.

Custom webhook:

```text
HTTPS
HMAC
timestamp
replay window
idempotency key
```

## 14A.8 Monitoring

Aggregated alerts:

```text
failure ratio
abandoned
channel outage
delivery backlog
```

Per-lead alerts default off.

## 14A.9 Admin / audit

Owner:

```text
delivery state
compact attemptLog
manual retry abandoned
```

Manual retry:

```text
не очищает attemptLog
append manual-retry audit entry
pending
enqueue one job
```

## 14A.10 Retention

```text
lead delete
→ deliveries delete

lead anonymize
→ linked diagnostics anonymize
```

---

# 15. SEO

Page contract:

```text
title
description
canonical
Open Graph
one logical H1
heading hierarchy
meaningful alt
structured data from factual data only
sitemap / robots coverage
```

Published URL change:

```text
redirect
без chains/loops
```

Filter indexing — whitelist only.

## 15.1 Lifecycle archived property

При `archived`:

```text
200
«не актуально»
noindex
remove from sitemap
show relevant alternatives
```

`archiveRetentionDays` фиксируется в `PROJECT.md`, типично 30–90 дней.

После retention:

```text
relevant target exists
→ permanent redirect

no relevant target
→ 410 Gone
```

Redirect на нерелевантную homepage запрещён.

## 15.2 Резервирование URL модулей

До первого production резервируются пространства планируемых модулей:

```text
/novostroyki/*
/komplex/[slug]
/journal/*
/journal/[slug]
```

Exact project URL schema фиксируется в `PROJECT.md`.

Reserved namespace:

```text
не занимается CMS page
не занимается unrelated static route
не переиспользуется без redirect analysis
```

Цель — активировать module §22A без миграции уже проиндексированных unrelated URLs.

PII из forms в analytics не передаётся.

---

# 16. БЕЗОПАСНОСТЬ

## 16.1 Users

Default:

```text
owner
editor optional
```

Self-registration off.

Первый owner — controlled bootstrap.

## 16.2 Access

Каждая business collection имеет explicit CRUD access.

Anonymous raw Payload business REST — deny.

Public website → Public Gateway.

Admin дополнительно ограничивается Nginx/IP/private-access policy по `PROJECT.md`, если используется редко.

## 16.3 Transport

Production minimum:

```text
HTTPS
login attempt limits / lockout
Nginx rate limits
secure cookies
exact allowed origins
CSP
HSTS
nosniff
Referrer-Policy
frame protection
```

## 16.4 Env / secrets

Canonical env categories:

```text
AMS_PROFILE
TZ
JOBS_AUTORUN

DATABASE_URI or project-approved existing DB env name
PAYLOAD_SECRET
NEXT_PUBLIC_SERVER_URL or project-approved existing public URL env name

CACHE_INVALIDATION_MODE
REVALIDATE_SECRET
INTERNAL_REVALIDATE_BASE_URL

S3_ENDPOINT
S3_REGION
S3_BUCKET
S3_ACCESS_KEY
S3_SECRET_KEY

FEED_SOURCE_*
OUTBOUND_ALLOWED_HOSTS

LEAD_CHANNELS
LEAD_OUTBOUND_HOSTS

TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID

MAX_BOT_TOKEN
MAX_CHAT_ID

CRM_KIND
CRM_WEBHOOK_URL
CRM_HMAC_SECRET
AMOCRM_BASE_URL
AMOCRM_TOKEN

ALERT_WEBHOOK_URL
```

Это canonical semantic names, а не требование переименовать уже работающий project env без пользы.

Если starter уже использует, например:

```text
DATABASE_URL
NEXT_PUBLIC_SITE_URL
```

project может сохранить эти names, если `env.ts` и `PROJECT.md` однозначно фиксируют mapping.

Zod env validation conditional:

```text
AMS_PROFILE → обязательный valid enum

LEAD_CHANNELS includes telegram
→ TELEGRAM_* required

LEAD_CHANNELS includes max
→ MAX_* required

CRM_KIND=amocrm
→ AMOCRM_* required

CRM_KIND=bitrix24
→ CRM_WEBHOOK_URL required

CRM_KIND=custom
→ CRM_WEBHOOK_URL + CRM_HMAC_SECRET required

CACHE_INVALIDATION_MODE=http
→ REVALIDATE_SECRET required
```

`TZ` обязателен.

Полный env dump запрещён.

## 16.5 Logs

Не логируются:

```text
passwords
tokens
cookies
auth headers
form bodies
lead PII
owner contacts
credential URLs
raw integration payloads
```

Redaction централизована.

## 16.6 Staging

Отдельная DB, non-production secrets, test/sanitized data, noindex, restricted access.

Production PII dump → staging запрещён.

---

# 17. PRODUCTION CONTRACT И ЭКСПЛУАТАЦИЯ

## 17.1 Граница и приоритет

```text
Core Standard
→ architectural invariants

AMS production deploy skill
→ release contract

OPERATIONS.md
→ project runbook
```

Procedure, нарушающая Core invariant, исправляется до release.

## 17.2 Jobs ownership по profile

Для каждой queue существует ровно один jobs owner.

### REALTY_BASE

```text
application runtime
JOBS_AUTORUN=true
```

### REALTY_EXTENDED

```text
web runtime:
  JOBS_AUTORUN=false

dedicated runner:
  owner своей queue
```

Инвариант profile-neutral:

> одна queue — один scheduling/running owner.

Независимо от profile:

```text
release только по явной owner command
exact main SHA
immutable artifact/image
no application build on production host
schema = migrations only
known-good rollback preserved
live proof mandatory
```

## 17.3 Migrations

```text
schema change
→ dev proof
→ migration
→ verify:schema
→ staging if RISKY
→ production
```

## 17.4 Backup / restore

```text
Managed PostgreSQL → automatic backup
SourceCraft → source recovery
Timeweb S3 → versioning/backup policy
```

Restore проверяется фактически.

## 17.5 Health / alerts

Actionable:

```text
site down
DB down
feed overdue
import suspicious/interrupted
lead delivery backlog/abandoned
backup failure
critical integration failure
```

Feed overdue:

```text
max(2h, 3 × refreshIntervalMinutes)
```

---

# 18. WORKFLOW И ПРОВЕРКИ

## 18.1 Risk classes

```text
STANDARD
  text
  CSS/layout
  static UI
  SEO copy
  safe presentation logic
  package-form boundary docs/guards
  module governance docs

RISKY
  auth/access
  schema/migrations
  import/source identity
  jobs/recovery
  lead delivery
  secrets
  critical queries/indexes
  S3/media pipeline
  major runtime upgrade
  production topology
  backup/recovery
```

## 18.2 Rhythm

```text
WORK
→ implementation + needed diagnostics

PR
→ checkpoint

MERGE
→ diff review + exact-head proof

DAILY
→ final main proof

RELEASE
→ deploy skill + live proof
```

`merge != release`.

## 18.3 Commands

```bash
pnpm verify
pnpm verify:schema
pnpm verify:daily
```

Exact command contents live in project scripts/docs.

## 18.4 Mechanical guards

Минимум:

```text
1. overrideAccess:true вне System Gateway
2. Local API application call без explicit access mode
3. low-level DB вне approved ingest/migration paths
4. private fields в public select/DTO
5. wildcard CORS
6. configurable outbound fetch мимо Safe Outbound Client
7. obvious secret exposure
8. top-level next/* внутри ingest/job-handler/cache graph
9. persistence dependencies внутри reusable UI
10. project-authored dark: при отключённой dark theme
11. design literals вне globals.css
```

### Guard 9 — package form

Если используется `packages/ui`:

```text
package.json не содержит:
  payload
  @payloadcms/*
  pg
  ORM/DB clients
  project persistence
```

`packages/contracts` не зависит от persistence и framework runtime; допустим minimal validator dependency.

### Guard 11 — CSS literals

Во всех CSS кроме `globals.css` запрещаются project-authored literal:

```text
colors
font-size
font-weight
design radius
section-rhythm values
```

Разрешены:

```text
var(--*)
structural geometry
%
fr
auto
aspect-ratio
```

Guard не должен ошибочно запрещать browser/system keywords, необходимые для layout; allowlist фиксируется тестами.

## 18.5 Integration tests — mandatory minimum

### Import

```text
idempotency
source isolation
safe deactivation on truncated feed
concurrent guard
304/unchanged
interrupted ≠ deactivation
approval single-use
maxDeactivationsPerRun
multi-feed independence
```

### Access

```text
anonymous deny
role/access matrix
private fields outside DTO
leads inaccessible publicly
lead-deliveries inaccessible publicly
```

### Lead delivery

```text
lead saved when all channels unavailable
form success after local save despite delivery failure
idempotency / duplicate mitigation after timeout
controlled waitUntil backoff
transition to abandoned
stale recovery: sending → pending
secret/PII absent from logs and lastErrorRedacted
retention removes/anonymizes delivery with lead
channel host allowlist enforced
```

### Migration

```text
clean DB path
relevant data preserved
indexes/constraints
newbuild-readiness fields backfill/default
```

E2E golden paths:

```text
catalog → property
Payload Admin → edit/publish
lead form → saved lead
```

Сотни tests ради coverage не создаются.

---

# 18A. TARGETED PLATFORM PROOFS

До first production и после relevant major upgrade проверяются:

## A. Heartbeat visibility

```text
long import
→ ingest transaction open
→ independent read sees advancing heartbeat
```

## B1. In-process cache invalidation

Только если project претендует на `in-process`:

```text
autoRun import
→ DB changed
→ in-process invalidation
→ fresh public response
→ no request-store error
```

Fail/not-run → `http`.

## B2. HTTP self-call in BASE

```text
autoRun import
→ one batched POST to INTERNAL_REVALIDATE_BASE_URL
→ secret accepted
→ no public rate-limit/self-throttle
→ fresh public response
```

## C. Dispatcher no catch-up

```text
overdue feed
→ one claim
→ one run
→ nextDueAt future
→ no storm
```

## D. Stale import recovery

```text
crash
→ stale heartbeat
→ interrupted
→ System Gateway unstuck
→ next import executes
```

## E. Retention execution

```text
expired lead + deliveries
→ maintenance schedule executes
→ delete/anonymize together
→ no PII remains
```

## F. Lead outbox crash window

```text
commit lead + pending deliveries
→ crash before enqueue
→ orphan sweep finds pending
→ requeue
→ delivery executes
```

## G. Retryable delivery

```text
retryable channel failure
→ handler does not throw
→ pending + nextAttemptAt
→ waitUntil job queued
→ next attempt executes
```

---

# 19. DRIFT AUDIT

Запускается после первой представительной страницы, периодически и перед сдачей. Режим по умолчанию — только отчёт.

```text
P0  нарушение hard contract · тихий сбой ·
    блокер доступности или безопасности · параллельная foundation
P1  системный дрейф · дефект, склонный распространяться ·
    реальная регрессия производительности, доступности или SEO
P2  локальная несогласованность

```

Что проверяется: сырые значения цвета и размеров в TSX вместо токенов; повторяющиеся произвольные значения; обход `Container`/`Section`/ролей типографики; дубли компонентов и скопированные секции; неверное количество H1; лишний `"use client"` на секции или layout; импорты persistence внутри `ui/**`; монолитные файлы страниц; второй паттерн Button/Input/Dialog/Card; несовпадение alias в `components.json` с реальными путями; мёртвые проектные токены; ошибки полей без программной связи; ad-hoc состояния загрузки и пустоты; несовпадение CSS-переменной шрифта; отсутствие обязательного SEO-контракта.

Мёртвым не считается токен, требуемый shadcn, или явно зарезервированный и задокументированный.

---

# 20. ОТЧЁТ AI ПО ЗАДАЧЕ

Для задач движка:

```text
СДЕЛАНО:
ПРОВЕРЕНО (фактически запущено):
MIGRATION / SECURITY:
НЕ ПРОВЕРЕНО:
РИСКИ / ОТКРЫТЫЕ РЕШЕНИЯ:

```

Для задач UI:

```text
REUSED:
CREATED + OWNERSHIP:
VARIANTS ADDED:
NEW TOKENS + WHY:
ARBITRARY VALUES + JUSTIFICATION:
RESPONSIVE / STATES / ACCESSIBILITY:
SEO / PAGE CONTRACT:
ПРОВЕРЕНО ФАКТИЧЕСКИ:
НЕ ПРОВЕРЕНО:
РИСКИ:

```

Слова `CHECKED`, `GREEN`, `DONE` без фактического proof запрещены.

---

# 21. ДОКУМЕНТАЦИЯ ПРОЕКТА

Обязательны:

```text
docs/PROJECT.md
docs/OPERATIONS.md
docs/DESIGN.md
```

## PROJECT.md

Минимум:

```text
client/domain
AMS_PROFILE
production/staging
enabled modules §22A

feed sources
refreshIntervalMinutes
dispatcherIntervalMinutes
parser mapping
safetyThresholdPercent
maxDeactivationsPerRun
approval TTL

TZ
archiveRetentionDays
leadRetentionDays

lead delivery channels
channel IDs/kinds
routing policy
destination host allowlists
delivery retry schedule
credentialRef mapping without secret values

CACHE_INVALIDATION_MODE
INTERNAL_REVALIDATE_BASE_URL
cache proof status

S3
DB/region
backup/monitoring
admin access
reserved URL namespaces
legal/retention notes
extended-profile triggers
```

## OPERATIONS.md

Минимум:

```text
deploy/rollback handoff
migrations
backup/restore
manual import
suspicious approval
interrupted/orphan recovery
payload-jobs diagnostics/unstuck
lead-delivery retry/recovery
channel outage procedure
S3/media
staging
monitoring
incident procedure
```

## DESIGN.md

```text
visual character / anti-goals
tokens/roles
containers/rhythm
page-level CSS policy
media/motion
shared patterns
approved exceptions
```

ADR только для труднообратимых deviations:

```text
stack change
new production component
Redis/PostGIS/search
custom auth
multitenancy
encrypted secret storage exception
multi-runner same queue
trust-boundary change
hard invariant deviation
```

---

# 22. ПЕРЕХОД НА РАСШИРЕННУЮ КОНФИГУРАЦИЮ

Несколько XML/YRL feeds и модули §22A сами по себе не требуют `REALTY_EXTENDED`.

Triggers:

```text
import влияет на site responsiveness
jobs регулярно долгие
нужна process isolation
десятки тысяч inventory records
heavy aggregates/facets
map с большим marker workload
large media processing
одному runtime тесно CPU/RAM/latency
новый production component действительно нужен
```

Переход:

```text
AMS_PROFILE:
REALTY_BASE → REALTY_EXTENDED
```

фиксируется в `PROJECT.md` + ADR, если меняется topology/trust boundary.

## 22.1 Dedicated jobs runners

Payload CLI допускает combined schedule+run:

```bash
pnpm payload jobs:run   --cron "*/1 * * * *"   --queue system   --handle-schedules
```

и schedule-only:

```bash
pnpm payload jobs:handle-schedules   --cron "*/1 * * * *"   --queue <queue>
```

или:

```bash
pnpm payload jobs:handle-schedules   --cron "*/1 * * * *"   --all-queues
```

Canonical transition:

```text
1. создать supervised queue runner(s)
2. каждой queue назначить ровно один scheduling mechanism
3. system/maintenance runners handle schedules
4. imports/lead-deliveries исполняют programmatic jobs
5. web JOBS_AUTORUN=false
6. CACHE_INVALIDATION_MODE=http
7. live proof всех enabled queues
```

## 22.2 One runner per queue

Default:

```text
system          → 1 runner
imports         → 1 runner
maintenance     → 1 runner
lead-deliveries → 1 runner
```

Competing runner processes одной queue не являются default.

Scaling:

```text
shard by queue
```

а не «ещё один worker той же queue».

Multi-runner same queue требует отдельного implementation review/proof/ADR.

## 22.3 Что не меняется

При переходе profile не меняются:

```text
Payload = schema owner
Gateway boundaries
DTO/UI isolation
source isolation
safe deactivation
lead-delivery invariants
PII rules
module governance
```

---

# 22A. МОДУЛИ

Модуль = collections + routes/pages + DTO/contracts + domain extensions без нового production component.

Модуль не переводит проект в `REALTY_EXTENDED`, пока topology не меняется.

## 22A.1 Новостройки

Добавляет:

```text
residential-complexes
buildings
developers
layouts
ЖК pages
newbuild filters
```

Requires:

```text
market
externalComplexId
externalComplexName
externalBuildingId
externalLayoutId where source provides it
```

## 22A.2 Шахматка

Requires:

```text
newbuild active
unit-level inventory
layout != unit
```

Новая отдельная domain model beyond current contract → RISKY + ADR.

## 22A.3 Сотрудники

```text
agents
agent pages
needed relations
```

## 22A.4 Журнал / блог

Добавляет:

```text
posts collection + migration
journal listing + pagination
categories/tags
article page
related materials
Article structured data
BreadcrumbList where applicable
canonical / OG
journal sitemap section
RSS optional
journal cache targets
journal blocks in compositions
existing client content migration if needed
```

В Base `posts` заранее не создаётся:

```text
journal = authored content
не feed-derived identity
```

Активация не требует historical backfill, если клиент не переносит существующие статьи.

Requires:

```text
reserved /journal/* namespace
journal DTO/contracts baseline
```

Даже при выключенном module contracts package может заранее содержать frozen:

```text
JournalCardDTO
JournalArticleDTO
JournalListDTO
JournalCategoryDTO
```

Contracts сами по себе не создают DB/runtime burden.

## 22A.5 Activation contract

```text
expand migration
→ backfill only if required
→ verify
→ cache registry update
→ activate reserved URL
→ PROJECT.md update
```

Module activation не меняет Hard Contract, Gateway boundaries, import safety, PII rules и topology.

Новый runtime/service/search/broker → §22 + possible `REALTY_EXTENDED` + ADR.

---

# 23. ЗАПРЕЩЕНО ПО УМОЛЧАНИЮ

```text
второй ORM рядом с Payload

Redis / broker / microservices / Kubernetes
без доказанного trigger

отдельный jobs runner в REALTY_BASE
без перехода §22

GraphQL / tRPC / Elasticsearch / PostGIS / imgproxy
без trigger

custom auth / MFA / server-side personal account
без отдельного решения

анонимный raw REST Payload business access

Local API application call без явного access mode

overrideAccess вне System Gateway

generic application CRUD payload-jobs

raw SQL из user input

schema push в production

secret в Git/business DB/logs/docs/browser bundle

wildcard CORS
wildcard remote image hosts

direct configurable fetch мимо Safe Outbound Client

cross-source deactivation

permanent safe-deactivation bypass

private field в public DTO

external HTTP inside DB transaction

VPS disk как единственный media source of truth

per-item synchronous mass revalidation

production PII dump → staging

более одного jobs owner одной queue без explicit architecture

second UI library / primitive foundation / icon pack

duplicate Button/Input/Dialog/Card/Table

universal page-builder

design literals вне globals.css
кроме approved non-design structural CSS values

занятие reserved module URL namespace unrelated page

server-side favorites/comparison disguised as “simple UI”

insecure lead channel destination outside approved allowlist
```

Client-only favorites/comparison по §12 не являются personal account и этим запретом не блокируются.

---

# 24. ФИНАЛЬНАЯ ФОРМУЛА

```text
Payload = schema owner
Payload Admin = admin foundation
Public data = Gateway + explicit access + DTO
Production schema = migrations only

UI isolation =
folder guards
или preferred package boundary

Design values = globals.css
Page layout CSS may consume var(--*)
Design literals do not fork outside globals

Import =
multi-feed
idempotent
source-isolated
safe-deactivation protected
conditional dispatcher
explicit queues

Bad feed ≠ empty catalog

Lead =
transactional outbox:
lead + delivery records in one commit
→ async enqueue after commit
→ orphan pending sweep
→ controlled waitUntil backoff
→ no secret/PII leakage
→ retention together with delivery records

One jobs owner per queue
REALTY_BASE = autoRun
REALTY_EXTENDED = dedicated queue runners when triggered

Timeweb Managed PostgreSQL = mandatory
Timeweb S3 = mandatory
Nginx = canonical proxy

Base catalog is newbuild-ready:
market + external grouping identity

Modules expand domain without changing topology; journal/posts is optional module, not base
unless §22 trigger is proven

Client-only favorites/comparison ≠ personal account

WORK = light
MERGE = exact-head proof
RELEASE = deploy skill / project runbook

Profile upgrade =
topology change
not domain/UI rewrite
```

> Если новая сложность не имеет реального trigger, понятной пользы и operational owner — она не добавляется.

> Если два решения одинаково безопасны — выбирается то, которое проще понять, проверить, восстановить и обслуживать solo owner + AI.

**Конец канонического документа — AMS REALTY PLATFORM CORE STANDARD 5.5 — SOLO + AI.**

---

