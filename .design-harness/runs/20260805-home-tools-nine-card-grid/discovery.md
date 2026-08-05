# Discovery

## Existing Design System

Используются существующие Tailwind-токены `paper`, `ink`, `line`, `action`,
существующая карточка `data-featured-traffic-tool` и детерминированный каталог
`data/seo_pages.json`. React и Rust SSR уже имеют один и тот же блок.

## Reuse Decisions

Переиспользовать карточку и сетку без нового компонента. Увеличить выборку с 7
до 9, синхронизировать tie-break сортировки и SSR-классы с React.

## New Primitives And Rationale

None: новых примитивов и графических активов не требуется.

## Risks

SSR мог показывать четыре колонки и другой порядок карточек до гидратации.
Исправление должно исключить layout shift и сохранить доступные обычные ссылки.
