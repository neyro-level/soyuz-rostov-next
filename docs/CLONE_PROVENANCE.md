# Clone provenance

- Client project: SOUZ-ROSTOV
- Preset: MIXED
- Preset SHA-256: 4984dd910ddbff6f6e58760e94fd6a4ad82b0f3cdcb8b4acfa96550c0207627c
- Source starter tag: starter-v2.1.0
- Source starter SHA: 29ba8474d6a76d1b8d37c9b72e7361c90286ba18
- Prepared at: 2026-10-01T13:50:00.000Z
- Fixture runtime: cleared for client mode
- Storage topology: separate explicit clone:activate-* step
- Retained platform standard: AMS Realty Platform Core 5.5 (repository-pinned)
- Retained UI contract: project Design System and closed @ams/realtbase-ui public API

## Removed starter-only groups

- `docs/research/ATLAS_BASELINE.md`
- `docs/research/atlas-css-parity.json`
- `deploy/compose/start-baza.compose.yml`
- `deploy/nginx/start-baza.ams24.ru.conf`
- `scripts/capture-atlas-visual-proof.mjs`
- `scripts/capture-starter-visual-proof.mjs`
- `scripts/verify-atlas-css-parity.mjs`
- `scripts/verify-final-client-clone.mjs`
- `scripts/verify-clone-runtime-matrix.mjs`
- `scripts/verify-clone-readiness.mjs`
- `scripts/verify-clone-prepare.mjs`
- `scripts/generate-align-inventory.mjs`
- `scripts/generate-corrections-inventory.mjs`
- `scripts/generate-hardening-inventory.mjs`
- `scripts/generate-residual-inventory.mjs`

Core, packages, guards, migrations and shared security/data checks remain unchanged.
