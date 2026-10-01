# Timeweb client activation blueprint

This directory is a static reference for a future client clone. It does not
alter the starter demo, provision infrastructure, deploy an application or
prove a live Timeweb connection.

## Frozen boundary

- Starter demo: local PostgreSQL and persistent `MEDIA_DIR`.
- Client default: Timeweb Managed PostgreSQL and Timeweb S3-compatible Object
  Storage.
- Client artifacts are built outside the server and deployed by immutable image
  digest or immutable tag. `git pull` and server-side builds are forbidden.
- Exactly one runtime owns Payload jobs. Follow the handover in
  `compose/client.compose.yml.example`; never run old and new owners together.
- Secrets are materialized from the client Secret Master project into an
  approved env file. No value belongs in Git.

## Activation order

1. Create separate staging Managed PostgreSQL and S3 resources.
2. Copy `env.client.example` outside Git and fill it from Secret Master.
3. Commit the client identity change so the checkout is clean, then run
   `pnpm clone:activate-timeweb-storage`. It installs the exact compatible
   `@payloadcms/storage-s3@3.90.2` peer for Payload `3.90.2`, applies the
   versioned config and validates types. In the activated `client +
   timeweb-s3` mode runtime env requires the S3 keys instead of `MEDIA_DIR`.
   The starter dependency set stays clean.
4. Fill `S3_ENDPOINT=https://s3.twcstorage.ru`, `S3_REGION=ru-1`, bucket,
   credentials and the client-safe `S3_PREFIX` from the Timeweb dashboard and
   Secret Master. Do not commit credentials.
5. Decide public/private URL, ACL and signed-download policy explicitly from
   the client requirement and provider evidence.
6. Build `DATABASE_URI` outside Git with `sslmode=verify-full`, an absolute
   `sslrootcert` pointing to the Timeweb CA file, `connect_timeout=10` and
   `options=-c statement_timeout=30000`. Keep `DATABASE_POOL_MAX` bounded at
   the approved instance limit; the generated default is `10`.
7. Before migrations, verify that the URI host equals the approved Timeweb
   resource host and that the CA file is the provider CA copied from the
   client Secret Master/runtime package. A wrong host, missing/wrong CA,
   `sslmode` other than `verify-full`, or an unbounded timeout is a stop.
8. Run clean migrations against staging with `PAYLOAD_DB_PUSH=false`.
9. Run the restore drill from `backup/README.md` against a new database named
   `restore_drill_<client>_<date>`. The command creates and always removes that
   database; it refuses protected/non-temporary names and mismatched dump hash.
10. Validate Nginx placeholders, backup, monitoring and one jobs owner.
11. Complete every item in `proofs/CLIENT_TIMEWEB_PROOF.md` before any client
   production decision.

## Official contract checked 2026-09-21

- Payload storage adapters: https://payloadcms.com/docs/upload/storage-adapters
  confirms `@payloadcms/storage-s3`, `collections`, `bucket`, AWS
  `S3ClientConfig`, conditional `enabled` and automatic local-storage disable.
- Timeweb S3: https://timeweb.cloud/docs/s3-storage/manage-storage/s3-guide
  confirms path-style endpoint `https://s3.twcstorage.ru`, region `ru-1`,
  S3-compatible credentials and provider connection data from the dashboard.
- Timeweb PostgreSQL: https://timeweb.cloud/docs/dbaas/postgresql/ confirms
  managed PostgreSQL availability, including PostgreSQL 18.
- Physical and logical backups:
  https://timeweb.cloud/docs/dbaas/dbaas-manage/backup and
  https://timeweb.cloud/docs/dbaas/dbaas-manage/logical-backups.

Static compatibility and local restore tooling: `PROVEN`. Real Timeweb TLS,
upload, migration, restore drill and live rollout: `NOT RUN` until an explicit
first-client owner command.
