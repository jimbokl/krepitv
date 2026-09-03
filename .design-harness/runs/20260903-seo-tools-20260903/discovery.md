# Discovery

## Existing Design System

Tailwind-токены `paper`, `ink`, `action`, `technical`, `danger`, display/mono типографика; рамки 1–2 px; компоненты `SeoPage`, `SeoEvidenceGuide`, `MountFunnelNextStep`; data contract `SeoPage.guide`.

## Reuse Decisions

Повторно используются все визуальные примитивы и композиция существующих доказательных руководств. Добавляется только контент и семантическая таксономия.

## New Primitives And Rationale

None. Существующий компонент уже покрывает таблицу, состояния, источники, стоп-границу и CTA.

## Risks

Длинные заголовки на 320 px, переполнение таблиц, рассинхронизация SSR/React и слишком ранний коммерческий переход.
