# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Точный следующий шаг | `SeoMountFunnelNextStep` | extend | новый заголовок и действие |
| SSR до JavaScript | `seo_mount_funnel_next_step_html` | extend | дословная копия React |
| Mobile/desktop layout | существующая Tailwind grid | reuse | mobile stack, desktop columns |
| Клавиатурный фокус | `focus-visible:ring-*` | reuse | screenshot + source test |
| Начало подбора | существующий event helper | extend | `selection_start` на ссылке |
| Защита от завышения | session-scoped dedupe | extend | один result на tool+page |
