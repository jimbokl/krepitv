# Visual Direction

## Visual Thesis

Та же техническая редакционная эстетика KREPI TV, но без визуального «перезапуска» страницы после загрузки JavaScript.

## Direction Options

1. Полная React-гидратация всего root — отклонено из-за CLS и позднего LCP.
2. Полностью статические страницы — отклонено из-за потери подбора и актуальных офферов.
3. Локальные islands поверх самостоятельного SSR — выбрано.

## Selected Direction

SSR-first progressive enhancement локальных блоков с зарезервированной высотой там, где содержимое меняется над сгибом.

## Hierarchy And Reading Order

Header → основной ответ/H1 → поиск или паспорт → доказательства → действие. Порядок совпадает до и после enhancement.

## Composition And Negative Space

Существующая сетка, границы, интервалы и max-width остаются без изменений; поисковый fallback резервирует высоту мобильной компоновки.

## Palette And Typography

Только существующие `paper`, `ink`, `action`, `muted`, `line`, `panel` и утверждённые семейства шрифтов.

## Responsive Or Sequence Behavior

На 320 px поля складываются вертикально; на tablet/desktop сохраняется существующая сетка. SSR не исчезает во время загрузки данных.

## Exact-content Layer

Все русские подписи рендерятся детерминированно в HTML/React; генеративный текст отсутствует.

## Imagegen Layer And Invariants

None — новые изображения не нужны; утверждённые визуальные референсы не заменяются.
