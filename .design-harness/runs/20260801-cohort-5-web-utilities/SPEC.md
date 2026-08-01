# Design Specification

## Context

KREPI TV уже использует один `TvTrafficTaskWizard` для закрытых локальных
мастеров. Cohort 5 добавляет три task ID без нового визуального языка.

## Goal

Подключить `soundbar-to-tv`, `screen-cleaning` и `smart-tv-box` к общей web-
оболочке, источникам, SEO-маршрутизации, related links и QA capture helper.

## Non-goals

Не менять Rust, WASM-обёртку, sitegen, research/data, карточки главной,
партнёрские поверхности или production.

## Inputs

Только закрытые radio-ответы из утверждённого engine-контракта. Никаких text,
textarea, URL query-параметров, загрузок файлов или сетевых пользовательских
данных.

## Constraints

Русский UI; существующие Tailwind-токены и компоненты; короткие списки;
fail-closed при неизвестной модели/порту/покрытии; ноль Market-ссылок.

## States

`empty`, `default`, `disabled`, `focus`, `loading`, `error`, `success`,
`needs-check`, `external-path`, `service-boundary` — через общую оболочку;
конкретная доступность результата определяется Rust-планом.

## Acceptance tests

- Три page ID однозначно сопоставлены трём task ID.
- В каждой конфигурации есть closed choices, русская копия и source allowlist.
- Очистка запрещает жидкость на экран, распыление на панель и давление.
- Smart box не обещает совместимость без инструкции точной модели.
- Саундбар разводит ARC/eARC, оптику и Bluetooth и не объявляет порт по форме.
- Страницы исключены из каталожного и affiliate CTA пути.
- Related map даёт входящие ссылки, главная остаётся без изменений.
- Capture helper знает сценарии task ID; targeted test проходит.

## Allowed files

`web/src/components/TvTrafficTaskWizard.jsx`, `web/src/pages/SeoPage.jsx`,
`web/src/lib/seoPages.mjs`, `scripts/qa/capture-page.mjs`,
`web/tests/tv-utility-cohort-5.test.mjs` и текущий harness-run.

## Verification commands

`node --test --test-concurrency=1 web/tests/tv-utility-cohort-5.test.mjs web/tests/seo-pages.test.mjs web/tests/result-instrumentation.test.mjs` и
`git diff --check`.

## Sources and claims

Samsung ARC и HDMI, Sony soundbar и cleaning, LG cleaning. Все модельные пути
остаются ограниченными официальной инструкцией точной модели.

## Asset contract

Адаптивный HTML/React UI для 320, 768 и 1440 CSS px. Точный текст рендерится
детерминированно; imagegen не используется.

## Review and rollback

Независимый агент проверяет diff, тест и визуальный дрейф. Откат — удалить три
config/map/related/capture записи и новый тест одним обратным изменением.
