# Design Specification

## Context

Поисковый трафик уже приходит на модели и полезные справочные страницы, но переход к подбору почти не измеряется. Старый CTA был корректным визуально, но слабо объяснял model-first логику.

## Goal

Сделать следующий шаг понятным, безопасным и измеримым без новых URL или рекламной агрессии.

## Non-goals

Не менять дизайн-систему, каталог, модели совместимости, партнёрские URL, цены, sitemap или число страниц.

## Inputs

Существующий `SeoMountFunnelNextStep`, Rust SSR, локальный fitment-граф и действующая схема событий Метрики.

## Constraints

Публичный язык только русский. Прямой переход идёт в `/podbor/`, не на внешний оффер. SSR и React дословно совпадают. Не более одного `result_completed` на инструмент и страницу за сессию.

## States

`default` и `focus` проверяются напрямую. Loading, empty, error, success и disabled для статической ссылки неприменимы и сохраняют ту же безопасную компоновку.

## Acceptance tests

- Заголовок и кнопка дословно совпадают в SSR и React.
- На 320/768/1440 px нет переполнения, наложений и обрезанного текста.
- Ссылка остаётся нативным `<a href="/podbor/">` с видимым фокусом.
- Клик отправляет `selection_start`; результат инструмента дедуплируется по инструменту и странице.
- Четыре улучшенные существующие страницы имеют точные title/description/FAQ и корректные `datePublished`/`dateModified`.
- Sitemap содержит ровно 299 индексируемых URL.

## Allowed files

См. `task.json`: CTA, аналитика, четыре существующие страницы, тесты, verifier, generated `docs/` и evidence запуска.

## Verification commands

Targeted Node/Rust tests, полный `npm run verify`, локальная screenshot-матрица и drift scan.

## Sources and claims

Проверка совместимости опирается на локальный fitment-граф; внешних маркетинговых обещаний в блоке нет.

## Asset contract

HTML/Tailwind UI без новых изображений. Текст является частью deterministic exact-content слоя.

## Review and rollback

Review проверяет mobile/desktop переносы, фокус, SSR parity, события и неизменные 299 URL. Rollback — откатить релизный коммит и повторно опубликовать прежний статический артефакт.
