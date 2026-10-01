# Client backup contract

## Managed PostgreSQL

- Enable the provider physical-backup schedule and record retention in the
  client operations document.
- Perform the documented provider restore flow against staging before
  production.
- Add a logical export only when client policy requires a portable SQL copy;
  Timeweb currently documents logical backups as beta, so it is not the sole
  recovery path.
- Record restore point, duration, integrity checks and application smoke result.

### Safe logical restore drill

Inputs (all explicit): custom-format dump path, its trusted SHA-256, approved
Timeweb host, a fresh database name matching `restore_drill_[a-z0-9_]+`, an
absolute Timeweb CA path, a smoke SQL query and its expected scalar result.
The target `DATABASE_URI` remains outside Git and must contain
`sslmode=verify-full`, matching `sslrootcert`, `connect_timeout=1..30` and a
`statement_timeout=1000..120000` ms option.

Materialize `DATABASE_URI` process-locally from the client Secret Master before
the command. Never put the URI into a command argument or shell history.

```text
pnpm db:restore-drill -- \
  --dump-file=<absolute custom dump path> \
  --dump-sha256=<trusted 64-char sha256> \
  --expected-host=<approved Timeweb host> \
  --expected-database=restore_drill_<client>_<date> \
  --ca-file=<absolute Timeweb CA path> \
  --smoke-sql=<read-only scalar query tied to restored data> \
  --smoke-expected=<expected scalar value>
```

Output: one non-secret PASS line naming only the temporary database. The script
creates the database, restores the immutable source dump, runs the smoke query
against that restored database and removes it in `finally`. It never alters or
deletes the source dump. Stop immediately when host/database identity, CA,
dump provenance or expected smoke value is unknown. Never point it at an
existing database, `postgres`, `main`, `live`, `prod` or `production`.

Local contract proof: `pnpm verify:db-restore-drill`. It uses a disposable
local PostgreSQL 18 container and fixture data; it does not contact Timeweb.
The first real Timeweb run remains `NOT RUN` until the owner explicitly starts
client staging validation.

## S3 media

- Decide and record bucket versioning/lifecycle/retention in the client project.
- Prove recovery of a representative object and Payload media reference.
- Keep credentials in Secret Master and verify that backup access is independent
  enough for the chosen failure model.

No unowned `pg_dump_to_s3` placeholder is part of this blueprint.
