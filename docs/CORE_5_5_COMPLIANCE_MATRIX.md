# Core 5.5 / UI Core 5.0 Compliance Matrix

Status: `Active / executable matrix`

Scope: AMS Realty Baza Starter at `REALTY_BASE`. This matrix maps the Core 5.5
Hard Contract to the current starter implementation and mechanical guards. It
does not authorize production, release tags, new infrastructure, real Timeweb
resources or secret access.

Status vocabulary:

| Status | Meaning |
|---|---|
| `PASS` | The requirement is implemented and has a local mechanical or document evidence path. |
| `DEVIATION` | Intentional project/starter deviation that must stay documented and guarded. |
| `N/A` | Not applicable to the starter demo contour, usually because the requirement is client-production-only. |

## Core Hard Contract Matrix

| Rule ID | Canonical requirement | Implementation path | Status PASS / DEVIATION / N/A | Evidence | Required action |
|---|---|---|---|---|---|
| `HC-01` | Payload CMS is the only application schema owner; no second ORM. | `payload.config.ts`, `src/project/collections/**`, `package.json` without Prisma. | `PASS` | `pnpm quality:architecture`, `pnpm verify:dependency-security`. | Keep Prisma/second ORM absent. |
| `HC-02` | Payload Admin is the main administrative workspace; no custom cabinet without trigger. | `src/app/(payload)/api/**`, Payload Admin routes only. | `PASS` | `payload.config.ts`, `docs/PROJECT.md`. | Add custom cabinet only through a separate owner-approved module. |
| `HC-03` | Public UI never receives raw Payload documents. | Public view-models and DTO builders under `src/core`/`src/project`; UI package consumes DTO/primitive props. | `PASS` | `scripts/quality/architecture-rules.self-test.mjs`, `scripts/quality/architecture-guard.mjs`. | Keep Payload imports out of reusable UI. |
| `HC-04` | Public data flows through Public Gateway -> explicit select -> DTO. | `src/project/data-access/public/**`, public gateway verifiers, catalog/property DTOs. | `PASS` | `pnpm verify:public-gateway`, `pnpm quality:architecture`. | Maintain explicit select/depth/limit per reader. |
| `HC-05` | Every Local API call in application code has an explicit access mode. | `scripts/quality/local-api-mode.mjs`. | `PASS` | `pnpm quality:architecture-guards`. | Keep `public-read`, `system-job`, operator or owner modes explicit. |
| `HC-06` | `overrideAccess:true` is allowed only in System Gateway whitelist operations. | `src/core/data-access/system/**`, `src/core/data-access/system/overrides.ts`. | `PASS` | `scripts/quality/architecture-guard.mjs`, `scripts/verify-security-boundaries.mjs`. | Do not import `systemOverrideAccess` into business code. |
| `HC-07` | Production schema changes only through migrations; `push` is forbidden. | `payload.config.ts` forces production `push:false`; env guard rejects `PAYLOAD_DB_PUSH=true`. | `PASS` | `pnpm verify:schema`, `pnpm verify:security-boundaries`. | Keep runtime fail-closed. |
| `HC-08` | Money is integer minor units; areas are normalized in square meters. | Property/development schemas and import normalization. | `PASS` | `pnpm verify:property-taxonomy`, `pnpm verify:developments`, `pnpm verify:schema`. | Keep derived numeric fields validated at write/import boundaries. |
| `HC-09` | Private fields are protected by access rules, not only DTO omission. | Collection access rules, raw REST denylist, role-scoped leads/deliveries. | `PASS` | `pnpm verify:security-boundaries`. | Keep private fields closed at collection access level. |
| `HC-10` | Bad, broken or suspicious feed cannot clear the catalog. | Ingest safety thresholds, import issues, lifecycle guards. | `PASS` | `pnpm verify:feed-ingest`, `pnpm verify:feed-lifecycle`. | Keep suspicious import fail-closed. |
| `HC-11` | Import is idempotent; unchanged business data is not rewritten. | Feed identity and import lifecycle suites. | `PASS` | `pnpm verify:feed-ingest`, `pnpm verify:integration:required`. | Preserve idempotent identity keys. |
| `HC-12` | Each bulk operation has explicit source scope. | Feed source identity, manual ownership and import run ownership. | `PASS` | `pnpm verify:manual-ownership`, `pnpm verify:feed-ingest`. | Keep source scope explicit in bulk scripts. |
| `HC-13` | Feed A cannot deactivate Feed B or overwrite manual/foreign-owned fields. | Field ownership policy and safety thresholds. | `PASS` | `pnpm verify:manual-ownership`, `pnpm verify:feed-lifecycle`. | Do not loosen ownership checks. |
| `HC-14` | Manual ownership survives the next import. | Manual ownership guard and fixtures. | `PASS` | `pnpm verify:manual-ownership`. | Keep manual fields excluded from feed overwrite. |
| `HC-15` | One mutating import per feed source. | Import run lifecycle and job ownership. | `PASS` | `pnpm verify:feed-lifecycle`, `pnpm verify:jobs-config`. | Preserve single-owner mutation path. |
| `HC-16` | Interrupted import does not deactivate inventory or update baseline. | Import recovery and lifecycle rules. | `PASS` | `pnpm verify:operational-recovery`, `pnpm verify:feed-lifecycle`. | Keep crash-window tests in required integration. |
| `HC-17` | Configurable outbound HTTP goes only through Safe Outbound Client. | `src/core/security/safe-outbound-client.ts`. | `PASS` | `pnpm verify:safe-outbound`, `pnpm verify:security-boundaries`. | No direct configurable `fetch` outside the safe client. |
| `HC-18` | Exactly one runtime may schedule/run jobs for the topology. | `JOBS_AUTORUN`, deployment docs, jobs config. | `PASS` | `pnpm verify:jobs-config`, Timeweb blueprint guard. | Keep rollout handover single-owner. |
| `HC-19` | One project has one Design System; new page is composition, not new design. | `docs/DESIGN.md`, `packages/ui`, `src/app/globals.css`. | `PASS` | `pnpm verify:ui-core`, `pnpm quality:design-tokens`. | Do not introduce a second primitive/design layer. |
| `HC-20` | Runtime factual design values are owned by `src/app/globals.css`; other CSS consumes tokens. | `src/app/globals.css`, deprecated `src/project/brand.css` compatibility stub. | `PASS` | `pnpm verify:brand-ownership`, `pnpm quality:design-tokens`. | Keep brand runtime values in globals marker block. |
| `HC-21` | shadcn/ui is the only primitive foundation. | `packages/ui/components.json`, `packages/ui/src/components/ui/**`. | `PASS` | `pnpm quality:architecture`, `pnpm verify:ui-core`. | Do not add duplicate Button/Input/Dialog/Card owners. |
| `HC-22` | Server Components by default; `"use client"` only for interactive leaves. | Client boundaries in `packages/ui/src/**`. | `PASS` | `scripts/quality/ui-core.mjs` reports client boundaries. | Keep client state isolated to leaves. |
| `HC-23` | Reusable UI does not import Payload, DB clients or persistence types. | `packages/ui`, Dependency Cruiser, architecture rules. | `PASS` | `pnpm quality:architecture`, `pnpm quality:architecture-guards`. | Keep reusable UI DTO-only. |
| `HC-24` | Accessibility is not broken for visual changes. | Starter a11y checks and UI Core matrix. | `PASS` | `pnpm verify:a11y-starter`, `pnpm verify:ui-core`. | Keep labels, focus and reduced-motion checks. |
| `HC-25` | Every production project uses Timeweb Managed PostgreSQL. | Starter demo is not client production; client clone docs require Managed PostgreSQL by default. | `N/A` | `docs/CLONE_ONBOARDING.md`, `deploy/clients/timeweb/README.md`. | Enforce on client production/release stream. |
| `HC-26` | Every production project uses Timeweb S3-compatible Object Storage. | Starter demo stays local; explicit client S3 activation exists. | `N/A` | `pnpm verify:timeweb-blueprint`, `pnpm verify:clone-readiness`. | Enforce on client production/release stream. |
| `HC-27` | Manual media is in S3; VPS disk is not production source of truth. | Starter demo `MEDIA_DIR` is owner-operated verification contour only. | `DEVIATION` | `docs/adr/ADR-LOCAL-STARTER-STORAGE.md`, `docs/PROJECT.md`. | Keep deviation limited to starter demo; client S3 mode must not require `MEDIA_DIR`. |
| `HC-28` | Production has automatic backup and external uptime monitoring. | Starter/client docs define required backup and monitoring; live provider proof is not claimed. | `N/A` | `deploy/clients/timeweb/backup/README.md`, `deploy/clients/timeweb/monitoring/README.md`. | Prove during explicit client staging/release. |
| `HC-29` | Secrets do not enter Git, DB, logs, docs or browser bundle. | Secret Master policy, env examples without values, secrets guard. | `PASS` | `pnpm verify:security-boundaries`, `pnpm verify:secrets-guard`. | Keep secret values out of committed artifacts. |
| `HC-30` | Leads/PII do not enter public DTO/logs/analytics; retention policy is mandatory and automated. | Lead access model, redaction, retention fail-closed when policy is missing. | `PASS` | `pnpm verify:lead-outbox`, `pnpm verify:health-alerts`, `pnpm verify:security-boundaries`. | Owner must set retention days before PII production. |
| `HC-31` | Staging is required before migration, parser/source identity, auth/access or major upgrade. | Release/checklist docs and SourceCraft gate rules. | `PASS` | `docs/05_RELEASE_CHECKLIST.md`, `docs/PROJECT.md`. | Keep staging as release gate, not WORK default. |
| `HC-32` | URL schema is fixed before production and changes only with redirect plan. | Product structure, static routes, legacy manifest and routing guards. | `PASS` | `pnpm verify:url-grammar`, `pnpm verify:resolver`, `pnpm verify:runtime-cutover`. | Keep URL decisions in Product Structure/SiteProfile. |
| `HC-33` | New infrastructure is not added without a real trigger. | Starter topology and clone activation separation. | `PASS` | `docs/PROJECT.md`, `docs/CLONE_ONBOARDING.md`, `pnpm verify:production-topology`. | Do not provision infra in starter work. |
| `HC-34` | If equally safe, choose the option easier for one owner + AI to maintain. | Minimal project-owned guards and docs; no extra registry/distribution layer. | `PASS` | `docs/PROJECT.md`, `docs/DESIGN.md`. | Keep abstractions local unless reuse is proven. |
| `HC-35` | Lead save is synchronous; external delivery is async and cannot change a saved-success response. | Public lead intake and outbox delivery. | `PASS` | `pnpm verify:lead-intake`, `pnpm verify:lead-outbox`. | Keep local save before outbound attempts. |
| `HC-36` | Every delivery has a `lead-delivery` record with channel, state, attempts, timing and redacted error. | `LeadDeliveries` collection and delivery state verifier. | `PASS` | `pnpm verify:lead-delivery-state`. | Preserve redacted diagnostics only. |
| `HC-37` | Delivery is idempotent by lead/channel/idempotency key; residual channel risk is recorded. | Delivery policy and adapter docs. | `PASS` | `pnpm verify:lead-outbox`, `docs/PROJECT.md`. | Keep channel-specific residual risk explicit. |

