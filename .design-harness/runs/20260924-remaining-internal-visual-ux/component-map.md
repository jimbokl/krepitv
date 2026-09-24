# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Остальные SEO | `seo-editorial-hero`, photo manifest | extend | render + validator |
| Проверенная модель | собственный VESA SVG, ModelPage | move into hero | SSR/React parity |
| Кронштейн | собственная схема, MountPage | move into hero | SSR/React parity |
| Неподтверждённая модель | safety state, observed page | extend | noindex/absence of CTA |
| Каталоги и служебные | existing editorial components | extend only where useful | visual QA |
