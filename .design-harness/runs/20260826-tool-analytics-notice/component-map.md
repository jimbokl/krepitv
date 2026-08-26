# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Неблокирующая сноска | `MetrikaConsent` | extend | inline placement уже есть во всех shells |
| Основное действие | `primary-button` | reuse | «Понятно» закрывает только сноску |
| Явный отказ | `secondary-button` | reuse | denied сохраняется и выключает отправку |
| Политика | текстовая underline-ссылка | reuse | канонический `/politika-konfidencialnosti/` |
| Начало инструмента | CustomEvent pipeline | extend | `tool_started` с allowlisted detail |
| Готовый результат | `result_completed` | reuse | существующие emitters и цель Метрики |
| Приватный анализ | funnel report | extend | started/completed по известным tool_id |
