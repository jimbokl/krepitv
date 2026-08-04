# Discovery

## Existing Design System

Сохраняются Tailwind-токены `paper`, `ink`, `action`, `technical`, `verified`,
шрифты и сетка существующих ModelPage/CatalogIndexPage. Источник истины дизайна:
`web/src/styles.css`, `web/tailwind.config.js`, текущие утверждённые references.

## Reuse Decisions

Переиспользуются SiteHeader, ModelSearch, CatalogBrandGroups, кнопки, рамки,
типографика и responsive breakpoints. Новый ObservedModelPage нужен только для
честного состояния «модель найдена на Маркете, паспорт ещё не подтверждён».

## New Primitives And Rationale

Один новый page-компонент и SSR-шаблон. Новых визуальных токенов, иконок,
изображений, градиентов или альтернативной навигации нет.

## Risks

Главный риск — визуально принять наблюдаемую модель за проверенную. Статусы,
цвета и формулировки должны быть различимы; CTA к кронштейну запрещён до данных.
