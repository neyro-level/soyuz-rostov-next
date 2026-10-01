# ADR: District taxonomy presentation contract 2.3

Статус: `ACCEPTED`

## Контекст

Current taxonomy uses persisted value `admin_district` instead of
`administrative`. Payload schema, migration, seed и SEO templates уже используют
новую taxonomy, поэтому публичный `DistrictDTO` не может сохранять
старое значение.

## Решение

- повысить base presentation contract с `2.2.0` до `2.3.0`;
- заменить `DistrictDTO.type=administrative` на `admin_district`;
- сохранить `microdistrict` без изменений;
- синхронизировать frozen lock с exact source.

## Откат

Rollback выполняется вместе с down migration, которая сначала возвращает
persisted `admin_district` в `administrative`. Частичный откат DTO или
schema запрещён.

## Проверка

- `pnpm contracts:check` и `pnpm verify:contracts-v2`;
- `pnpm typecheck`;
- exact-head `RISKY schema-data` Gate.
