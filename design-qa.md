# Design QA — «Полный монтажный комплект»

Дата проверки: 25 августа 2026 года

Маршрут: `/podbor/`

Состояние: первый шаг, выбранная стена и монтажный паспорт для `TCL 65C7K + ONKRON NN24`

## Источник визуальной правды

- Desktop-мастер: `product-docs/design-references/2026-08-25-full-installation-kit-visual/01-engineering-editorial-desktop.png` — 1487×1058 px.
- Mobile-мастер: `product-docs/design-references/2026-08-25-full-installation-kit-visual/02-field-tool-mobile.png` — 853×1844 px.
- Монтажный паспорт: `product-docs/design-references/2026-08-25-full-installation-kit-visual/03-installation-passport-desktop.png` — 1487×1058 px.
- Продуктовые ограничения: `product-docs/superpowers/specs/2026-08-25-installation-kit-visual-design.md`.

Референсы задают композицию, типографику, ритм и статусную иерархию. Растровые mockup-изображения намеренно не публикуются: production использует реальные данные, библиотечные иконки и существующие доказательные технические схемы, как зафиксировано в спецификации.

## Реализация и снимки

- Desktop, первый шаг: `.private/design-qa/2026-08-25/desktop-start-1440x1024.png` — 1440×1024 px, CSS viewport 1440×1024, density 1.
- Mobile, первый шаг: `.private/design-qa/2026-08-25/mobile-start-390x844.png` — 390×844 px, CSS viewport 390×844, density 1.
- Mobile, выбранная стена: `.private/design-qa/2026-08-25/mobile-wall-selected-viewport-390x844.png` — 390×844 px, CSS viewport 390×844, density 1.
- Mobile, паспорт: `.private/design-qa/2026-08-25/mobile-passport-390x844.png` — 390×844 px, CSS viewport 390×844, density 1.
- Tablet, паспорт: `.private/design-qa/2026-08-25/tablet-passport-768x1024.png` — 768×1024 px, CSS viewport 768×1024, density 1.
- Desktop, паспорт: `.private/design-qa/2026-08-25/desktop-passport-1440x1024.png` — 1440×1024 px, CSS viewport 1440×1024, density 1.

## Нормализация и совместное сравнение

Desktop-референсы пропорционально приведены из 1487×1058 к 1440×1024; mobile-референс — из 853×1844 к 390×844. Плотность реализации равна одному пикселю снимка на один CSS px. Совместные полотна содержат источник слева и реализацию справа:

- `.private/design-qa/2026-08-25/compare-desktop-start-final.png` — 2880×1024 px.
- `.private/design-qa/2026-08-25/compare-mobile-start-final.png` — 780×844 px.
- `.private/design-qa/2026-08-25/compare-desktop-passport.png` — 2880×1024 px.

## Full-view comparison

- Desktop сохраняет тёплый бумажный фон, выразительный condensed-заголовок, асимметричную инженерную сетку, вертикальную шкалу шагов, один главный выбор и открытый список результата справа.
- Mobile превращает тот же продукт в один вопрос на экран: горизонтальный прогресс, крупный select, действие на всю ширину и свёрнутый блок результата. Горизонтального overflow нет.
- Паспорт сохраняет документную иерархию: общий статус и точная пара, печать, семь независимых проверок, таблицы фактов и компактная статусная навигация. Неполные данные визуально не маскируются под подтверждённые.

## Focused region comparison

- Mobile wall state: крупные строки выбора, нативные radio, выбранный `Бетон` с рамкой действия, доступная кнопка продолжения; снимок `mobile-wall-selected-viewport-390x844.png`.
- Passport header/statuses: общий `needs-check`, verified-совместимость и винты, отдельные янтарные статусы остальных секций; снимки `mobile-passport-390x844.png` и `desktop-passport-1440x1024.png`.
- Factual tables: IBM Plex Mono и табличные цифры для модели, VESA, массы, винтов и высот; планшетный снимок `tablet-passport-768x1024.png` позволяет прочитать строки и источники без масштабирования.

## Обязательные поверхности

- **Шрифты и типографика:** Roboto Condensed формирует заголовочную иерархию, IBM Plex Sans сохраняет читаемость, IBM Plex Mono используется только для технических меток. Переносы русских заголовков устойчивы на 390/768/1440.
- **Ритм и сетка:** desktop/sidebar, tablet и одноколоночный mobile не перекрываются; цели касания не меньше 44 px, primary на mobile — 52 px. Вложенного каскада карточек нет.
- **Цвета и токены:** оранжевый зарезервирован для действия, зелёный — для подтверждённого, янтарный/красный — для проверки и остановки. Смысл продублирован иконкой и текстом.
- **Изображения и ассеты:** mockup-референсы не выданы за фактические схемы; кастомных SVG/CSS-иллюстраций и placeholder-изображений нет. Все видимые иконки — одна библиотека Phosphor.
- **Текст:** публичный UI полностью русский; нет цен, коммерческих обещаний, логотипа Маркета, точек сверления или точного стенового крепежа без evidence.
- **Состояния и доступность:** radio/select имеют нативную семантику, focus-visible сохранён, mobile disclosure работает, reduced-motion предусмотрен. Browser console: 0 errors, 0 warnings.

## История исправлений

### Итерация 1 — P1, desktop-предпросмотр был визуально пустым

- Evidence: `.private/design-qa/2026-08-25/compare-desktop-start.png`.
- Причина: закрытый `<details>` оставлял заголовок «Что вы получите», но браузер скрывал содержимое, несмотря на desktop CSS-правило.
- Влияние: исчезала ключевая правая колонка и композиция теряла обещание продукта.
- Исправление: mobile оставлен отдельным закрытым `<details>`, desktop получил постоянно видимую семантическую секцию; добавлены `data-kit-outcome-mobile` и `data-kit-outcome-desktop` и SSR-контракт.
- Post-fix evidence: `.private/design-qa/2026-08-25/compare-desktop-start-final.png`; desktop body visible, mobile desktop-body hidden, горизонтальный overflow отсутствует.

## Findings

После повторного сравнения actionable P0/P1/P2 не осталось.

## Open Questions

Нет. Отличия от растровых mockup-иллюстраций осознанны и описаны в визуальной спецификации: production не должен выдавать концептуальную картинку за техническое доказательство.

## Implementation Checklist

- [x] Desktop-предпросмотр результата постоянно видим.
- [x] Mobile-предпросмотр остаётся свёрнутым и раскрываемым.
- [x] Основной путь brand → model → wall → mechanism → mount → placement → result пройден в браузере.
- [x] Проверены 390×844, 768×1024 и 1440×1024.
- [x] Проверены overflow, семантика, статусы, таблицы, печать и fail-closed Market CTA.
- [x] Компонентные тесты и release-сборка проходят.

## Follow-up Polish

P3-замечаний, которые стоит переносить в этот спринт, нет.

final result: passed
