# Legacy URL Decisions - 2026-10-01

Source: bounded crawl of `https://souz-home.ru` before new project cutover. No production mutation was performed.

| URL | Live status | Live canonical | Live robots | Decision | Target | Reason |
|---|---:|---|---|---|---|---|
| /prodat/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | OUT_404 |  | Live URL is 404; no same-intent R1 redirect is proven. |
| /sdat/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | OUT_404 |  | Live URL is 404; plan default remains OUT/404 unless exact evidence proves same-intent 301. |
| /uslugi/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | KEEP_NEW_R1_ROUTE | /uslugi/ | Live URL is 404, but approved plan keeps a new R1 service route; this is not a legacy redirect. |
| /nedvizhimost/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | NO_GENERIC_REDIRECT |  | Live URL is 404; no bulk category/home redirect is approved. |
| /obekty/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | PATTERN_ONLY_PENDING_ENTITY_MAP |  | Root is 404; individual legacy object URLs require per-entity EPIC-28 mapping. |
| /sotrudniki/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | R1_404_RESERVED |  | Live root is 404; no staff migration evidence in R1. |
| /stroitelstvo-domov/ | 200 | https://souz-home.ru/stroitelstvo-domov/ | index, follow | R1_404_WITH_LEGACY_EVIDENCE |  | Live page is indexable, but owner plan excludes construction from R1; do not activate route without later owner-approved scope. |
| /reviews/ | 200 | https://souz-home.ru/reviews/ | index, follow | HIDE_UNTIL_VERIFIED_SOURCE |  | Live page is indexable, but R1 reviews require verified review source before publication. |
| /otzyvy/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | R1_404_LEGACY_SPELLING |  | Live Russian spelling URL is 404; spelling evidence captured, no redirect to hidden reviews. |
| /semeinaya-ipoteka/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | NO_REDIRECT_WITHOUT_EVIDENCE |  | Live URL is 404; no same-intent evidence for redirect. |
| /ipoteka/semeynaya/ | 404 | https://souz-home.ru/404/ | noindex, nofollow | NEW_CANONICAL_CANDIDATE_ONLY | /ipoteka/semeynaya/ | Live URL is 404; approved plan treats it as future canonical candidate after evidence/Gate, not current legacy redirect. |

## Guardrails

- No bulk homepage/category redirects are approved by this snapshot.
- `/obekty/{slug}` migration requires EPIC-28 per-entity identity mapping.
- `/stroitelstvo-domov/` and `/reviews/` are live/indexable on the old site, but R1 keeps construction outside scope and reviews hidden until verified source evidence exists.
- `/sdat/` remains OUT/404 because live evidence is 404 and no same-intent target was proven.
