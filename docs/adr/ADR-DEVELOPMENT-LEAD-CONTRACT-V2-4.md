# ADR: Development lead presentation contract 2.4

Дата: 2026-09-27

Статус: ACCEPTED

## Контекст

Форма запроса цены ЖК сохраняется как `development_price`, но публичный
`LeadFormKind` не мог выразить контекст `development`. UI обходил mapper через
отдельный `intakeKind`, поэтому presentation context и persisted kind могли
расходиться.

## Решение

- повысить base presentation contract с `2.3.0` до `2.4.0`;
- добавить `development` в `LeadFormKind`;
- сопоставлять `development` с persisted `development_price` в существующем
  UI mapper;
- убрать локальный override из формы запроса цены ЖК.

Изменение additive: существующие значения и их mapping не меняются.

## Проверка и rollback

- `pnpm contracts:diff` фиксирует изменение только `lead.ts` и public version;
- `pnpm contracts:check`, `pnpm verify:contracts-v2` и
  `pnpm verify:lead-analytics` подтверждают frozen lock и mapping;
- rollback: вернуть `LeadFormKind`, mapper и lock на `2.3.0` одним revert.
