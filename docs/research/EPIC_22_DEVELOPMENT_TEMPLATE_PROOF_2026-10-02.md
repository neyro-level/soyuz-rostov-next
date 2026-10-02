# EPIC-22 — Development template proof

Task: `szh-task-22-implementation`  
Date: `2026-10-02`

## Route contract

- Canonical development detail route remains `/novostroyki/zhk-{slug}/` for residential complexes.
- Breadcrumbs are built through safe navigation and fall back when a geo/category hub is inactive.

## Public data safety

- Public detail UI does not render internal `checkedAt`, source URLs, source labels or public verification/update dates.
- Fresh-price presentation hides stale prices; when no fresh price exists, the public UI falls back to a price-request CTA.
- Aggregate offer generation remains freshness-aware through structured-data guards.

## Media safety

- Development galleries use Payload `Media` relations only and map them to `kind: "managed"` media DTOs.
- External/hotlinked media URLs are not emitted by the public detail DTO.

## Safety

- No production, DNS, indexing, server, S3 or database mutation was performed.
- No new backend/auth/ORM was introduced.
