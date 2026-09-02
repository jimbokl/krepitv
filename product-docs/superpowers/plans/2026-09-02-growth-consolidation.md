# Growth Consolidation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить появившийся органический трафик KREPI TV в корректно измеряемую цепочку от полезного результата к подбору и укрепить существующие страницы с доказанным спросом без новых URL.

**Architecture:** Браузерные события остаются обезличенными CustomEvent и переводятся в точные action-goals Метрики. Событие результата дедуплицируется на уровне установленного адаптера Метрики, новый `selection_start` измеряет переход в существующий подбор, а отчётность деградирует до корректных totals при недоступной разбивке goal parameters. SEO-изменения ограничены существующими canonical и проходят статическую Rust/React генерацию.

**Tech Stack:** React 19, JavaScript ES modules, Yandex Metrika API, Rust sitegen, Vite, Tailwind CSS, Node test runner, GitHub Pages.

**Spec:** `product-docs/superpowers/specs/2026-09-02-growth-consolidation-design.md`

## Global Constraints

- Весь публичный интерфейс — только на русском языке.
- Не создавать новые индексируемые URL; sitemap должен остаться на 299 canonical.
- Не добавлять зависимости, сервер или платную инфраструктуру.
- Affiliate-ссылки только прямые на `market.yandex.ru`, без цен, редиректов и клоакинга.
- Публичные события и отчёты не содержат пользовательский ввод, ПДн и приватные идентификаторы.
- `result_completed` считается активацией и отправляется один раз на `tool_id × source_path` за жизненный цикл страницы.
- При отсутствии детализации API отчёт сохраняет totals и явно помечает breakdown как unavailable.
- Любое поведенческое изменение реализуется TDD: RED → GREEN → полный regression.

---

### Task 1: Точная семантика результата

**Files:**
- Modify: `web/tests/metrika.test.mjs`
- Modify: `web/src/lib/metrika.mjs`

**Interfaces:**
- Consumes: `installMetrika({ counterId, windowObject, documentObject })`.
- Produces: `trackResultCompleted(detail): boolean`, возвращающий `false` для повторной пары `toolId + sourcePath`.

- [ ] **Step 1: Write the failing test**

Добавить тест, который дважды вызывает `trackResultCompleted` с одинаковыми `toolId` и `sourcePath`, ожидает один `reachGoal`, затем вызывает другой `toolId` и ожидает второй `reachGoal`.

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test web/tests/metrika.test.mjs`

Expected: FAIL, потому что повторный результат сейчас отправляется дважды.

- [ ] **Step 3: Write minimal implementation**

В `installMetrika` создать локальный `Set`, формировать ключ после безопасной нормализации и добавлять его только после отправки цели. Очищать Set в `dispose`.

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test web/tests/metrika.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add web/tests/metrika.test.mjs web/src/lib/metrika.mjs && git commit -m "fix: count one useful result per tool page"`

### Task 2: Измеряемое начало подбора

**Files:**
- Create: `web/src/lib/selectionStart.mjs`
- Create: `web/tests/selection-start.test.mjs`
- Modify: `web/src/lib/metrika.mjs`
- Modify: `web/src/lib/metrikaGate.mjs`
- Modify: `web/src/components/MountFunnelNextStep.jsx`
- Modify: `web/tests/mount-funnel.test.mjs`
- Modify: `web/tests/metrika.test.mjs`
- Modify: `web/tests/metrika-gate.test.mjs`
- Modify: `scripts/analytics/metrika-goals.mjs`
- Modify: `tests/analytics/metrika-goals.test.mjs`

**Interfaces:**
- Produces: `SELECTION_START_EVENT`, `selectionStartDetail(value, sourcePath)`, `emitSelectionStart(windowObject, detail)`.
- Produces: Metrika goal `selection_start` with `{ placement, source_path }`.

- [ ] **Step 1: Write failing event-contract tests**

