# Component Map

| Зона | Решение | Статус |
|---|---|---|
| Шаги | `RailStep` расширяется с 3 до 4 | reuse |
| Выбор марки | нативный `select` + primary button | reuse tokens |
| Выбор модели | `ModelSearch` с brand-filtered index | reuse |
| Стена/механизм | существующий `ChoiceGrid` | unchanged |
| Совместимость | `CompatibilityResult` + Rust/WASM | unchanged |
| Данные модели | `ModelFacts` | unchanged |
| Доверие | `TrustMark` | unchanged |
| SSR fallback | brand select + каталог в `<details>` | revised |
