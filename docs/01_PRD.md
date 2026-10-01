# PRD - AMS Realty Baza Starter

Статус: `ACTIVE`.

## Продукт

AMS Realty Baza Starter - коммерческая базовая платформа AMS для сайтов
агентств недвижимости: публичный сайт и каталог, Payload Admin, импорт
нескольких XML/YRL-фидов, сохранение лидов и подключаемая доставка заявок.

## Пользователи

- посетитель подбирает объект и отправляет заявку;
- агентство управляет объектами, страницами и лидами через Payload Admin;
- владелец продукта с AI разрабатывает, выпускает и обслуживает экземпляр.

## Базовый объём

- 15-50 публичных страниц;
- обычно 300-1 000 объектов, до примерно 2 000 active inventory records;
- несколько feed sources;
- 1-2 администратора;
- формы заявок и подключаемые каналы доставки;
- отдельные PostgreSQL, media storage, домен и секреты на клиентском clone.

## Ценность первой версии

Единый проверяемый foundation, который сохраняет визуальные паттерны Atlas, но
не переносит его технический долг. UI зависит от presentation contracts, а
Payload реализует эти contracts через Public Gateway и DTO.

## Реализованный scope

- Geo-first catalog: single-geo и multi-geo профили.
- Каноническая URL-грамматика для geo hubs, категорий, карточек объектов,
  застройщиков и development pages.
- Нормализованные geo/taxonomy entities, developments/developers, properties,
  leads, feed sources и import runs.
- Public Gateway/DTO boundary между Payload и публичным UI.
- SEO Registry, Content Gate, canonical/robots/discovery правила.
- Clone preset/intake, starter-owned manifest и явный upgrade boundary.

Reusable target-контракт каталога: `platform/GEO_CATALOG_CONTRACT.md`.

## Не входит без отдельного trigger

Личный кабинет, Redis, broker, PostGIS, поисковый движок, второй backend/ORM,
отдельный jobs runner, multi-currency, production release, новый immutable tag и
клиентская инфраструктура. Bounded feed-image mirror и модуль новостроек
существуют только в границах текущего runtime и `PROJECT.md`.

Продуктовые границы определяет `02_PRODUCT_STRUCTURE.md`, технические -
`03_ARCHITECTURE.md`, текущую работу - `04_BACKLOG.md`.
