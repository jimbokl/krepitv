# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Точный поисковый сниппет | `commercial_profile_for` + `html_shell` | extend | Профиль переопределяет title/description только одного существующего URL |
| Прямой ответ и FAQ | `commercial_profile_html` / `CommercialProfile` | reuse | SSR и React читают один публичный JSON |
| Паспорт модели | `ModelPage` / `model_page_body` | reuse | VESA, масса, размеры и источник уже в `tv_models.json` |
| Совместимые кронштейны | compatibility graph | reuse | 14 рёбер `verified-fit`, без условных вариантов |
| Техническое изображение | существующий `xiaomi-tv-a-pro-65-2025-vesa.svg` | reuse | Новый визуальный ассет не требуется |
