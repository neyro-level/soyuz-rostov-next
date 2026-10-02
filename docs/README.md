# Союз застройщиков Ростов — карта документации

Статус: `ACTIVE / CLIENT CLONE / CURRENT CANON`.

SourceCraft — primary repository. Текущий SHA и ветку проверять Git/SourceCraft-командами, а не старыми отчётами.

## Source of Truth

| Вопрос | Документ |
|---|---|
| Project identity, domains, runtime boundaries | `PROJECT.md` |
| Server/deploy/runbook | `OPERATIONS.md`, `../deploy/clients/timeweb/` |
| Client clone provenance | `CLIENT_BOOTSTRAP.json`, `CLONE_PROVENANCE.md`, `CLONE_GENERATED_OUTPUTS.json` |
| Canonical development program and Epic/dependency state | `AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md` (`4.1.1-ARCH-v5 APPROVED`) |
| Independent repo-vs-plan evidence | `research/MASTER_PLAN_GAP_AUDIT_2026-10-01.md` |
| Цель, пользователи и границы продукта | `01_PRD.md` |
| Публичные URL, surfaces и content ownership | `02_PRODUCT_STRUCTURE.md` |
| Архитектура, stack, security, delivery profile | `03_ARCHITECTURE.md` |
| Текущие приоритеты, blockers и owner gates | `04_BACKLOG.md` |
| PR, merge и release условия | `05_RELEASE_CHECKLIST.md` |
| Project Design System | `DESIGN.md` |
| Geo/catalog URL, status, resolution, lifecycle | `platform/GEO_CATALOG_CONTRACT.md` |
| SEO seed/evidence | `seo/SEO_REGISTRY_SEED.csv` |

## Порядок чтения для AI

1. `../AGENTS.md`.
2. `../AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md`.
3. `../AMS_UI_CORE_v5.0_FINAL.md` for UI scope.
4. This file.
5. `PROJECT.md`, `OPERATIONS.md`.
6. `AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md` and its exact revision/status.
7. `01_PRD.md`, `02_PRODUCT_STRUCTURE.md`, `03_ARCHITECTURE.md`.
8. `04_BACKLOG.md`, `05_RELEASE_CHECKLIST.md`.
8. Relevant ADR/module/deploy docs only when in scope.
9. `package.json`, `src/project/**`, `src/core/**`, `packages/**`, `migrations/**` as factual implementation.

## Current state

- Client project: `Союз застройщиков` / Ростов-на-Дону.
- Package: `souz-rostov-realty`.
- Final domain: `souz-home.ru`.
- Technical Timeweb host: `soyuz-rostov.tw1.ru`.
- `DELIVERY_PROFILE=COMMERCIAL`: before merge/release use one exact-head SourceCraft gate according to risk.
- Master plan is `4.1.1-ARCH-v5 APPROVED` after final-audit PASS and the exact owner phrase; Task Manager/Beads has not been initialized/imported in this audit run.
- Night Run Readiness remains `READY_WITH_LIMITS`: independent implementation lanes are executable after clean parent-controlled import/reconcile, while external evidence, staging, production and indexing retain explicit stop gates.
- Production/release/DNS cutover are not automatic and require separate explicit owner command.
- Current indexing is `noindex` until old-site cutover/public-indexing owner decision.

## Runtime truth

- Versions: `package.json`, `pnpm-lock.yaml`.
- Client identity/domain/readiness: `src/project/site.config.ts`, `src/project/client-readiness.config.ts`, `src/project/public-origin.ts`.
- Geo/catalog: `src/project/site-profile.config.ts`.
- SEO runtime: `docs/seo/SEO_REGISTRY_SEED.csv`, `src/project/seo/registry-seed.ts`.
- CI/gates: `.sourcecraft/ci.yaml` and SourceCraft API.
