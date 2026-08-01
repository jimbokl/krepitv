# Design Specification

## Context

KREPI TV должен достичь 1001+ реального посетителя из поиска в сутки семь полных
суток подряд. На 01.08.2026 GSC показывает 33 проиндексированных URL, но 0 показов
и кликов; Яндекс — 2 показа, 0 кликов; Метрика — 0 органических посетителей.
Строгий Wordstat-срез подтвердил три разные задачи: 5 867, 4 687 и 3 707.

## Goal

Выпустить три source-backed canonical с локальными интерактивными мастерами:
`/televizor-sam-vyklyuchaetsya/`, `/televizor-ne-podklyuchaetsya-k-internetu/`
и `/televizor-ne-vidit-fleshku/`. Каждая страница полезна без JavaScript и без
партнёрских ссылок, решает один поисковый job и не каннибализирует текущие мастера.

## Non-goals

- Не выпускать «телевизор не включается» и «телевизор завис»: exact demand не подтверждён.
- Не создавать brand/model/OS/USB-format варианты URL до реальных query signals.
- Не обещать позиции, трафик, диагноз, ремонт, совместимость или сохранность данных.
- Не добавлять Market CTA, цену, товар, redirector, форму, сервер или сбор данных.
- Не форматировать USB, не сбрасывать ТВ/роутер и не давать аппаратные инструкции.

## Inputs

- Wordstat batches и contracts от 01.08.2026, Россия 225, все устройства.
- SERP-срез и primary-source matrix Samsung/LG/Sony/Google от 01.08.2026.
- Текущие Rust/WASM, `TvTrafficTaskWizard`, sitegen и diagnostic related-map.
- Утверждённые Tailwind tokens и production layout KREPI TV.

## Constraints

Только русский публичный текст. Один canonical на Core Job. Закрытые варианты,
никаких query-параметров и свободного текста. Максимум четыре шага и три warning.
Вычисление локально, ответы не отправляются. Видимый focus, действия ≥48 px,
320/768/1440 px, 200% text zoom. USB только для обычной флешки с медиа: не телефон,
не Android storage и не HDD для записи. Sony-ссылки помечаются как доступные в
браузере при `automation_blocked=true`, а не как проверенный HTTP 200.

## States

- `default`/`empty`: обязательных ответов нет, следующий шаг объяснён.
- `disabled`: submit недоступен до двух обязательных ответов.
- `loading`: ответы сохранены, виден локальный статус.
- `success`: заголовок результата получает focus, шаги и границы видимы.
- `error`: русское сообщение, ответы сохранены, доступен retry.
- `focus`: логичный tab order и необрезанный ring.
- `service-boundary`, `external-path`, `needs-check`: наблюдение не превращается в диагноз.

## Acceptance tests

1. Ровно три новых indexable canonical с одним H1, self-canonical, русским SSR,
   FAQ, source links, substantive `lastmod` и входящей внутренней ссылкой.
2. Rust принимает только объявленные значения; для каждого интента есть success,
   needs-check/external и fail-closed unit cases. Ни один ответ не называет деталь.
3. React использует один WASM entrypoint, не читает URL/user text и эмитит один
   bounded `result_completed` только после явного submit.
4. На новых страницах нет Market/affiliate URL, цен, форм и рекомендаций покупки.
5. Internet flow не собирает сеть/пароль/IP/MAC и не предлагает DNS/router reset.
   USB flow не предлагает форматировать/регистрировать диск. Power flow немедленно
   останавливается при danger-signals и не требует доступа за настенным ТВ.
6. На 320×800, 768×1024, 1440×900 и при 200% text нет overflow, overlap или
   обрезанного focus; default/loading/error/success/disabled проходят smoke.
7. Полная сборка, Rust/web/sitegen tests, static/security/affiliate audits,
   design drift, независимое review, production hash и browser smoke проходят.

## Allowed files

Совпадают с `task.json`: engine/sitegen, SEO data/source manifest, существующий
общий wizard, SeoPage/HomePage/seoPages, точечные тесты, research/operations docs,
generated `docs/`, README, research collector и этот design run. Поскольку
`canSubmit` принадлежит общему wizard, регрессионные ожидания cohort 2/3
тоже входят в scope, без изменения их продуктовой логики.

## Verification commands

- `cargo fmt --check && cargo test -p krepitv-engine tv_diagnostics_cohort_4`
- `node --test --test-concurrency=1 web/tests/tv-diagnostics-cohort-4.test.mjs web/tests/seo-pages.test.mjs web/tests/result-instrumentation.test.mjs`
- `npm run build`
- security/static/affiliate audits из ru-seo-affiliate-site-harness
- design drift с явным списком изменённых UI-файлов, final check, seal/ship check
- local screenshots and production HTTPS/hash/browser smoke

## Sources and claims

Demand maps only to saved Wordstat exact snapshots and is not summed or forecast.
Technical copy maps to primary sources in `task.json` and the source manifest.
Claims are deliberately observational: internet path isolates TV/router/provider/
app; shutdown timing isolates timer/CEC/external source; USB recognition is scoped
to media playback and exact-model support. No source is used to infer hardware.

## Asset contract

Responsive HTML/React and SSR are final assets. Text, canonical, FAQ, values and
source links are deterministic. Imagegen is `None`; current reference and all UI
primitives are reused. QA PNG files are evidence only at exact viewports.

## Review and rollback

Независимый агент проверяет spec, implementation, screenshots, sources and
evidence. Rollback — один release commit; удалить только три новых URL из data,
route maps и sitemap. Текущие 152 URL, DNS, analytics и affiliate snapshot не менять.
