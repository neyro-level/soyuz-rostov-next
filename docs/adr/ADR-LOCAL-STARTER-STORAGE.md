# ADR-LOCAL-STARTER-STORAGE

Статус: Accepted (demo/template only)  
Дата: 2026-09-18  
Контекст: AMS RealtBase Starter / `AMS_PROFILE=REALTY_BASE`

## Решение

Этот ADR описывает **демо-проект** на AMS Server. Коммерческий clone не копирует эту topology автоматически.

Этот репозиторий живёт на одном AMS Server:

- PostgreSQL local — постоянный канон, не «пока не купим Managed PostgreSQL»;
- Payload Media в persistent host directory (`MEDIA_DIR`), не `@payloadcms/storage-s3`;
- один application runtime с `JOBS_AUTORUN=true`.

Закупка Timeweb Managed PostgreSQL и S3 для этого репозитория закрыта. Это не stopgap и не backlog-задача.

## Почему

Owner-operated demo не требует отдельную платную managed-инфраструктуру. Нужны проверяемые backup/restore и jobs ownership на уже существующем сервере.

## Сохраняется

Storage Boundary abstraction в коде. Адаптер object storage в этот репозиторий не добавляется.

## Последствия

- Disk-full — critical condition; backup обязан иметь offsite/второй носитель.
- Production client rollout не копирует эту topology автоматически.
