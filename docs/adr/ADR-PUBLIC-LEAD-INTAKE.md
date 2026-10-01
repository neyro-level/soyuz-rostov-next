# ADR-PUBLIC-LEAD-INTAKE

Статус: Accepted  
Дата: 2026-09-18  
Контекст: public lead intake + transactional outbox

## Решение

Публичная способность создать заявку:

```text
POST /api/public/leads
```

Generic Payload REST/Local API `leads.create` закрыт для пользовательских ролей. Это не public create коллекции: запись разрешена только classified route через именованный System Gateway.

Транзакционная запись lead + enabled `lead-deliveries` идёт через System Gateway `overrideAccess` в `createPayloadLeadOutboxRepository`. Анонимный Local API create без gateway запрещён.

Sweeper `recoverLeadDeliveries` — primary scheduler. Immediate `deliverLead` enqueue после commit — ускорение: ошибка enqueue не откатывает lead.

Idempotency: browser создаёт UUID `requestAttemptId`; exact retry сохраняет тот же attempt ID, новая осознанная отправка получает новый. Server строит unique `lead:<requestAttemptId>`.

Fraud fingerprint: keyed HMAC по `PAYLOAD_SECRET`, без raw IP/UA.

## Extended attribution contract

The runtime intake contract adds `legal`, `development_price` and `quiz` plus an
optional normalized `context` (`geo`, `surface`, `district`, `propertyUrlId`,
`development`, `developer`). Context is attribution only: it never authorizes a
read, replaces a canonical entity, or creates another lead backend/outbox.

This is classified `RISKY auth-pii-leads`. The additive migration extends the
existing enum/table and has a guarded down path: rollback succeeds while the new
fields are unused, but stops before data loss when an extended lead exists.

Analytics is a separate provider-neutral event contract. It has a strict event
and dimensions allowlist, an automated PII-key guard, a test sink and a project
no-op adapter. No vendor, browser runtime or analytics persistence is enabled by
this decision.

Канал включается только если он перечислен в `LEAD_CHANNELS`, заданы credential refs и непустой `LEAD_OUTBOUND_HOSTS`. Значения секретов не хранятся в Git.

## Почему

Конституция 5.5 требует public capability без открытия generic Payload CRUD. Outbox обязан быть transactional; доставка не должна зависеть от процесса, пережившего HTTP-ответ.
