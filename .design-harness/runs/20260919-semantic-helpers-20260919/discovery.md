# Discovery

## Existing Design System
DESIGN.md, input-control, primary-button, paper/ink/action/line, IBM Plex Sans и Roboto Condensed. Таблица SeoEvidenceGuide уже имеет SSR.

## Reuse Decisions
Переиспользовать оболочку SEO, таблицу и источники, контекстную навигацию, измерение tool_usage/result_completed и калькулятор VESA.

## New Primitives And Rationale
Один ConnectionHelper для трёх разных наборов параметров. Движок возвращает локальный план; три независимых формы не нужны.

## Risks
Дублирование инструкций и рекомендаций; общий источник не доказывает модельную совместимость. Состояния unknown сохранять.
