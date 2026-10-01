# Module manifest: journal

## Status

`DISABLED`. Frozen journal DTO contracts do not activate persistence or routes.

## Prerequisites

The owner approves authored content, the reserved `/journal/*` namespace and
the existing frozen journal DTO contract.

## Enabled flag owner

The `journal` entry in validated `src/project/site-profile.config.ts`;
`docs/PROJECT.md` mirrors it for operators.

## Reserved URLs

`/journal/*`, including listing, pagination and article routes.

## Collections to add

`posts`; categories or tags are added only when the real editorial model needs
them. The starter must not pre-create `posts`.

## Migration contract

Add the authored-content schema through an expand migration before activating
routes or writes.

## Backfill contract

No historical backfill is required unless a client is migrating existing
articles; such migration needs an explicit source mapping and proof.

## Gateway/DTO additions

Activate explicit journal list/article Gateway selects and the frozen journal
DTOs. Public UI never consumes raw Payload documents.

## Feed identity requirements

Journal content is authored, not feed-derived. Imported legacy content requires
a separate stable source identity decision.

## Cache targets

Register journal listing, pagination, article, related-material and sitemap
targets. RSS remains optional.

## UI composition

Compose listing, article and related-material blocks from the project design
system; no second component system is introduced.

## SEO contract

Article structured data, applicable breadcrumbs, canonical, Open Graph,
pagination/index policy and journal sitemap ownership are required.

## Verification

Migration/schema proof, authored-content access tests, pagination, structured
data, canonical/OG, sitemap, cache and representative-page checks are required.

## Non-goals

No pre-created `posts`, speculative RSS, external CMS or feed-driven journal
identity.

## Trigger to REALTY_EXTENDED

Journal activation alone stays in `REALTY_BASE`; only a proven Core section 22
topology trigger permits the profile change.

## Rollback/deactivation notes

Remove journal navigation and routes from public composition, retain authored
content, then revert readers/writers. Do not drop posts during deactivation.
