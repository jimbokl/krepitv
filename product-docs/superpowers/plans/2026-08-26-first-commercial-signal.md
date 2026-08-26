# Первый измеримый коммерческий сигнал KREPI TV — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Замкнуть и доказуемо измерить путь от уже ранжирующейся страницы точной модели телевизора до предзаполненного монтажного мастера, прямого точного предложения Яндекс Маркета и первого атрибутированного заказа — без новых индексируемых URL.

**Architecture:** Сначала Rust SSR перестаёт быть временной заставкой: homepage сохраняет стабильную статическую структуру, React монтирует только зарезервированный search island, а данные загружаются по route/действию. Затем все 161 verified model page получают SSR+React вход в существующий `/podbor/?model=<id>`. Валидный deep link сразу открывает шаг стены. Consent-gated Метрика получает новый `kit_started` и полный контролируемый контекст `result_completed`; для 12-модельной поисковой когорты отдельный affiliate manifest создаёт уникальные `installation_result` VID. Orders API и единый приватный readout связывают surface, модель, кронштейн, статус и фактический `payment` без ПДн.

**Tech Stack:** Rust sitegen, React, Tailwind CSS, JavaScript modules, Яндекс Метрика API, Яндекс Маркет Affiliate API, Google Search Console API, Node test runner, GitHub Actions, GitHub Pages.

**Spec:** `product-docs/superpowers/specs/2026-08-26-first-commercial-signal-design.md`

**Financial model:** `product-docs/roadmap-to-100k.md`

## Global Constraints

- [ ] Не создавать новые индексируемые URL и не менять canonical; sitemap до и после релиза содержит ровно 299 URL.
- [ ] Весь публичный текст только на русском языке.
- [ ] Полезная техническая часть страницы модели остаётся самостоятельной и предшествует коммерческому CTA.
- [ ] Не публиковать цены, не использовать редиректы, клоакинг, sticky/exit-intent и срочность.
- [ ] Ссылки Маркета прямые и появляются только для точного свежего оффера и `verified-fit` пары.
- [ ] Consent-gate не ослаблять; Метрику трактовать как нижнюю границу.
- [ ] Search click, IndexNow, `promise`, `NEW` и `ON_HOLD` не считать доходом.
- [ ] Не раскрывать токены, cookie, внутренние account/counter/order ID, исходные заказы или ПДн.
- [ ] Не менять title/description без отдельного зрелого query→page сигнала.
- [ ] Каждое изменение начинается с падающего теста и заканчивается тематическим коммитом.

---

## Task 0: Устранить CLS/LCP-регрессию до коммерческого эксперимента

**Evidence:** `product-docs/performance/pagespeed-home-2026-08-26.md`

**Files:**

- Create: `scripts/qa/measure-layout-stability.mjs`
- Create: `tests/qa/layout-stability.test.mjs`
- Create: `web/src/components/HomeSearchIsland.jsx`
- Modify: `web/src/main.jsx`
- Modify: `web/src/lib/clientBoot.mjs`
- Modify: `web/src/lib/catalog.js`
- Modify: `web/src/pages/HomePage.jsx`
- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/src/styles.css`
- Modify: `package.json`

- [ ] **Step 1: Написать воспроизводимый падающий performance probe**

  CDP-скрипт запускает Chrome с фиксированными mobile viewport, CPU ×4 и slow 4G, устанавливает `PerformanceObserver`, снимает геометрию `#root/main/h1` на DOMContentLoaded и после интерактива и пишет только обезличенные timings/layout values. Тест должен падать на production baseline при временно пустом root или смене `main.top` после FCP.

- [ ] **Step 2: Зафиксировать три baseline маршрута**

  Проверить `/`, `/modeli/tcl-55c6k/` и `/podbor/?model=tcl-55c6k` минимум по три раза. Сохранить медианы CLS/LCP/FCP/TBT и факт full-root replacement; query не публиковать как canonical или sitemap URL.

- [ ] **Step 3: Написать падающий SSR-island contract**

  Rust test требует на homepage стабильный `data-home-search-island` с фиксированной минимальной геометрией и полезным fallback form/link. Web test требует, чтобы homepage boot не вызывал `createRoot(rootElement)` для всего `#root`.

- [ ] **Step 4: Реализовать стабильный homepage SSR**

  Оставить Rust homepage DOM финальной структурой. `HomeSearchIsland` монтируется только в подготовленный контейнер; до JS остаётся рабочий переход в каталог моделей. Не использовать `hydrateRoot` поверх несовпадающего HTML.

