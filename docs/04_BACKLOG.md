# Backlog

Статус: `ACTIVE / NO ACTIVE IMPLEMENTATION QUEUE`.

## NOW

- Активной implementation queue нет.
- Поддерживать текущий канон документации, runtime и clone boundary без
  скрытого расширения scope.
- Любая новая реализация начинается с Task Contract и отдельного branch/worktree
  от актуального SourceCraft `main`.
- Current release/tag/live-proof status читать в `STARTER_RELEASE_STATE.md`.
- Production не выпускался в рамках текущего документационного состояния.
- Active blocker registry: `P0=0`; `P1=0`; `P2=0`.

## NEXT - только по команде владельца

- Создать новый immutable `starter-v2.MINOR.PATCH` release tag.
- Выполнить release starter demo на `start-baza.ams24.ru`: immutable artifact,
  rollout, live smoke и rollback point.
- Синхронизировать GitHub mirror после SourceCraft `main`, когда это явно
  входит в рабочую команду владельца.
- Начать client clone только из exact released tag + SourceCraft SHA и
  утверждённого preset schema v3.
- Для client production определить реальные `leadRetentionDays`,
  `archiveRetentionDays`, legal/indexing и topology decisions.

## LATER / trigger-based

- Личный кабинет, Redis, broker, PostGIS, отдельный search engine, второй jobs
  runner и multi-currency.
- Live provider proof Timeweb Managed PostgreSQL/S3 для конкретного client clone.
- Performance/RUM и реальные delivery-channel проверки для конкретного
  release/client scope.

## Delivery policy

- Один approved delivery stream = одна branch/worktree = один Pull Request.
- `DELIVERY_PROFILE=COMMERCIAL`: перед merge обязателен review и один ручной
  exact-head SourceCraft Gate выбранного риска.
- SourceCraft - primary; GitHub получает только явный fast-forward mirror
  canonical `main`.
- Production и tag требуют отдельных команд владельца.
