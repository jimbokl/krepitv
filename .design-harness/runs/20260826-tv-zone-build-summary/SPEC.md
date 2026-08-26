# Design Specification

## Context

На `/podbor/` уже есть шестишаговый мастер и подробный результат из семи секций. Вычисления выполняет Rust/WASM. Новый спринт добавляет точную проверку зазора заднего штекера и уплотняет первый экран результата, не удаляя доказательства ниже.

## Goal

Показать пользователю короткую проверяемую сборку ТВ-зоны и безопасно остановить переход к товару, если габарит заднего штекера неизвестен или превышает минимальный отступ кронштейна.

## Non-goals

Новые товары, категории аксессуаров, цены, SEO URL, PDF-шаблон, электромонтаж, новые формулы в JavaScript.

## Inputs

Текущие компоненты `/podbor/`, `InstallationKitPlan`, дизайн-токены, утверждённый implementation plan и четыре детерминированных результата Rust: verified, needs-measurement, conflict, no-offer.

## Constraints

Русский язык; WCAG-friendly focus; без горизонтального скролла; один прямой CTA Маркета только в verified; без цен; zero new sitemap URLs; CLS ≤0.10, LCP ≤2500 ms, TBT ≤200 ms; print сохраняет причины и чек-лист.

## States

`default`, `loading`, `empty`, `error`, `success`, `disabled`, `verified`, `needs-check`, `blocked`, `no-offer`, `focus`, `print`. Базовые состояния мастера (`default/loading/empty/error/success/disabled`) сохраняют существующую геометрию; новые детерминированные состояния результата проверяются отдельно.

## Acceptance tests

- Summary виден до семи подробных секций и содержит точную модель и кронштейн ровно один раз.
- Неподтверждённые секции перечислены не более чем тремя видимыми пунктами; остаток под `details`.
- При `needs-measurement` и `conflict` CTA Маркета отсутствует; при verified он один, прямой и без цены.
- Кабельный блок показывает доступный зазор, замер и margin только из готового plan.
- На 390/768/1440 px нет горизонтального overflow, clipping или перекрытий.
- Все контролы доступны с клавиатуры, ошибки связаны `aria-describedby`, статус имеет текст.
- В print остаются summary, предупреждения и подробный чек-лист; кнопки скрыты.

## Allowed files

Только файлы, перечисленные в `task.json`; вычислительный Rust-контракт уже реализуется отдельным TDD-task и не относится к визуальному drift-scan.

## Verification commands

Команды из `task.json`, полный `npm run build`, screenshot capture и трёхкратный layout-stability gate из implementation plan.

## Sources and claims

Техническое утверждение о расчёте подтверждается implementation plan и кодом Rust. Маркетинговых, медицинских и ценовых утверждений нет.

## Asset contract

PNG evidence: 390×1000 mobile needs-check, 1440×1100 desktop verified, 1440×1600 print blocked. Текст рендерится детерминированно DOM-слоем. Imagegen не используется.

## Review and rollback

Final review проверяет цель, все состояния, responsive, accessibility, exact content, drift и residual risks. Rollback: revert feature commits и восстановить предыдущий tracked `docs/` artifact; URL и sitemap не меняются.
