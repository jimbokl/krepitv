# Design Specification

## Context

Первый зрелый page-only сигнал Google относится к `/modeli/tcl-65c7k/`, но
главная до изменения вела только в общий каталог моделей.

## Goal

Дать зрелой точной модели одну прямую ссылку с верхнего уровня графа и показать
пользователю реальный пример паспортной проверки без длинного списка.

## Non-goals

Новые URL, новые модели, изменение модельной страницы, партнёрские ссылки,
публикация метрик и переработка дизайна главной.

## Inputs

Приватный page-only отчёт Google, `data/tv_models.json`, существующие компоненты
`ModelFacts`, `ArrowRight`, `modelHref` и утверждённые Tailwind-токены.

## Constraints

Только русский UI; SSR и React должны совпадать; один canonical; без цены;
без произвольных цветов/отступов; минимум 320 CSS px; блок скрывается после
выбора другой модели.

## States

Default: карточка видна. Focus: существующий `focus:ring-2 focus:ring-action`.
Empty: при отсутствии exact id блок fail-closed не рендерится. Loading, error,
success и disabled относятся к поиску модели и не меняют статическую ссылку;
после успешного выбора spotlight скрывается в пользу результата пользователя.

## Acceptance tests

1. В SSR и React присутствует ровно один `data-home-model-spotlight`.
2. `href` равен `/modeli/tcl-65c7k/`, а модель существует один раз в реестре.
3. Видимые VESA, диагональ и масса берутся из модели, а не дублируются строкой.
4. Все остальные модели остаются только в сгруппированном каталоге.
5. На 320, 768 и 1440 CSS px нет горизонтального переполнения, обрезки текста
   и наложения CTA.
6. Блок не содержит Market URL, цену или поисковые показатели.

## Allowed files

`crates/sitegen/src/main.rs`, `web/src/components/ModelFacts.jsx`,
`web/src/pages/HomePage.jsx`,
`web/tests/home-model-spotlight.test.mjs`,
`product-docs/operations/seo-improvement-cycle-2026-08-05.md`.

## Verification commands

`npm run build`; `node --test web/tests/home-model-spotlight.test.mjs`;
локальные PNG-capture 320×800, 768×1024 и 1440×900.

## Sources and claims

Поисковый порог подтверждается приватным GSC page-only отчётом; паспортные
значения — `data/tv_models.json`. На публичной странице метрики не показываются.

## Asset contract

Три PNG viewport-capture. Точный текст и числа рендерятся HTML из реестра.
Imagegen не используется: новый графический актив не нужен.

## Review and rollback

Независимый subagent-review по трём capture. Откат — revert коммита spotlight и
повторный Pages deploy предыдущего проверенного артефакта.
