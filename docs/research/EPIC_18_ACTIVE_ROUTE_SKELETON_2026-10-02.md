# EPIC-18 — Active route skeleton proof

Task: `szh-task-18-implementation`  
Date: `2026-10-02`

## Route contract

R1 active skeleton keeps the approved geo/category/entity/service/legal routes only. `/ipoteka/semeynaya/` is present as a noindex family mortgage subservice skeleton.

## Fail-closed surfaces

The following surfaces are explicit `404` / fail-closed in R1 unless a later owner-approved evidence gate changes them:

- `/sdat/`
- `/nedvizhimost/`
- `/otzyvy/`
- `/stroitelstvo-domov/`
- `/journal/` and `/journal/**`

Generic `/nedvizhimost` redirect remains absent; exact legacy redirects must be evidence-backed rows only.

## Safety

- No production deploy, DNS, indexing promotion, destructive migration, or secret access.
- Global project indexing remains `noindex` until owner cutover.
- PREPARED_OFF category surfaces remain out of the R1 route skeleton.
