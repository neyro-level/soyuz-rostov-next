# SZ Rostov server prep plan

Дата: 2026-10-01
Статус: `SERVER_CLEANED / DB_RESET / DOCKER_READY / AWAITING_SOURCECRAFT_IMAGE_RELEASE`

## Canonical deployment route

Owner requires production via immutable Docker image built/stored through SourceCraft/release flow.

Required route:

1. Merge approved project state to canonical SourceCraft `main`.
2. Run exact-head SourceCraft gate for `COMMERCIAL` profile.
3. Build one immutable Docker image from `Dockerfile` (`node:24.21.0-bookworm-slim`, `pnpm@11.28.2`).
4. Publish/store image by immutable digest/tag outside the production host.
5. Server pulls the image; server must not build the app from Git.
6. Rollout via Docker Compose/Nginx with exactly one jobs owner.
7. Live proof: health, technical host, noindex, rollback point.

## Read-only server inventory

Server access:

- SSH alias: `szrostov`.
- Hostname: `msk-1-vm-py2a`.
- User: `root`.
- OS: Ubuntu 26.04 LTS.
- systemd: `running`, failed units: `0`.
- Disk `/`: 38G total, 22G used, 17G available, 57% used.
- RAM: 1.9Gi total, about 611Mi available at inventory time; swap 4.0Gi.

Installed runtime:

- Node: `v24.20.0` on host.
- pnpm: `11.24.0` on host.
- Nginx: `1.28.3`, active, config OK.
- PostgreSQL client: `psql 18.6`.
- Docker: not installed / not found.
- Docker Compose: not installed / not found.

Current listening ports:

- `0.0.0.0:80` / `[::]:80` — Nginx.
- `127.0.0.1:3000` — old Soyuz Next runtime.
- `127.0.0.1:3010` — old starter runtime.
- `127.0.0.1:8443` — local Nginx starter SSL contour.
- `0.0.0.0:22` — SSH.
- `0.0.0.0:10050` — Zabbix agent.

Current services to remove/replace:

- `soyuz-rostov.service` — old Soyuz web runtime.
- `soyuz-rostov-imports.service` — old Payload imports worker.
- `soyuz-rostov-maintenance.service` — old Payload maintenance worker.
- `soyuz-rostov-maintenance-scheduler.service` — old Payload scheduler.
- `ams-realty-platform-starter.service` — old starter web runtime.
- `ams-realty-platform-starter-worker.service` — old starter worker.

Current app directories to remove/replace:

- `/opt/soyuz-rostov` — old app releases/current/shared/deploy.
- `/opt/ams-realty-platform-starter` — old starter app/runtime/releases.

Current Nginx config to remove/replace:

- `/etc/nginx/sites-enabled/soyuz-rostov.conf`.
- `/etc/nginx/sites-available/soyuz-rostov.conf` and backup variants.
- `/etc/nginx/sites-enabled/ams-realty-platform-starter.conf`.
- `/etc/nginx/sites-available/ams-realty-platform-starter.conf`.

Current env files to remove/recreate from Secret Master:

- `/etc/soyuz-rostov/runtime.env`.
- `/etc/soyuz-rostov/release.env`.

Values were not printed. Existing runtime env is stale: its `DATABASE_URL` SHA does not match Secret Master `DATABASE_URL` SHA, and it lacks `DATABASE_URI` required by current code.

## Database inventory

Secret Master `szrostov-server/prod` contains required names, including:

- `DATABASE_URL`.
- Timeweb server/database IDs.
- S3 names.
- SSH/server access names.

Database connectivity using Secret Master `DATABASE_URL` from the server: PASS.

Sanitized DB identity:

- Host: `192.168.0.6`.
- Port: `5432`.
- Database: `soyuz_rostov_prod`.
- Runtime user: `soyuz_runtime`.

Existing schema is not empty. Read-only count: 36 tables. First tables include:

- `_pages_v`.
- `admin_activities`.
- `analytics_events`.
- `buildings`.
- `employees`.
- `import_sources`.
- `leads`.
- `media`.
- `pages`.
- `payload_jobs`.
- `properties`.
- `residential_complexes`.

This appears to be the old project schema, not the new AMS Realty Baza Starter client schema (`cities`, `districts`, `developments`, `feed_sources`, etc.).

## Blockers

1. Docker/Compose are not installed, but target route requires immutable Docker image rollout.
2. Current `/etc/soyuz-rostov/runtime.env` uses stale DB credentials and `DATABASE_URL`; current code expects `DATABASE_URI`.
3. The dedicated database is active but contains old schema/data; new project needs explicit destructive DB reset or a planned migration.
4. Old web/worker services are still running and repeatedly failing DB auth.
5. The current technical host returns cached HTTP 200, but internal health returns 500.

## Proposed destructive cleanup sequence

Requires explicit confirmation because it stops live services and removes old app/runtime data.