- [ ] **Step 5: Разделить загрузку данных по route**

  Homepage initial island загружает только `model-search.json`. `tv-models`, mounts, graph, `seo-pages`, installation-kit справочники и affiliate snapshots не входят в first-screen barrier и загружаются только на нужном route либо после явного выбора модели.

- [ ] **Step 6: Проверить модель и `/podbor/`**

  Если probe подтверждает позднюю полную замену root, применить тот же принцип к коммерчески критичной области: стабильный SSR + зарезервированные интерактивные islands. Не смешивать это с изменением текста/офферов.

- [ ] **Step 7: Повторно измерить и только затем решить вопрос шрифтов**

  Gate после архитектурного исправления: CLS ≤ 0,10 (цель ≤ 0,05), LCP ≤ 2,5 с, TBT ≤ 200 мс, FCP не хуже baseline более чем на 0,2 с. Если CLS остаётся выше 0,10, отдельным минимальным экспериментом сократить веса/subsets и проверить preload или `font-display: optional` с визуальным reference.

- [ ] **Step 8: Не маскировать ограничение GitHub Pages**

  Зафиксировать `Cache-Control: max-age=600` как ограничение hosting. Не переносить сайт и не подключать Cloud.ru. Cloudflare CDN/Pages оценивать отдельным спринтом только после P0 и только по измеримой экономии.

- [ ] **Step 9: Проверить**

  Run: `node --test tests/qa/layout-stability.test.mjs`

  Run: `node scripts/qa/measure-layout-stability.mjs --url https://krepitv.ru/ --runs 3`

  Run: `npm run build`

- [ ] **Step 10: Commit**

  `git add scripts/qa tests/qa web/src crates/sitegen/src/main.rs package.json product-docs/performance && git commit -m "perf: keep SSR stable during enhancement"`

---

## Task 1: Зафиксировать воспроизводимую поисковую когорту

**Files:**

- Create: `data/research/first-commercial-signal-cohort.json`
- Create: `tests/analytics/first-commercial-signal-cohort.test.mjs`

- [ ] **Step 1: Написать падающий тест структуры когорты**

  Зафиксировать обязательные поля `schema_version`, `evidence_window`, `selection_rule`, `treatment_models`, `control_models`; запретить query strings, полные Search Console payload, внешние идентификаторы и пути вне `/modeli/<id>/`.

- [ ] **Step 2: Сохранить обезличенный page-level baseline**

  В treatment включить ровно 12 моделей из спецификации по правилу `impressions >= 14 && position <= 8` за 2026-08-17..2026-08-23. В control включить существующие страницы с 10–13 показами в том же окне. Хранить только path, clicks, impressions, CTR и position.

- [ ] **Step 3: Добавить semantic checks**

  Проверить уникальность model ID/path, совпадение ID с текущим `data/tv_models.json`, существование generated HTML и наличие минимум одного `verified-fit` ребра и актуального model affiliate offer.

- [ ] **Step 4: Проверить включение в analytics gate**

  Существующий wildcard `tests/analytics/*.test.mjs` обязан автоматически включить новый тест в `npm run analytics:test`; не создавать отдельный production runtime для статического manifest.

- [ ] **Step 5: Проверить**

  Run: `node --test tests/analytics/first-commercial-signal-cohort.test.mjs`

- [ ] **Step 6: Commit**

  `git add data/research/first-commercial-signal-cohort.json tests/analytics/first-commercial-signal-cohort.test.mjs && git commit -m "analytics: freeze first commercial signal cohort"`

---

## Task 2: Добавить доказательный вход из модели в монтажный мастер

**Files:**

