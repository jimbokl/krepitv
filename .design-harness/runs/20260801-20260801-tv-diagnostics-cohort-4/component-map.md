# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Закрытые наблюдения | `ChoiceGrid` / `TriStateChoice` | reuse | component tests + screenshots |
| Локальный план | `calculateTvTrafficTask` + Rust dispatcher | extend | Rust unit tests |
| Loading/error/retry/focus | `TvTrafficTaskWizard` | reuse | browser state captures |
| SSR без JS | `tv_diagnostic_answer` in sitegen | extend | generated HTML tests |
| Каноникал и FAQ | `data/seo_pages.json` + sitegen | extend | static SEO audit |
| Внутренние ссылки | `preferredRelatedIds` + SSR mapping | extend | related-map tests |
| Источники | `sourceRegistry` + source manifest | extend | source-contract tests |
