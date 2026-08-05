# Discovery

## Existing Design System

Используются существующие Tailwind-токены `paper`, `ink`, `action`, `verified`, `technical`, `line`, шрифтовые роли `font-display`, `font-sans`, `font-mono`, кнопки `primary-button` и `secondary-button`. Основные компоненты: `SiteHeader`, `ModelSearch`, `CatalogBrandGroups`, `AffiliateOffer`, `MountTechnicalScheme`, Rust SSR в `sitegen`. Данные совместимости и источники не меняются.

## Reuse Decisions

Сохраняются все существующие визуальные примитивы. Расширяются только поведение `ModelSearch` и `SiteHeader`, порядок существующих блоков `MountPage` и семантические подписи `SeoPage`/SSR. Для русских числительных добавляется маленькая чистая функция без UI-примитива.

## New Primitives And Rationale

None: существующей дизайн-системы достаточно.

## Risks

Главный риск — обновить React и забыть Rust SSR. Вторичный — сломать существующие source-based tests, tabindex или прямые ссылки Маркета. Полный build и браузерные снимки обязательны.
