# Design Specification

## Context

Ежедневная SEO-когорта KREPI TV на 8 августа 2026 года.

## Goal

Опубликовать ровно 10 полезных русскоязычных страниц с измеренным спросом, самостоятельным локальным инструментом, таблицей и официальными источниками.

## Non-goals

Новый дизайн, партнёрские блоки, цены, назначение анкеров, изменение существующих canonical и новые изображения.

## Inputs

Сохранённые Wordstat-срезы, `data/seo_pages.json`, существующий SeoEvidenceGuide, официальные источники из manifest страницы.

## Constraints

Tailwind-дизайн не менять; весь публичный текст русский; только HTTPS-источники; 10 страниц; 6 фактов и 6 FAQ; 3 ветки; без Market URL.

## States

Default/empty: SSR показывает таблицу и приглашение выбрать ситуацию. Focus: видимое кольцо. Success: выбранная ветка и следующий шаг. Loading/error/disabled не применимы, потому что расчёт локальный и синхронный; SSR остаётся полным без JS.

## Acceptance tests

1. Manifest содержит ровно 10 уникальных id/path с положительной частотностью. 2. Build и verify проходят. 3. На каждой странице присутствуют H1, 6 фактов, 6 FAQ, 3 SSR-строки, минимум 2 HTTPS-источника и stop-блок. 4. Нет `market.yandex.ru`. 5. На 320/768/1440 нет overflow страницы. 6. Sitemap увеличивается ровно на 10 canonical.

## Allowed files

См. `task.json`: только cohort manifest, SEO JSON, Rust sitegen, verify, design-run и сгенерированный `docs/**`.

## Verification commands

`npm run build`; локальные production screenshots на 320, 768 и 1440; design-harness spec/final/ship.

## Sources and claims

Wordstat-частотности фиксируются в cohort manifest. Технические утверждения ограничены официальными источниками VESA, HDMI LA, КНАУФ, fischer, ДКС, Samsung и LG.

## Asset contract

HTML/React/Tailwind для web; 320/768/1440 CSS px; exact content хранится в JSON и попадает в SSR; imagegen не используется.

## Review and rollback

Финальный review фиксирует screenshots, build и drift scan. Rollback: revert одного source commit и повторный Pages deploy.
