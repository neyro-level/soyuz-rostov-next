# EPIC-23d — Payload Media DB import proof

Status: `PASS`  
Task: `szh-task-23d-payload-media-import-proof`  
Date: `2026-10-02`

## What was proven

- Payload Local API created a `media` record in a disposable PostgreSQL DB.
- Payload S3 storage adapter uploaded the media file to Timeweb S3.
- The S3 object was read back with SHA-256 match.
- The Payload media record was read back by ID.
- The proof media record and object were cleaned up.

## Safety

- The managed DB identity was checked first and `soyuz_rostov_prod` was refused for this proof.
- A temporary PostgreSQL container on `szrostov` was used as an isolated DB contour and removed after proof.
- No secret values were printed.
- No production DB mutation, DNS change, indexing change, deploy, or destructive migration was performed.

## Command evidence

`powershell.exe -NoProfile -ExecutionPolicy Bypass -File ./.pi-szh23d-run-proof.ps1` returned `PASS` with:

```json
{
  "status": "PASS",
  "payloadMediaRecord": "created-read-deleted",
  "s3Object": "put-by-payload-readback-cleaned",
  "keyRedacted": "media/<payload-media-proof>.png",
  "bytes": 68,
  "sha256": "4b5c5c92cec3b23e6a294fc0eea43234ef5126c5a64f4c6c531ac8430ab0b844",
  "etagPresent": true,
  "productionDbRefused": true
}
```
