# Design Specification

## Context

На главной уже есть десять приоритетных полноценных traffic-first инструментов,
но блок показывает только семь. Две следующие страницы имеют собственный
Rust/WASM-мастер, SSR-ответ, источники и измеренный спрос.

## Goal

Сделать блок визуально завершённым и усилить внутренние ссылки на два
востребованных существующих инструмента.

## Non-goals

Не создавать URL, не менять данные страниц, sitemap, CTA Маркета, диагностику,
шапку или остальные секции главной.

## Inputs

`data/seo_pages.json`, Wordstat snapshot от 2026-08-01, текущие React HomePage и
Rust `home_page_body`.

## Constraints

Весь публичный текст по-русски. Desktop и tablet — 3×3; mobile —
одна. SSR и React должны выдавать одинаковые девять id и одинаковую структуру.

## States

`default` и `focus`. Loading, empty, error, success и disabled неприменимы:
секция состоит из статических внутренних ссылок и не зависит от сети.

## Acceptance tests

- В React и SSR ровно 9 элементов `data-featured-traffic-tool`.
- В набор входят `laptop-to-tv` и `digital-channels`.
- Desktop-класс задаёт три колонки; нет горизонтального overflow на 320/768/1440.
- Карточки доступны как обычные ссылки до и после гидратации.
- Sitemap остаётся на 237 URL.

## Allowed files

См. `task.json`; разрешены HomePage, SSR sitegen, связанный тест, generated
`docs/` и evidence этого запуска.

## Verification commands

Targeted Node/Rust tests, полный `npm run build`, screenshot matrix и drift scan.

## Sources and claims

14 262 и 9 135 — точные Wordstat-частоты из сохранённого normalized CSV; это
спрос, а не прогноз визитов.

## Asset contract

HTML/Tailwind responsive UI. Imagegen не используется: визуальная задача
полностью решается существующей дизайн-системой и реальными текстами страниц.

## Review and rollback

Review проверяет порядок, 3×3, фокус, overflow и неизменный sitemap. Rollback —
вернуть лимит/take к 7 и прежний SSR grid, затем пересобрать `docs/`.
