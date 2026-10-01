# Release Checklist

Статус: `ACTIVE RELEASE CONTRACT / NO CURRENT RELEASE AUTHORIZATION`.

Текущие release boundaries, tag status, runtime versions и live-proof status
читаются из `STARTER_RELEASE_STATE.md`. Owner-operated demo contour существует,
но сам по себе не доказывает текущий SHA. PII retention days остаются
`NEEDS_OWNER` до client/release decision.

## Перед Pull Request

- scope соответствует одному workstream и одному worktree;
- source documents и runtime не имеют известного незафиксированного drift;
- релевантные локальные проверки завершены;
- секреты, PII и generated artifacts не попали в diff;
- новые или изменённые секреты заведены в Secret Master, а не в Doppler, git,
  markdown или logs;
- rollback impact описан, если изменение затрагивает runtime/data.

## Перед merge

- PR основан на актуальном SourceCraft `main` и не содержит чужого scope;
- полный diff просмотрен;
- риск классифицирован как `STANDARD` или `RISKY`;
- `STANDARD` запускает `pnpm verify:merge-standard`;
- `RISKY` выбирает ровно один `risk_scope` и запускает STANDARD плюс
  соответствующий targeted proof;
- safe isolated test DB и zero skipped required suites обязательны только для
  `schema-data`, `auth-pii-leads` и `ingest-jobs`;
- build выполняется только для `dependency-runtime`;
- один ручной SourceCraft Merge Gate зелёный на exact head SHA;
- все блокеры исправлены.

## Перед production

- есть отдельная команда владельца на release;
- SourceCraft canonical `main` чистый, итоговый SHA известен, GitHub не
  используется как release source;
- target domain для internal production: `start-baza.ams24.ru`, режим
  `noindex`;
- server identity, owner-approved local PostgreSQL on AMS Server and runtime env
  file permissions are confirmed without moving secrets into git/logs;
- S3 не требуется для starter; media = `MEDIA_DIR`;
- staging обязателен для migration, parser/source identity, auth/access и major
  upgrade;
- migration, backup/restore, jobs ownership и rollback проверены по риску;
- готов immutable Docker artifact из exact `main`; build на production host
  запрещён;
- production secrets берутся из Secret Master; Doppler допустим только как
  временный legacy/import source для ещё не перенесённых значений;
- после rollout выполнен live smoke изменённого сценария;
- production URL, health и rollback point зафиксированы.

Live demo infrastructure on AMS Server exists (`start-baza.ams24.ru`).
Checklist PASS for a given SHA requires immutable image + live smoke on that SHA,
not only the existence of the contour.
