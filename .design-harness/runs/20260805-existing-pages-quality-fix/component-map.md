# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| SEO-категория до/после JS | `SeoPage`, Rust `seo_page_body` | extend | Один семантический mapping по id в обоих рендерах |
| Поиск с клавиатуры | `ModelSearch` | extend | active option, Arrow keys, Enter, Escape, ARIA |
| Неизвестная модель | `ModelSearchEmptyState` | extend | Собственная помощь и внутренние ссылки первичны |
| Мобильное меню | `SiteHeader` | extend | aria-expanded/controls, Escape, focus return |
| Русские числительные | `HomePage` | create helper | Чистая `pluralizeRu` с unit tests |
| Итог кронштейна | `MountPage` | extend/reorder | Существующие факты, без новых claims |
| Визуальная система | Tailwind tokens/classes | reuse | Цвета, типографика, рамки и кнопки неизменны |
