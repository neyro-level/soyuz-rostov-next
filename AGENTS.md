# AMS Realty Baza Starter

## Project router

- Контур: Windows 11, SourceCraft primary.
- Platform: AMS Realty Platform Core Standard 5.5, `AMS_PROFILE=REALTY_BASE`,
  режим `BUILD`.
- Delivery: `COMMERCIAL`.
- Secrets source of truth: Secret Master, self-hosted Infisical
  `https://infisical.ams24.ru`; Doppler is legacy/import source only until old
  secrets are migrated.
- Backend/data owner: Payload CMS + PostgreSQL; Prisma и второй backend/auth
  запрещены.
- Активной implementation queue нет. Новые задачи начинаются отдельным
  branch/worktree от актуального SourceCraft `main`.
- Current release state, tag boundary, runtime versions and live-proof status:
  `docs/STARTER_RELEASE_STATE.md`.
- `start-baza.ams24.ru` - owner-operated demo/template verification contour on
  AMS Server. Runtime: local PostgreSQL + persistent `MEDIA_DIR`. S3 и Timeweb
  Managed PostgreSQL не являются starter runtime; клиентский clone принимает
  собственное topology decision (`docs/CLONE_ONBOARDING.md`).

## Reading order

1. `docs/README.md`.
2. `AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md`.
3. `AMS_UI_CORE_v5.0_FINAL.md` для UI-scope.
4. `docs/01_PRD.md`, `02_PRODUCT_STRUCTURE.md`, `03_ARCHITECTURE.md`.
5. `docs/04_BACKLOG.md`, `05_RELEASE_CHECKLIST.md`,
   `STARTER_RELEASE_STATE.md`.
6. `docs/PROJECT.md`.
7. `docs/DESIGN.md` or `docs/OPERATIONS.md` по scope.
8. Профильный ADR/module/research документ, только когда он входит в scope.

## Invariants

- Один независимый stream = одна branch/worktree = один Pull Request.
- Repository mode: `SOURCECRAFT_PRIMARY_GITHUB_MIRROR`. Ветки, PR, exact-head
  Gate, merge и будущий release tag принадлежат SourceCraft; GitHub получает
  только односторонний fast-forward mirror canonical SourceCraft `main`.
  Reverse/bidirectional sync запрещён.
- Git SHA и mirror equality проверяются через Git/SourceCraft, а не через
  устаревающие текстовые поля документации.
- Независимый reviewer / Task Manager Code Reviewer запускается только по
  явному триггеру владельца (`проведи review`, `аудит кода`, `позови
  ревьюера`) или для отдельно зафиксированного high-risk/high-complexity scope.
  Создание Pull Request и обычная READY-задача не запускают независимый review
  автоматически.
- Автономность не отменяет COMMERCIAL Gate и fail-closed stop при красных
  проверках или изменившемся SHA.
- Production выполняется только по отдельной явной команде владельца.
- Client Master Plan создаётся только от immutable released starter tag и exact
  40-character SourceCraft SHA этого tag; moving `main` не baseline.
- Новые пароли, API tokens, SSH keys, database credentials и service
  credentials хранятся только в Secret Master. Для доступа к секретам
  использовать trigger `подключись к секрет мастеру`; для Git-доступов
  SourceCraft/GitHub - trigger `подключись к гид-сервису`. Значения секретов не
  печатать в чат, markdown, логи или git.
- UI работает через замороженные presentation contracts и Public
  Gateway/fixture provider по режиму.
- Payload не диктует форму UI; public data проходит через Gateway и DTO.
- Новая инфраструктура или модуль добавляются только по доказанному trigger.
- Не заменять неизвестное решение догадкой: фиксировать `TODO` или
  `NEEDS_OWNER` в профильном документе.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
