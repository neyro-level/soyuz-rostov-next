# Project Design System

Статус: `Active / REALTY_BASE / Project Design System`.

Этот документ описывает project-owned visual system starter instance. Он не
заменяет каноническую UI-конституцию. Канонический UI Core зафиксирован в
`../AMS_UI_CORE_v5.0_FINAL.md` и SHA-locked через
`../config/ams-constitution.lock.json`.

## Theme

Dark theme: DISABLED.

`--surface-dark` and `--surface-dark-strong` are lightbox, overlay and inverse-footer tokens inside the light theme. Root `html` has no `dark` class. Tailwind `@custom-variant dark` remains unused by starter public routes.

## Характер

Цель — visual parity with Atlas при архитектурной очистке. Это не редизайн. Изменение визуального решения требует явного owner approval.

Anti-goals: новый visual language без owner approval; вторая primitive foundation; raw hex/rgb в компонентах; wildcard image hosts; хранение десятков мегабайт скриншотов в каждом clone.

## Source of truth

`src/app/globals.css` is the runtime factual design-value owner. Clone
preset/intake remains the client-owned input for generated project values.
`src/project/brand.css` is deprecated compatibility only and has no runtime
design-value authority.

Brand primitives генерируются из approved preset schema v3 при подготовке
snapshot clone. `starter:upgrade` не превращает client brand в starter-owned
слой: ownership определяется `starter-owned.json` schema v2, а конфликт
останавливает upgrade без тихой перезаписи.

Другой CSS может описывать grid, flex, positioning, sizing relationships и responsive composition, но получает design values через `var(--*)`. Component-specific literals не образуют второй набор токенов.

## Token taxonomy

| Class | Meaning |
|---|---|
| BRAND | `--brand-*` values generated from clone preset/intake into the marked runtime block in `globals.css`. Components consume semantic/component tokens, not brand primitives directly. |
| CORE | Required runtime tokens enforced by `scripts/quality/design-tokens.mjs` (`--background`, section rhythm, radii, motion, fonts). |
| SHADCN | `@theme inline` mappings that expose CORE/PROJECT values to Tailwind utilities. |
| PROJECT | Starter/Atlas page tokens with live `var(--*)` usage in `packages/ui` or `src`, including live corporate prefixes `about-company`, `sale`, `new-building`. |
| MODULE-RESERVED | None in this starter. Unused future-module prefixes without a `docs/modules/` contract are not reserved. Journal DTO remains contract-only in `packages/contracts` without unused CSS tokens. |
| DEAD | No `var(--token)` and not a `@theme` key and not MODULE-RESERVED. Guard requires count = 0. |

ACTIVE = CORE ∪ SHADCN ∪ PROJECT. Documented RESERVED is not dead.

### Module token reservations

A reservation is valid only when the module has a manifest in `docs/modules/`,
its state is documented in `docs/PROJECT.md`, and a row below explicitly names
the token prefix. No family is reserved in the current starter.

<!-- MODULE_TOKEN_RESERVATIONS_BEGIN -->
| Module | Token prefix |
|---|---|
<!-- MODULE_TOKEN_RESERVATIONS_END -->

`pnpm tokens:report` exposes the same analyzer as the fail gate. Supported
options: `--format=table`, `--format=json`, `--dead-only`, `--explain=<token>`.
The command is report-only and never deletes CSS.

## Page-level CSS policy

Reusable visual rhythm goes through tokens and `Section` / `Container` variants. Page CSS may keep geometry (grid, flex, positioning, responsive relationships, intrinsic sizing). Forbidden: a second control pattern (`.home-btn-primary`); journal tokens outside journal module files.

## Geometry vs design-values

Runtime factual design values live in `globals.css`. Brand primitives are
generated into the marked `CLONE_BRAND_VALUES` block in `globals.css`; the
deprecated `brand.css` compatibility stub must not define runtime custom
properties or be imported. Semantic/component colors, type sizes, weights,
derived radii, shadows and durations remain in `globals.css`; accent shadows may
derive from `--brand-*` values through `color-mix()`. Neutral/effect raw RGB
values follow the explicit guard allowlist. Component CSS consumes only semantic/component
variables. Repeated section spacing uses `--section-space-*` /
`--site-section-space-desktop`.

Typography scale consolidation preserves role names while aliases replace only
values whose source difference is below `0.5px`. The mechanical guard records
each approved alias and rejects a larger source delta; distinct display/process
sizes remain when collapsing them would cross that limit or alter composition.

## Font contract

- family: allowlisted Manrope/Inter/Roboto через generated
  `src/project/font.generated.ts`, который подключает `next/font/google`;
- subsets: `cyrillic`, `latin`; loading mode: `display: swap`;
- runtime variable: `--font-project`; `--brand-font-sans` владеет approved family
  plus system fallback, а semantic `--site-font-family` и Tailwind `--font-sans`
  получают это значение через mapping;
