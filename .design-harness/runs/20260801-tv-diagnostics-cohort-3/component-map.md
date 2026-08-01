# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Закрытые наблюдения | `ChoiceGrid`, `TriStateChoice` | reuse | native fieldset/radio, видимый focus |
| Общий жизненный цикл | `TvTrafficTaskWizard` | extend | default/loading/error/retry/success уже реализованы |
| Локальная логика | `TvTrafficTaskInput`, `tv_traffic_task_plan_json` | extend | один Rust/WASM dispatcher без новых сетевых данных |
| Результат | `TrafficTaskResult` | reuse | headline, status, steps, stop-condition, warnings |
| Источники | `sourceRegistry`, `TvTrafficTaskReference` | extend | видимые первичные ссылки |
| Crawlable ответ | `seo_calculator_note` | extend | substantive SSR до JavaScript |
| Страница и навигация | `SeoPage`, `related_seo_pages` | extend | один canonical и нормальные внутренние ссылки |
| Визуальный стиль | существующие Tailwind tokens/components | reuse | `DESIGN.md`, текущие traffic utility screenshots |
| Растровые assets | отсутствуют | none | точный UI рендерится HTML/CSS |
