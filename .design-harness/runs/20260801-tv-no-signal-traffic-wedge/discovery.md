# Discovery

## Existing Design System

Переиспользуется production-система KREPI TV: Tailwind tokens `paper`, `ink`,
`action`, `technical`, `verified`, `danger`; Roboto Condensed для заголовков,
IBM Plex Sans для текста и IBM Plex Mono для kicker/status; плоские границы без
теней и градиентов. Ближайший интерактивный паттерн —
`PhoneTvConnectionWizard`, SSR-паттерн — `seo_calculator_note`, аналитика —
`emitResultCompleted`, WASM-loader — `web/src/lib/catalog.js`.

## Reuse Decisions

- Переиспользовать `fieldset`/native radio, gap-px сетку, primary/secondary button.
- Переиспользовать fail-closed Rust JSON-wrapper и локальный retry WASM-loader.
- Переиспользовать один canonical SEO-record и исключение generic affiliate/catalog.
- Переиспользовать существующий header/footer/home tool navigation.
- Все официальные источники показывать прямыми ссылками рядом с соответствующей веткой.

## New Primitives And Rationale

Один новый компонент `TvNoSignalWizard` нужен, потому что ветки диагностики и
результат «следующая проверка» отличаются от подбора способа подключения. Новых
визуальных primitives, токенов, иконок и изображений не требуется.

## Risks

Главный риск — спутать надпись телевизора с сообщением приставки. Поэтому мастер
сначала проверяет, открывается ли меню ТВ, затем источник изображения. Второй
риск — слишком ранний сброс/покупка: эти действия исключены из первичного плана.