## UI Core v5.0 Matrix

| UI topic | Requirement | Implementation path | Status PASS / DEVIATION / N/A | Evidence | Required action |
|---|---|---|---|---|---|
| primitive foundation | Only shadcn/Radix primitives owned by `packages/ui`. | `packages/ui/components.json`, `packages/ui/src/components/ui/**`. | `PASS` | `pnpm verify:ui-core`, `pnpm quality:architecture`. | No second primitive foundation. |
| REUSE -> VARIANT -> CREATE | Reuse existing component, add semantic variant, create only when needed. | `docs/DESIGN.md`, UI package exports. | `PASS` | `pnpm verify:ui-core`. | Keep `plain` usage inside policy limit. |
| design values | Runtime factual values in `src/app/globals.css`; components consume `var(--*)`. | `src/app/globals.css`, `scripts/quality/design-tokens.mjs`. | `PASS` | `pnpm quality:design-tokens`, `pnpm verify:brand-ownership`. | No component-owned raw design values. |
| Server/Client boundaries | Server Component default; client leaves only for interaction. | `packages/ui/src/**`, app routes. | `PASS` | `scripts/quality/ui-core.mjs` client boundary report. | Keep `"use client"` localized. |
| DTO boundary | Reusable UI consumes DTOs/primitive props and not Payload documents. | `packages/contracts`, `packages/ui/src/view-models/**`. | `PASS` | `pnpm quality:architecture`. | Keep persistence out of UI package. |
| forms | Forms provide labels/errors/states and server-safe submission paths. | `LeadFormView`, `PriceRequestFormView`, public lead route. | `PASS` | `pnpm verify:lead-intake`, `pnpm verify:ui-core`. | Keep PII out of analytics/logs. |
| accessibility | Visible focus, labels, one `h1`, keyboard/reduced-motion contracts. | UI views and a11y verifier. | `PASS` | `pnpm verify:a11y-starter`. | Keep browser proof updated for UI changes. |
| media | Stable aspect ratio, approved hosts, local CMS media and external feed rules. | `MediaDTO`, `next.config.ts`, image host guards. | `PASS` | `pnpm verify:security-boundaries`, `pnpm verify:ui-core`. | No wildcard image hosts. |
| SEO page contract | One logical `h1`, metadata/robots/canonical via Content Gate. | SEO registry, page metadata guards. | `PASS` | `pnpm verify:seo-contracts`, `pnpm verify:content-gate`. | Keep SEO ownership outside CMS shortcuts. |
| dark mode | Dark theme disabled; no project-authored dark theme behavior. | `docs/DESIGN.md`, globals without root `.dark`. | `PASS` | `pnpm quality:design-tokens`. | Do not install `.dark` class for starter. |
| motion | Motion uses transform/opacity and respects reduced motion. | UI Core rules and CSS tokens. | `PASS` | `pnpm verify:ui-core`. | Keep motion tokenized and non-blocking. |
| drift audit | Token/package/export drift remains reportable and guarded. | `scripts/quality/ui-core.mjs`, `scripts/quality/drift-audit.mjs`. | `PASS` | `pnpm verify:drift`, `pnpm verify:ui-core`. | Keep baseline reviewed when UI changes. |

