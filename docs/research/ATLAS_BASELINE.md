# Atlas visual baseline evidence

> **REFERENCE / NOT NORMATIVE / NOT CLONE ONBOARDING.** Этот файл хранит
> provenance и историческое visual evidence. Активные решения находятся в
> `docs/DESIGN.md`, а порядок клонирования — в `docs/CLONE_ONBOARDING.md`.

Статус: `SOURCE FIXED / INVENTORY COMPLETE / CAPTURE COMPLETE`.

## Donor identity

| Параметр | Значение |
|---|---|
| Source | local Atlas checkout |
| Canonical repository | SourceCraft `integrator-p/atlas-realty-starter` |
| Branch | `main` |
| Exact commit | `4fc5d8a2cfcd29b1431ce9541db72ba0280a4cbe` |
| Проверка | local `HEAD` равен `origin/main`, tracked state clean |
| Режим данных | deterministic `SITE_ENGINE=fixture` |
| Locale / theme / motion | `ru-RU` / light / reduced motion |

Donor фиксируется как visual/UX reference и источник presentation patterns. Его Payload schema, migrations, data access, jobs, deployment и tenant-specific данные не переносятся.

## Viewports

| Роль | Размер |
|---|---|
| mobile | `390 × 844` |
| tablet | `768 × 1024` |
| desktop | `1280 × 900` |
| wide desktop | `1440 × 1000` |

Размеры совпадают с `playwright.visual.config.ts` exact donor commit.

## Representative capture contract

| Сценарий | Donor route / state |
|---|---|
| Главная | `/` |
| Каталог | `/nedvizhimost` |
| Карточка объекта | `/obekty/svetlaya-kvartira-v-centre` |
| Коммерческая страница | `/promo/stroitelstvo-domov` |
| Контакты | `/kontakty` |
| Lead modal | `/`, открыть canonical request modal и показать validation state |

Дополнительные Atlas visual tests могут использоваться как evidence, но не расширяют обязательный набор без отдельного решения.

## Reproduction contract

1. Использовать только exact commit из таблицы.
2. Запускать donor в fixture mode через его `playwright.visual.config.ts`; production или client DB не использовать.
3. Перед capture подтверждать clean tracked state и равенство `HEAD = origin/main` для зафиксированного commit.
4. Снимать все обязательные сценарии во всех четырёх viewport.
5. Хранить screenshot manifest с route, viewport, donor SHA и временем capture.

## Capture evidence

- Manifest: [`atlas-visual-baseline/manifest.json`](./atlas-visual-baseline/manifest.json).
- Результат: `24 / 24` full-page PNG, шесть сценариев во всех четырёх viewport.
- Donor: SourceCraft `integrator-p/atlas-realty-starter`, exact commit `4fc5d8a2cfcd29b1431ce9541db72ba0280a4cbe`.
- Capture: `2026-09-15T16:26:55.496Z`, self-managed fixture server, `ru-RU`, light theme, reduced motion.
- Integrity: каждый файл имеет размер и SHA-256 в manifest; пустых файлов нет, все 24 хэша уникальны.
- Визуально проверены representative mobile home, tablet property, desktop lead validation modal и wide commercial service; layout и обязательные состояния читаемы.

Воспроизводимый capture выполняет `scripts/capture-atlas-visual-proof.mjs`. Путь donor передаётся через `ATLAS_DONOR_ROOT`, поэтому workstation-specific absolute path в repository не фиксируется.

## Классификация extraction

| Класс | Решение |
|---|---|
| `BASE` | переносимый presentation pattern, нужный профилю REALTY_BASE |
| `MODULE` | подключается только вместе с отдельным продуктовым модулем |
| `ATLAS-SPECIFIC` | tenant identity, copy, content, slug или application adapter Atlas; используется только как reference |
| `LEGACY` | compatibility/старый route или facade; не переносится как новый API |
| `DROP` | не входит в UI extraction RealtBase |

Классификация применяется ко всем элементам через явные path/group rules ниже. Неуказанный Atlas application code по умолчанию не переносится.

## Routes inventory

В Atlas найдено 17 записей canonical route registry и 26 public `page.tsx` entrypoints.

