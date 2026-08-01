# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| SEO shell and related jobs | `SeoPage` | extend | Existing calculator page routing |
| Numeric fields and actions | `input-control`, `primary-button`, `secondary-button` | reuse | `web/src/styles.css` |
| Exact-model data | `catalog.models` | reuse | `data/tv_models.json` |
| Core geometry | Rust `validate_range`, screen 16:9 helper | extend | `crates/engine/src/lib.rs` |
| Focusable wall preview | Existing SVG diagram conventions | create `WallPlannerDiagram` | Height/mounting diagrams lack X-axis and drag |
| Tool state and export | Calculator patterns + print CSS | create `WallPlannerCalculator` | One bounded coordinator |
| Analytics | `emitResultCompleted` | reuse | Controlled `toolId`/`resultType` only |
| Static search answer | `seo_calculator_note` and sitegen tests | extend | Raw HTML gate |
| Visual QA | capture-page + tracked design evidence | reuse | 320/768/1440 captures |
