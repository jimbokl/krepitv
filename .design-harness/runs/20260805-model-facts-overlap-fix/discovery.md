# Discovery

## Existing Design System

Tailwind-токены `ink`, `muted`, `technical`, `line`; семантический `dl/dt/dd`; Phosphor icons; существующие каталожные данные.

## Reuse Decisions

Сохраняются компонент и композиция. Исправляется только его внутренняя grid-геометрия и добавляется машинный overlap-check.

## New Primitives And Rationale

None: существующих примитивов достаточно.

## Risks

Длинные неразрывные размеры и узкие колонки; ложная проверка только document-level overflow не замечает пересечение соседей.