Проверить allowlist placement `seo_next_step`, очистку pathname, отказ от произвольных значений и один CustomEvent без пользовательских полей.

- [ ] **Step 2: Run event tests to verify RED**

Run: `node --test web/tests/selection-start.test.mjs`

Expected: FAIL, модуль отсутствует.

- [ ] **Step 3: Implement the safe event module**

Создать модуль по паттерну `mountDetailClick.mjs`, разрешив только `seo_next_step` и same-site pathname.

- [ ] **Step 4: Run event tests to verify GREEN**

Run: `node --test web/tests/selection-start.test.mjs`

Expected: PASS.

- [ ] **Step 5: Write failing integration tests**

Проверить подписку `installMetrika`, точный `reachGoal selection_start`, отсутствие события при отказе от аналитики и вызов обработчика на обычный/средний клик CTA.

- [ ] **Step 6: Run integration tests to verify RED**

Run: `node --test web/tests/metrika.test.mjs web/tests/metrika-gate.test.mjs web/tests/mount-funnel.test.mjs`

Expected: FAIL до интеграции события.

- [ ] **Step 7: Implement integration and goal definition**

Подключить событие к Метрике и consent gate, добавить click handlers к `/podbor/`, зарегистрировать exact action goal в `REQUIRED_METRIKA_GOALS`.

- [ ] **Step 8: Run integration tests to verify GREEN**

Run: `node --test web/tests/selection-start.test.mjs web/tests/metrika.test.mjs web/tests/metrika-gate.test.mjs web/tests/mount-funnel.test.mjs tests/analytics/metrika-goals.test.mjs`

Expected: PASS.

- [ ] **Step 9: Commit**

Run: `git add web/src/lib web/src/components/MountFunnelNextStep.jsx web/tests scripts/analytics/metrika-goals.mjs tests/analytics/metrika-goals.test.mjs && git commit -m "feat: measure selection starts after useful results"`

### Task 3: Устойчивый отчёт Метрики

**Files:**
- Modify: `scripts/analytics/metrika-funnel.mjs`
- Modify: `tests/analytics/metrika-funnel.test.mjs`
- Modify: `scripts/analytics/affiliate-revenue-capacity.mjs`
- Modify: `tests/analytics/affiliate-revenue-capacity.test.mjs`

**Interfaces:**
- Consumes: goal IDs including `selection_start`.
- Produces: schema-versioned funnel totals with `selection_start`; `tool_usage.breakdown_state` is `available` or `unavailable`.

- [ ] **Step 1: Write failing totals and fallback tests**