1. Stop and disable old services:
   - `soyuz-rostov.service`
   - `soyuz-rostov-imports.service`
   - `soyuz-rostov-maintenance.service`
   - `soyuz-rostov-maintenance-scheduler.service`
   - `ams-realty-platform-starter.service`
   - `ams-realty-platform-starter-worker.service`

2. Remove old systemd unit files for those services and run `systemctl daemon-reload`.

3. Remove old app directories:
   - `/opt/soyuz-rostov`
   - `/opt/ams-realty-platform-starter`

4. Remove old env directory/files and recreate clean root-only directory:
   - `/etc/soyuz-rostov`

5. Remove old Nginx site configs and reload Nginx after installing the new placeholder.

6. Reset database for new project:
   - preferred: create/drop/recreate a clean database or clean schema via Timeweb-approved route;
   - fallback: `DROP SCHEMA public CASCADE; CREATE SCHEMA public;` using an owner-approved admin credential.
   - This must happen only after explicit DB reset confirmation.

## Required bootstrap after cleanup

1. Install Docker Engine and Docker Compose plugin.
2. Create fresh app directories:
   - `/opt/souz-rostov` or `/opt/soyuz-rostov` (choose one canonical spelling before writing configs).
   - `/etc/souz-rostov` or `/etc/soyuz-rostov` for root-only env.
3. Materialize env from Secret Master with both compatibility names if needed:
   - `DATABASE_URI=<Secret Master DATABASE_URL>` for current code.
   - optional `DATABASE_URL=<same>` only if runtime scripts still need it.
   - `NEXT_PUBLIC_SERVER_URL=https://souz-home.ru` for final production; technical preview may require a separate env decision.
4. Configure Nginx:
   - `soyuz-rostov.tw1.ru` → noindex technical host.
   - `souz-home.ru` → final host, noindex until cutover/public indexing decision.
5. Deploy immutable SourceCraft-built Docker image with Docker Compose.
6. Run migrations from the same image against the clean DB.
7. Start web + exactly one jobs owner.
8. Validate `/api/internal/healthz`, technical host, headers, logs, and rollback.

## Completed destructive cleanup — 2026-10-01

Owner confirmed: delete everything old and make the DB absolutely clean.

Completed actions:

- Stopped, disabled and removed old systemd services:
  - `soyuz-rostov.service`
  - `soyuz-rostov-imports.service`
  - `soyuz-rostov-maintenance.service`
  - `soyuz-rostov-maintenance-scheduler.service`
  - `ams-realty-platform-starter.service`
  - `ams-realty-platform-starter-worker.service`
- Removed old app/runtime directories:
  - `/opt/soyuz-rostov`
  - `/opt/ams-realty-platform-starter`
  - `/etc/soyuz-rostov`
  - `/etc/ams-realty-platform-starter`
- Removed old Nginx site configs for Soyuz/starter and reloaded Nginx.
- Removed old app users `soyuz-rostov` and `ams-realty-platform-starter`.
- Reset Timeweb PostgreSQL database `soyuz_rostov_prod` to an empty public schema.
- Verified DB table count: `0`.
- Installed Docker runtime:
  - Docker `29.1.3`.
  - Docker Compose `2.40.3`.
- Created clean server baseline:
  - app user: `souz-rostov`.
  - app dir: `/opt/souz-rostov`.
  - env dir: `/etc/souz-rostov`.
  - log dir: `/var/log/souz-rostov`.
  - media dir: `/opt/souz-rostov/shared/media`.
- Wrote root-only runtime env file from Secret Master at `/etc/souz-rostov/app.env`.
  - Includes both `DATABASE_URI` and compatibility `DATABASE_URL`.
  - Includes generated `REVALIDATE_SECRET`; this should be moved into Secret Master as canonical follow-up.
- Wrote Docker Compose placeholder at `/opt/souz-rostov/compose.yml`.
- Wrote Nginx placeholder at `/etc/nginx/sites-available/souz-rostov.conf` and enabled it.

Final verification:

- systemd: `running`, failed units: `0`.
- relevant active services: `docker.service`, `nginx.service` only.
- Docker active: yes.
- Compose config with sample image: PASS.
- Nginx config test: PASS, with non-blocking `proxy_headers_hash` warning.
- Technical host local HTTP: `502` expected until immutable SourceCraft Docker image is deployed.

## Remaining before release

- Build/publish immutable SourceCraft Docker image from canonical exact `main`.
- Store/pull image by immutable digest/tag.
- Run Payload migrations against the clean DB from the same image.
- Start app container and exactly one jobs owner.
- Run live proof on `soyuz-rostov.tw1.ru` with noindex.
- Move generated `REVALIDATE_SECRET` into Secret Master or replace server env from canonical Secret Master value.
- Configure TLS/certbot and final `souz-home.ru` cutover only after explicit release/DNS command.