## Always-On Schema Classification

| Collection | Classification | Implementation path | Evidence | Required action |
|---|---|---|---|---|
| `Regions` | base platform capability | `src/project/collections/Regions.ts` | Raw REST denylist + `geoReadAccess`; `pnpm verify:security-boundaries`. | Keep as base geography. |
| `Cities` | base platform capability | `src/project/collections/Cities.ts` | Raw REST denylist + `geoReadAccess`; `pnpm verify:security-boundaries`. | Keep as base geography. |
| `Districts` | base platform capability | `src/project/collections/Districts.ts` | Raw REST denylist + `geoReadAccess`; `pnpm verify:security-boundaries`. | Keep as base geography. |
| `Developers` | activated optional module | `src/project/collections/Developers.ts` | Required by active developments surface; covered by schema/developments verifiers. | Keep because `Developments` are active in current starter. |
| `Developments` | activated optional module | `src/project/collections/Developments.ts` | `pnpm verify:developments`, UI development presentation checks. | Keep active; building/layout/chessboard stays prepared extension only. |
| `LifecycleEvents` | operational collection | `src/project/collections/LifecycleEvents.ts` | Used for property lifecycle/public cache invalidation evidence. | Keep system-owned; no anonymous raw REST. |

This classification does not change Core. It documents the starter state:
geography is base capability, developments/developers are activated optional
surface, and lifecycle events are operational infrastructure.

