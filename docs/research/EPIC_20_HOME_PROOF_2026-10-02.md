# EPIC-20 — Home proof

Task: `szh-task-20-implementation`  
Date: `2026-10-02`

## Scope

Home is aligned with the R1 route scope and preserves a safe, no-fabrication approach:

- agency/value hero for Rostov real-estate intent;
- R1 active section links only: novostroyki, apartments, developers, mortgage, seller CTA;
- featured catalog block uses published Gateway DTO data only;
- no `/sdat/`, reviews, construction, journal, fake metrics or unsourced claims;
- `/` keeps agency/brand intent and does not duplicate `/rostov-na-donu/` geo-hub intent.

## Safety

- Production indexing remains controlled by project indexing policy.
- RealEstateAgent JSON-LD remains built only from approved NAP.
- No production, DNS, indexing, server or data mutation was performed.
