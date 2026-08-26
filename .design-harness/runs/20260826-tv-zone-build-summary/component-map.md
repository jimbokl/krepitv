# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Сводка пары и статуса | `KitSection`, `StatusBadge`, `MountMarketLink` | create `InstallationKitBuildSummary`, reuse primitives | UI tests + desktop/mobile screenshots |
| Кабельный verdict | `CablePanel` | extend | Rust contract tests + blocked/verified screenshots |
| Измерение штекера | `.input-control`, current step form | extend `PlacementCableStep` | component test + focus state |
| Подробные проверки | seven existing `KitSection` panels | reuse; add stable anchors | visual contract test |
| Печать | existing `@media print` rules | extend | print screenshot |