- Modify: `web/src/lib/catalog.js`
- Modify: `web/src/pages/ModelPage.jsx`
- Modify: `web/src/lib/installationKitState.js`
- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/tests/model-page-affiliate-render.test.mjs`
- Modify: `web/tests/installation-kit-state.test.mjs`
- Modify: `scripts/verify.mjs`

- [ ] **Step 1: Написать падающие helper/state tests**

  Добавить контракт `installationKitHref(model)` → `/podbor/?model=<safe-id>`. Небезопасный, отсутствующий или слишком длинный ID должен возвращать fail-closed результат. Проверить, что валидный deep link инициализирует мастер на шаге 3 с выбранными brand/model, а неизвестный начинает шаг 1.

- [ ] **Step 2: Реализовать безопасный helper**

  В `web/src/lib/catalog.js` использовать тот же строгий ID-контракт, что у `modelHref`/`mountHref`; не переносить в URL стену, механизм, размеры, кабели или кронштейн.

- [ ] **Step 3: Написать падающий render test модельной страницы**

  После `CompatibilityProof` ожидать один блок `data-installation-kit-entry="true"` с заголовком, точной моделью, перечислением следующих проверок и CTA на безопасный deep link. Прямые CTA Маркета остаются ниже доказательства совместимости.

- [ ] **Step 4: Реализовать React-блок без рекламной простыни**

  Добавить компактный Tailwind-блок «Собрать монтажный комплект»: стена → механизм → высота → кабели → порядок монтажа. Не дублировать весь результат и не переносить офферы выше доказательного блока.

- [ ] **Step 5: Добавить эквивалентный SSR**

  В `crates/sitegen/src/main.rs` добавить ту же ссылку и смысловой текст в статическое тело каждой verified model page. Rust unit-test проверяет все модели и точное совпадение query model ID.

- [ ] **Step 6: Обновить release verifier**

  `scripts/verify.mjs` должен проверять 161/161 model HTML: ровно один безопасный `/podbor/?model=<id>`, self-canonical без query и отсутствие других пользовательских параметров.

- [ ] **Step 7: Проверить**

  Run: `node --test web/tests/installation-kit-state.test.mjs web/tests/model-page-affiliate-render.test.mjs`

  Run: `cargo test -p krepitv-sitegen --locked`

- [ ] **Step 8: Commit**

  `git add web/src/lib/catalog.js web/src/pages/ModelPage.jsx web/src/lib/installationKitState.js crates/sitegen/src/main.rs web/tests scripts/verify.mjs && git commit -m "feat: connect model passports to installation kit"`

---

## Task 3: Закрыть аналитический разрыв мастера

**Files:**

- Create: `web/src/lib/installationKitStarted.mjs`
- Create: `web/tests/installation-kit-started.test.mjs`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `web/src/lib/metrika.mjs`
- Modify: `scripts/analytics/metrika-goals.mjs`
- Modify: `scripts/analytics/metrika-funnel.mjs`
- Modify: `scripts/analytics/report-metrika-funnel.mjs`
- Modify: `tests/analytics/metrika-goals.test.mjs`
- Modify: `tests/analytics/metrika-funnel.test.mjs`
- Modify: `web/tests/result-completed.test.mjs`

- [ ] **Step 1: Написать падающие event-contract tests**

  Новый `kit_started` принимает только controlled `modelId`, `entrySurface` (`model_page`, `podbor`, `other`) и same-site `sourcePath`. Запретить поисковый текст, пользовательские размеры и произвольные ключи.

- [ ] **Step 2: Реализовать одноразовую отправку `kit_started`**

  Emit выполняется один раз на загрузку, когда мастер впервые находится на шаге 3 или дальше с валидной точной моделью. Переходы назад/вперёд и rerender не создают дублей.

- [ ] **Step 3: Дополнить `result_completed`**

  Существующие безопасные `modelId` и `mountId` уже входят в browser detail, но не доходят до параметров Метрики. Добавить `model_id` и `mount_id` в `trackResultCompleted`, сохранив строгую фильтрацию и отсутствие пользовательских ответов.

- [ ] **Step 4: Добавить цель Метрики fail-closed**

  В `REQUIRED_METRIKA_GOALS` добавить `kit_started`. Сначала выполнить check-only; apply разрешён только если нет duplicate-condition или name-mismatch. После apply повторно прочитать authoritative goal list.

- [ ] **Step 5: Расширить funnel report**

  Порядок агрегатов: visits, users, `kit_started`, `result_completed`, `mount_detail_click`, `market_click`. Обновить строгую длину totals, source breakdown и organic/eligible-region отчёты. Старый payload неправильной длины должен закрываться ошибкой, а не нулями.

- [ ] **Step 6: Проверить**

  Run: `node --test web/tests/installation-kit-started.test.mjs web/tests/result-completed.test.mjs tests/analytics/metrika-goals.test.mjs tests/analytics/metrika-funnel.test.mjs`

- [ ] **Step 7: Commit**

  `git add web/src/lib/installationKitStarted.mjs web/src/pages/GuidedSelectionPage.jsx web/src/lib/metrika.mjs web/tests scripts/analytics tests/analytics && git commit -m "analytics: measure installation kit entry"`

---

## Task 4: Создать отдельные affiliate placements результата

**Files:**

- Create: `data/affiliate/installation-result-placements.json`
- Create: `data/affiliate/public-installation-result-offers.json`
- Create: `scripts/affiliate/installation-result-placements.mjs`
- Create: `scripts/affiliate/generate-installation-result-placements.mjs`
- Create: `scripts/affiliate/validate-installation-result-placements.mjs`
- Create: `scripts/affiliate/check-installation-result-placements.mjs`
- Create: `scripts/affiliate/build-installation-result-snapshot.mjs`
- Create: `scripts/affiliate/publish-installation-result-snapshot.mjs`
- Create: `tests/affiliate/installation-result-placements.test.mjs`
- Modify: `package.json`
- Modify: `scripts/verify.mjs`

- [ ] **Step 1: Написать падающие manifest tests**

  Контракт содержит только 12 treatment models и максимум три технически приоритетных `verified-fit` кронштейна на модель. Проверить `landing_path=/podbor/`, уникальность placement ID/VID, существование source card, модель/кронштейн в каталоге, соответствие Rust compatibility и отсутствие `conditional-fit`.

- [ ] **Step 2: Реализовать детерминированную генерацию**

  Переиспользовать техническое ранжирование `selectModelPlacementCandidates`; не копировать формулу совместимости. ID формата `kit-<model>-r01-<mount>`, VID — читаемая часть + короткий SHA-256 digest, длина в пределах API.

- [ ] **Step 3: Реализовать check/build/publish pipeline**

  Повторить fail-closed свойства model placement pipeline: private batch вне git, проверка ответа API, свежесть, exact entity/title, атомарная публикация и удаление CTA при невалидном snapshot. Не писать token/CLID/полный API payload в логи.

- [ ] **Step 4: Наполнить treatment cohort**

  Сгенерировать не более 36 placement links. Для каждой модели добиться минимум одного публикуемого exact offer; отсутствие оффера не заменять несовместимым SKU.

- [ ] **Step 5: Включить команды в общий gate**

  Добавить `affiliate:check-installation-result-manifest`, `affiliate:validate-installation-results`, `affiliate:validate-installation-results-public`; включить их в `npm run verify`.

- [ ] **Step 6: Проверить**

  Run: `node --test tests/affiliate/installation-result-placements.test.mjs`

  Run: `npm run affiliate:check-installation-result-manifest`

  Run: `npm run affiliate:validate-installation-results-public`

- [ ] **Step 7: Commit**

  `git add data/affiliate scripts/affiliate tests/affiliate package.json scripts/verify.mjs && git commit -m "affiliate: add installation result placements"`

---

## Task 5: Подключить result offers и точную order attribution

**Files:**

- Create: `web/src/lib/installationResultAffiliateOffers.mjs`
- Create: `web/tests/installation-result-affiliate.test.mjs`
- Modify: `web/src/hooks/useCatalog.js`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Modify: `scripts/affiliate/orders.mjs`
- Modify: `scripts/affiliate/sync-orders.mjs`
- Modify: `scripts/affiliate/report-orders.mjs`
- Modify: `tests/affiliate/orders.test.mjs`
- Modify: `web/tests/guided-selection-result.test.mjs`

- [ ] **Step 1: Написать падающие snapshot selector tests**

  `getFreshInstallationResultOffers` принимает только schema 1, свежий snapshot, безопасные model/mount ID, `page_path=/podbor/`, rank 1..3 и точный affiliate presentation. Любой duplicate ID/VID/model+mount закрывает весь snapshot.

- [ ] **Step 2: Подключить snapshot к catalog loader**

  Загружать result offers независимо от базовых и model-page offers. Ошибка или устаревание обнуляет только `installationResultAffiliateOffers`; страницы и расчёты остаются рабочими.

- [ ] **Step 3: Выбирать точный result offer**

  В `GuidedSelectionPage` выбирать offer по паре selected model + selected mount. `InstallationKitResult` показывает CTA только при существующих `market_eligible`, `compatibility=verified` и свежем exact offer. Для модели вне treatment разрешён существующий base-offer fallback, явно сохраняющий surface `mount_page`.

- [ ] **Step 4: Расширить order attribution**

  Добавить `installation_result` в безопасные surfaces и новый placement manifest в `buildPlacementAttributionIndex`. Один VID обязан разрешаться ровно в один surface/path/entity/rank; конфликт завершает sync/report ошибкой.

- [ ] **Step 5: Обновить CLI и приватный workflow contract**

  `sync-orders.mjs` и `report-orders.mjs` получают `--installation-result-placements`; default ведёт на новый tracked manifest. Внешние идентификаторы и исходные order rows остаются только в `.private`.

- [ ] **Step 6: Проверить UI и attribution**

  Render test: treatment result получает `kit-*` placement, прямую HTTPS Market link и один CTA. Control/fallback получает base placement; `blocked` не получает CTA. Orders test: известный kit VID агрегируется как `installation_result`.

- [ ] **Step 7: Проверить**

  Run: `node --test web/tests/installation-result-affiliate.test.mjs web/tests/guided-selection-result.test.mjs tests/affiliate/orders.test.mjs`

- [ ] **Step 8: Commit**

  `git add web/src scripts/affiliate tests/affiliate web/tests && git commit -m "feat: attribute installation result orders"`

---

## Task 6: Автоматизировать приватный readout «поиск → результат → деньги»

**Files:**

- Create: `scripts/analytics/first-commercial-signal.mjs`
- Create: `scripts/analytics/report-first-commercial-signal.mjs`
- Create: `tests/analytics/first-commercial-signal.test.mjs`
- Modify: `package.json`

- [ ] **Step 1: Написать падающие aggregation tests**

  На fixtures проверить объединение только обезличенных агрегатов: Google page rows treatment/control, Яндекс totals/indexation, consented funnel, Orders attribution winners. Unknown/not matured и отсутствующий файл не превращать в ноль.

- [ ] **Step 2: Реализовать строгий readout**

  Результат содержит окна и источники, treatment/control search metrics, `kit_started`, `result_completed`, `mount_detail_click`, `market_click`, orders по статусам и `APPROVED payment_kopecks`. Не включать query strings, внешние ID, VID, order key, credential path или ПДн.

- [ ] **Step 3: Добавить decision flags без обещаний**

  Поддержать только проверяемые состояния: `awaiting_mature_window`, `no_commercial_signal`, `first_market_click`, `first_attributed_order`, `first_approved_payment`, `100_market_clicks_without_order`. Не вычислять прогноз выручки до 20 `APPROVED`.

- [ ] **Step 4: Обеспечить приватность файла**

  CLI пишет только в `.private/analytics/` атомарно с mode `0600`. Публично допустим лишь ручной обезличенный итог без внутренних идентификаторов.

- [ ] **Step 5: Добавить npm command**

  `analytics:first-commercial-signal` принимает явные пути к четырём свежим отчётам и treatment manifest; без любого обязательного входа завершается ошибкой.

- [ ] **Step 6: Проверить**

  Run: `node --test tests/analytics/first-commercial-signal.test.mjs`

  Run: `npm run analytics:test`

- [ ] **Step 7: Commit**

  `git add scripts/analytics tests/analytics package.json && git commit -m "analytics: add first commercial signal readout"`

---

## Task 7: Workflow, полный gate и production release

**Files:**

- Modify: `.github/workflows/affiliate-health.yml`
- Modify: `.github/workflows/affiliate-orders.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `.github/workflows/pages.yml` only if artifact inputs change
- Modify: `product-docs/operations.md`
- Modify: `product-docs/roadmap-to-100k.md`

