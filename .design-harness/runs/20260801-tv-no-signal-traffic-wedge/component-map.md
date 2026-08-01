# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Пошаговый выбор | `PhoneTvConnectionWizard` radio grid | extend | native controls, 48+ px targets |
| Локальный расчёт | Rust engine + WASM loader | extend | deterministic JSON + retry |
| Статический ответ | `seo_calculator_note` | extend | raw HTML remains useful without JS |
| Продуктовая аналитика | `emitResultCompleted` | reuse | controlled `tool_id` and `result_type` |
| Источники | direct official links | reuse | source id bound to result branch |
| Навигация | SiteHeader/Footer/Home featured tools | extend | normal internal links |
| Визуальный язык | production Tailwind tokens | reuse | no raw colors or new token family |
