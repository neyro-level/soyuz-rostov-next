# ADR-YARL-LIGHTBOX

Статус: Accepted  
Дата: 2026-09-19  
Контекст: AMS RealtBase Starter property gallery lightbox.

## Решение

Оставляем `yet-another-react-lightbox` как единственный lightbox. Overlay tokens (`--surface-dark-strong`) живут в light theme, не в dark mode class на `html`.

## Почему

YARL уже подключён в `packages/ui/src/styles.css` и MediaGallery. Замена пакета
была бы redesign и требует отдельного owner-approved UI scope.

## Последствия

Не добавлять второй lightbox. Live LCP/lightbox perf остаётся NOT PROVEN.