- [ ] **Step 1: Написать падающие workflow-hardening tests**

  Проверить, что affiliate health генерирует, проверяет и публикует result snapshot до production artifact; orders workflow передаёт новый manifest в sync/report; секреты не печатаются; публикация не делает commit при unchanged snapshot.

- [ ] **Step 2: Обновить workflows**

  Добавить result-placement pipeline рядом с model placements. Сохранить существующие concurrency, timeout, read-only defaults и точечные write permissions.

- [ ] **Step 3: Выполнить полный локальный gate**

  Run: `npm run build`

  Run: `git status --short`

  Сборка должна пройти Rust formatting/tests, WASM reproducibility, русский UI, site tests, catalog/evidence, affiliate, analytics, IndexNow и release verification.

- [ ] **Step 4: Выполнить визуальный и browser gate**

  Проверить treatment model → prefilled `/podbor/` → wall step → mechanism → exact mount → result → Market CTA на 320, 768 и 1440 CSS px. Проверить keyboard focus, отсутствие overflow, свёрнутые длинные списки, print и прямой href.

- [ ] **Step 5: Выпустить source и artifact**

  Опубликовать через документированный GitHub Pages artifact flow. Cloud.ru не трогать. Зафиксировать source commit, artifact commit и run URL локально без секретов.

