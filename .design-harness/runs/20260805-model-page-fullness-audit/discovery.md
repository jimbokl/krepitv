# Discovery

## Existing Design System

Tailwind-токены из `web/src/styles.css` и `web/tailwind.config.js`; утверждённая модельная композиция из `product-docs/design-references/03-model-page.png`; компоненты `ModelPage`, `ModelFacts`, `AffiliateOffer`, `CatalogBrandGroups`.

## Reuse Decisions

Сохранить текущие компоненты и типографику. Усилить только fail-closed отбор данных и машинный аудит, без нового визуального примитива.

## New Primitives And Rationale

None: существующих примитивов достаточно.

## Risks

Условно совместимое крепление может попасть в верхний CTA; массовая шаблонная страница может формально существовать без полезного результата; длинный список может раскрыться на мобильном.
