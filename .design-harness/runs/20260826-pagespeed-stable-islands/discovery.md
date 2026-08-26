# Discovery

## Existing Design System

Tailwind-токены в `web/src/styles.css` и `web/tailwind.config.js`; шрифты Roboto Condensed, IBM Plex Sans/Mono; существующие Brand, ModelSearch, AffiliateOffer и GuidedSelectionPage; референсы в `product-docs/design-references`.

## Reuse Decisions

Переиспользуются ModelSearch и AffiliateOffer. GuidedSelectionPage получает только режим `embedded`; DOM и компоненты шагов сохраняются.

## New Primitives And Rationale

HomeSearchIsland и ModelOffersIsland — минимальные route-scoped оболочки для существующих компонентов. Новый визуальный примитив не вводится.

## Risks

Несовпадение высоты fallback/island; повреждённые/просроченные данные; повторный `<main>`; случайная загрузка всего каталога на главной; потеря полезного SSR при ошибке JavaScript.
