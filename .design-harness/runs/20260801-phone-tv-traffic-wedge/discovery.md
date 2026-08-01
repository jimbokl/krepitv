# Discovery

## Existing Design System

`web/src/styles.css` и `web/tailwind.config.js`: paper/ink/action/verified/technical/danger, Roboto Condensed, IBM Plex Sans/Mono. Ближайший паттерн — `TvDimensionsCalculator`: двухколоночная оболочка, fieldset/radio, чёрные разделители, крупный результат. SEO-контракт — `data/seo_pages.json`; SSR — `crates/sitegen`; WASM wrappers — `web/src/lib/catalog.js`.

## Reuse Decisions

Переиспользованы `primary-button`, `secondary-button`, `SiteHeader`, `SiteFooter`, `SeoPage`, `emitResultCompleted`, Tailwind-токены и Phosphor icons. Прогрессивное раскрытие повторяет существующие `<details>` и не создаёт новый визуальный язык.

## New Primitives And Rationale

Создан один предметный компонент `PhoneTvConnectionWizard` и чистая Rust-модель маршрута: задача новая, но визуальные примитивы существующие. `ChoiceGrid` локален компоненту, потому что связывает native radio с конкретным прогрессивным сценарием.

## Risks

Бренд не подтверждает протокол; точных connectivity-профилей моделей пока нет. Поэтому брендовые маршруты остаются `needs-check`. Transient loading/error требуют принудительной WASM-задержки/ошибки только в headless QA; production query и debug-флаги не добавляются.
