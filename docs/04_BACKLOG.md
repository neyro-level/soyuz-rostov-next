# Backlog — Союз застройщиков Ростов

Статус: `MASTER PLAN APPROVED / NO IMPORTED EXECUTION GRAPH`.

## Current control state

- Canonical plan: `AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md`.
- Exact revision: `4.1.1-ARCH-v5`.
- Status: `APPROVED` after final-audit PASS and exact owner phrase.
- Night Run Readiness: `READY_WITH_LIMITS`.
- Task Manager/Beads: not initialized/imported in this audit run; parent-controlled handoff remains.
- Production/indexing: forbidden without separate explicit owner command.

## Completed baseline

- EPIC-00 SourceCraft repository/workspace.
- EPIC-01 current starter/client baseline import.
- EPIC-02 client activation/clone hygiene.
- Server cleanup, empty Timeweb DB, Docker/Compose and Nginx baseline.
- Imported platform capabilities accepted for EPIC-09/10/11/12/14/27/32/35.

## NOW — parent-controlled post-audit handoff

1. Four-pass audit of exact `4.1.1-ARCH-v5` is complete with zero open audit blockers/cycles and zero before-approval owner decisions.
2. Owner approval is recorded; preserve the exact approved snapshot and §34 `READY_WITH_LIMITS` contract.
3. Parent may create the docs checkpoint, inventory schema v2 and run Task Manager `Validate → Init → Import → Reconcile`; this audit run performs none of those actions. Keep noindex and all staging/production gates.

## NEXT — after exact owner approval/import, safe in parallel

- EPIC-03 legacy crawl and URL decisions.
- EPIC-04 semantic QA, collisions and measured Registry evidence.
- EPIC-07 apply approved SiteSettings/NAP and draft owner-reviewed privacy/consent package.
- EPIC-16 preserve/verify the Bastion-template R1 visual baseline.
- EPIC-23 collect the 24-ЖК Yandex Realty/Excel package and `>=120` accepted photos if all 24 publish.
- EPIC-06 storage/secret/topology closure without deploy.

## Confirmed client-hardening blockers

- Payload media adapter/env/compose do not yet implement the owner-selected Timeweb S3 topology.
- Public provider can expose starter fixture NAP/content when Payload is unavailable.
- R2 novostroyki-district rows/categories leak into current R1 seed.
- Current SEO Registry is bootstrap-only (`fallback_no_data`, `NONE`, `draft`).
- Rostov district seed is incomplete.
- Immutable client image publication/pull-by-digest route is not proven.
- React/pnpm/TypeScript and other stale direct dependencies still require the EPIC-01 latest-stable compatibility uplift.
- Legal/consent wording, 24-ЖК data and media are decisions now, not yet collected implementation evidence.

## LATER — implementation waves

After owner/evidence decisions:

- project baseline hardening;
- data/import streams;
- public UI/pages and services;
- leads/analytics according to approved scope;
- integration quality, browser/a11y/performance/security;
- noindex staging and release candidate.

EPIC-46..50 remain outside R1 unless explicitly promoted.

## Delivery policy

- One independent stream = one branch/worktree = one Pull Request.
- `DELIVERY_PROFILE=COMMERCIAL` requires review and one manual exact-head SourceCraft Gate before merge.
- SourceCraft is primary; GitHub is mirror-only when explicitly requested.
- Production, DB migration, DNS cutover and public indexing remain separate owner gates.
