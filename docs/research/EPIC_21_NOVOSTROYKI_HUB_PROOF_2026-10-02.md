# EPIC-21 — Novostroyki root + Rostov geo hub proof

Task: `szh-task-21-implementation`  
Date: `2026-10-02`

## Route contract

- `/novostroyki/` remains the SINGLE_GEO global category root and is safe/noindex through the registry/content gate.
- `/rostov-na-donu/novostroyki/` remains the Rostov geo-first catalog owner.
- R2 novostroyki district URLs are excluded from the R1 SEO registry and generated route seed.

## Data and UI safety

- Novostroyki listing cards are Gateway DTO-backed `DevelopmentCardDTO` records.
- Public listing cards do not expose internal `checkedAt`, source URLs or verification timestamps.
- Stale prices are filtered through `freshDevelopmentPrices` / `minimumFreshPrice`; no stale price is rendered on cards.
- Nearby-city links are produced through safe navigation, so PREPARED_OFF geo hubs are not linked from public UI.

## Safety

- No production, DNS, indexing, server or data mutation was performed.
- No new route surface beyond R1 was activated.
