# EPIC-23 — 24 priority development identity/status matrix

Status: `PARTIAL_EVIDENCE / BLOCKED_FOR_MEDIA_AND_IMPORT`
Task: `szh-task-23-implementation`
Date: `2026-10-02`

## Summary

- 24/24 owner-priority ЖК have a source identity candidate from Yandex Realty search evidence.
- 22/24 are Ростов-на-Дону records; 2/24 are intentionally non-Rostov/agglomeration records and retain their real city: `Луна` (Батайск), `Столицыно` (Аксай). `Придонье` is also an Aksay/agglomeration record discovered through offer-level evidence.
- 0/24 are publish-eligible in this repository evidence pass because accepted media count is `0` and Payload → Timeweb S3 import proof is absent.
- All rows are therefore explicitly `unpublished`; no placeholder is allowed to pass Content Gate.

## Blocking gap

EPIC-23 cannot honestly close from repository-only work because its DoD requires at least five accepted S3-backed Payload media records for each published priority ЖК, checksum/deduplication proof, import reports and restart-persistent S3 media. This run did not download/commit media binaries, did not mutate Payload/S3 and did not perform staging/production actions.

## Matrix

| Owner name | Source slug | City | Developer | Status | Publish | Blocker |
|---|---|---|---|---|---|---|
| Созвездие | `sozvezdie-3453617` | Ростов-на-Дону | Донстрой | verified | unpublished | media/S3 import missing |
| Луна | `luna-3982269` | Батайск | СК «Анастасия» | verified_non_rostov | unpublished | media/S3 import missing |
| Лайм | `lajm-siti-3053470` | Ростов-на-Дону | ИнвестРадиоСтрой | verified | unpublished | media/S3 import missing |
| Придонье | `pridonie-offer-based` | Аксай | ССК | verified_offer_only_non_rostov | unpublished | media/S3 import missing |
| Октябрь Парк | `oktyabr-park-3925017` | Ростов-на-Дону | ССК | verified | unpublished | media/S3 import missing |
| Донские легенды | `donskie-legendy-4068051` | Ростов-на-Дону | ПОКОЛЕНИЕ ДЕВЕЛОПМЕНТ | verified | unpublished | media/S3 import missing |
| Ботаника | `botanika-4029488` | Ростов-на-Дону | ГК «АльфаСтройИнвест» | verified | unpublished | media/S3 import missing |
| Академия | `akademiya-4061334` | Ростов-на-Дону | ГК «АльфаСтройИнвест» | verified | unpublished | media/S3 import missing |
| Донской Арбат 2 | `donskoj-arbat-2-3604394` | Ростов-на-Дону | Московская Строительная Компания | verified | unpublished | media/S3 import missing |
| Город у реки | `gorod-u-reki-1970419` | Ростов-на-Дону | Московская Строительная Компания | verified | unpublished | media/S3 import missing |
| Royal Towers | `royal-tauehrs-3083408` | Ростов-на-Дону | Московская Строительная Компания | verified | unpublished | media/S3 import missing |
| Суворовский | `suvorovskij-301798` | Ростов-на-Дону | ВКБ-Новостройки | verified | unpublished | media/S3 import missing |
| Малина-парк | `malina-park-3499750` | Ростов-на-Дону | СК10 | verified | unpublished | media/S3 import missing |
| Сезоны | `sezony-3997833` | Ростов-на-Дону | СК10 | verified | unpublished | media/S3 import missing |
| Гринсайд | `grinsajd-2633689` | Ростов-на-Дону | СК10 | verified | unpublished | media/S3 import missing |
| Локация 9-11 | `lokaciya-9-11-3991274` | Ростов-на-Дону | СЗ «МАГНУМ» | verified | unpublished | media/S3 import missing |
| Звезда Столицы 2 | `zvezda-stolicy-2-4059240` | Ростов-на-Дону | СК «ДОННЕФТЕСТРОЙ» | verified | unpublished | media/S3 import missing |
| Иловайский | `ilovajskij-4200584` | Ростов-на-Дону | ГК «ФОРТ» | verified | unpublished | media/S3 import missing |
| Фрейм | `frejm-3102231` | Ростов-на-Дону | ГК «АльфаСтройИнвест» | verified | unpublished | media/S3 import missing |
| Культура | `kultura-3765245` | Ростов-на-Дону | СК10 | verified | unpublished | media/S3 import missing |
| 1799 | `1799-3459528` | Ростов-на-Дону | Федеральный девелопер «Неометрия» | verified | unpublished | media/S3 import missing |
| Эстет | `ehstet-4100783` | Ростов-на-Дону | ГК «ЮСИ» | verified | unpublished | media/S3 import missing |
| Столицыно | `stolicyno-4065490` | Аксай | ГК ТОЧНО | verified_non_rostov | unpublished | media/S3 import missing |
| Сияние | `siyanie-kvartal-na-sholohova-3896193` | Ростов-на-Дону | ЮгСтройИнвест | verified | unpublished | media/S3 import missing |

## Machine-readable CSV

See `docs/research/EPIC_23_PRIORITY_DEVELOPMENTS_STATUS_2026-10-02.csv`.

## Boundaries

- No production/staging/DNS/indexing action.
- No destructive migration.
- No secrets printed.
- No media binaries committed.
- No public UI attribution/check-date change.
- Source facts remain evidence for internal intake; public rendering must continue to omit provenance/rights/checkedAt fields.
