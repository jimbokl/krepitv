# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Узкий поисковый ответ | `SeoPage` | reuse | Единый SSR/React canonical-шаблон |
| Локальный выбор следующего шага | `SeoEvidenceGuide` | reuse | 3 кнопки, aria-live и selected state |
| Сравнение веток | `SeoEvidenceGuide` table | reuse | SSR-таблица с внутренним overflow |
| Доверие и границы | guide stop + sources | reuse | Официальные HTTPS-ссылки и дата проверки |
| Навигация | related pages + SiteHeader/Footer | reuse | Существующая перелинковка и визуальная система |
