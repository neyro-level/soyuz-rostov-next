# Starter Release State

Статус документа: `ACTIVE`.

Срез проверен: `2026-10-01`.

Контур: reusable AMS Realty starter; SourceCraft - primary, GitHub -
mirror-only.

Этот файл фиксирует текущие release boundaries и runtime версии. Текущий Git SHA
не хранится как ручное поле, потому что он меняется при каждом merge; его нужно
получать из Git/SourceCraft:

```powershell
git rev-parse HEAD
git rev-parse origin/main
git ls-remote github refs/heads/main
```

## Current state

| Поле | Текущее значение | Доказательство |
|---|---|---|
| Canonical SourceCraft repository | `integrator-p/ams-realty-baza-starter` | `origin` remote |
| Repository mode | `SOURCECRAFT_PRIMARY_GITHUB_MIRROR` | `AGENTS.md`, `03_ARCHITECTURE.md` |
| GitHub mirror | mirror-only; exact SHA equality must be checked by `git ls-remote github refs/heads/main` | Git remote state, not a manual doc field |
| AMS Realty Platform Core | `5.5` | `AMS_REALTY_PLATFORM_CORE_STANDARD_5.5_SOLO_AI_FINAL.md` and constitution lock |
| AMS UI Core | `v5.0` | `AMS_UI_CORE_v5.0_FINAL.md` and constitution lock |
| Runtime versions | Node `>=24.21.0 <25`; pnpm `11.28.2`; Next.js `16.3.8`; React `19.2.8`; Payload `3.90.2`; `@payloadcms/db-postgres` `3.90.2`; `@payloadcms/next` `3.90.2` | `package.json`, `.node-version`, `Dockerfile`, `.sourcecraft/ci.yaml` and `pnpm-lock.yaml` |
| Ownership manifest | `starter-owned.json`, `schemaVersion: 2` | committed manifest |
| Current immutable released starter tag | `NOT CREATED` | Release tag creation requires a separate owner release command |
| Released tag SHA | `NOT CREATED` | No current immutable release tag |
| Open P0 | `0` known | `docs/04_BACKLOG.md` active blocker registry |
| Open P1 | `0` known | `docs/04_BACKLOG.md` active blocker registry |
| Open P2 | `0` known | `docs/04_BACKLOG.md` active blocker registry |
| Production/live proof | `NOT RUN / NOT AUTHORIZED` for the current moving main | Production, release tag and live proof require separate owner command |

## Release boundary

Moving SourceCraft `main` is not an immutable commercial starter release. A
client project may start only from a released `starter-v2.MINOR.PATCH` tag and
its exact 40-character SourceCraft SHA.

The release command must create the tag from clean canonical SourceCraft `main`,
build an immutable artifact, run one rollout, confirm live smoke, and preserve a
rollback point. Production and release are not inferred from merge, GitHub mirror
or the existence of the demo contour.

## Update rule

Update this document when a stable release-state fact changes: Core/UI/runtime
versions, ownership schema, released tag, live proof, production boundary or
active severity registry. Do not add old plan histories or per-merge chronologies
back into this file.
