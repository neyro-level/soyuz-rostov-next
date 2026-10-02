# PRD — Союз застройщиков Ростов

Статус: `ACTIVE CLIENT PRODUCT / MASTER PLAN REVIEW`.

## Продукт

`souz-home.ru` — публичный сайт и каталог агентства недвижимости «Союз застройщиков» для Ростова-на-Дону на базе AMS Realty Platform/Payload foundation.

R1 создаёт коммерческий контур для:

- новостроек и страниц жилых комплексов;
- продажи квартир, включая вторичку и подтверждённые районные страницы;
- страниц застройщиков;
- ипотечных, seller-acquisition, company, contact, legal and trust surfaces;
- приёма лидов через Payload-owned intake/outbox;
- управляемого импорта ЖК и объектов;
- SEO/indexing через code-owned URL grammar, Registry and Content Gate.

## Пользователи

- покупатель выбирает квартиру/ЖК/застройщика и отправляет заявку;
- продавец оставляет заявку на продажу объекта;
- агентство управляет контентом, объектами, ЖК, застройщиками и лидами через Payload Admin;
- владелец продукта с AI разрабатывает и выпускает проект через SourceCraft/Timeweb contour.

## R1 scope

```text
primaryGeo = rostov-na-donu
geoMode = SINGLE_GEO
ACTIVE categories = kvartiry + novostroyki
ACTIVE markets = secondary + newbuild
Bataysk/Aksay = data entities / PREPARED_OFF public geo surfaces
indexing = noindex until explicit owner promotion
```

Global entity URLs remain stable; local catalog URLs are geo-first. Payload CMS is the only application schema/auth/Admin owner. Public UI reads through Public Gateway and storage-neutral DTO.

## Existing platform baseline

The imported repository already contains reusable capability for:

- normalized geo/property/development/developer schema and migrations;
- contracts/DTO and Public Gateway;
- profile/status matrices, URL grammar, resolver and Content Gate;
- lifecycle/redirect, sitemap/robots/IndexNow and cache/jobs;
- feed/Excel import and lead outbox/delivery;
- reusable catalog, entity and marketing UI.

The client program must not rebuild these layers. It closes Soyuz-specific evidence, configuration, data, content, UI and delivery gaps recorded in `AMS_SOUZ_HOME_FINAL_MASTER_PLAN_V4_1_1.md`.

## Required client outcomes

- real legacy URL migration decisions;
- measured/approved semantic and SEO Registry evidence;
- owner-approved NAP/legal identity plus approved privacy/consent wording before staging/indexing;
- verified Rostov district, developer, ЖК and property data;
- 24 owner-prioritized ЖК collected Excel-first from the approved Yandex Realty partner source, with at least five accepted photos per publish-eligible ЖК;
- private provenance/rights/checkedAt evidence without public attribution or public check dates;
- Timeweb S3 as the single production media topology, with no Git binaries or hotlinking;
- exact preservation of the current Bastion-template R1 appearance and representative browser acceptance; redesign is post-R1;
- MAX lead delivery with canonical Development authority and Yandex Metrica non-PII analytics after consent;
- latest-compatible-stable direct stack proof before feature execution and release;
- immutable SourceCraft image, noindex staging proof, rollback and explicit production gate.

## Non-goals without explicit owner activation

- public MULTI_GEO;
- public houses, land, commercial, cottage-village or rent categories;
- construction service and journal in R1;
- novostroyki district/facet pages (R2);
- price analytics (R2);
- personal account, Redis, broker, PostGIS, second search engine/backend/ORM/auth;
- production deploy, DNS cutover or public indexing from an implementation task.

## Current readiness

Master plan: `4.1.1-ARCH-v5 APPROVED`.

The exact-version four-pass audit passed with `READY_WITH_LIMITS`, then the owner supplied the exact approval phrase. External source/compatibility and later staging/production gates retain deterministic fallbacks and stop rules. Missing factual/legal inputs may be represented only by noindex staging placeholders and cannot satisfy Content Gate, release or indexing readiness. Task Manager/Beads import was not performed in this audit run.

Product structure: `02_PRODUCT_STRUCTURE.md`. Architecture: `03_ARCHITECTURE.md`. Current work: `04_BACKLOG.md`.
