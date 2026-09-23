# Design Specification

## Context

Сайт уже использует редакционный стиль KREPI TV и три бытовых кадра на главной. Из 155 SEO-страниц выбраны все 96 страниц с пошаговыми руководствами и четыре действующих инструмента с сильным поисковым интентом. Сейчас почти все эти страницы не имеют фотографии в первом экране.

## Goal

Ввести внутренний визуальный язык: тематический фото-кадр, ясное первое действие, короткая развилка из реальных шагов руководства, затем полноценный интерактив и источники.

## Non-goals

Не создавать новые маршруты, не менять спецификации моделей/кронштейнов, не утверждать, что фото показывает правильное сверление или подключение конкретной модели, не трогать партнёрскую и аналитическую логику.

## Inputs

`DESIGN.md`, `web/AGENTS.md`, `data/seo_pages.json`, существующие три изображения и текущие React/Rust шаблоны SEO-страниц.

## Constraints

Русский язык, GitHub Pages без сервера, SSR/React согласованность, лёгкие WebP, без текста/логотипов/чисел внутри генеративных фото. На страницах монтажа фото не служит инструкцией по крепежу. Все точные действия и ограничения исходят из проверенного текста страницы.

## States

Для нового редакционного первого экрана проверяются `default` и клавиатурный `focus`. Это статический HTML с одной ссылкой: асинхронные `loading`, `empty`, `error`, `success` и `disabled` для него невозможны. Состояния существующих мастеров ниже первого экрана в этом спринте не меняются.

## Acceptance tests

Manifest содержит ровно 100 уникальных индексируемых существующих URL: 96 с `guide` и четыре указанных инструмента. Для каждого URL статический HTML и React содержат подходящий тематический кадр, alt, подпись и прямую ссылку на основной инструмент. Для guide-страниц три видимых варианта взяты из `guide.steps`, а стоп-условие остаётся доступным. Нет горизонтального overflow на 320 px и при 200% тексте; клавиатурный фокус виден. Кадр первого экрана загружается eager с высоким приоритетом и асинхронным декодированием. `npm run build`, тест когорты и production smoke проходят.

## Allowed files

`data/internal_visual_pages.json`, `web/src/pages/SeoPage.jsx`, `web/src/styles.css`, `web/src/lib/internalVisualPages.mjs`, `crates/sitegen/src/main.rs`, `scripts/qa/verify-internal-visual-pages.mjs`, `tests/qa/internal-visual-pages.test.mjs`, `web/public/assets/images/`, `product-docs/design-references/internal-visual-2026-09-23/`, `web/AGENTS.md`, `DESIGN.md`, `.design-harness/runs/20260923-internal-100-visual-ux/`, plus generated `docs/` and `web/dist/`.

## Verification commands

`node scripts/qa/verify-internal-visual-pages.mjs`; `npm run build`; screenshot/browser audit of five representative themes at 320, 768, 1440 CSS px, 200% text, keyboard focus, and production.

## Sources and claims

Visual variant labels and technical text come verbatim from `data/seo_pages.json`, not from image generation. Technical provenance remains in each guide's existing official sources. Generated photos are explicitly illustrative and make no measurable claims.

## Asset contract

Eight contextual documentary-style photo substrates (connection, wireless connection, fault check, TV settings, display inspection, purchase inspection, mobile stand, transport) generated through built-in imagegen, optimized to 960×640 WebP. Existing model/wall/height frames reused. Exact copy, numbers and arrows remain selectable HTML/CSS. Every new image receives alt and limitation caption.

The editorial hero is static HTML with a single anchor link. It has no loading, empty, error, success, or disabled state; those belong to the pre-existing tools further down the page and are unchanged by this sprint. Verify the default and keyboard-focus states. The four interactive tool links must also resolve to useful static anchors before hydration.

## Review and rollback

Independent reviewer examines cohort, screenshots, assets and source diff before release. Rollback is a single revert of the source commit plus Pages redeploy; no data migration.
