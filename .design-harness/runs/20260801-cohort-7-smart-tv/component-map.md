# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Четыре закрытых вопроса | `TvTrafficTaskWizard`, `ChoiceGrid` | extend | cohort 6 browser/test evidence |
| Локальный результат | `TvTrafficTaskPlan` + WASM JSON | extend | Rust typed tests |
| SSR direct answer | `seo_calculator_note` + `SeoPage` facts/FAQ | extend | sitegen tests/raw HTML |
| Источники | `sourceRegistry` + source manifest | extend | exact source-id parity tests |
| Статусы/ограничения | `TrafficTaskResult` | reuse | action/needs/external/service states |
| Навигация | `getRelatedPages` + next card | extend | related-link tests |
| Визуальный язык | existing Tailwind tokens/components | reuse | drift scan + screenshots |