## Public Data-Access Layout Review

| Hard requirement | Current physical layout | Status PASS / DEVIATION / N/A | Evidence | Required action |
|---|---|---|---|---|
| public reads | Public readers live under `src/project/data-access/public/**` and project composition paths. | `PASS` | `pnpm verify:public-gateway`. | Do not move files only for cosmetic path matching. |
| server only | Public readers execute on server/app routes, not reusable UI. | `PASS` | Dependency Cruiser + architecture guard. | Keep gateway imports out of `packages/ui`. |
| overrideAccess:false | Public readers use public/read access mode, not system override. | `PASS` | `scripts/quality/architecture-guard.mjs`, `scripts/verify-security-boundaries.mjs`. | Keep `overrideAccess:true` in System Gateway only. |
| explicit select | Public gateway has explicit selected DTO fields. | `PASS` | `pnpm verify:public-gateway`. | Add fields only through DTO review. |
| explicit depth | Public gateway depth is explicit and bounded. | `PASS` | `pnpm verify:public-gateway`. | Avoid implicit relation expansion. |
| explicit limit | Public list readers use explicit limits/pagination. | `PASS` | `pnpm verify:public-gateway`, catalog query checks. | Keep bounded list size. |
| publication predicate | Public readers require published/current public state. | `PASS` | `pnpm verify:content-gate`, lifecycle preflight checks. | Keep draft/private states denied. |
| DTO only | Public UI receives DTO/view models only. | `PASS` | `pnpm quality:architecture`. | Keep raw Payload documents internal. |

