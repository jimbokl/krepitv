# Discovery

## Existing Design System

Используются существующие Tailwind-токены `paper`, `ink`, `action`, `technical`,
`verified`, `danger`, `line`, `muted`; Roboto Condensed для заголовков и IBM
Plex для текста/служебных подписей. Утверждённая композиция traffic-first
мастеров: крупный служебный kicker, закрытые radio-grid, необязательные детали
в native `<details>`, результат с нумерованными шагами и видимыми источниками.

Существующие контракты: `TvTrafficTaskWizard`, `TvTrafficTaskInput/Plan`, один
WASM dispatcher, `SeoPage`, `seo_calculator_note`, статический sitegen,
privacy-safe `emitResultCompleted`, sitemap/lastmod и production capture helper.

## Reuse Decisions

- Расширить общий `TvTrafficTaskWizard` тремя config, не создавать три почти
  одинаковых компонента.
- Расширить общий Rust `calculate_tv_traffic_task`; сохранить пять закрытых
  строковых полей и единую форму результата.
- Переиспользовать error/retry/loading/focus/status/rendering и source registry.
- Добавить три самостоятельных SSR-ответа в существующий sitegen и три записи
  `seo_pages.json`.
- Переиспользовать текущую типографику, рамки, кнопки и адаптивную сетку без
  изображений, градиентов и нового визуального языка.

## New Primitives And Rationale

Новых визуальных примитивов нет. Добавляются только task-config, source entries,
Rust-ветки и содержательные SSR-блоки. Это уменьшает дублирование и сохраняет
одинаковое поведение состояний всех diagnostic utility.

## Risks

- Слишком уверенный текст может выглядеть как диагноз аппаратной неисправности.
- Общий source registry может разойтись с JSON-манифестом и SSR.
- «Звук есть, изображения нет» может пересечься с «Нет сигнала», если не
  закрепить различие: видимый интерфейс/сообщение против полностью чёрного экрана.
- Автоматические HTTP-проверки официальных сайтов могут получать 403; такой
  источник нельзя автоматически объявлять битым.
