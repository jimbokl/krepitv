# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Общая шапка и навигация | SiteHeader/static_header | reuse | Те же ссылки и breakpoint |
| Поиск точной модели | ModelSearch/model-search.json | extend | Добавить наблюдаемые canonical routes |
| Группировка 100+ моделей | CatalogBrandGroups/brand_catalog_html | extend | Отдельный закрытый блок наблюдаемых моделей |
| Проверенная модель | ModelPage/model_page_body | reuse | Не менять семантику подтверждённых фактов |
| Наблюдаемая модель | None | create | ObservedModelPage + observed_model_page_body |
| Расчёт экрана 16:9 | существующая формула TvDimensions | reuse | Показать активную область, не корпус |
| Источник | существующие source-link styles | reuse | Прямой canonical Маркета без query |
| Совместимость | compatibility graph | suppress | Не строить edge без VESA/массы |
