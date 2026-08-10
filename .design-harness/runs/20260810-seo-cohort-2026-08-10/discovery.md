# Discovery

## Existing Design System

Tailwind-токены `paper`, `ink`, `action`, `muted`, `line`; `font-display`/`font-mono`; `SiteHeader`, `SeoPage`, `SeoEvidenceGuide`, `MountFunnelNextStep`. Контент задаёт `data/seo_pages.json`, SSR строит Rust sitegen.

## Reuse Decisions

Повторно использовать текущий guide-компонент и существующий funnel; они уже обеспечивают SSR, доступность и утверждённую визуальную систему.

## New Primitives And Rationale

None: новых примитивов не требуется.

## Risks

Длинные H1 и таблицы могут переполнить 320 px; близкие задачи настройки способны каннибализировать существующие страницы; технический совет нельзя выдавать за паспорт точной модели.
