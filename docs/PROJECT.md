# Project — Союз застройщиков Ростов

Статус: `Client clone / REALTY_BASE / BUILD`.

Этот репозиторий — клиентский сайт агентства недвижимости «Союз застройщиков» для Ростова-на-Дону на базе AMS Realty Baza Starter. Starter-only demo contour удалён через `clone:prepare`; текущий runtime identity хранится в `src/project/**` и `docs/CLIENT_BOOTSTRAP.json`.

## Зафиксировано

| Параметр | Решение |
|---|---|
| Project identity | `Союз застройщиков Ростов` |
| Brand | `Союз застройщиков` |
| Package | `souz-rostov-realty` |
| Product line | `AMS RealtBase` |
| Profile | `AMS_PROFILE=REALTY_BASE` |
| Project kind | `client` |
| Delivery | `COMMERCIAL` |
| Git platform | SourceCraft primary: `integrator-p/soyuz-rostov-next` |
| Primary geo | `Ростов-на-Дону` / `rostov-na-donu` |
| Region | `Ростовская область` |
| Final domain | `souz-home.ru` |
| Technical Timeweb host | `soyuz-rostov.tw1.ru` |
| Indexing | `noindex` until owner cutover from the old live site and explicit promotion to `public` |
| Runtime platform | Timeweb Cloud client contour |
| Server alias | `szrostov` / `sz-rostov` |
| Secret scope | `szrostov-server/prod` for server access; app runtime secrets must stay project-specific and never be printed |
| Database target | Timeweb managed PostgreSQL `soyuz_rostov_prod`; connectivity proven and public schema reset to `0` tables by owner-approved cleanup; migrations only during approved staging/release |
| Media target | Timeweb S3 selected by owner; activate S3 adapter/workflow and align Payload/env/compose before staging; local `MEDIA_DIR` is not production canon |
| Development intake | 24 owner-prioritized ЖК from Yandex Realty; Excel-first, no R1 XML feed; minimum 5 accepted photos per ЖК |
| Source rights | Owner attests official Yandex Realty partnership rights to copy facts/photos without public attribution; private source/rights/checkedAt provenance remains mandatory |
| UI baseline | Preserve the current Bastion-template appearance for R1; only brand/name and required factual content change; redesign is post-R1 |
| Stack policy | Latest compatible stable direct stack only; exact versions rechecked at implementation, no canary/RC; incompatible latest combinations require owner decision |
| Jobs owner | exactly one runtime with `JOBS_AUTORUN=true` |
| Public origin | final production exact `https://souz-home.ru`; technical host is staging/validation only |
| Active catalog | `kvartiry`, `novostroyki` in Ростов-на-Дону; Батайск/Аксай prepared-off |
| Lead delivery | MAX for R1; credentials/destination remain Secret Master-only |
| Analytics | Yandex Metrica for approved non-PII events after consent |
| Leads/PII retention | `leadRetentionDays = 180`, `archiveRetentionDays = 90` from generated readiness config |
| Legal identity | ИП Мормуль Екатерина Владимировна, ИНН 940400159853; owner-approved phone/email/address/hours are fixed in the canonical plan |
| Legal content | privacy/consent/operator wording must be drafted and owner-approved before staging/public indexing; placeholders are noindex-only and cannot satisfy release gates |

## Planning state

- Canonical plan: `docs/AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md`.
- Current revision/status: `4.1.1-ARCH-v5 APPROVED`.
- Night Run Readiness: `READY_WITH_LIMITS`; external source/compatibility and later environment gates have deterministic stop/fallback rules.
- Beads import: not initialized/imported in this audit run; pending parent-controlled inventory validation/reconciliation.

## Runtime Source of Truth

<!-- MODULE_GOVERNANCE_BEGIN -->
| Module | State | Manifest |
|---|---|---|
| `novostroyki` | `prepared` | `docs/modules/novostroyki.md` |
| `journal` | `disabled` | `docs/modules/journal.md` |
| `agents` | `disabled` | `docs/modules/agents.md` |
<!-- MODULE_GOVERNANCE_END -->

- Client bootstrap: `docs/CLIENT_BOOTSTRAP.json`.
- Clone provenance and generated hashes: `docs/CLONE_PROVENANCE.md`, `docs/CLONE_GENERATED_OUTPUTS.json`.
- Project kind: `src/project/site.config.ts`.
- Domain/readiness/indexing: `src/project/client-readiness.config.ts`, `src/project/public-origin.ts`, `src/project/indexing-policy.ts`.
- Geo/catalog profile: `src/project/site-profile.config.ts`.
- Brand/design tokens: `src/app/globals.css`.
- SEO seed: `docs/seo/SEO_REGISTRY_SEED.csv`, `src/project/seo/registry-seed.ts`.
- Timeweb deployment reference: `deploy/clients/timeweb/`.

## Runtime env mapping

- Secret Master canonical `DATABASE`/connection value maps to runtime `DATABASE_URI`; server may retain compatibility `DATABASE_URL` only where deployment tooling requires it.
- `NEXT_PUBLIC_SERVER_URL` is the exact approved public origin.
- `MEDIA_DIR` is valid only if owner explicitly selects persistent local media; Timeweb S3 uses the approved `S3_*` runtime set instead.
- `LEAD_CHANNELS` enables only owner-approved adapters; no CRM / telegram keys are inferred or committed.

## Boundaries

- Payload CMS owns Admin/auth/schema/migrations.
- Prisma, second CMS/backend/auth and anonymous raw REST for business collections are forbidden.
- Production deploy, DNS switch, production migrations, public indexing promotion and secret creation are owner gates.
- The old live site on `souz-home.ru` remains external until cutover; do not overwrite DNS or production runtime implicitly.
- Client public runtime must not expose starter fixture NAP/content when Payload is unavailable.
- Internal source URLs, rights notes and checkedAt timestamps must not leak through Public Gateway/UI.
- Verification dates are retained internally but not displayed publicly in R1.
- Binary Yandex Realty media is never committed to Git or hotlinked; temporary intake is private/ephemeral and final storage is Payload-managed Timeweb S3.
- Missing factual/legal content may use explicit placeholders only on protected noindex staging; placeholders never pass Content Gate or release readiness.
- R2 novostroyki-district routes/categories must not remain in R1 seeds.
