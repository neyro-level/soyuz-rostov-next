# ADR-EMBLA-CAROUSEL

Статус: Accepted  
Дата: 2026-09-19  
Контекст: AMS RealtBase Starter gallery on property cards and detail.

## Решение

Оставляем `embla-carousel-react` 8.x как единственный carousel runtime. Не заменяем его native scroll-snap или вторым slider-пакетом в этом демо.

## Почему

Галерея объектов уже завязана на Embla (touch, loop, dots). Переписывать визуал в CORE-ALIGN запрещено.

## Последствия

Новый carousel dependency требует отдельный project trigger. ADR не утверждает production LCP.
