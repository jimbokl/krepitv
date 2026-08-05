# Discovery

## Existing Design System

Первый шаг уже задаёт эталон select: `border-ink`, `bg-white`, `focus:border-action`, `CaretDown`, responsive grid и disabled primary button. Данные моделей находятся в `catalog.models`.

## Reuse Decisions

Повторно использовать разметку и классы brand-select, фильтровать опции по exact `brand`, сохранить существующие state reset и submit boundary.

## New Primitives And Rationale

Экспортируемый pure helper сортировки/фильтрации моделей нужен для тестируемого контракта. Нового визуального примитива нет.

## Risks

Большие бренды дают до 30 моделей; длинные коды должны помещаться на 320 px и при 200% текста. DOM-подмена не должна разрешать модель другой марки.
