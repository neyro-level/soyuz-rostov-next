# ADR-UI-RUNTIME-DESIGN-VALUES

Status: `APPROVED / CURRENT`

## Decision

Factual runtime design-system values live in `src/app/globals.css`.

Clone preset/intake remains the client-owned input for generated project
values. `src/project/brand.css` is allowed only as deprecated compatibility
stub and has no runtime authority.

## Consequences

- `AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md` and
  `AMS_UI_CORE_v5.0_FINAL.md` are locked together by
  `config/ams-constitution.lock.json`.
- Silent edits to either authority must fail `pnpm verify:constitution-lock`.
- This ADR records the approved runtime authority boundary.