Расширить ожидаемые metrics новой целью и смоделировать HTTP 400 `invalid_parameter` для goal-parameter breakdown; totals должны сохраниться, breakdown — стать unavailable.

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test tests/analytics/metrika-funnel.test.mjs tests/analytics/affiliate-revenue-capacity.test.mjs`

Expected: FAIL из-за старой длины totals и исключения breakdown API.

- [ ] **Step 3: Implement totals and bounded fallback**

Добавить `selection_start` между result и detail. Для endpoint goal parameters перехватывать только безопасно распознанный `invalid_parameter`; любые другие ошибки продолжают fail-closed. Возвращать aggregate goal totals из основного отчёта и `breakdown_state: unavailable` без фиктивных tool rows.

- [ ] **Step 4: Run tests to verify GREEN**

Run: `node --test tests/analytics/metrika-funnel.test.mjs tests/analytics/affiliate-revenue-capacity.test.mjs`

Expected: PASS.

- [ ] **Step 5: Commit**

Run: `git add scripts/analytics tests/analytics && git commit -m "fix: preserve funnel totals when Metrika breakdown is unavailable"`

### Task 4: Усиление существующих поисковых победителей

**Files:**
- Modify: `data/seo_pages.json`
- Modify: `web/src/components/MountFunnelNextStep.jsx`
- Modify: `web/tests/tv-utility-cohort-6.test.mjs`
- Modify: `web/tests/tv-utility-cohort-7.test.mjs`
- Modify: `web/tests/mount-funnel.test.mjs`
- Create: `web/tests/seo-signal-pages.test.mjs`

**Interfaces:**
- Consumes: существующие page IDs и canonical paths.
- Produces: обновлённый SSR для четырёх страниц с доказанными показами и измеряемый следующий шаг; URL set не меняется.

- [ ] **Step 1: Write failing SEO contract tests**

Проверить: прямой ответ страницы энергии содержит формулу и примеры за день/месяц/год; субтитры явно покрывают формулировки «убрать» и «отключить»; голос различает три источника; VESA ведёт к точному поиску модели; все четыре страницы сохраняют источники и общий следующий шаг.

- [ ] **Step 2: Run tests to verify RED**

Run: `node --test web/tests/seo-signal-pages.test.mjs web/tests/tv-utility-cohort-6.test.mjs web/tests/tv-utility-cohort-7.test.mjs web/tests/mount-funnel.test.mjs`

Expected: FAIL на новых требованиях к ответу и CTA.

- [ ] **Step 3: Apply minimal source-backed content changes**

Изменить только title/description/lead/facts/FAQ/guide четырёх существующих записей. Не добавлять брендовую инструкцию без официального источника и не менять canonical.

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `node --test web/tests/seo-signal-pages.test.mjs web/tests/tv-utility-cohort-6.test.mjs web/tests/tv-utility-cohort-7.test.mjs web/tests/mount-funnel.test.mjs`

Expected: PASS.

- [ ] **Step 5: Verify URL set stability**

Run: `npm run build && test "$(grep -c '<url>' docs/sitemap.xml)" -eq 299`

Expected: build exit 0 and 299 sitemap URL.

- [ ] **Step 6: Commit**

Run: `git add crates/sitegen/src/main.rs data/seo_pages.json web/src/components/MountFunnelNextStep.jsx web/src/pages/SeoPage.jsx web/tests docs && git commit -m "seo: strengthen proven TV utility intents"`

### Task 5: Release and production proof

**Files:**
- Modify: generated `docs/**` and `web/**` artifact files from `npm run build:release`.
- Create privately: release evidence under `.private/` only.

**Interfaces:**
- Produces: exact verified GitHub Pages artifact and changed canonical notification list.

- [ ] **Step 1: Run complete local verification**

Run: `npm run build:release && npm run verify && git diff --check`

Expected: all commands exit 0.

- [ ] **Step 2: Run project harness gates**

Run the repository's security, static, affiliate and design commands discovered from `package.json`/`.design-harness/README.md`.

Expected: all gates exit 0; no secrets, prices, redirects, overflow or unavailable CTA.

- [ ] **Step 3: Apply and verify the exact Metrika goal**

Run privately: `YANDEX_ANALYTICS_CREDENTIALS=<private-path> npm run analytics:goals:apply`, then dry-run `analytics:goals:check`.

Expected: every required goal is satisfied exactly once; no IDs or token values are committed or printed publicly.

- [ ] **Step 4: Merge the verified branch into main and push**

Run from the main checkout: `git merge --ff-only codex/growth-consolidation-20260902 && git push origin main`.

Expected: push succeeds and Pages workflow starts for the exact commit.

- [ ] **Step 5: Verify production**

Check Pages status, HTTPS 200, HTTP→HTTPS, TLS verification, sitemap count, representative changed pages at mobile and desktop widths, and byte/hash equality for representative artifact files.

- [ ] **Step 6: Notify only changed canonical URLs**

Send only the four substantively changed URLs through the existing IndexNow workflow. HTTP 202 is recorded only as receipt.

- [ ] **Step 7: Capture the post-release baseline**

Store private Search Console, Webmaster and Metrika reports. Record confirmed orders only from the affiliate orders API.
