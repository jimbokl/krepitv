# Discovery

## Existing Design System

Существующие `TvTrafficTaskWizard`, `SeoPage`, `seoPages.mjs`, Rust
`TvTrafficTaskPlan`, sitegen SSR-блоки и Tailwind-токены уже покрывают четыре
закрытых выбора, loading/error/retry, status, источники и сворачиваемый хвост.
Утверждённый визуальный референс и предыдущая когорта 6 являются baseline.

## Reuse Decisions

Расширить существующий task registry и engine dispatcher. Переиспользовать
ChoiceGrid, result layout, source links, related cards, analytics event и SSR
композицию. Не создавать отдельный компонент на каждую платформу.

## New Primitives And Rationale

None. Новые визуальные примитивы не нужны; добавляются только конфигурации,
контент и закрытая доменная логика.

## Risks

Длинные названия платформ и предупреждения могут переполнить 320 px. Сброс
деструктивен, поэтому confirmation нельзя предзаполнять. Generic menu paths могут
быть неверны для года/региона, поэтому мастер останавливается без точной инструкции.
