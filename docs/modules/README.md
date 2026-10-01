# Optional module activation

Validated `src/project/site-profile.config.ts` owns the activation state and
reserved module spaces. `docs/PROJECT.md` mirrors it for operators. A module
manifest is a dormant contract: its presence does not create collections,
routes, relations or infrastructure.

## Canonical workflow

1. The owner changes the module state in SiteProfile to `active` and updates
   the mirrored row in `docs/PROJECT.md`.
2. Add an expand-only migration.
3. Backfill only when real client data requires it.
4. Verify schema and data before enabling reads.
5. Add Public/System Gateway operations and explicit DTOs.
6. Update the cache registry.
7. Activate the reserved URL namespace.
8. Compose the UI from the project design system.
9. Synchronize the final state in `docs/PROJECT.md`.
10. Run the manifest's targeted proof.

## Hard boundaries

A module cannot add Redis, a broker, search, a second backend or a different
authentication model. A new production component requires the Core section 22
trigger, an owner decision and, when required, an ADR before moving from
`REALTY_BASE` to `REALTY_EXTENDED`.

The guard in `scripts/quality/module-governance.mjs` fails when module runtime
markers exist while the module is disabled, when an enabled module lacks its
manifest, or when a manifest loses a required section.