| Элементы | Класс | Решение |
|---|---|---|
| `/`, `/nedvizhimost`, `/obekty/[slug]`, `/kontakty`, public 404/error | `BASE` | сохранить роли страниц и composition patterns; slugs/copy заменить |
| dynamic root commercial pages (`/ipoteka`, продажа, юридические услуги и аналоги) | `BASE` | сохранить page patterns, но не Atlas content |
| `/novostroyki/**`, `/sotrudniki/**`, `/journal/**` | `MODULE` | включать только по trigger соответствующего модуля |
| `/otzyvy` | `MODULE` | employee/review surface; включать только вместе с соответствующим модулем |
| `/izbrannoe/**`, `/sravnenie`, `/promo/**`, `/spasibo` | `MODULE` | activation определяется Product Structure и реальным journey |
| `/legal`, privacy/cookie/consent pages, HTML/XML sitemap | `BASE` | реализовать только применимые legal/SEO routes по проектному контракту |
| exact tenant slugs, включая `/aura`, и Atlas promo copy | `ATLAS-SPECIFIC` | reference only |
| `/agents/**` и `/articles/**` compatibility redirects | `LEGACY` | не переносить; RealtBase использует собственный URL canon |
| sitemap archive/reserve operational pages | `DROP` | не нужны публичному foundation |

## Components and primitives

Atlas `@starter/site-ui` содержит 22 primitive files и 101 view file: 98 TSX-компонентов и 3 вспомогательных TS-файла.

| Элементы | Класс | Решение |
|---|---|---|
| accordion, aspect-ratio, badge, breadcrumb, button, card, carousel, checkbox, dialog, field, input, label, layout, scroll-area, select, separator, sheet, skeleton, slot, table, tabs, textarea | `BASE` | reference для project-owned shadcn foundation; перенос через inspect/adapt, не copy-all |
| `site-shell` (10), `shared` (3), `home` (8), `catalog` (9), `property` (14), `legal` (3) | `BASE` | сохранить semantic API, responsive/a11y и DTO boundary |
| `property/property-card-layout.types.ts`, `site-shell/site-header.types.ts` | `BASE` | типы presentation boundary |
| `corporate` (23): не-Employee и не-Careers commercial service views | `BASE` | reusable service patterns; copy и identity заменить |
| `new-building` (8), `journal` (12), `leadgen` (8), `corporate/Employee*`, `corporate/Careers*`, session collections | `MODULE` | не входят в BASE автоматически |
| `leadgen/leadgen-promo-final-cta.shared.ts` | `MODULE` | helper переносится только вместе с leadgen-модулем |
| Atlas application wrappers и content compositions | `ATLAS-SPECIFIC` | использовать как visual/composition reference; copy и identity не переносить |
| package root `.` umbrella export и wildcard subpath exports | `BASE` | donor reference; RealtBase public API is narrowed by actual consumers |
| Payload Admin components и backend/data/job UI из donor | `DROP` | CMS остаётся native; technical owner — Core 5.5 implementation |

## Client leaves

Atlas содержит 108 файлов с явным `use client`. Для каждого действует правило:

| Path family | Класс |
|---|---|
| `packages/site-ui/src/components/ui/**`, shared overlay, reusable home/catalog/property/gallery/shell/legal interaction и non-Employee/non-Careers corporate views | `BASE` |
| `packages/site-ui/src/views/new-building/**`, `journal/**`, `leadgen/**`, `corporate/Employee*`, `corporate/Careers*` | `MODULE` |
| `src/modules/analytics/**`, `employees/**`, `new-buildings/**`, `session-collections/**`, `leadgen/**` | `MODULE` |
| `src/components/**`, `src/app/**` и `src/modules/leads/**` tenant/application adapters | `ATLAS-SPECIFIC` |
| compatibility event/facade adapter, если он только поддерживает старый route/API | `LEGACY` |
| `src/core/**`, `src/payload/**` и прочие backend/operational client helpers | `DROP` |

Client boundary переносится только когда без него невозможны interaction, overlay, form, carousel, gallery или local browser state. Server Component остаётся default.

## CSS and tokens

