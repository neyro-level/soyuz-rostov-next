# Clone onboarding

Этот репозиторий — демо-шаблон AMS Realty Baza, а не готовый коммерческий
сайт клиента. Переход между стадиями выполняется явно; demo-топология не
становится клиентской по умолчанию.

## A. Starter demo

```text
projectKind: starter-demo
host: AMS Server
database: local PostgreSQL on the same server
storage: persistent MEDIA_DIR
jobs: one runtime, JOBS_AUTORUN=true
domain: start-baza.ams24.ru, noindex
```

Это owner-operated verification contour. Его Nginx/Compose и локальное
хранилище относятся только к starter demo.

## Client Master Plan baseline

Новый client Master Plan до импорта в Task Manager обязан зафиксировать оба
неизменяемых значения:

```text
Starter tag: starter-v2.MINOR.PATCH
Starter SourceCraft SHA: <exact 40-char SHA resolved from that tag>
```

Tag, SHA и release manifest должны описывать один опубликованный release.
`main`, `origin/main`, branch name, `latest` или directory snapshot не являются
допустимым baseline. Если tag ещё не опубликован либо SHA не совпал, подготовка
плана и clone останавливается.

## B. One-day client clone checklist

Этот маршрут выполняется последовательно. Переход к следующему шагу разрешён
только после проверки output текущего. Неизвестное решение — `STOP`, а не
скрытый default. Исходная точка — отдельный clean repository на опубликованном
`starter-v2.MINOR.PATCH` с release manifest того же tag/SHA. Непубликованный
target и moving `main` использовать запрещено. Текущий released-tag status
проверяется по `STARTER_RELEASE_STATE.md`.

### 1. Intake

- Input: утверждённый JSON вне Git по `docs/CLONE_INTAKE.schema.json`; пример —
  `docs/CLONE_INTAKE.souz.json`. Обязательны brand/domain, NAP, режим рынка,
  города и морфология, районы, статусы категорий, legacy URL, indexing и
  client-readiness решения.
- Command: `pnpm clone:init --intake=C:/secure/client-intake.json`.
- Output: `client-intake.preset.json` schema v3 и
  `client-intake.defaults-diff.json` с hash входа/preset.
- STOP: пропущенное owner-решение, v1/v2, synthetic production evidence или
  секрет в intake. Исправить intake и повторить; generated preset вручную не
  дополнять.

### 2. Prepare

- Input: clean checkout exact released tag, preset, exact 40-char SHA и release
  manifest из опубликованного release package.
- Command:
  `pnpm clone:prepare --preset-file=C:/secure/client-intake.preset.json --source-tag=starter-v2.MINOR.PATCH --source-sha=<exact-tag-sha> --release-manifest=C:/secure/starter-v2.MINOR.PATCH.manifest.json`.
- Output: client identity, SiteProfile, brand primitives, SEO seed,
  `docs/CLIENT_BOOTSTRAP.json`, provenance и generated-output hashes; demo
  fixture runtime удалён. Повтор с тем же preset — no-op.
- Check: `pnpm verify:clone-bootstrap`.
- STOP: tag не опубликован, SHA/manifest/hash не совпали, worktree dirty,
  protected `src/core/**`, `packages/**`, migrations или guards изменились.

### 3. Activate storage

- Input: утверждённая client topology и отдельные client Secret Master/Timeweb
  resources; значения секретов не попадают в Git или командную строку.
- Command: `pnpm clone:activate-timeweb-storage`.
- Output: version-pinned S3 adapter и client-owned storage config; повтор —
  безопасный no-op. В режиме `client + timeweb-s3` runtime требует S3 keys из
  Secret Master и не требует `MEDIA_DIR`; starter demo остаётся на `MEDIA_DIR`.
- STOP: topology не утверждена, нет отдельного bucket/credentials или команда
  пытается изменить starter demo runtime.

### 4. Seed geography and NAP

- Input: отдельная пустая client PostgreSQL, process-local runtime env из Secret
  Master и prepared bootstrap.
- Command: `pnpm clone:seed-geo`.
- Output: идемпотентные region/cities/typed districts и обязательные публичные
  NAP-настройки без demo fallback.
- STOP: target DB identity неизвестна, parent/type/morphology невалидны или
  повтор создаёт дубликаты.

### 5. Import demand

- Input: owner-approved CSV `url,phrase,value,snapshotDate` с реальным
  источником/датой; URL должны точно принадлежать generated draft registry.
