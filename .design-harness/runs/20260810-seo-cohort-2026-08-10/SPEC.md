# Design Specification

## Context

Ежедневная traffic-first SEO-когорта KREPI TV на 10 августа 2026 года.

## Goal

Опубликовать ровно 10 полезных русскоязычных страниц с измеренным спросом, самостоятельным локальным инструментом, SSR-таблицей и официальными источниками.

## Non-goals

Новый дизайн, новые компоненты, партнёрские блоки, цены, изменение существующих canonical и новые изображения.

## Inputs

Свежий Wordstat-срез 10.08.2026, `data/seo_pages.json`, существующий `SeoEvidenceGuide`, официальные справки производителей и Яндекса.

## Constraints

Tailwind-дизайн не менять; публичный язык только русский; ровно 10 страниц; 6 фактов и 6 FAQ; 3 ветки; 2+ HTTPS-источника; без Market URL.

## States

Default/empty: SSR показывает таблицу и приглашение выбрать ситуацию. Focus: видимое кольцо. Success: выбранная ветка и следующий шаг. Loading/error/disabled не применимы: инструмент локальный и синхронный, полноценный SSR остаётся без JS.

## Acceptance tests

1. Manifest содержит ровно 10 уникальных id/path и одну положительную exact-частотность на страницу. 2. Build/verify проходят. 3. Каждая страница имеет H1, 6 фактов, 6 FAQ, 3 SSR-строки, stop и 2+ официальных источника. 4. Нет Market URL и числовых цен. 5. На 320/768/1440 нет overflow документа. 6. Sitemap увеличен ровно на 10 URL.

## Allowed files

См. `task.json`: research, SEO JSON, Rust sitegen, JS related/verify, design-run, design/plan и generated `docs/**`.

## Verification commands

`npm run build`; датированный cohort-contract; drift scan; скриншоты на 320/768/1440; design-harness spec/final/ship.

## Sources and claims

Wordstat-частотности хранятся в evidence manifest. Технические утверждения ограничены официальными материалами Samsung, Sony, LG и Яндекса.

## Asset contract

HTML/React/Tailwind; 320/768/1440 CSS px; exact content приходит из JSON в SSR; imagegen не используется.

## Review and rollback

Финальный review фиксирует build, скриншоты и drift scan. Rollback: revert одного source-коммита и повторный Pages deploy.
