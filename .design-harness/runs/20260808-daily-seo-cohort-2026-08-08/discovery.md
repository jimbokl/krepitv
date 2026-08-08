# Discovery

## Existing Design System

Tailwind-токены `paper`, `ink`, `action`, `muted`, `line`; шрифты `font-display` и `font-mono`; существующие SiteHeader, SiteFooter, SeoPage и SeoEvidenceGuide. Контентный контракт задаётся `data/seo_pages.json`, статический SSR — Rust sitegen.

## Reuse Decisions

Повторно использовать SeoEvidenceGuide: он уже даёт три интерактивные ветки, SSR-таблицу, stop-блок, источники и состояния focus/success. Новые визуальные примитивы не нужны.

## New Primitives And Rationale

None: существующего компонента достаточно.

## Risks

Длинные H1 и таблица могут вызвать overflow на 320 px; близкие темы VESA и стен могут каннибализировать существующие материалы; технические советы могут быть ошибочно восприняты как назначение крепежа.
