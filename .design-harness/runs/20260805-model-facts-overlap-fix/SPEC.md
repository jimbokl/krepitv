# Design Specification

## Context

Во внешнем Chrome на `/podbor/` длинные значения подробного `ModelFacts` выходят из узкой колонки и визуально оказываются под соседней монтажной иллюстрацией.

## Goal

Сделать сетку фактов shrink-safe: адаптивная колонка подписи, нулевая минимальная ширина и безопасный перенос длинных значений.

## Non-goals

Редизайн результата, новая графика, изменение данных моделей, URL, SEO-текста, коммерции или совместимости.

## Inputs

Скриншот текущего внешнего Chrome и существующие `ModelFacts`/`GuidedSelectionPage`.

## Constraints

Сохранить русский интерфейс, Tailwind-токены, Phosphor icons и текущую композицию «факты + иллюстрация».

## States

Default — выбранная модель до расчёта; success — готовые результаты совместимости. Loading, empty, error, disabled и focus сохраняют тот же статический блок фактов, поэтому проверяются как layout-инварианты без отдельного дизайна.

## Acceptance tests

- Длинные `dd` имеют `min-width: 0` и безопасный перенос.
- Колонка подписи больше не фиксирована на 13rem внутри узкого контейнера.
- QA-capture отклоняет текст, если он заходит в вертикально пересекающуюся область иллюстрации.
- На 320, 768 и 1470 CSS px нет горизонтального overflow или перекрытия.
- Содержимое всех фактов остаётся полным.

## Allowed files

Совпадают с `task.json`: компонент фактов, мастер, его QA/test, `docs/` и run-пакет.

## Verification commands

Targeted SSR-тесты, полный `npm run build`, drift scan и browser screenshots.

## Sources and claims

None: no externally checkable claims; значения поступают из существующего каталога без изменений.

## Asset contract

Новых активов нет. Текст и числа остаются детерминированным HTML; imagegen не используется.

## Review and rollback

Headless Chrome проверяет bounding boxes. Rollback — откат release-коммита и повторная сборка GitHub Pages.
