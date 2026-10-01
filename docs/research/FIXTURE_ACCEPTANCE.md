# Fixture website acceptance

Статус: `PASS / CONTRACT FREEZE UNBLOCKED`.

## Проверенный baseline

| Параметр | Значение |
|---|---|
| Проверка | 2026-09-16 |
| Base commit | `e88c4dcf8cee5a9334c7772c6f04ab3844f25c91` |
| Data mode | fixture provider, без Payload и PostgreSQL |
| Сборка | production build, 15 статических страниц |
| Viewports | mobile `390 × 844`, desktop `1440 × 1000` |

## Route и visual proof

Проверены главная, каталог, карточка объекта, услуги, о компании, ипотека,
продажа, аренда, контакты, обе legal-страницы и 404. На всех страницах:

- один `h1` и один `main`;
- горизонтальное переполнение равно нулю;
- отдельный title; у публичных fixture-страниц абсолютный canonical;
- fixture policy `noindex, nofollow` сохранена до подключения production data;
- обязательные Atlas-паттерны читаемы на mobile и desktop, включая каталог,
  карточку, lead form и media placeholder.

## Автоматизированная доступность и SEO semantics

| Сценарий | Device | Accessibility | Best Practices | Agentic | SEO |
|---|---:|---:|---:|---:|---:|
| Главная | mobile | 100 | 100 | 100 | 63 |
| Каталог | mobile | 100 | 100 | 100 | 63 |
| Карточка объекта | mobile | 100 | 100 | 100 | 63 |
| Главная | desktop | 100 | 100 | 100 | 63 |

Единственный failed SEO audit — `is-crawlable`: он вызван намеренным
`noindex, nofollow` fixture-режима. Title, description, canonical, links и image
semantics проходят проверку; перед production индексирование включается отдельным
release-решением.

## Решения перед freeze

- Facets: Base использует `filters only`; counts для отдельных options не входят
  в DTO. Неподтверждённые Atlas-поля скрыты, а не вычисляются.
- Media: XML/YRL `picture` остаётся external URL; fixture использует `null` и
  честный placeholder. Неизвестные width/height и изображения не выдумываются.
- Consent: форма реально рендерит обязательный checkbox, canonical legal link и
  `fixture-consent-v1`. Mapping UI → `leads.consentAccepted`,
  `leads.consentVersion`, `leads.consentedAt` доказан в
  `CONTRACT_FEASIBILITY.md`; submit остаётся отключён до lead intake epic.
- Feasibility: блокеров Base DTO, фильтров, media, SEO shell или consent
  persistence не найдено. Юридический production-текст и его final version ID
  остаются owner/legal TODO перед release, но contract freeze не блокируют.

## Итог

Fixture acceptance пройден. Presentation contracts готовы к freeze `1.0.0` и
созданию tag `contracts-v1` в следующей задаче.
