# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Трёхвариантный инструмент | `SeoEvidenceGuide` | reuse | SSR и React используют одну data-схему |
| Редакционная ответственность | `EditorialAccountability` | reuse | автор, дата, методика и границы на каждой странице |
| Конверсия после результата | `MountFunnelNextStep` | reuse | CTA ведёт в `/podbor/`, а не сразу на Маркет |
| Взаимная перелинковка | `preferredRelatedIds` / `related_seo_pages` | extend | два тематических кластера синхронизированы в JS и Rust |
| Категория страницы | `seoPageKindLabel` | extend | четыре экранных инструмента относятся к настройке ТВ |
