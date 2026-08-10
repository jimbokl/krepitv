# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Видимый trust-блок | border/grid/font tokens | create `EditorialAccountability` | React render tests + screenshots |
| Строгое основание | JSON data contracts | extend fail-closed builder | unit tests + whole-artifact verify |
| SSR до JavaScript | Rust `static_layout` | extend one escaped helper | Rust test + `scripts/verify.mjs` |
| Публичный автор | trust pages | create `/redaktsiya/` | route test + sitemap |
| Постоянная навигация | `SiteFooter` | extend one link | footer render test |
| Доверительная страница | `TrustPage` | extend publisher line | trust screenshot |
| Изображения | None | reuse no asset | no generated visual |
