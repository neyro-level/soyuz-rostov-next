# AMS UI CORE — единая UI-конституция v5.0
**Статус:** каноническое UI-ядро AMS  
**Модель:** solo owner / project manager + AI  
**Область:** коммерческие сайты, каталоги, кабинеты, CRM, mini-SaaS, специализированные веб-платформы  
**Базовый UI-стек:** Next.js App Router · TypeScript · Tailwind CSS 4.x · shadcn/ui · pnpm  
**Default reuse:** project-local компоненты + approved starter/template  
**Registry:** не используется по умолчанию; только редкое исключение по отдельному owner decision
---
# 0. Как AI использует этот файл
1. Проверить раздел 3 `Project Technical Core`.
2. Проверить раздел 4 `Project Design System`.
3. Если Design System не сформирован — выполнить раздел 6 `Design Intake`.
4. Проверить `package.json`, lockfile, `components.json`, `src/app/globals.css`, `src/ui/**`.
5. Всегда применять `REUSE → VARIANT → CREATE`.
6. Завершать задачу отчётом из раздела 19.
7. Не писать «проверено», если proof фактически не выполнялся.
8. Version-sensitive API проверять по pinned project state и актуальной официальной документации.
9. Не использовать память модели как source of truth, если доступно фактическое состояние проекта.
10. Не вводить новый системный value молча при конфликте с Design System.
```text
ACTUAL PROJECT STATE
→ CURRENT OFFICIAL DOCS
→ IMPLEMENTATION
```
---
# 1. Приоритет источников истины
```text
1. Фактическое состояние проекта + выбранный AMS Technical Core · 2. Project Technical Core
3. src/app/globals.css · 4. Project Design System
5. Эта UI-конституция · 6. Figma / макет / референс
7. Решение AI — только если всё выше молчит
```
Назначение:
```text
Technical Core → runtime, data, transport, deployment, SEO, analytics · globals.css   → реальные token values
Design System  → visual policy, intent, exceptions · Constitution   → architecture, process, ownership, AI workflow
Figma          → input, не нормативный source of truth
```
Если reference конфликтует с системой:
```text
CONFLICT · → не вводить value молча
→ зафиксировать конфликт · → предложить варианты
→ при необходимости owner decision · → записать approved exception
```
---
# 2. Hard Rules
1. Tailwind CSS 4.x — основной styling layer.
2. Exact Tailwind version — только из project lockfile.
3. shadcn/ui — единственный canonical primitive foundation.
4. Вторая UI-library/primitive foundation запрещена без owner decision.
5. Tailwind-классы нормально использовать внутри компонентов.
6. Повторяемый UI не остаётся случайным набором `div + className`.
7. Канонический порядок: `REUSE → VARIANT → CREATE`.
8. Нельзя создавать второй Button/Input/Dialog/Card/Table pattern.
9. Один коммерческий сайт = один Project Design System.
10. Новая страница = новая композиция, а не новый дизайн.
11. Каждая самостоятельная смысловая секция = отдельный component.
12. `page.tsx` преимущественно composition layer.
13. Системные values не размазываются по JSX.
14. Reusable UI получает DTO / ViewModel / safe contract.
15. Prisma/raw Payload/raw CMS/DB clients не протекают в reusable UI.
16. Server Components — default.
17. `"use client"` ставится максимально глубоко, только на interactive leaf.
18. Accessibility нельзя ломать ради визуала.
19. Не создавать speculative abstractions и universal builders.
20. Registry не является частью default workflow.
21. Starter/template — snapshot, а не runtime dependency.
22. При равной безопасности выбирать решение, которое проще поддерживать solo owner + AI.
---
# 3. PROJECT TECHNICAL CORE — заполнить один раз на проект
UI не имеет права придумывать значения этого раздела.
## 3.1 Runtime
```text
AMS Core:        STATIC | APPLICATION | REALTY · Core version:    <version>
Node:            <pinned> · Next.js:         <pinned>
React:           <pinned> · TypeScript:      <pinned>
Tailwind:        <exact 4.x> · shadcn:          <actual components.json/base>
Deployment:      <static export / Docker / Next+Payload / other>
```
## 3.2 Images / Media
```text
Mechanism:             <next/image | static policy | approved adapter> · Responsive sizing:     <project contract>
LCP media contract:    <approved rule for pinned version> · Remote restrictions:   <if applicable>
Missing-image fallback:<component/shared policy>
```
Не фиксировать framework props из памяти.
## 3.3 Fonts
```text
Loading:              <next/font | approved static> · Primary family:       <name>
Display family:       <name | none> · Approved weights:     <list>
Primary CSS variable: <e.g. --font-app-sans> · Display CSS variable: <e.g. --font-app-display | none>
Cyrillic verified:    YES | NO | N/A · License verified:     YES | NO | REQUIRES_CHECK
```
CSS variable names обязаны совпадать с `globals.css`.
## 3.4 Leads / Forms
```text
Canonical UI:        LeadForm · Submission transport:<AMS Leads API / command/action / Payload path / other>
Server validation:   <boundary> · Persistence/delivery:<CRM/email/webhook/other>
Anti-spam:           <honeypot/captcha/rate limit> · PII/consent:         <policy reference | N/A>
Lead analytics event:<event + owner>
```
UI не меняет transport.
## 3.5 Data Boundary
```text
UI contract:            DTO | ViewModel | Safe Contract · DTO formed in:          <path/module>
Validation:             <Zod/approved boundary> · Forbidden in reusable UI:<Prisma/raw Payload/DB client/raw CMS>
```
## 3.6 SEO / Page Contract
```text
Metadata owner:     <route/layout/content layer> · Title/description:  <policy>
Canonical:          <policy> · Indexable URLs:     <rule>
Pagination:         <rule> · Sitemap:            <owner>
Robots:             <owner> · Open Graph:         <policy>
Structured data:    <page types + factual source>
```
Страница не готова, если visual UI есть, а обязательный SEO contract не выполнен.
## 3.7 Analytics
```text
Provider:            <Metrika/other> · Page-view contract:  <rule>
Lead/conversion:     <typed events> · Dispatch owner:      <project layer>
PII in analytics:    NO by default · Consent dependency: <if applicable>
```
Reusable UI не отправляет business analytics events самостоятельно.
## 3.8 Performance Budget
Default, если проект не переопределил:
```text
mobile LCP <= 2.5 s · CLS <= 0.1
measurement = production-like build + representative mobile profile
```
## 3.9 Verification Cadence
```text
WORK:          <necessary diagnostics only> · MERGE STANDARD:<project proof>
MERGE RISKY:   <project proof> · DAILY/RELEASE: <project proof>
```
UI Constitution не требует build после каждой мелкой задачи, если Technical Core этого не требует.
## 3.10 Locale / Theme
```text
Dark mode:      ENABLED | DISABLED   (commercial default = DISABLED) · Primary locale: <ru-RU>
Number format:  <policy> · Pluralization:  <shared formatter>
Currency/units: <policy> · Date/time:      <policy>
```
Русские plural forms и форматирование чисел не пишутся вручную по компонентам.
## 3.11 Mandatory / Conditional Pages
```text
404:                         REQUIRED · Error boundary / equivalent:<REQUIRED / CORE-DEFINED>
Privacy/personal data:       <REQUIRED / N/A> · Cookie notice/banner:        <REQUIRED / N/A>
Thank-you page:              <REQUIRED / INLINE_SUCCESS / N/A>
```
Не создавать conditional pages «на всякий случай».
---
# 4. PROJECT DESIGN SYSTEM — заполнить на проект
Здесь только policy и intent. Numeric values живут только в `globals.css`.
## 4.1 Visual Character
```text
3–5 характеристик:<...> · Anti-goal:         <как проект НЕ должен выглядеть>
```
## 4.2 Status
```text
Design source:           <Figma/reference> · Design Intake completed: <date>
Representative page:     <page>
```
## 4.3 Typography
Approved roles:
```text
text-h1 / text-h2 / text-h3 / text-h4 · text-body-lg / text-body / text-body-sm
text-label / text-caption
```
Rules:
- HTML semantics и visual role разделены.
- `<h2 className="text-h3">` допустимо.
- Font weight задаётся отдельной `font-*` utility.
- Weight не встраивается в typography role по умолчанию.
- Fluid scale не требует случайных responsive font-size classes.
- Новый typography role требует owner/project decision.
- Long-form/editorial использует `narrow` container.
## 4.4 Containers
```text
site   → обычные коммерческие страницы
narrow → статьи/legal/focused text/forms
wide   → карты/широкий каталог/галерея/таблица, только если нужен
```
Horizontal padding задаёт `Container`.
## 4.5 Section Rhythm
```text
sm   → плотные/служебные секции
md   → default
lg   → крупное смысловое разделение
hero → hero / first major section
```
Vertical rhythm задаёт `Section`.
## 4.6 Surfaces / Shadows
```text
Approved surfaces:<actual list> · Alternation:      <policy>
Shadow policy:    <policy>
```
Не сохранять роли, которые проект реально не использует.
## 4.7 Radii
Control baseline определяется установленным shadcn primitive scale.
Не создавать `radius-control`, если shadcn его не использует.
Дополнительные project roles только по необходимости:
```text
card  → cards/card media
large → hero media/large surfaces
```
Если control radius меняется — меняется фактический shadcn radius mapping.
## 4.8 Buttons
Canonical primitive: `shadcn Button`.
Variants живут в canonical Button/CVA.
Не создавать отдельные `HeroButton`, `BlueButton`, `CTAButton2`, если это варианты одной сущности.
## 4.9 Forms
Один control system:
```text
height / radius / border / focus / disabled / error / success
```
Required states:
```text
default / validation error / submitting / server error / success
```
Ошибки показываются текстом и связаны с полем программно.
## 4.10 Media
```text
Aspect roles:          <actual roles> · object-fit:            <policy>
Missing-image fallback:<required> · Text-over-image:       <policy>
Gallery loading:       <policy>
```
## 4.11 Icons
Default: `Lucide`.
Один icon ecosystem на проект.
## 4.12 Motion
Default: `CSS / Tailwind transitions`.
- duration = built-in Tailwind scale;
- semantic `--ease-*` допустимы;
- default properties = `transform`, `opacity`;
- `prefers-reduced-motion` обязателен.
## 4.13 Dark Mode
```text
ENABLED | DISABLED
```
Если `DISABLED`:
- `dark` variant class-based;
- `.dark` не устанавливается;
- project-authored `dark:` запрещены;
- внутренние shadcn `dark:` могут оставаться inert.
## 4.14 Editorial / Journal Profile
```text
NOT_APPLICABLE
```
или intentional extension:
```text
content width / article typography / article rhythm / quotes/meta / image treatment
```
Журнал расширяет основную систему, а не создаёт вторую UI ecosystem.
## 4.15 Shared Project Patterns
| Component | Layer | Used on | Notes |
|---|---|---|---|
| Container | shared | all pages | width/padding |
| Section | shared | all pages | vertical rhythm |
| SectionHeader | shared | multiple | heading composition |
## 4.16 Approved Exceptions
| Date | Location | Exception | Reason | Owner decision |
|---|---|---|---|---|
Повторяющийся exception должен стать token/variant/component или быть устранён.
---
# 5. TOKEN SOURCE — `src/app/globals.css`
`globals.css` — единственный source of truth для фактических design values.
Содержит:
```text
Tailwind setup · shadcn semantic variables
project semantic variables · @theme mapping
fonts mapping · base styles
global accessibility/motion foundation
```
Не является складом component-specific CSS.
## 5.1 Template = menu, not baseline
```text
template
→ удалить всё неиспользуемое
→ оставить только реальные project roles
→ проверить сборкой
```
Unused project tokens не живут «на будущее».
## 5.2 Dark Variant
Для light-only проекта:
```css
@custom-variant dark (&:is(.dark *));
```
Это переводит `dark:` в class-based mode. Без `.dark` внутренние shadcn `dark:` не активируются от OS preference.
## 5.3 Token Families
Создаются только по необходимости:
```text
semantic colors / surfaces / containers / section rhythm / typography / radii / easing / aspect ratios
```
`chart-*` и `sidebar-*` добавляются вместе с соответствующим shadcn module/component.
## 5.4 Tailwind 4
CSS-first configuration.
Не создавать `tailwind.config.*`, если его нет в актуальном проекте и pinned stack явно его не требует.
## 5.5 Typography Tokens
Role включает:
```text
size / line-height / letter-spacing
```
Font weight задаётся отдельно.
## 5.6 Duration / Easing
Использовать встроенные `duration-150`, `duration-300`, ...
Semantic easing — через поддерживаемый `--ease-*` namespace.
## 5.7 Font Variables
Font loader variable и `globals.css` mapping должны совпадать точно.
Несовпадение = defect.
---
# 6. DESIGN INTAKE — обязательный Step 0
Запускается один раз до массовой UI-разработки.
```text
REFERENCE / FIGMA · → INVENTORY
→ NORMALIZE · → TOKENS
→ FIXTURE · → DESIGN SYSTEM
→ SECTION MAP · → REPRESENTATIVE PAGE
```
## 6.1 Inventory
Собрать без нормализации:
- цвета;
- fonts/sizes/weights/line-heights/letter-spacing;
- spacing/section padding/content widths;
- radii/borders/shadows;
- media aspect ratios;
- button/control variants;
- repeated patterns;
- semantic sections по страницам.
Для шрифтов отдельно:
```text
Cyrillic coverage / approved weights / source / license / loader CSS variable
```
## 6.2 Normalize
```text
похожие цвета → semantic roles · близкие sizes → compact type scale
radii → shadcn control scale + card/large if needed · section gaps → sm / md / lg / hero
widths → narrow / site / wide
```
Сомнительное = `REQUIRES_OWNER_DECISION`.
## 6.3 Write Tokens
Добавить только реально нужные роли. Не создавать speculative tokens.
## 6.4 Compile Fixture
До масштабирования проверить фактической сборкой:
- semantic colors;
- container roles;
- named section-spacing utilities;
- typography roles;
- radius mapping;
- easing;
- class-based dark behavior;
- font CSS-variable resolution;
- representative shadcn primitive styling.
Особенно проверить named `--spacing-*` + `clamp()`.
Assumed class generation ≠ evidence.
## 6.5 Fill Design System
Заполнить раздел 4. Policy only, numbers остаются в CSS.
## 6.6 Section Map
| Page | Section | Layer | Existing? | Reused on |
|---|---|---|---|---|
| Home | Hero | page-specific | no | — |
| Home | Services | shared/domain | maybe | services |
| All | CTA | shared | yes | multiple |
## 6.7 Representative Page
Выбирать наиболее показательную страницу, желательно с:
```text
Hero / content / cards / CTA / form / media / responsive complexity / domain component
```
## 6.8 Validate Before Scaling
Проверить:
```text
token fit / typography / containers / section rhythm / radii / buttons/forms
server-client boundary / responsive / accessibility / page semantics / performance / reuse
```
Только после этого масштабировать остальные страницы.
---
# 7. Ownership и структура проекта
Логическая иерархия:
```text
SHADCN PRIMITIVES → LAYOUT → SHARED → DOMAIN → PAGE-SPECIFIC → PAGE COMPOSITION
```
Рекомендуемая структура:
```text
src/
├── app/
└── ui/
    ├── primitives/     shadcn
    ├── layout/         header/footer/navigation/mobile-menu
    ├── shared/         container/section/section-header/cta/faq/lead-form
    ├── domain/         stable subject-matter components
    └── pages/<page>/   hero-section/services-section/...
```
Physical paths могут адаптироваться под Technical Core. Логические layers сохраняются.
## 7.1 Layout Primitives
`Container`, `Section`, `SectionHeader` обязаны принимать внешний `className` и объединять его через canonical `cn()`.
## 7.2 Search Order
```text
1. existing project component · 2. existing shared/domain wrapper or variant
3. shadcn primitive/component · 4. new project-local component
```
Registry не входит в normal workflow.
## 7.3 components.json
Aliases должны совпадать с реальными paths.
Перед `shadcn add` проверить destination.
Параллельные primitive trees запрещены.
---
# 8. Semantic Sections и Page Composition
Коммерческая страница не создаётся монолитом.
```tsx
export default function Page() {
  return (
    <>
      <HeroSection />
      <ServicesSection />
      <AdvantagesSection />
      <CasesSection />
      <LeadFormSection />
      <FAQSection />
      <CTASection />
    </>
  )
}
```
Использовать термин `semantic section`, а не «первый/второй экран».
Page-specific section не обязана становиться shared.
---
# 9. Server / Client Boundary
Default = `Server Component`.
`"use client"` только для реальной browser-interactivity:
```text
hooks / local state / browser API / carousel / accordion / form UX / filter / menu / map / drag-drop
```
Правило:
```text
SERVER SECTION
└── CLIENT INTERACTIVE LEAF
```
Не делать Hero/Section/Layout client-side ради одного child.
---
# 10. Data Boundary
```text
DATA SOURCE → APPROVED PROJECT DATA BOUNDARY → DTO / VIEW MODEL → UI COMPONENT
```
Reusable UI не импортирует persistence implementation.
Dirty feed/CMS data нормализуется до UI boundary.
---
# 11. Forms / Leads / States
Один canonical lead-form UI на проект.
UI отвечает за:
```text
fields / UX validation / consent presentation / default / validation error / submitting / server error / success
```
Technical Core отвечает за:
```text
transport / server validation / anti-spam / persistence / delivery / analytics event
```
Field error = visible text + programmatic association.
Data-dependent UI минимум:
```text
loading / empty / error / success
```
Повторяемые states оформляются shared patterns.
---
# 12. Accessibility Minimum
Проверить:
- semantic HTML;
- logical heading hierarchy;
- keyboard navigation;
- visible focus;
- labels;
- programmatic field/error association;
- meaningful `alt`;
- empty alt для decorative media;
- accessible overlays;
- sufficient contrast;
- status not only by color;
- reasonable touch targets;
- reduced-motion preference.
`ACCESSIBILITY CHECKED` нельзя ставить без этой проверки.
---
# 13. Media / Performance
Image/font API берётся из Technical Core.
UI правила:
- deliberate LCP candidate;
- не eager-load всё;
- explicit responsive sizing;
- gallery lazy beyond critical media;
- fonts centrally declared;
- only required families/weights;
- no heavy hero motion dependency without proof;
- missing-image fallback обязателен.
Сверять с performance budget из 3.8.
---
# 14. SEO / Commercial Page Contract
Коммерческая страница при применимости должна иметь:
```text
title / description / canonical / OG / one logical H1 / heading hierarchy
meaningful alt / structured data from facts / sitemap+robots coverage / analytics events
```
Конкретная реализация — Technical Core.
Для filterable catalogs:
```text
URL filters → server parsed → approved indexable combinations → random/deep facets noindex → declared pagination policy
```
SEO logic не придумывается заново на каждой странице.
---
# 15. Motion / Dark Mode / Icons
## Motion
```text
CSS/Tailwind first · built-in duration scale
semantic easing · transform/opacity default
reduced motion required
```
Одна animation ecosystem на проект.
## Dark Mode
Если disabled:
```css
@custom-variant dark (&:is(.dark *));
```
`.dark` не устанавливается, собственные `dark:` не пишутся, внутренние shadcn `dark:` остаются inert.
## Icons
Default = `Lucide`. Не смешивать icon packs.
---
# 16. Mandatory / Conditional Pages
Baseline:
```text
404 / error boundary-equivalent
```
Conditional:
```text
privacy/personal-data page — если собираются ПД · cookie notice/banner — если реально требуется
thank-you page — если UX page-based · 500-like page — по Technical Core
```
Форма ПД не выпускается без действующего consent target.
---
# 17. Build Order
```text
0. Выбрать AMS Technical Core. · 1. Заполнить Project Technical Core.
2. Провести Design Intake inventory + normalization. · 3. Записать и очистить tokens в globals.css.
4. Собрать token/shadcn fixture и подтвердить class generation. · 5. Заполнить Project Design System.
6. Проверить components.json aliases и installed primitives. · 7. Собрать только нужный foundation:
   Container · Section · SectionHeader · Button · form primitives · Header · Footer · 8. Добавить только реально нужные shared patterns:
   CTA · FAQ · LeadForm · cards · 9. Собрать одну representative page.
10. Проверить typography/container/section rhythm/radius/surfaces/responsive/accessibility/SEO/performance. · 11. Запустить Drift Audit.
12. Масштабировать страницы через REUSE → VARIANT → CREATE. · 13. Перед delivery повторить Drift Audit.
```
Не строить 10–20 страниц, чтобы потом унифицировать их.
---
# 18. Design System Drift Audit
Запускать после representative page, периодически и перед delivery.
Default = `REPORT ONLY`.
## Severity
```text
P0 → hard contract violation / silent failure / accessibility-security blocker / parallel foundation
P1 → systematic drift / likely-to-spread defect / real performance-accessibility-page regression
P2 → local inconsistency / limited blast radius
```
## Checks
1. Raw colors в project-authored TSX, где должен быть token.
2. Repeated arbitrary values.
3. Styling в обход Container/Section/radius/typography roles.
4. Hard-coded duration/easing в обход motion policy.
5. Project-authored `dark:` при disabled dark mode; shadcn primitives исключить.
6. Duplicate/near-duplicate components.
7. Copied semantic sections между pages.
8. Неверный logical H1 count.
9. Unnecessary `"use client"` на section/layout.
10. Media contract violations.
11. Persistence imports внутри reusable UI.
12. Monolithic TSX/page files.
13. Inline styles, дублирующие system values.
14. Второй Button/Input/Dialog/Card/Table pattern.
15. `components.json` aliases не совпадают с paths.
16. Parallel primitive trees.
17. Repeated page-specific values, которым нужен token/variant/component.
18. Unrecorded exceptions.
19. Dead project-specific tokens.
20. Field errors без programmatic association.
21. Ad-hoc loading/empty/error вместо canonical pattern.
22. Font CSS variable mismatch.
23. Missing required SEO/page contract.
24. Missing required conditional pages.
## Dead Token Rule
Не считать dead:
- shadcn-required token;
- explicitly documented reserved token.
Считать dead:
- unused project-specific token;
- leftover token после Intake без contract.
## Output
| Severity | File | Location | Finding | Rule | Action |
|---|---|---|---|---|---|
В конце:
```text
TOP 5 RISKS · TOKENS
COMPONENT DUPLICATION · PAGE COMPOSITION
SERVER/CLIENT · RESPONSIVE
ACCESSIBILITY · SEO/PAGE CONTRACT
MEDIA/PERFORMANCE · UNRECORDED EXCEPTIONS
```
Effort:
```text
LOW → mechanical cleanup
MEDIUM → component/token consolidation
RISKY → primitive API / token contract / foundation / UI architecture
```
---
# 19. End-of-Task Report / Definition of Done
Каждая UI-задача заканчивается отчётом:
```text
REUSED: · CREATED + OWNERSHIP:
VARIANTS ADDED: · NEW TOKENS + WHY:
ARBITRARY VALUES + JUSTIFICATION: · RESPONSIVE CHECKED:
STATES CHECKED: · ACCESSIBILITY CHECKED:
SEO / PAGE CONTRACT CHECKED: · CHECKS ACTUALLY RUN:
NOT CHECKED: · RISKS / OPEN DECISIONS:
```
Нельзя писать `CHECKED`, `GREEN`, `DONE`, если фактического proof не было.
Verification cadence — из 3.9.
---
# 20. Starter / Cross-Project Reuse
Default:
```text
APPROVED STARTER → COPY / SNAPSHOT → PROJECT OWNS SOURCE
```
Это сознательно snapshot model:
- project changes не возвращаются автоматически в starter;
- starter improvements не приезжают автоматически в существующие проекты;
- foundation upgrade существующего проекта — отдельная задача;
- cross-project registry/distribution не предполагается существующим.
Registry допускается только как отдельное исключение по owner decision.
---
# 21. Forbidden Without Owner Decision
Запрещено:
- вторая UI-library;
- второй primitive foundation;
- случайный community UI kit;
- duplicate Button/Input/Dialog/Card/Table;
- copy-paste reusable sections;
- giant `page.tsx`;
- giant `globals.css` с component-specific CSS;
- raw system values по десяткам JSX;
- blind overwrite modified shadcn component;
- universal builders before repetition;
- новый visual language для каждой страницы;
- persistence types inside reusable UI;
- whole-section `"use client"` ради одного child;
- silent token changes ради одного reference;
- speculative infrastructure;
- active Registry workflow без owner decision.
---
# 22. Final AMS UI Contract
```text
ONE PROJECT DESIGN SYSTEM · +
TAILWIND CSS 4.x · +
SHADCN/UI · +
SEMANTIC TOKENS · +
ONE SOURCE OF TRUTH FOR VALUES · +
SERVER-FIRST COMPONENT TREE · +
PROJECT-LOCAL REUSE · +
SEMANTIC SECTIONS · +
PAGE COMPOSITION · +
MECHANICAL DRIFT CONTROL · =
SYSTEMATIC AMS UI
```
> **Tailwind — рабочая основа.**
> **shadcn — primitive foundation.**
> **Повторяемый UI не должен оставаться бесформенным и случайным.**
> **Новая страница — новая композиция существующей системы, а не новый дизайн.**
> **Каждая самостоятельная смысловая секция — отдельный component.**
> **Системное решение имеет один source of truth.**
> **Если задача решается reuse или variant — новый component не создаётся.**
> **При равной безопасности выбирается решение, которое проще понять, проверить и поддерживать одному owner вместе с AI.**
