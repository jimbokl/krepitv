# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Закрытые ответы | `ChoiceGrid`, `TriStateChoice` | reuse | `TvTrafficTaskWizard.jsx` |
| Локальный fail-closed план | `normalizeTvTrafficTaskPlan`, `TrafficTaskResult` | reuse | targeted test |
| Официальные источники | `sourceRegistry`, `TvTrafficTaskReference` | extend | source URL assertions |
| SEO wiring | `tvTrafficTaskByPageId`, `preferredRelatedIds` | extend | mapping assertions |
| QA состояния | `--tv-traffic-state` scenarios | extend | capture-helper assertions |
| Визуальный язык | существующие Tailwind tokens/classes | reuse | drift scan |
