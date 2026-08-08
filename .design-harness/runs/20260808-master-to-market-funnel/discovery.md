# Discovery

## Existing Design System

Переиспользуются `primary-button`, `secondary-button`, `paper`, `ink`, `action`, `technical`, `verified`, шрифты проекта и `ArrowRight`. Данные цепочки задают compatibility graph, `GuidedSelectionPage` и `MountPage`.

## Reuse Decisions

`SeoPage` — общий React-шаблон 85 SEO-материалов; `seo_page_body` — эквивалентный Rust SSR. `/podbor/` уже выдаёт карточки через `CompatibilityResult`, а `MountPage` содержит Market CTA/fallback.

## New Primitives And Rationale

Один общий `MountFunnelNextStep` устраняет дублирование и получает эквивалентную SSR-функцию. Других примитивов не требуется.

## Risks

CTA нельзя показывать раньше собственного результата и нельзя вести прямо на Маркет без подтверждённой совместимости. React и SSR должны оставаться идентичными по marker, тексту и ссылке.
