# Discovery

## Existing Design System

Существующая система — Tailwind с токенами `paper`, `ink`, `action`, `technical`, `verified`, `line`, шрифтовыми ролями `font-display` и `font-mono`, жёсткими редакционными рамками, dashed-разделителями и Phosphor Icons. Переиспользуются `KitSection`, `StatusBadge`, `MountMarketLink`, `TrustMark`, `.input-control`, существующая сетка и print rules. Источник данных — `InstallationKitPlan` из Rust/WASM.

## Reuse Decisions

Сохраняем инженерно-редакционную эстетику и существующие статусы. Summary — новая композиция из текущих данных, а не второй результат. Измерительный блок использует обычные `details`, `select`, `input`, существующие focus-ring и form controls.

## New Primitives And Rationale

Один новый presentation-only компонент `InstallationKitBuildSummary`; отдельный визуальный примитив не создаётся. Кабельный verdict расширяет существующий `CablePanel`.

## Risks

Дублирование CTA, потеря прямого URL Маркета, показ CTA в uncertain/blocked, числовой overflow на мобильном, скрытые предупреждения в печати, передача замеров в аналитику.
