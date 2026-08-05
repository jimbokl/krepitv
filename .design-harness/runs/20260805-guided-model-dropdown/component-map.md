# Component And Asset Map

| Requirement | Existing primitive | Decision | Evidence |
|---|---|---|---|
| Выпадающий список марки | `GuidedSelectionPage` brand select | reuse | текущий шаг 1 |
| Выпадающий список модели | тот же native select pattern | extend | шаг 2, exact brand filter |
| Продолжение | `primary-button` | reuse | disabled до валидной модели |
| SSR-порядок | `matcher_page_body` | extend | статическая марка и disabled модель |
| QA | `capture-page.mjs` guided state | extend | выбор exact option без текстового ввода |
