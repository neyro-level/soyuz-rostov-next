# Release Checklist — Союз застройщиков Ростов

Статус: `ACTIVE CLIENT RELEASE CONTRACT / NO CURRENT RELEASE AUTHORIZATION`.

This checklist does not authorize staging, production, DB migrations, DNS or indexing. Those actions require the exact master-plan state and explicit owner command defined below.

## Before Pull Request

- task belongs to one approved workstream/worktree;
- source documents and runtime have no known unclassified drift;
- scope uses actual owners (`src/core`, `src/project`, `packages`, Payload migrations), not a new parallel platform layer;
- relevant local checks completed on the EPIC-01 approved latest-compatible-stable Node/pnpm/direct-dependency snapshot;
- no canary/RC/prerelease dependency and no unapproved stale-stack exception;
- no secrets, PII, credentials, env values, private source manifests or media binaries in diff;
- rollback/data impact recorded where applicable.

## Before merge

- PR is based on current SourceCraft `main` and contains one coherent risk scope;
- full diff reviewed;
- risk classified `STANDARD` or one exact `RISKY` scope;
- one manual SourceCraft Gate is green on exact head SHA;
- required isolated test DB proof exists for schema/data/auth/ingest changes;
- P0/P1 findings are closed;
- merge does not initialize/import an unapproved Task Manager graph.

## Before staging

- master plan exact version is owner-approved for implementation/delivery scope;
- clean canonical SourceCraft `main` exact SHA is known;
- immutable Docker image is built outside production host and recorded by digest;
- image registry/name/publish/pull contract is documented;
- Payload media adapter, env and compose use owner-selected Timeweb S3; local `MEDIA_DIR` is not production canon;
- `REVALIDATE_SECRET` and all runtime secrets are canonical in Secret Master;
- approved NAP identity and owner-approved privacy/consent/legal content exist; starter fixture identity and placeholder legal copy cannot surface;
- all publish-eligible priority ЖК are source-identity-matched and have at least five accepted Payload/S3 photos;
- Yandex Realty source URLs, rights notes and checkedAt remain private/admin-only; no public attribution/check date is required;
- no media hotlinks or intake binaries in Git;
- R1 Registry/profile contains no R2 route leakage;
- DB backup/restore route and monitoring ownership are recorded;
- technical host remains noindex.

## Staging proof

- server pulls exact immutable image digest;
- migrations run from the same image against the approved clean DB;
- exactly one runtime owns Payload jobs;
- `/api/internal/healthz` passes locally and through technical host;
- Admin/auth/access, media upload/read, restart persistence, leads/outbox/channel, Excel import, cache invalidation and backup/restore changed paths pass;
- per-development photo-count assertion passes for every published priority ЖК;
- Public Gateway proof confirms internal provenance/rights/checkedAt fields do not leak;
- old/new crawl and migration rehearsal artifacts exist;
- browser/a11y/performance/security acceptance is tied to exact candidate SHA;
- rollback point includes previous image, env snapshot/checksum and DB restore point.

## Before production

- owner gives a separate explicit production/cutover command;
- exact release candidate SHA/image digest and evidence ledger are approved;
- final `souz-home.ru` DNS/TLS target is confirmed;
- old-site migration/redirect decisions are frozen;
- noindex remains until a separate explicit public-indexing promotion;
- rollback operator and stop conditions are named.

## Production live proof

- final and technical origins serve the expected exact release identity;
- health, critical catalog/entity pages, leads, Admin, media and jobs are healthy;
- redirects have no chains and canonical/robots/sitemap match the approved registry;
- logs contain no secrets/PII;
- rollback point remains usable.

## Hard stop conditions

- plan is not `APPROVED` for the exact version;
- image digest/SHA mismatch;
- Timeweb S3 activation incomplete or adapter/env/compose mismatch;
- starter fixture content can reach client public output;
- missing Secret Master value or unapproved env mutation;
- DB identity/backup uncertain;
- duplicate jobs owner;
- public indexing would be enabled without owner command;
- unresolved P0/P1 or migration/crawl blocker;
- any published placeholder, priority ЖК with fewer than five accepted photos, public source/check-date leakage, or known stale direct stack version without an approved compatibility exception.
