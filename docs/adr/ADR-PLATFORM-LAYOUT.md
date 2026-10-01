# ADR — Platform layout

Status: `ACCEPTED`

## Context

Project documents and historical guards sometimes used `src/platform/**` as a
conceptual name for reusable platform code. The implemented repository has no
separate platform owner there: reusable behavior lives in `src/core/**` and
`packages/**`, while client/project composition lives in `src/project/**` and
the application layer.

## Decision

- Reusable platform surface is exactly `src/core/**` plus `packages/**`.
- `src/project/**` owns project profile, brand, domain, geo data, templates,
  presets and composition that may vary between clones.
- Dependency direction is `project -> core`; `core/packages -> project` is
  forbidden.
- Client city, brand, domain and Russian marketing-template literals are
  forbidden in the reusable platform surface.
- Any guard or plan requirement that historically names `src/platform/**`
  applies to `src/core/**` plus `packages/**`; it does not authorize creating a
  second reusable-platform tree.
- Candidate improvements that may later move upstream are recorded in
  `docs/UPSTREAM_CANDIDATES.md`; recording a candidate does not change ownership
  or authorize another repository.

## Consequences

Project-specific configuration can consume reusable functions and contracts,
but reusable packages stay clone-neutral. Moving a boundary or introducing a
new platform root requires a new approved ADR and updated architecture guards.

## Recovery

Revert the documentation change. Runtime paths are not moved by this ADR.