- weights: variable font, без отдельного списка загружаемых static weights;
- license: [SIL Open Font License 1.1 upstream](https://github.com/google/fonts/blob/main/ofl/manrope/OFL.txt);
  файл шрифта self-hosted сборкой Next.js, runtime-запрос к Google Fonts не
  является контрактом;
- system stack остаётся только fallback, не основной визуальный font claim.

## Approved exceptions

- Neutral/effect RGB bases outside brand primitives are limited by
  `neutralEffectRgbAllowlist` in `scripts/quality/design-tokens.mjs`; burgundy
  accent/danger RGB is never allowlisted outside the generated globals block.

- Feed images Variant B (unoptimized + allowlist), see Media.
- Atlas donor `home-page.css` удалён из live package source; starter public home
  composes domain-owned Tailwind/shadcn views.
- Visual deviations vs Atlas donor: simpler starter shell/cards are report-only
  unless owner approves a redesign.

## Representative pages and viewports

Pages: `/`, `/primorsk/kvartiry/`, `/novostroyki/zhk-severnyy-bereg/`, `/uslugi/`.
Viewports: `390×844`, `768×1024`, `1280×900`, `1440×1000`.
Browser proof for future UI changes must cover the representative pages and
viewports above. Bulk PNG artifacts stay outside the starter clone unless a
specific owner-approved task requires checked-in visual fixtures.

### Canonical UI Core v5 acceptance matrix

| Surface | Required states |
|---|---|
| Listing | default, active filters with reset, empty result, pagination previous/current/next |
| Development | fresh and stale price, sales finished, optional layouts/progress/FAQ anchors |
| Lead | default, invalid, submitting, server error, success; typed non-PII analytics dimensions |
| Responsive | all representative pages at the four canonical viewports; one `h1`, no horizontal overflow |

The canonical browser proof also checks that visible internal links do not
resolve through redirects or 404 responses. Optional sections are linked only
when rendered. Sales-finished projects expose an explicit status and never
present stale price rows as current offers.

## Visual baseline provenance

Local Atlas donor: SourceCraft `integrator-p/atlas-realty-starter`, exact `main@4fc5d8a2cfcd29b1431ce9541db72ba0280a4cbe`, `SITE_ENGINE=fixture`. Inventory: `docs/research/ATLAS_BASELINE.md`. Capture PNGs live in donor/external storage, not in this starter clone.

## Allowed specialized UI dependencies

`embla-carousel-react`, `yet-another-react-lightbox`, Lucide, Radix/shadcn primitives already in `packages/ui`. New specialized UI deps need a project trigger.

Icon ecosystem: only `lucide-react`; do not add a second icon pack. The exact
installed version is owned by `pnpm-lock.yaml`, not by a long-lived Design
System family claim.

### Clone portability guard

- Public UI package API is closed to `.`, `./primitives`, `./views` and
  `./styles.css`; internal component and utility paths are not public contracts.
- `plain` is an explicit escape hatch only: A = behavior primitive, B = proven
  repeated visual pending a semantic variant, C = justified one-off. The
  checked ceiling may only decrease unless an owner-approved design-system
  decision documents a new exception.
- Repeated visual groups move to named semantic variants. Current proven groups
  are `cardMedia` buttons and `catalogRange` inputs.
- `pnpm ui:clone-audit` is report-only and inventories donor views, project
  token families, dead tokens, `plain` uses, package exports and page CSS.
- Token deletion is allowed only for entries reported as `DEAD`; the current
  audit has no dead token to delete. Page-owned CSS remains co-located with its
  owning view and is not exposed as a package subpath.

## Компоненты и композиция

- порядок: `REUSE -> VARIANT -> CREATE`;
- shadcn/ui — единственная primitive foundation;
- `Container`: `narrow | site | wide`;
- `Section`: `sm | md | lg | hero`;
- Server Component по умолчанию, client component — интерактивный leaf;
- page compositions принадлежат domain folders `views/home`, `views/catalog`,
  `views/property`, `views/marketing`; публичные exports идут через
  `packages/ui/src/views.ts`;
- `react` и `react-dom` объявлены peer dependencies `packages/ui`;
- одна логическая `h1`, видимый focus, keyboard navigation, labels/errors, alt и reduced motion обязательны.

## Media и motion

UI использует storage-neutral `MediaDTO`. Для изображений задаются stable aspect ratio, `sizes`, lazy loading ниже critical area и fallback. Target: mobile LCP не хуже 2.5 s, CLS не выше 0.1. Motion по умолчанию — CSS/Tailwind transform/opacity с `prefers-reduced-motion`; icons — Lucide.

Feed image rendering: **Variant B** for the one-server starter. External feed
photos stay `unoptimized` with exact `EXTERNAL_IMAGE_HOSTS` allowlist, `sizes`,
explicit aspect ratio, lazy below fold and `fetchPriority=high` on the LCP
candidate. Local `/media` CMS files may use Next optimizer. Next
`images.remotePatterns` are generated from the same `parseAllowedImageHosts`
source as ingest validation; wildcards are forbidden. Safe outbound image fetch,
if added, must use `getApprovedImageOutboundHosts()`.
