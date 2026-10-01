# Module manifest: agents

## Status

`DISABLED`. No collection or property relation exists because of this document.

## Prerequisites

A real product journey must prove agent pages and the exact relationships it
needs before schema design begins.

## Enabled flag owner

The `agents` entry in validated `src/project/site-profile.config.ts`;
`docs/PROJECT.md` mirrors it for operators.

## Reserved URLs

The client-specific agent listing/profile namespace is reserved only during
activation and after the canonical URL map is updated.

## Collections to add

`agents`. Add only relationships proven by the activated journey.

## Migration contract

Use an expand migration for the collection and separately justified relations.
Do not pre-create `properties.assignedAgent`.

## Backfill contract

Backfill only verified employee identities and explicitly mapped property
relations. Missing or ambiguous relationships remain unset.

## Gateway/DTO additions

Add minimal public agent selects and explicit DTOs; private employee data stays
behind Payload access rules.

## Feed identity requirements

No feed identity is assumed. Any external staff directory requires a separate
stable identity and ownership contract.

## Cache targets

Register agent listing/profile targets and only the property surfaces that gain
an approved relationship.

## UI composition

Compose agent cards and profiles from the project design system after the
product journey and accessible states are approved.

## SEO contract

Freeze indexability, canonicals, metadata, sitemap ownership and any person
structured-data decision before publishing agent pages.

## Verification

Migration/schema proof, access and PII tests, Gateway/DTO tests, relation
fixtures, cache invalidation, SEO checks and representative pages are required.

## Non-goals

No custom employee cabinet, new auth model, speculative assigned-agent field or
automatic property relationship.

## Trigger to REALTY_EXTENDED

Agent pages and relations alone do not change the profile. Only a proven Core
section 22 topology trigger permits `REALTY_EXTENDED`.

## Rollback/deactivation notes

Remove public navigation/routes and relationship reads first, preserve employee
records for owner review, then revert module code without destructive data loss.