## Module Governance Consistency

| Module | State | Live schema/routes | Evidence | Required action |
|---|---|---|---|---|
| `novostroyki` | `prepared` | Development collections exist; public reserved namespace is not occupied by a static `/novostroyki` app route. | `pnpm quality:architecture-guards`, `pnpm verify:developments`. | Keep building/layout/chessboard as prepared extension until owner trigger. |
| `journal` | `disabled` | No runtime journal route/collection/module marker; contracts may remain frozen only. | `pnpm quality:architecture-guards`. | Do not add journal runtime without module activation. |
| `agents` | `disabled` | No agents route/collection/module marker. | `pnpm quality:architecture-guards`. | Do not add agents runtime without module activation. |

## Mechanical Guard Coverage

| Guard surface | Guard command / owner | Status PASS / DEVIATION / N/A | Evidence | Required action |
|---|---|---|---|---|
| overrideAccess | `pnpm quality:architecture-guards`, `pnpm verify:security-boundaries` | `PASS` | Rejects `overrideAccess:true` outside System Gateway allowlist. | Keep whitelist narrow. |
| Local API access mode | `pnpm quality:architecture-guards` | `PASS` | `scripts/quality/local-api-mode.mjs`. | Every Local API call must name mode. |
| raw SQL boundary | `pnpm quality:architecture-guards`, `pnpm verify:schema` | `PASS` | SQL governance allows migrations/approved ingest/system paths only. | No public raw SQL layer. |
| private fields | `pnpm verify:security-boundaries`, `pnpm verify:public-gateway` | `PASS` | Raw REST denial and collection access rules. | Keep DTO as second layer, not primary protection. |
| wildcard CORS | `pnpm verify:security-boundaries` | `PASS` | Payload CORS is exact-origin driven. | No `*` origin. |
| direct configurable outbound fetch | `pnpm quality:architecture-guards`, `pnpm verify:safe-outbound` | `PASS` | Direct configurable `fetch` forbidden outside Safe Outbound Client. | Keep allowlists exact. |
| secret exposure | `pnpm verify:security-boundaries`, `pnpm verify:secrets-guard` | `PASS` | Obvious secret exposure and env examples checked. | Never commit secret values. |
| top-level next/* in jobs/ingest/cache | `pnpm quality:architecture-guards`, `pnpm verify:security-boundaries` | `PASS` | Cache graph fixture rejects top-level `next/cache`. | Keep Next runtime APIs lazy/boundary-owned. |
| UI persistence dependencies | `pnpm quality:architecture`, `pnpm quality:architecture-guards` | `PASS` | UI package persistence fixture rejected. | Keep UI DTO-only. |
| dark mode | `pnpm quality:design-tokens`, `pnpm verify:ui-core` | `PASS` | Starter dark theme disabled; project-authored dark selectors forbidden. | Do not add root `.dark`. |
| design literals | `pnpm verify:ui-core`, `pnpm quality:design-tokens` | `PASS` | UI literal scanner rejects unapproved design values outside token owners. | Use `var(--*)`. |
| module URL reservations | `pnpm quality:architecture-guards` | `PASS` | Module governance rejects disabled/prepared runtime route markers. | Keep reserved namespaces aligned with module state. |

## Current Required Proof

Any current core-compliance change must pass:

```text
pnpm quality:architecture
pnpm quality:architecture-guards
pnpm quality:guards
pnpm verify:security-boundaries
pnpm verify:public-gateway
pnpm verify:schema
pnpm verify:ui-core
```

`pnpm verify:core-compliance` is intentionally included inside
`quality:architecture-guards` and `quality:guards`, so future changes cannot
leave this matrix stale without breaking the guard set.
