# ADR-LEAD-ACCESS-MODEL

Статус: Accepted
Дата: 2026-09-21
Контекст: current lead access model

## Решение

Текущий AMS Realty Platform Core 5.5 задаёт каноническую матрицу:

| Capability | anonymous | editor | admin | owner | named system path |
|---|---:|---:|---:|---:|---:|
| `leads` generic create | deny | deny | deny | deny | allow |
| `leads` read/update/delete | deny | deny | deny | allow | allow |
| lead PII read/update | deny | deny | deny | allow | allow |
| `lead-deliveries` read | deny | deny | deny | allow | allow |
| `lead-deliveries` create/update | deny | deny | deny | deny | allow |
| `lead-deliveries` delete | deny | deny | deny | allow | allow |
| `POST /api/lead-deliveries/:id/retry` | deny | deny | deny | allow | deny as HTTP actor |

Public lead creation остаётся отдельной capability `POST /api/public/leads`.
Она валидирует intake и сохраняет lead/outbox через именованный System Gateway;
generic Payload CRUD не является public или admin fallback.

Manual retry сначала проверяет owner на collection endpoint, затем выполняет
delivery state transition через `owner-lead-delivery-retry` System Gateway.
Прямой generic update delivery state запрещён даже owner.

## Причины

- Lead содержит наиболее чувствительные PII проекта.
- Delivery row принадлежит системной state machine, а не общему Admin CRUD.
- Роль `admin` не должна неявно получать owner capability.
- System actor — именованный trusted path с `overrideAccess`, а не пользовательская роль.

## Проверка

`verify:security-boundaries`, `verify:owner-operations` и реальная PostgreSQL
integration matrix проверяют anonymous/editor/admin/owner/system для коллекций,
PII и manual retry.
