# AMS Realty Baza Starter - карта документации

Статус: `ACTIVE / CURRENT CANON`.

SourceCraft - primary repository. GitHub - one-way mirror only. Текущий SHA,
ветку и mirror equality нужно проверять командами Git/SourceCraft, а не выводить
из старых планов или отчётов.

## Source of Truth

| Вопрос | Документ |
|---|---|
| Цель, пользователи и границы продукта | `01_PRD.md` |
| Публичные URL, surfaces и content ownership | `02_PRODUCT_STRUCTURE.md` |
| Архитектура, stack, security, delivery profile | `03_ARCHITECTURE.md` |
| Текущие приоритеты, blockers и owner gates | `04_BACKLOG.md` |
| PR, merge и release условия | `05_RELEASE_CHECKLIST.md` |
| Release state: tag, live proof, runtime versions | `STARTER_RELEASE_STATE.md` |
| Project-specific решения starter instance | `PROJECT.md` |
| Canonical UI Core | `../AMS_UI_CORE_v5.0_FINAL.md` |
| Project Design System, design tokens и визуальный контракт | `DESIGN.md` |
| Demo/runtime operations | `OPERATIONS.md` |
| Client clone onboarding | `CLONE_ONBOARDING.md` |
| Geo/catalog URL, status, resolution, lifecycle | `platform/GEO_CATALOG_CONTRACT.md` |
| Reusable platform boundary | `adr/ADR-PLATFORM-LAYOUT.md` |
| Future upstream candidates | `UPSTREAM_CANDIDATES.md` |

## Порядок чтения для AI

1. `../AGENTS.md`.
2. `../AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md`.
3. `../AMS_UI_CORE_v5.0_FINAL.md` для UI-scope.
4. Этот файл.
5. `01_PRD.md`, `02_PRODUCT_STRUCTURE.md`, `03_ARCHITECTURE.md`.
6. `04_BACKLOG.md`, `05_RELEASE_CHECKLIST.md`, `STARTER_RELEASE_STATE.md`.
7. `PROJECT.md`, `DESIGN.md`, `OPERATIONS.md` по scope.
8. ADR, module manifest или research только если они прямо входят в задачу.
9. `package.json`, код, migrations и runtime config как фактическая реализация.

## Current state

- Активной implementation queue нет.
- `DELIVERY_PROFILE=COMMERCIAL`: перед merge в `main` нужен один ручной
  exact-head SourceCraft Gate.
- Новый immutable `starter-v2.MINOR.PATCH` tag не создан.
- Production/release не выполняются без отдельной явной команды владельца.
- Client clone начинается только от immutable released starter tag и exact
  SourceCraft SHA этого tag.
- Новый AI-агент читает только актуальные Source of Truth из этой карты.

## Runtime truth

Документы описывают контракт. Фактическое состояние проверяется через:

- `package.json` и `pnpm-lock.yaml` для версий;
- `src/project/**`, `src/core/**`, `packages/**`, `migrations/**` для
  реализации;
- `.sourcecraft/ci.yaml` и SourceCraft API для gates;
- `git rev-parse HEAD`, `git rev-parse origin/main`,
  `git ls-remote github refs/heads/main` для SHA.
