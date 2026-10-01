# Internal production deploy

Target: `start-baza.ams24.ru`.

This folder contains only non-secret deployment templates. Runtime values must be
materialized into `/etc/ams/realtbase/start-baza.env` on the server. Do not
commit or paste secret values. For this starter deployment, the owner-approved
database is local PostgreSQL on AMS Server, not a paid Timeweb Managed
PostgreSQL instance.

Canonical release runbook (execution requires a separate owner release command):

1. Confirm clean canonical SourceCraft `main` and record its exact full SHA.
2. Run the release preflight required by `docs/05_RELEASE_CHECKLIST.md`.
3. Outside the production host run
   `pnpm release:build --expected-sha=<sha> --image=<registry/image:<sha>>` to
   build one immutable Docker image from the existing `Dockerfile`.
4. Verify `.release/release-manifest.json`: source commit, build identity, image
   reference and full sha256 digest must describe the same build.
5. Publish/store that immutable artifact only inside the owner-authorized
   release; implementation or dry-run checks never publish it.
6. Preserve the previous known-good immutable image and runtime env as rollback
   point.
7. Apply Payload migrations through the release path using the same image.
8. Roll out through `deploy/compose/start-baza.compose.yml`; keep
   `JOBS_AUTORUN=false` during handover and enable exactly one jobs owner only
   after the old owner is inactive.
9. Check health and explicit live smoke with `X-Robots-Tag: noindex, nofollow`;
   rollback to the preserved image on failure.

Rollback: switch `AMS_REALTBASE_IMAGE` back to the previous known-good immutable
tag and restart the compose project. Database rollback is separate and requires
restore evidence before destructive changes. Local PostgreSQL backups live
outside the app container and must be protected by server backup policy.

The client clone reference is separate: `deploy/clients/timeweb/README.md`.
It does not change this starter demo topology and contains no live credentials.
