# Visual Direction

## Visual Thesis

Техническая маршрутная плашка в существующем бруталистском стиле: моноширинный kicker, крупный заголовок, три шага и одна оранжевая CTA.

## Direction Options

1. Одна кнопка без объяснения — компактно, но скрывает границу Маркета.
2. Три шага и primary CTA — объясняет путь и сохраняет собственную ценность.
3. Товарные карточки прямо под мастером — агрессивно и нарушает fail-closed порядок.

## Selected Direction

Вариант 2: маршрут виден, но реклама не вытесняет результат.

## Hierarchy And Reading Order

Результат мастера → заголовок следующего шага → три этапа → кнопка `/podbor/` → пояснение о границе Маркета.

## Composition And Negative Space

Один full-width section с существующими границами; три шага образуют сетку без вложенных карточек и лишнего декора.

## Palette And Typography

Только `paper`, `ink`, `line`, `action`, `technical`, `verified`; IBM Plex Mono/Sans и Roboto Condensed через существующие классы.

## Responsive Or Sequence Behavior

На 320 px шаги идут одной колонкой. На tablet/desktop — три колонки. Нативная ссылка сохраняет reading order и видимый focus.

## Exact-content Layer

Заголовок, CTA и предупреждение из `task.json` выводятся как точный HTML/JSX-текст.

## Imagegen Layer And Invariants

None. Новые изображения не нужны; утверждённая визуальная система сохраняется.