- [ ] **Step 6: Проверить production**

  Проверить HTTPS 200, HTTP→HTTPS 301, TLS verify 0, robots, self-canonical, sitemap ровно 299 URL, hash контрольных model/podbor/snapshot файлов и production browser E2E.

- [ ] **Step 7: Уведомить поисковики только об изменённых canonical**

  Отправить homepage только если она реально изменилась, `/podbor/` и существующие verified model canonical. Query deep links не отправлять. HTTP 202/receipt не считать индексом.

- [ ] **Step 8: Обновить документацию**

  В operations зафиксировать result placement refresh/order readout; в roadmap записать дату релиза и исходный baseline, не объявляя доход до `APPROVED payment`.

- [ ] **Step 9: Commit**

  `git add .github/workflows product-docs && git commit -m "ops: ship first commercial signal sprint"`

---

## Task 8: Семидневное окно измерения и решение следующего шага

**Files:**

- Private only: `.private/search/*`
- Private only: `.private/affiliate-orders/*`
- Private only: `.private/analytics/first-commercial-signal-*.json`
- Modify after matured readout: `product-docs/roadmap-to-100k.md`

- [ ] **Step 1: Заморозить продукт на семь полных дней**

  Не менять title, контент, placements и flow, кроме TLS, 404, broken exact offer или другого критического дефекта.

