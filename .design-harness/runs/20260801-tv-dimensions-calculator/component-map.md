# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Два режима расчёта | `ViewingDistanceCalculator` mode/form pattern | extend | `web/src/components/ViewingDistanceCalculator.jsx` |
| Чистая геометрия | `screen_dimensions_16_by_9`, validation helpers | extend | `crates/engine/src/lib.rs` |
| WASM loading | `catalog.js` engine loader | extend | `web/src/lib/catalog.js` |
| Результат и live state | `ResultMetric`, `emitResultCompleted` | reuse | existing calculator tests |
| Выбор точной модели | `ModelSearch` и проверенный catalog | reuse | 80 source-backed models |
| Ниша и корпус | engine validation helpers | create | Rust tests for active-area and exact-case fit |
| SSR-ответ и таблица | `seo_calculator_note`, sitegen page policy | extend | `crates/sitegen/src/main.rs` |
| Responsive tokens | Tailwind components from `styles.css` | reuse | `DESIGN.md` |
| Raster imagery | none | omit | exact geometry is deterministic HTML/SVG |