| Файл | Класс | Решение |
|---|---|---|
| `packages/site-ui/src/theme.css` | `BASE` | source для inventory/normalization; не копировать token set вслепую |
| `packages/site-ui/src/styles.css` | `BASE` | reference import boundary |
| `packages/site-ui/src/styles/shell.css`, `site-footer.css`, `request-modal.css` | `BASE` | shared ownership patterns |
| `packages/site-ui/src/styles/home-page.css` | `BASE` | representative page pattern |
| `packages/site-ui/src/styles/journal.css` | `MODULE` | только с Journal |
| `packages/site-ui/src/styles/promo.css` | `ATLAS-SPECIFIC` | reference для commercial composition, не общий BASE stylesheet |
| `src/app/(site)/globals.css`, `src/app/styles/base.css` | `ATLAS-SPECIFIC` | application wiring Atlas; RealtBase сохраняет собственный `globals.css` |

Atlas semantic roles для color/surface/text/border/focus/status, typography,
containers, section rhythm, radii, media и motion входят в normalization input.
Numeric values остаются donor reference material; они не становятся RealtBase
tokens автоматически.

### Normalized CSS parity proof

Atlas geometry и visual treatment сохраняются без глобального загрязнения
route-owned styles: `shell.css`, `request-modal.css` и `site-footer.css`
подключаются через package root, а `home-page.css` и выделенный
`home-articles.css` экспортируются отдельно для маршрута главной. Скрипт
`pnpm visual:atlas-css-parity` сравнивает pinned Atlas до и после подключения
нормализованного CSS. Зафиксированный результат: 24/24 pixel-identical кадров
для шести сценариев на mobile, tablet, desktop и wide; machine-readable parity
data — `docs/research/atlas-css-parity.json`.

## Media inventory

| Элементы | Факт | Класс |
|---|---|---|
| `public/**` visual/font assets | 33 JPG, 4 PNG, 4 SVG, 42 WebP, 1 WOFF2 | neutral fallback/icon/font pattern — `BASE`; brand/city/people/content — `ATLAS-SPECIFIC` |
| `media/**` property/ЖК content | 655 WebP | `DROP` from extraction; tenant/demo data не переносится |
| gallery aspect, responsive `sizes`, lazy loading, fallback, lightbox behavior | storage-neutral pattern | `BASE` |

RealtBase media продолжает использовать `MediaDTO`; physical Atlas paths и photography не являются контрактом.

## DTO expectations

| RealtBase contract | Atlas evidence | Класс / действие |
|---|---|---|
| `PropertyCardDTO`, `PropertyDetailsDTO`, `PropertyListDTO` | card/detail/page/snapshot DTO и Zod schemas существуют | `BASE`; shape belongs to current Core 5.5 contracts |
| `PropertyFilterDTO` | query + 10 facet groups существуют | `BASE`; зафиксировано `filters only`, option counts не переносить |
| `MediaDTO` | donor в основном передаёт строки/локальные gallery shapes | `BASE GAP`; привести к `kind/src/alt/width/height` |
| `SiteHeaderDTO`, `SiteFooterDTO` | shell/nav/footer view DTO существуют | `BASE`; удалить Atlas identity/copy |
| `BreadcrumbDTO`, `PageSEOContract` | page-specific reference exists, единого minimal contract недостаточно | `BASE GAP`; define only through current Core 5.5 contract work |
| `LeadFormContext` | form type и property context существуют | `BASE GAP`; добавить `consentVersion`, `consentHref`, `consentRequired` до freeze |
| new-buildings, journal, employee/review contracts | отдельные domain DTO | `MODULE` |
| Atlas tenant config/content DTO | brand/city/legal/copy | `ATLAS-SPECIFIC` |
| raw Payload documents, schema types и persistence models | backend owner Atlas | `DROP` |

## Filters and facet decision

Atlas query surface содержит search, city/district, category/deal type, rooms/studio, exclusive, price/area/kitchen/floor/lot ranges, building/renovation/land utilities/commercial attributes, sort, view и pagination. Facet groups: cities, districts, rooms, price, building types, renovations, land-use types, commercial types, commercial building types, entrance types.

Решение REALTY_BASE: `filters only`. Сохраняются общий `total`, result label и apply-result count, но per-option facet counts не входят в `PropertyFilterDTO`. Причина: representative Atlas controls не отображают option counts; добавление counts сейчас создало бы лишний data contract. Если будущий approved UX потребует counts, решение меняется до contract freeze и реализуется bounded aggregate queries без Redis, search engine или prepared facet read model.
