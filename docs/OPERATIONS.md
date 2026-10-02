# Operations — Союз застройщиков Ростов

Статус: `Client Timeweb contour / Docker-ready pre-release server`.

Этот файл описывает текущий operational-контур проекта «Союз застройщиков» после owner-approved cleanup сервера 2026-10-01. Production release, DNS cutover, production migrations and public indexing promotion выполняются только по отдельной явной команде владельца.

## Domains

```text
Final public domain: souz-home.ru
Technical Timeweb host: soyuz-rostov.tw1.ru
Current indexing policy: noindex until cutover/public-indexing decision
```

`souz-home.ru` может всё ещё обслуживать старый сайт. Новый проект готовится на техническом контуре и не должен переключать DNS без release/cutover gate.

## Server contour

```text
Client: Союз застройщиков Ростов
Provider: Timeweb Cloud
Canonical server name: sz-rostov
SSH alias: szrostov / sz-rostov
Secret Master scope: szrostov-server/prod
```

Safe smoke without secrets:

```bash
ssh -o BatchMode=yes szrostov "hostname; whoami; systemctl is-system-running; systemctl --failed --no-pager"
```

Не печатать env values, private keys, DB URLs with credentials, tokens or Secret Master values.

## Current server state — 2026-10-01

Owner confirmed destructive cleanup: delete old runtimes and make DB clean.

Current verified state:

- Hostname: `msk-1-vm-py2a`.
- User used for inventory: `root`.
- OS: Ubuntu 26.04 LTS.
- systemd: `running`, failed units: `0`.
- Nginx: active, config test PASS, version `1.28.3`.
- Docker: installed and active, version `29.1.3`.
- Docker Compose: installed, version `2.40.3`.
- PostgreSQL client: `psql 18.6`.
- Active relevant services: `docker.service`, `nginx.service` only.
- Old `soyuz-rostov*` and `ams-realty-platform-starter*` systemd services: removed/reset.
- Old app/runtime directories removed:
  - `/opt/soyuz-rostov`;
  - `/opt/ams-realty-platform-starter`;
  - `/etc/soyuz-rostov`;
  - `/etc/ams-realty-platform-starter`.

Clean baseline created:

```text
App user: souz-rostov
App dir: /opt/souz-rostov
Env dir: /etc/souz-rostov
Runtime env: /etc/souz-rostov/app.env
Compose file: /opt/souz-rostov/compose.yml
Media dir: /opt/souz-rostov/shared/media
Log dir: /var/log/souz-rostov
Nginx site: /etc/nginx/sites-available/souz-rostov.conf
Enabled site: /etc/nginx/sites-enabled/souz-rostov.conf
```

Permissions baseline:

- `/etc/souz-rostov/app.env` is root-owned, group-readable only by `souz-rostov`; values must never be printed.
- `/opt/souz-rostov/compose.yml` is root-owned, group-readable by `souz-rostov`.
- media/log/app directories belong to `souz-rostov` where runtime write is required.

## Database state

Secret Master `szrostov-server/prod` contains the approved Timeweb PostgreSQL connection names. Values are not committed or printed.

Sanitized DB identity verified during cleanup:

```text
Host: 192.168.0.6
Port: 5432
Database: soyuz_rostov_prod
Runtime user: soyuz_runtime
```

Current DB state:

- Connectivity from server using Secret Master credentials: PASS.
- Old schema/data was removed by owner-approved destructive reset.
- Current public schema table count after reset: `0`.
- Runtime env now includes `DATABASE_URI` and compatibility `DATABASE_URL`.

Important:

- Production/staging migrations must run only from the approved immutable Docker image.
- Do not run ad-hoc production DDL from local workstation or server shell except during an explicitly approved recovery/maintenance action.

## Target runtime

Default client topology follows AMS Realty Platform Core:

```text
application: Next.js + Payload CMS
process: one app runtime, exactly one jobs owner
proxy: Nginx/TLS
final origin: https://souz-home.ru
technical host: https://soyuz-rostov.tw1.ru
DB: Timeweb managed PostgreSQL / approved managed PostgreSQL
media: Timeweb S3 selected by owner; activation pending, current Payload code still uses local filesystem
secrets: Secret Master + server root-only runtime env
artifact: immutable Docker image built outside production host
```

The production host must not build the application from Git. It pulls an immutable image digest/tag produced by the SourceCraft release flow.

## Open architecture blockers

- Timeweb S3 is the owner-selected production topology, but activation is incomplete: `payload.config.ts`/`Media.ts` still use local filesystem. The server media directory is prepared infrastructure only, not production canon.
- Client public provider can fall back to starter fixture NAP/content if Payload is unavailable; public client runtime must fail closed or use an explicitly client-owned safe bootstrap.
- Current R1 SEO/district seed contains novostroyki district rows reserved by the master plan for R2.
- Image registry/name/publish/pull-by-digest procedure is not yet proven.

These are implementation/planning blockers, not permission to deploy.

## Current Nginx/HTTP behavior

Nginx placeholder is enabled for:

- `soyuz-rostov.tw1.ru` — technical validation host, noindex headers.
- `souz-home.ru` / `www.souz-home.ru` — final host placeholder, still noindex until cutover/indexing decision.

Current local technical-host HTTP returns `502`, which is expected until the new application container is deployed and listening on `127.0.0.1:3000`.

Nginx config test is PASS. A non-blocking `proxy_headers_hash` warning was observed; it does not block config load but may be cleaned in a hardening pass.

## Runtime env caveat

`/etc/souz-rostov/app.env` was materialized during cleanup from Secret Master values plus a generated `REVALIDATE_SECRET`.

Follow-up required before release:

- Move the generated `REVALIDATE_SECRET` into Secret Master as canonical, or replace server env from a Secret Master value.
- Re-materialize env without printing values.
- Verify `requiredKeysForMode("runtime")` through application startup/health.

## Release gates

Before production/staging rollout:

1. Confirm clean canonical SourceCraft `main` and exact SHA.
2. Confirm approved image name/digest/tag built from that exact SHA.
3. Confirm runtime env was materialized from Secret Master without printing values.
4. Confirm DB identity and backup/restore strategy.
5. Run migrations only from the approved image against the approved clean DB.
6. Ensure one jobs-active runtime (`JOBS_AUTORUN=true`) and no duplicate jobs owners.
7. Start app container via `/opt/souz-rostov/compose.yml`.
8. Validate `/api/internal/healthz` locally.
9. Validate `soyuz-rostov.tw1.ru` via Nginx with noindex headers.
10. Only after owner cutover decision: route `souz-home.ru`, validate TLS, remove noindex only if indexing is explicitly promoted to `public`.

## Rollback

Rollback unit must be:

- previous immutable image digest/tag;
- previous env snapshot path/checksum, without printing values;
- database backup point or restore procedure;
- Nginx config rollback point.

`git pull` and server-side build are not release/rollback strategy.

## Current caveats

- `productionIndexing` is currently `noindex` in `src/project/client-readiness.config.ts`.
- Technical host returns `502` until release image is deployed.
- `REVALIDATE_SECRET` must be canonicalized into Secret Master before release.
- TLS/certbot state for final domains still needs release-stage proof.
- Legal texts are marked approved by preset, but owner should re-check final public copy before public indexing.

## Detailed cleanup evidence

See `SERVER_PREP_PLAN.md` for the full inventory, destructive cleanup record and verification transcript summary.
