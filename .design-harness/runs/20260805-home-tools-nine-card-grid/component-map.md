# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Девять карточек | `HomePage` featured tools nav | extend | limit 9, существующая карточка |
| SSR до JS | `home_page_body` | extend | take 9, детерминированный tie-break |
| Desktop/tablet 3×3 | текущая Tailwind grid | reuse | `sm:grid-cols-3` |
| Mobile | текущий breakpoint | reuse | одна колонка до 640 px |
| Фокус/ссылка | обычный `<a href>` | reuse | browser + source test |
