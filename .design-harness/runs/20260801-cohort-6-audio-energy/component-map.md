# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Выбор аудиопути | `TvTrafficTaskWizard` | extend | закрытые radio enum и общая result surface |
| Расчёт кВт·ч | числовые calculators + Rust/WASM bridge | create/extend | отдельная formula contract, те же controls |
| SSR-ответ | `seo_calculator_note` / `SeoPage` | extend | ответ и источники до hydration |
| Перелинковка | `preferredRelatedIds` + sitegen related | extend | точное совпадение React/SSR |
| Визуальная система | Tailwind tokens, typography, borders | reuse | production reference KREPI TV |
| QA состояний | `capture-page.mjs` | extend | reproducible mobile/tablet/desktop evidence |
