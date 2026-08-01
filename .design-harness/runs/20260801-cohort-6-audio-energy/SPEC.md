# Design Specification

## Context

Fresh exact fixed-wordform Wordstat по России дал 10 429 для подключения колонок,
7 992 для подключения наушников и 2 030 для запроса о ваттах телевизора. Частоты
вариантов не складываются. First-party органика пока нулевая, поэтому существующие
страницы не переписываются; выпускается отдельная измеренная traffic-first когорта.

## Goal

Добавить три самостоятельных canonical с SSR-ответом, локальным результатом,
официальными источниками, явными ограничениями и естественными внутренними
переходами. Полезность не должна зависеть от Маркета или сервера.

## Non-goals

Не добавлять офферы, цены, редиректы, регистрацию, загрузку пользовательских
данных, модельные меню без подтверждения и массовые брендовые варианты страниц.

## Inputs

Существующий TvTrafficTaskWizard, числовой шаблон калькуляторов KREPI TV,
Rust/WASM engine, Rust sitegen, Tailwind tokens, cohort-6 Wordstat snapshot и
восемь первичных источников из task.json.

## Constraints

Только русский UI. Закрытые enum-входы для аудиомастеров. Числовые данные энергии
остаются в браузере. Пассивные колонки не подключаются напрямую к выходу ТВ.
Опасное питание или повреждение кабеля останавливает самостоятельный сценарий.
Все точные числа выводятся детерминированно, без imagegen.

## States

`empty`, `default`, `disabled`, `focus`, `loading`, `error`, `success`,
`needs-check`, `external-path`, `service-boundary`. Для energy calculator
`needs-check`, `external-path` и `service-boundary` неприменимы; для мастеров
числовая validation error неприменима, но WASM error и retry обязательны.

## Acceptance tests

- Три canonical уникальны, indexable, присутствуют в sitemap и имеют substantive SSR.
- Rust принимает только объявленные enum и finite numeric ranges; неизвестное и
  противоречивое состояние не превращается в точную рекомендацию.
- Совпадающий подтверждённый безопасный аудиопуть даёт один первичный шаг;
  passive-wire и unsafe никогда не дают прямое подключение.
- Energy formula отдельно показывает active и standby вклад; 30-дневный месяц и
  365-дневный год подписаны как допущения; тариф необязателен.
- На трёх страницах ноль Market-ссылок, цен и скрытых редиректов.
- На 320/768/1440 px нет overflow/overlap; 200% text zoom и WCAG text spacing
  сохраняют текст и управление; keyboard focus видим.
- Loading блокирует повторную отправку, error сохраняет введённые ответы и даёт retry.

## Allowed files

Совпадают с `task.json`; изменения ограничены engine, sitegen, тремя UI-маршрутами,
данными/исследованием, QA/tests, generated artifact и этим harness-run.

## Verification commands

Совпадают с `task.json`: targeted Rust/sitegen/web, full build, security/static/
affiliate audit, drift scan, screenshot matrix, production HTTP/TLS/hash/browser.

## Sources and claims

Все восемь source IDs из `task.json` должны совпасть между source manifest,
Rust output, React registry и SSR. Формула энергии опирается на единицы мощности
и времени; примеры спецификаций подтверждают, где брать W и standby W.

## Asset contract

Финальный артефакт — responsive HTML/CSS/JS/WASM на GitHub Pages. Скриншоты PNG
320×800, 768×1024 и 1440×900. Точный текст и числа компонуются кодом. Imagegen не
используется: существующий утверждённый Tailwind-язык уже является референсом.

## Review and rollback

Независимый агент проверяет goal fit, контракты, исходники, тесты и реальные
скриншоты. Rollback — один release commit: убрать три canonical, две task config,
energy component/engine и связанные источники; DNS, аналитика и affiliate snapshots
не менять.
