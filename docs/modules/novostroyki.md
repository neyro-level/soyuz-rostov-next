# Module manifest: novostroyki

## Status

`PREPARED` for the optional extended newbuild module. The base geo-catalog
platform already owns the unified `developments` / `developers` schema,
Gateway readers, navigation/discovery and canonical public detail routes
`/novostroyki/zhk-{slug}/` and `/kottedzhnye-poselki/kp-{slug}/`.

The prepared module means only the not-yet-activated building/layout/chessboard
extension. It must not be used to disable or duplicate the live base
development surface.

## Prerequisites

The source must provide a market, `externalComplexId`, `externalComplexName`,
`externalBuildingId`, and `externalLayoutId` where available. A layout is not a
unit. Source identity wins; fallback grouping may use complex/building, rooms,
area and source-specific attributes. Ambiguity becomes `needsReview`; area alone
must never auto-merge records.

## Enabled flag owner

The `novostroyki` entry in validated `src/project/site-profile.config.ts`;
`docs/PROJECT.md` mirrors it for operators.

## Reserved URLs

The existing residential-complex, cottage-village and developer detail URLs are
owned by the base platform. Only deeper building/layout/chessboard namespaces
are reserved for this optional extension, and their exact grammar must be
approved in `docs/02_PRODUCT_STRUCTURE.md` before activation.

## Collections to add

No duplicate `developments` or `developers` collection: both already exist in
the base platform, and `properties.development` already links inventory to a
development. Activation may add only the proven building/layout structures
needed by the client journey; a layout remains distinct from an inventory unit.

## Migration contract

Use an expand migration, validate the new schema, then activate readers. No
schema push and no semantic rewrite of existing migrations.

## Backfill contract

Backfill only real source identities. Ambiguous rows remain reviewable and are
not merged by area alone.

## Gateway/DTO additions

Extend the existing development Public Gateway selects and project DTOs only
for approved building/layout/chessboard data. Existing base detail readers stay
active. Raw Payload documents remain private.

## Feed identity requirements

Persist complex, building and layout source identifiers with source scope.
Cross-source ownership and deactivation rules remain unchanged.

## Cache targets

Keep existing development/developer cache targets unchanged; register only new
building/layout/chessboard targets activated by this extension.

## UI composition

Extend the existing development pages through the project design system. A
layout and an inventory unit remain different domain concepts.

## SEO contract

Preserve existing development URL/canonical/discovery ownership. Freeze URLs,
metadata, sitemap ownership and redirect requirements before indexing any new
building/layout/chessboard namespace.

## Verification

Migration/schema proof, identity fixtures, Gateway/DTO tests, cache invalidation,
SEO contract checks and representative page verification are required.

## Non-goals

No automatic chessboard activation, duplicate development/developer owner,
search service, broker, second backend or speculative relation is introduced by
this manifest.

## Trigger to REALTY_EXTENDED

Only a proven topology or capacity trigger from Core section 22 can change the
profile; collection and page activation alone does not.

## Rollback/deactivation notes

Disable only extension routes/readers first, preserve data for review, then
revert module-specific code. Base development/developer pages remain platform
surfaces. Never use deactivation to destructively drop client data.
