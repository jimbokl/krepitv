# Discovery

## Existing Design System

Tailwind-токены `ink`, `paper`, `panel`, `muted`, `action`, существующие
`primary-button`/`secondary-button`, Roboto Condensed + IBM Plex Sans/Mono.
MetrikaConsent уже встроен в стандартную шапку и нестандартные входные страницы.
События используют CustomEvent и строгие controlled-token/path валидаторы.

## Reuse Decisions

Расширить существующую плашку и существующий event pipeline. Сохранить inline
размещение, border-ритм, русскую типографику и политику конфиденциальности.

## New Primitives And Rationale

Один новый технический примитив: делегированный tracker первого взаимодействия.
Визуальных примитивов не добавляется.

## Risks

React-гидратация создаёт границы поздно — delegation должен работать без
MutationObserver. Повторные события исключаются по tool_id/path. Сохранённый
отказ не должен быть перезаписан автоматическим default.
