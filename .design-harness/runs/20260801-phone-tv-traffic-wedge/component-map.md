# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Оболочка мастера | `TvDimensionsCalculator` | reuse visual grammar | `PhoneTvConnectionWizard.jsx` |
| Выборы | native radio + Tailwind tokens | extend locally | `ChoiceGrid`, keyboard/focus screenshot |
| Кнопки | `primary-button`, `secondary-button` | reuse | `styles.css` and state screenshots |
| Навигация | `SiteHeader`, `SiteFooter`, static equivalents | extend | sitewide link to canonical |
| Расчёт | Rust/WASM engine pattern | extend | 20-case deterministic matrix |
| SSR | `seo_calculator_note`, `seo_page_body` | extend | one canonical and source-backed matrix |
| Аналитика | `emitResultCompleted` | reuse | controlled `phone_tv_connection` event |
| Иллюстрации | none | omit | exact instructional UI needs no raster asset |
