# Design Specification
## Context
Страница формата: 75 показов / 2 клика за 07.09–04.10. Винты: 3 запуска без результатов, не доказанный баг.
## Goal
Наглядно сравнить полосы, обрезку и растяжение. Выбрать точную модель для винтов без переписывания кода.
## Non-goals
Не создаём URL, не меняем характеристики/цены, не маскируем дефекты панели.
## Inputs
LG support, действующие паспорта винтов, DESIGN.md, Rust engine и analytics.
## Constraints
Русский UI; SSR объяснение; Rust/WASM геометрия; существующие tokens и компоненты.
## States
Default: объяснение. Empty/disabled: формат или модель не выбраны. Loading: WASM. Error: модуль недоступен, можно повторить. Success: сравнение и следующий шаг. Focus: keyboard controls и результат.
## Acceptance tests
Нет overflow 320/768/1440. Fit/crop сохраняют круг; stretch меняет пропорции. Смена формата скрывает прежний расчёт. Событие только после расчёта, без ввода. Dropdown не выдаёт винты без паспорта.
## Allowed files
В task.json; docs — generated artifact штатной сборки.
## Verification commands
`npm run build`; `node scripts/qa/traffic-tools-sprint.mjs`. Логи и screenshots в evidence.
## Sources and claims
LG: полосы зависят от исходного формата. Геометрия — математическая модель экрана 16:9, не меню конкретного ТВ.
## Asset contract
Responsive SVG, точные значения Rust; без новых растров и сетевых зависимостей.
## Review and rollback
Независимый reviewer смотрит screenshots, код и события. Rollback: revert source commit и Pages deploy.
