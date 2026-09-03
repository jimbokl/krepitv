# Design Specification

## Context

Сайт уже использует утверждённую editorial/technical визуальную систему и универсальный SeoEvidenceGuide. Спринт расширяет полезное ядро без визуального дрейфа.

## Goal

Опубликовать 10 разных SEO-инструментов, каждый из которых решает задачу до CTA и связывает результат с точной моделью и совместимым кронштейном.

## Non-goals

Редизайн сайта, генерация изображений, цены, партнёрские ссылки внутри инструмента, городские/брендовые вариации и предположения о безопасности монтажа.

## Inputs

Аудированный Wordstat-срез в data/research/seo-tool-sprint-2026-09-03.json, официальные материалы Samsung, Sony и LG, существующие SeoPage и SeoEvidenceGuide.

## Constraints

Только русский публичный текст; SSR до гидрации; deterministic content; fail-closed формулировки; прямой путь /podbor/ после результата; текущие Tailwind-токены и адаптивная сетка.

## States

default, success и focus проверяются непосредственно. loading, empty, error и disabled не применимы: инструменты работают на статических данных и всегда имеют три доступных исхода; их безопасный стоп является fail-closed состоянием.

## Acceptance tests

1. В sitemap присутствуют ровно 10 новых self-canonical URL.
2. У каждого URL один H1, SSR-таблица из трёх решений, стоп-граница, минимум два HTTPS-источника и CTA /podbor/ после результата.
3. На странице нет цены и прямой ссылки Маркета.
4. Связанные материалы образуют два взаимных кластера без noindex URL.
5. На ширине 320, 768 и 1440 px нет горизонтального переполнения, focus видим.

## Allowed files

crates/sitegen/src/main.rs; data/seo_pages.json; data/research/seo-tool-sprint-2026-09-03.json; data/indexnow/changed-urls.txt; web/src/lib/seoPages.mjs; web/src/pages/SeoPage.jsx; web/tests; generated web pages; docs; этот run.

## Verification commands

Targeted Rust/Node tests; npm run build; design drift scan; production HTTP/TLS/canonical smoke.

## Sources and claims

Спрос фиксируется только как наблюдённая точная частотность Wordstat, не прогноз трафика. Технические решения ограничены перечисленными первичными источниками и датой проверки.

## Asset contract

Responsive HTML/Tailwind на 320/768/1440 CSS px. Точные заголовки, таблицы и ограничения рендерятся текстом. Imagegen не используется: новые изображения не нужны и нарушили бы согласованную техническую эстетику.

## Review and rollback

Независимая проверка — тесты, скриншоты и drift scan после сборки. Откат — revert одного feature-коммита; старые URL и компоненты не удаляются.
