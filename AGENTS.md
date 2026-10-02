# Союз застройщиков Ростов

## Project router

- Контур: Windows 11, SourceCraft primary.
- Client: `Союз застройщиков`, город Ростов-на-Дону.
- Package/runtime identity: `souz-rostov-realty`.
- Platform: AMS Realty Platform Core Standard 5.5, `AMS_PROFILE=REALTY_BASE`, режим `BUILD`.
- Delivery: `COMMERCIAL`.
- Backend/data owner: Payload CMS + PostgreSQL; Prisma и второй backend/auth запрещены.
- Runtime project kind: `client` (`src/project/site.config.ts`).
- Final public domain: `souz-home.ru`.
- Timeweb technical/staging host: `soyuz-rostov.tw1.ru`.
- Production indexing: currently `noindex` until owner cutover decision from old live site to this project.
- Secrets source of truth: Secret Master, self-hosted Infisical `https://infisical.ams24.ru`; values must never be printed.
- Server access: SZ Rostov / `szrostov` (`szrostov-server/prod`), Timeweb Cloud.

## Reading order

1. `docs/README.md`.
2. `AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md`.
3. `AMS_UI_CORE_v5.0_FINAL.md` for UI scope.
4. `docs/PROJECT.md`, `docs/OPERATIONS.md`.
5. `docs/01_PRD.md`, `02_PRODUCT_STRUCTURE.md`, `03_ARCHITECTURE.md`.
6. `docs/04_BACKLOG.md`, `05_RELEASE_CHECKLIST.md`.
7. `docs/DESIGN.md` and relevant deploy docs under `deploy/clients/timeweb/`.
8. ADR/module/research document only when in scope.

## Invariants

- Один независимый stream = одна branch/worktree = один Pull Request.
- Repository mode: SourceCraft primary. GitHub mirror only if explicitly requested.
- Production deploy, DNS cutover, production DB migration/rollback and indexing promotion require separate explicit owner command.
- Public UI/API receives data only through Gateway/DTO. Payload Admin remains CMS-native.
- Runtime secrets, DB credentials, SSH keys, API tokens and env files live only in Secret Master / server root-only env files.
- Do not print `.env`, secret values, DB URLs with credentials, private keys or tokens.
- `souz-home.ru` is canonical final domain; `soyuz-rostov.tw1.ru` is technical host for server validation/staging.
- Until final cutover from the old site, keep noindex safeguards for technical host and generated project indexing.
- New infrastructure/module/dependency is added only by proven trigger and documented decision.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
