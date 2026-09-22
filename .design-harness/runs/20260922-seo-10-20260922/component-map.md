# Component And Asset Map

| Требование | Существующий примитив | Решение | Проверка |
|---|---|---|---|
| Оболочка, источники, таблица | SeoPage, SeoEvidenceGuide | reuse | SSR и build |
| Три вопроса | ConnectionHelper | extend | browser states |
| Ветвление плана | connection_helper_json | extend через Rust module | exhaustive tests |
| Перелинковка | related_seo_pages, RELATED_BY_ID | extend | verify и SSR |
| Событие результата | result_completed | reuse | dedup browser check |
