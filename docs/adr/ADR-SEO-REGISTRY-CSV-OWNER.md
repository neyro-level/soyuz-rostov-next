# ADR D-09-02 — CSV owner of the SEO Registry

Status: accepted.

## Decision

`docs/seo/SEO_REGISTRY_SEED.csv` is the only editable owner of registry rows.
`pnpm seo:registry:generate` validates it and deterministically generates
`src/project/seo/registry-seed.ts`; `pnpm seo:registry:check` fails when the
generated file differs and is included in `verify:daily`.

The CSV contract owns PageKey, URL/canonical, intent and evidence, tier,
minimum objects, template/status, release and Content Gate rule. Runtime reads
only the generated typed registry.

## Rejected alternative

Payload CMS is not a second SEO Registry owner. Adding editable CMS rows would
create competing CSV/CMS truth, nondeterministic clone output and an unclear
release boundary. A future owner change requires a separate ADR and migration.