- [ ] **Step 2: Ежедневно проверять техническое здоровье**

  Production/TLS, CI/Pages, snapshot freshness, Search Console/Webmaster maturity и Orders API. Не считать текущий неполный день.

- [ ] **Step 3: На восьмой день собрать readout**

  Использовать одинаковые семидневные окна и неизменные timezone. Отдельно показать Google/Yandex, consented lower-bound funnel и Orders API.

- [ ] **Step 4: Применить следующий gate**

  - Есть `APPROVED payment > 0`: заменить ближайшую контрольную точку на 20 `APPROVED` и копить фактический payment distribution.
  - Есть attributed order, но он не зрелый: ничего не считать доходом; ждать статус.
  - Есть `market_click`, но нет заказа: продолжать до накопленных 100 квалифицированных кликов.
  - Есть `kit_started >= 10`, но completion ниже 20%: чинить конкретный шаг с подтверждённым drop-off.
  - Есть `result_completed >= 10`, но Market click ниже 10%: проверять result evidence/CTA, не добавлять страницы.
  - Коммерческого сигнала нет, но модельные показы/клики растут: сначала проверять видимость CTA и offer freshness; не расширять P1 вслепую.
  - Нет ни поискового, ни коммерческого роста: вернуть приоритет технической индексации и зрелым query→page улучшениям существующих URL.

- [ ] **Step 5: Обновить roadmap одним фактом**

  Записать только зрелые агрегаты, решение gate и следующий выбранный спринт. Не публиковать приватные отчёты.

## Definition of Done спринта

- [ ] Homepage, treatment model и `/podbor/` имеют CLS ≤ 0,10, LCP ≤ 2,5 с и ноль full-root replacement после FCP в воспроизводимом mobile lab.
- [ ] 0 новых индексируемых URL; sitemap = 299.
- [ ] 161/161 verified model page имеют полезный SSR+React вход в предзаполненный мастер.
- [ ] Валидный model deep link начинает шаг стены; неизвестный ID fail-closed.
- [ ] `kit_started` и расширенный `result_completed` проходят consent-gated funnel report.
- [ ] До 36 treatment result placements имеют уникальные VID и точные свежие Market links.
- [ ] Orders report различает `installation_result`, `model_page`, `mount_page`, `seo_hub`.
- [ ] Приватный readout не содержит внешних идентификаторов, VID, заказов или ПДн.
- [ ] Full local gate, CI, Pages, production hash/TLS/browser checks зелёные.
- [ ] После семи полных дней принято одно evidence-based решение; отсутствие денег не замаскировано кликами или `promise`.
