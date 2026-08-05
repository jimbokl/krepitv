# Discovery

## Existing Design System

Tailwind-токены и глобальные стили находятся в `web/tailwind.config.js` и
`web/src/styles.css`. Переиспользуются `ModelFacts`, `ArrowRight`, `modelHref`,
типографика `font-display`/`font-mono`, цвета `paper`/`line`/`action` и
существующий контракт `data/tv_models.json`. Storybook отсутствует; визуальный
референс хранится в `product-docs/design-references`.

## Reuse Decisions

Переиспользовать карточную границу главной, существующие факты модели, link
focus-ring и responsive grid. Не добавлять локальный CSS или новый цвет.

## New Primitives And Rationale

None: существующих примитивов достаточно.

## Risks

Дублирование spotlight в SSR и React; переполнение CTA на 320 px; случайное
появление нескольких моделей; устаревание выбора при смене поискового сигнала.
