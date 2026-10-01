# Product Structure

Статус: `ACTIVE / CANONICAL GEO-CATALOG RUNTIME`.

Текущая release identity не выводится из этого файла: canonical SHA/tag/Gate
содержатся в `STARTER_RELEASE_STATE.md`. Индексацией владеет связка
`src/project/indexing-policy.ts` + canonical resolver/Gate: tracking parameters
не меняют content/canonical, а неизвестный functional query остаётся
fail-closed. Production origin допускается только как approved HTTPS origin.

## Текущий публичный runtime

Динамический public runtime обслуживается canonical resolver. Статические
маршруты остаются explicit; два реально публичных donor URL сохранены как
redirect-only compatibility adapters без прежнего presentation/runtime.

| Назначение | Текущий URL |
|---|---|
| Главная | `/` |
| Каталог | `/{category}/`, `/{geo}/{category}/`, bounded district/facet routes |
| Карточка объекта | `/{category}/{semantic}-{publicUrlId}/` |
| Geo hub | `/{geo}/` |
| Застройщики | `/zastroyshchiki/`, `/zastroyshchiki/{slug}/`, `/{geo}/zastroyshchiki/` |
| Проекты | `/novostroyki/zhk-{slug}/`, `/kottedzhnye-poselki/kp-{slug}/` |
| Услуги | `/uslugi` |
| О компании | `/o-kompanii` |
| Ипотека | `/ipoteka` |
| Продать | `/prodat` |
| Сдать | `/sdat` |
| Контакты | `/kontakty` |
| Политика конфиденциальности | `/politika-konfidencialnosti` |
| Согласие на обработку данных | `/soglasie-na-obrabotku-personalnyh-dannyh` |

## Активные и зарезервированные пространства

- `/novostroyki/zhk-{slug}/` и `/kottedzhnye-poselki/kp-{slug}/` — активные
  базовые страницы unified development model;
- более глубокие building/layout/chessboard URL внутри development namespace —
  зарезервированы до отдельной активации optional-модуля `novostroyki`;
- `/sotrudniki/**` — сотрудники;
- `/journal/**` — журнал.

Их нельзя использовать для несвязанных страниц. Активация модулей фиксируется в `PROJECT.md` до появления маршрутов.

## Владение контентом и данными

- статические маркетинговые страницы остаются в коде, пока для редактирования нет доказанного требования;
- Payload владеет application schema и управляемым контентом;
- публичный UI получает только DTO через Public Gateway;
- избранное и сравнение допустимы без кабинета через localStorage/URL;
- feed/manual identity и lifecycle объекта реализуются по мастер-плану до публичного каталога.

## Каталог: facet UX

Для базового профиля выбран режим `filters only`: общий результат и число найденных объектов показываются, per-option facet counts в presentation contract не входят. Если approved UX потребует counts до contract freeze, они добавляются отдельным решением и только через bounded aggregate queries.

Текущие SEO index/canonical/redirect решения зафиксированы ниже и проверяются
общим Content Gate; новые поверхности добавляются сюда до их индексации.

## Geo-catalog platform contract

Reusable target-контракт: `platform/GEO_CATALOG_CONTRACT.md`. Он фиксирует
PageKey, URL grammar, resolution order, status/profile model и lifecycle
семантику. Контракт реализован в текущем runtime.

| Target surface | Canonical grammar | Текущий статус |
|---|---|---|
| Главная | `/` | live |
| Geo hub | `/{geo}/` | live via resolver |
| Категория по geo | `/{geo}/{category}/` | live via resolver |
| Район или whitelist facet | `/{geo}/{category}/{sub}/` | live via resolver |
| Root-категория | `/{category}/` | live via resolver |
| Объект | `/{category}/{semantic}-{publicUrlId}/` | live via resolver |
| Застройщики geo | `/{geo}/zastroyshchiki/` | live via resolver |
| Застройщики root/detail | `/zastroyshchiki/`, `/zastroyshchiki/{slug}/` | live via resolver |
| ЖК | `/novostroyki/zhk-{slug}/` | live via resolver |
| Коттеджный посёлок | `/kottedzhnye-poselki/kp-{slug}/` | live via resolver |
| Project static routes | explicit declarations from project profile | live, explicit routes preserved |

Инварианты target-грамматики: не более трёх сегментов, lowercase, canonical
trailing slash, property URL не содержит geo, parent района не входит в URL.
Legacy `/nedvizhimost` и `/obekty/[slug]` делают один прямой `301` на итоговый
canonical URL. Только нормализация trailing slash использует `308`. Реальные
canonical `301/410` обслуживает bounded preflight в `src/proxy.ts`. Raw legacy
geo/source fields и redirect history не удаляются без отдельного owner-approved
cleanup scope.

## Runtime ownership

- **Current runtime:** explicit static routes + один catch-all dispatcher,
  общий resolver для HTML и metadata, canonical lifecycle preflight в proxy.
- **Canonical contract:** `platform/GEO_CATALOG_CONTRACT.md`.
- **Implementation:** schema, profile, grammar, resolver, Gate, UI и discovery
  работают в текущем runtime.
- **Data preservation:** raw source fields and redirect history are retained
  unless a separate owner-approved cleanup task says otherwise.

## Clone profile and registry ownership

- Clone input is preset schema v3. The project-owned preset module is the only
  default/profile owner; optional overrides pass the canonical SiteProfile
  schema before generated files are written.
- Runtime status is an explicit matrix: category and market capability at the
  profile level, geo/category and geo/market status per published geo, plus
  root/per-geo developer surfaces. Missing configuration fails closed.
- `clone:seed-geo` materializes approved city/district morphology through the
  privileged gateway. It does not make a route indexable.
- Registry rows move `draft → approved` only after non-synthetic demand
  evidence, canonical URL/template validation and approved morphology. Content
  Gate still owns the final 200/robots/canonical/discovery decision.
