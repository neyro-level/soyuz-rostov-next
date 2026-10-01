# Payload S3 activation patch

This is the review checklist for the automated client-clone activation. Do not
apply it manually to the starter.

1. Verify `projectKind: "client"`, commit the client identity and start from a
   clean checkout.
2. Run `pnpm clone:activate-timeweb-storage`. The command verifies Payload
   `3.90.2`, installs exact `@payloadcms/storage-s3@3.90.2`, copies the pinned
   factory under `src/project/`, updates the single env owner and runs typecheck.
3. Confirm `timewebS3Plugin` is the only Payload Media storage adapter and
   `S3_PREFIX` is unique to this client/environment.
4. Confirm runtime required keys switch to S3 credentials and no longer require
   `MEDIA_DIR` for `client + timeweb-s3`, while external feed image URLs stay
   unchanged.
5. Keep `PAYLOAD_DB_PUSH=false`; create and review migrations for any collection
   change.
6. Decide public/private URL, ACL and signed-download behavior explicitly from
   the client requirement and provider evidence. The blueprint does not guess.
7. Prove an Admin upload, read/access behavior, delete and rollback in staging.

The generated config explicitly disables local storage for Media. A repeated
activation command must be a no-op. Do not implement permanent local/S3 dual
mode in the starter.
