# Discovery

## Existing Design System

Tailwind-токены и типографика уже закреплены production-дизайном KREPI TV.
Переиспользуются `TvTrafficTaskWizard`, `ViewingDistanceCalculator`,
`SeoPage`, `seoPages.mjs`, Rust `TvTrafficTaskPlan`, sitegen SSR sections,
`capture-page.mjs` и существующие analytics/result-completed контракты.
Storybook/Figma mapping отсутствуют; evidence строится на route screenshots.

## Reuse Decisions

Расширить существующий wizard двумя config-объектами и source registry. Числовой
energy flow оформить отдельным компонентом, но сохранить input-control,
primary-button, ResultMetric-ритм, aria-live/error и существующие цвета/границы.

## New Primitives And Rationale

Один новый `TvEnergyCalculator`, потому что числовая формула и четыре поля не
совпадают с закрытым radio decision-tree. Новых визуальных примитивов нет.

## Risks

Колонки и саундбар близки по словам, поэтому H1/SSR/related должны строго
ограничить страницу активными колонками/аудиосистемой. Тариф вводит пользователь;
никакая региональная цена не хранится. Общий JS-бандл может содержать affiliate
код, но DOM и исходящие Market-ссылки на трёх маршрутах должны отсутствовать.