- Command: `pnpm seo:registry:import-demand --file=C:/secure/client-demand.csv`.
- Output: измеренные значения в `docs/seo/SEO_REGISTRY_SEED.csv`; повтор того же
  файла — no-op.
- STOP: synthetic/fallback evidence, чужой URL, duplicate, неверная дата или
  изменение schema.

### 6. Approve

- Input: проверенная морфология, canonical URL/template key и owner decision.
- Command:
  `pnpm seo:registry:approve --scope=all-measured --actor=<owner> --reason=<decision>`.
- Check: `pnpm seo:registry:approvals:check`, затем
  `pnpm seo:registry:generate` и `pnpm seo:registry:check`.
- Output: append-only approval journal и детерминированная runtime projection.
- STOP: строка без измерения, synthetic evidence или неутверждённая морфология.

### 7. Verify and deployment handoff

- Commands: `pnpm install --frozen-lockfile`, `pnpm verify:daily`,
  `pnpm verify:client-readiness`; для DB recovery contract также
  `pnpm verify:db-restore-drill` и инструкция
  `deploy/clients/timeweb/backup/README.md`.
- Output: clean committed client tree, local validation evidence, immutable
  candidate SHA и заполненный staging checklist.
- STOP: любая красная проверка, SKIPPED required DB suite, неизвестная backup
  provenance, непроверенный TLS/S3/jobs-owner contract или dirty tree.
- Deploy не выполняется этой инструкцией. После отдельной команды владельца
  `Выпускаем production` используется project-specific release workflow из
  canonical `main`, exact immutable artifact, rollback и live smoke. Эта фраза
  является human gate, а не package script и не разрешена самим onboarding.

Проверяемая clone matrix включает Souz, `NEWBUILD_FIRST`, `SECONDARY_FIRST`,
`MULTI_GEO` и профиль typed districts + legacy. `pnpm verify:clone-matrix` —
редкий локальный acceptance-check переносимости, а не ежедневная команда и не
production proof.

## C. Client Timeweb staging

Статический reference package: `deploy/clients/timeweb/README.md`. Его файлы
нужно скопировать и адаптировать в client clone; они не являются вторым runtime
starter и не доказывают доступ к реальному Timeweb.

- отдельный Timeweb VPS или другой явно одобренный runtime;
- отдельная Timeweb Managed PostgreSQL;
- отдельный Timeweb S3-compatible Object Storage;
- Payload media подключена командой `pnpm clone:activate-timeweb-storage`;
- изображения фидов остаются внешними URL, если нет отдельного решения;
- ровно один jobs-active runtime;
- Nginx, отдельный staging-домен и staging-секреты;
- staging закрыт от индексации явным решением проекта;
- настроены автоматический backup и внешнее наблюдение.

Перед staging: заполнить runtime env и выполнить
`pnpm verify:client-readiness`.

До первого реального feed отдельно выбрать parser и host, зафиксировать
`EXTERNAL_IMAGE_HOSTS`, refresh interval, safety threshold и maximum
deactivations. Первый полный staging import создаёт baseline и не должен
массово деактивировать записи.

## D. Client Timeweb production

Client production default follows Core 5.5:
Timeweb Managed PostgreSQL + Timeweb S3-compatible Object Storage.
Deviation requires explicit owner decision + ADR where Core requires it.

Production требует клиентский домен, утверждённые правовые тексты, явное
решение об индексации, retention для лидов/архива, точные host allowlists,
один jobs-active runtime, Nginx, automatic backup и external monitoring.
Решение записывается как `productionIndexing = public | noindex`; для `public`
domain обязан совпадать с canonical runtime origin, а legal content иметь статус
`approved`. Client Nginx placeholder `__INDEXING_X_ROBOTS_TAG__` заменяется на
noindex header либо удаляется для public-контура.
Starter `start-baza` Compose/Nginx и `MEDIA_DIR` не являются клиентским
production target/source of truth.

Перед release обязателен `pnpm verify:client-readiness`. Сам release и любая
закупка инфраструктуры выполняются только отдельной командой владельца.

До client production дополнительно доказать: real S3 upload, Managed PostgreSQL
migrations, restore drill, PII retention, выбранные lead channels, одного jobs
owner, frozen URL schema, осознанное indexing decision, performance baseline,
immutable artifact exact SHA и rollback point.

Канон starter demo: `docs/adr/ADR-LOCAL-STARTER-STORAGE.md`,
`docs/PROJECT.md`, `docs/OPERATIONS.md`.
