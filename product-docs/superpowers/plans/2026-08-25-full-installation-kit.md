# Полный монтажный комплект KREPI TV — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Превратить существующий подбор кронштейна на `/podbor/` в самостоятельный русскоязычный мастер полного монтажного комплекта: совместимый кронштейн, крепёж VESA, безопасная классификация крепления к стене, геометрия размещения, кабельный план, инструменты и печатный чек-лист — с прямым переходом на Яндекс Маркет только при доказанной совместимости.

**Architecture:** Один канонический SSR-маршрут `/podbor/` получает шестишаговый React/Tailwind-интерфейс. Все вычисления и fail-closed решения выполняет Rust-ядро и экспортирует одним WASM JSON-контрактом; JavaScript отвечает только за загрузку данных, состояние формы, представление и аналитику. Источники и дополнительные справочники проходят JSON Schema и отдельные валидаторы до сборки. При неполных данных отдельная секция результата переходит в `needs-check` или `blocked`, но остальные секции продолжают работать.

**Tech Stack:** Rust, wasm-bindgen, React, Tailwind CSS, Vite, статический Rust sitegen, JSON Schema, Node test runner, Playwright/browser harness, GitHub Pages.

**Spec:** `product-docs/superpowers/specs/2026-08-25-full-installation-kit-design.md`

## Global Constraints

- [ ] Весь публичный интерфейс, SSR-текст, ошибки и печатная версия — только на русском языке.
- [ ] Не добавлять новые индексируемые URL: продукт остаётся на единственном canonical `/podbor/`; пользовательские размеры и ответы не попадают в URL.
- [ ] Сохранять только существующий безопасный deep link `?model=<id>`.
- [ ] Не публиковать точные винты, анкеры, свёрла, допустимые нагрузки и кабельные выводы без первичного источника и пройденной валидации.
- [ ] Не использовать цену, редиректы или клоакинг. Ссылки на Маркет — прямые, только для точного товара, доказанной совместимости и актуального предложения.
- [ ] При недостатке данных деградировать в `needs-check`; при несовместимости или небезопасном сценарии — в `blocked`; никогда не угадывать.
- [ ] Не менять текущий визуальный язык сайта и не создавать длинные списки-простыни.
- [ ] Каждое изменение начинается с падающего теста, проходит локальную проверку и фиксируется небольшим тематическим коммитом.
- [ ] Не считать HTTP 200, IndexNow, sitemap или console impressions посещением и не заявлять успех деплоя до production-проверки.

---

## Task 1: Rust-контракт полного монтажного комплекта

**Files:**

- Create: `crates/engine/src/installation_kit.rs`
- Modify: `crates/engine/src/lib.rs`
- Test: `crates/engine/src/installation_kit.rs` (`#[cfg(test)]`)

- [ ] **Step 1: Написать падающие unit-тесты контрактов**

  Добавить тесты сериализации статусов `verified`, `needs-check`, `blocked`, обязательного порядка семи секций и отсутствия точных значений в непроверенных секциях.

- [ ] **Step 2: Ввести типы входа и результата**

  Реализовать `KitSectionStatus`, `InstallationKitModel`, `WallProfile`, `PlacementInput`, `CableInput`, `InstallationKitInput`, `CompatibilitySection`, `ScrewSection`, `WallFixingSection`, `PlacementSection`, `CableSection`, `ToolsSection`, `ChecklistSection`, `InstallationKitPlan` с `serde`-контрактом и явными optional-полями.

- [ ] **Step 3: Написать падающие сценарные тесты**

  Покрыть: проверенную пару модель/кронштейн; несовместимую пару; неизвестную стену; отсутствующие данные о винтах; отсутствующие данные о портах; гипсокартон без закладной с поворотным кронштейном; стабильный JSON без `NaN`/`null` в обязательных полях.

- [ ] **Step 4: Реализовать `build_installation_kit`**

  Собрать результат поверх существующих `match_mounts`, `calculate_vesa_screw_length_plan`, `calculate_height_plan`, `calculate_mounting_map`, `calculate_turn_clearance_plan`, `calculate_tilt_angle_plan`. Не дублировать существующие формулы. Любая отсутствующая предпосылка должна менять статус только затронутой секции.

- [ ] **Step 5: Добавить WASM-экспорт**

  Экспортировать `build_installation_kit_json(input_json: &str) -> String` в `crates/engine/src/lib.rs`; ошибки возвращать в существующем машинно-читаемом error envelope, без panic.

- [ ] **Step 6: Проверить Rust-ядро**

  Run: `cargo test -p krepitv-engine installation_kit -- --nocapture`

- [ ] **Step 7: Commit**

  `git add crates/engine/src/installation_kit.rs crates/engine/src/lib.rs && git commit -m "feat: add installation kit engine"`

---

## Task 2: Строгие справочники и evidence-контракты

**Files:**

- Create: `data/wall_fixing_systems.json`
- Create: `data/model_ports.json`
- Create: `data/connection_profiles.json`
- Create: `schemas/wall-fixing-systems.schema.json`
- Create: `schemas/model-ports.schema.json`
- Create: `schemas/connection-profiles.schema.json`
- Create: `scripts/catalog/validate-installation-kit-data.mjs`
- Create: `tests/catalog/installation-kit-data.test.mjs`
- Modify: `data/mounts.json`
- Modify: `package.json`

- [ ] **Step 1: Написать падающие schema/semantic tests**

  Проверить обязательные `source_url`, `source_title`, `source_publisher`, `checked_at`, идентификаторы моделей/кронштейнов, единицы измерения, уникальность ключей, запрет неподтверждённых точных рекомендаций и отсутствие ссылок на несуществующие каталоговые сущности.

- [ ] **Step 2: Создать JSON Schema**

  Зафиксировать типы и диапазоны для геометрии настенной пластины, массы/вылета кронштейна, классов стен, профилей подключений и расположения портов. Exact-поля разрешать только вместе с evidence-объектом.

- [ ] **Step 3: Добавить валидатор fail-closed**

  Реализовать `scripts/catalog/validate-installation-kit-data.mjs`, который завершает сборку ненулевым кодом при неизвестной сущности, устаревшем или не-HTTPS источнике, противоречии единиц, точном совете без evidence и опасной комбинации стены/механизма.

- [ ] **Step 4: Наполнить только доказанные записи**

  Использовать первичные источники производителей телевизоров, кронштейнов и крепёжных систем. Для непокрытых моделей/стен оставлять отсутствие exact-данных, а не общую догадку. В `data/mounts.json` добавить только подтверждённые `wall_plate`, `mount_mass_kg`, `max_extension_mm` и evidence.

- [ ] **Step 5: Включить проверку в общий verify**

  Добавить npm script `validate:installation-kit-data` и вызвать его внутри `npm run verify` до генерации production artifact.

- [ ] **Step 6: Проверить данные**

  Run: `node --test tests/catalog/installation-kit-data.test.mjs`

  Run: `npm run validate:installation-kit-data`

- [ ] **Step 7: Commit**

  `git add data schemas scripts/catalog tests/catalog package.json && git commit -m "data: add sourced installation kit contracts"`

---

## Task 3: Browser adapter и детерминированное состояние мастера

**Files:**

- Create: `web/src/lib/installationKit.js`
- Create: `web/src/lib/installationKitState.js`
- Create: `web/src/hooks/useInstallationKit.js`
- Create: `web/tests/installation-kit-state.test.mjs`
- Create: `web/tests/installation-kit-engine.test.mjs`
- Modify: `web/src/lib/catalog.js`

- [ ] **Step 1: Написать падающие reducer-тесты**

  Проверить шестишаговое состояние, валидацию переходов, сброс зависимых ответов при смене бренда/модели/стены/механизма/кронштейна и восстановление только `model` из query string.

- [ ] **Step 2: Реализовать чистый reducer**

  Экспортировать `initialInstallationKitState`, `installationKitReducer`, `canAdvance`, `getCompletedSteps`; запретить невозможные состояния и хранение пользовательских размеров в URL/localStorage.

- [ ] **Step 3: Написать падающие adapter-тесты**

  Проверить точную форму JSON для WASM, нормализацию каталожных данных, обработку error envelope и сохранение трёх статусов секций.

- [ ] **Step 4: Реализовать WASM adapter/hook**

  Добавить `buildInstallationKit()` в `web/src/lib/catalog.js`, тонкий адаптер в `installationKit.js` и hook, который отменяет устаревший результат при изменении входа и не падает при отсутствии secondary data.

- [ ] **Step 5: Проверить web-логику**

  Run: `node --test web/tests/installation-kit-state.test.mjs web/tests/installation-kit-engine.test.mjs`

- [ ] **Step 6: Commit**

  `git add web/src/lib web/src/hooks web/tests && git commit -m "feat: add installation kit web state"`

---

## Task 4: Шестишаговый интерфейс подбора

**Files:**

- Create: `web/src/components/installation-kit/KitStepRail.jsx`
- Create: `web/src/components/installation-kit/WallProfileStep.jsx`
- Create: `web/src/components/installation-kit/MountChoiceStep.jsx`
- Create: `web/src/components/installation-kit/PlacementCableStep.jsx`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `web/tests/guided-selection-flow.test.mjs`

- [ ] **Step 1: Обновить тесты до шести шагов**

  Зафиксировать порядок: бренд → модель → стена → механизм → кронштейн → размещение и кабели; доступность кнопок, клавиатурное управление, свёрнутые длинные списки, deep link модели и сброс дочерних шагов.

- [ ] **Step 2: Разделить существующую страницу на компоненты**

  Сохранить текущий дизайн, spacing и Tailwind-токены. `KitStepRail` показывает прогресс без ложного статуса готовности; селекты бренда и модели остаются выпадающими и доступны с клавиатуры.

- [ ] **Step 3: Реализовать расширенный профиль стены**

  Поддержать бетон, полнотелый кирпич, пустотелый/ячеистый блок, гипсокартон с известной закладной, гипсокартон без известной закладной и «не знаю». Не показывать точный крепёж до подтверждения достаточных данных.

- [ ] **Step 4: Реализовать выбор одного verified-fit кронштейна**

  Показывать сначала только `verified-fit`; `conditional-fit` не превращать в рекомендацию. Для каждой карточки оставить самостоятельную техническую ценность и прямую ссылку на карточку кронштейна.

- [ ] **Step 5: Реализовать компактный ввод размещения и кабелей**

  Поля: высота глаз/центра при наличии, режим просмотра, желаемый поворот/наклон, скрытая/открытая проводка, перечень нужных подключений. Поля с размерами должны иметь единицы, диапазоны и пояснения.

- [ ] **Step 6: Проверить flow**

  Run: `node --test web/tests/guided-selection-flow.test.mjs`

- [ ] **Step 7: Commit**

  `git add web/src/pages web/src/components/installation-kit web/tests/guided-selection-flow.test.mjs && git commit -m "feat: extend mount picker to installation kit flow"`

---

## Task 5: Семь секций результата и печатный чек-лист

**Files:**

- Create: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Create: `web/src/components/installation-kit/CompatibilityPanel.jsx`
- Create: `web/src/components/installation-kit/ScrewPanel.jsx`
- Create: `web/src/components/installation-kit/WallFixingPanel.jsx`
- Create: `web/src/components/installation-kit/PlacementPanel.jsx`
- Create: `web/src/components/installation-kit/CablePanel.jsx`
- Create: `web/src/components/installation-kit/ToolsPanel.jsx`
- Create: `web/src/components/installation-kit/PrintableChecklist.jsx`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `web/src/styles.css`
- Modify: `web/tests/guided-selection-result.test.mjs`

- [ ] **Step 1: Написать падающие result-тесты**

  Проверить наличие семи секций, явные статусы, отсутствие unsafe exact-claim, отсутствие коммерческого CTA у `blocked`, сохранение полезного чек-листа без оффера и полный порядок элементов печати. Отдельно проверить, что точки сверления появляются только при полной доказанной геометрии конкретной настенной пластины, а неполные данные дают размерную схему без отверстий.

- [ ] **Step 2: Реализовать общий status UI**

  Один доступный визуальный язык для `verified`, `needs-check`, `blocked`; цвет не должен быть единственным носителем смысла. Каждая секция получает причину статуса и следующее безопасное действие.

- [ ] **Step 3: Реализовать семь result panels**

  Совместимость, VESA-винты/проставки, крепление к стене, геометрия, кабели, инструменты/расходники, упорядоченный чек-лист. Не выводить пустые числовые поля как нули.

- [ ] **Step 4: Реализовать печать**

  Кнопка вызывает `window.print()`. В `@media print` скрыть навигацию и CTA, раскрыть чек-лист, сохранить названия модели/кронштейна, статусы, предупреждения и источники. Для полностью доказанной геометрии добавить масштабную SVG-карту с контрольной линейкой 100 мм; для остальных сценариев — только размерную схему без точек сверления. Не добавлять отдельный PDF-движок в первый релиз.

- [ ] **Step 5: Проверить результат**

  Run: `node --test web/tests/guided-selection-result.test.mjs`

- [ ] **Step 6: Commit**

  `git add web/src/components/installation-kit web/src/pages/GuidedSelectionPage.jsx web/src/styles.css web/tests/guided-selection-result.test.mjs && git commit -m "feat: render complete installation kit result"`

---

## Task 6: SSR, входы в продукт и E-E-A-T слой

**Files:**

- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/src/App.jsx`
- Test: `crates/sitegen/src/main.rs` (`#[cfg(test)]`)
- Test: `tests/catalog/seo-pages.test.mjs`

- [ ] **Step 1: Написать падающие sitegen-тесты**

  Проверить, что `/podbor/index.html` до JS объясняет назначение, методику, ограничения, состав результата, источники и пример; homepage CTA содержит «Собрать монтажный комплект»; каждая verified model page имеет `/podbor/?model=<id>`; canonical единственный; sitemap остаётся без новых URL.

- [ ] **Step 2: Усилить SSR `/podbor/`**

  Добавить русскоязычные блоки «Что вы получите», «Как мы проверяем совместимость», «Что нельзя определить без осмотра», краткий пример и ссылки на первичные источники. React должен гидратировать страницу без дублирования H1/canonical.

- [ ] **Step 3: Обновить входы**

  На главной основной CTA — «Собрать монтажный комплект». На подтверждённых модельных страницах добавить точный deep link с model id. Существующие материалы могут ссылаться на `/podbor/`, но без новых thin pages.

- [ ] **Step 4: Проверить SEO-инварианты**

  Run: `cargo test -p krepitv-sitegen -- --nocapture`

  Run: `node --test tests/catalog/seo-pages.test.mjs`

- [ ] **Step 5: Commit**

  `git add crates/sitegen/src/main.rs web/src/App.jsx tests/catalog/seo-pages.test.mjs && git commit -m "seo: make installation kit the primary site tool"`

---

## Task 7: Аналитика и affiliate fail-closed

**Files:**

- Modify: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Modify: `web/src/lib/analytics.js`
- Modify: `web/tests/result-instrumentation.test.mjs`
- Modify: `web/tests/mount-funnel.test.mjs`
- Modify: `tests/affiliate/market-links.test.mjs`

- [ ] **Step 1: Написать падающие instrumentation-тесты**

  Проверить единственный `result_completed` с `tool_id=installation_kit`; разрешённые model/mount ids и controlled status summary; отсутствие размеров, поискового текста, URL-параметров и ПДн.

- [ ] **Step 2: Реализовать событие завершения**

  Отправлять событие один раз после успешного расчёта, отдельно от `mount_detail_click` и `market_click`. Повторный render не должен дублировать событие.

- [ ] **Step 3: Ограничить CTA Маркета**

  Показывать прямую кнопку Маркета только когда compatibility=`verified`, идентичность оффера совпадает с выбранным кронштейном, предложение свежее и URL проходит существующий allowlist. Иначе оставить техническую карточку без CTA.

- [ ] **Step 4: Проверить аналитику и ссылки**

  Run: `node --test web/tests/result-instrumentation.test.mjs web/tests/mount-funnel.test.mjs tests/affiliate/market-links.test.mjs`

- [ ] **Step 5: Commit**

  `git add web/src/components/installation-kit/InstallationKitResult.jsx web/src/lib/analytics.js web/tests tests/affiliate && git commit -m "feat: instrument installation kit safely"`

---

## Task 8: Полная локальная верификация

**Files:**

- Modify only if a test exposes a real defect.

- [ ] **Step 1: Проверить рабочее дерево и placeholders**

  Run: `git status --short`

  Run: `rg -n "TBD|TODO|FIXME|implement later|similar to" crates web data schemas scripts tests product-docs/superpowers/specs/2026-08-25-full-installation-kit-design.md`

- [ ] **Step 2: Полный build/verify**

  Run: `npm run build`

  Expected: Rust tests, WASM reproducibility, data/schema/SEO/affiliate/analytics tests и RU public-text scan проходят без ошибок.

- [ ] **Step 3: Design/browser QA**

  Проверить `/podbor/?model=tcl-65c7k` и путь без параметра на 390, 768 и 1440 CSS px: весь flow, back/reset, overflow, клавиатура, секции `verified/needs-check/blocked`, печатная версия, прямой CTA Маркета. Сделать скриншоты evidence вне git.

- [ ] **Step 4: Статический security/release audit**

  Проверить отсутствие секретов и ПДн, отсутствие внешних inline scripts, корректные `rel`, direct Market links, canonical, robots, sitemap и zero-new-URL invariant.

- [ ] **Step 5: Финальный diff audit**

  Run: `git diff --check`

  Run: `git status --short`

- [ ] **Step 6: Final implementation commit**

  Если после предыдущих тематических коммитов остались только evidence/docs изменения: `git add <exact-files> && git commit -m "test: verify full installation kit release"`.

---

## Task 9: Деплой и production read-back

**Files:**

- Generated production artifact tracked by the existing release flow.
- Private evidence under `.private/` only; never commit credentials or reports.

- [ ] **Step 1: Проверить source и Pages workflows**

  Убедиться, что локальный HEAD clean, затем `git push origin main`. Отслеживать именно запущенные для этого commit source CI и GitHub Pages deploy до terminal success. При billing/runner-сбое использовать документированный artifact-repo flow проекта, не Cloud.ru.

- [ ] **Step 2: Проверить production transport**

  Проверить `https://krepitv.ru/` = 200, `http://krepitv.ru/` → HTTPS, TLS verify=0, сертификат соответствует hostname.

- [ ] **Step 3: Проверить production artifact**

  Сравнить SHA-256 локального и production HTML для `/`, `/podbor/`, одной модельной и одной кронштейнной страницы; проверить canonical/robots/sitemap и неизменное число индексируемых URL.

- [ ] **Step 4: Production browser E2E**

  На production пройти все шесть шагов для verified, needs-check и blocked сценариев на mobile/desktop, проверить print preview, отсутствие overflow и работоспособность прямой ссылки Маркета.

- [ ] **Step 5: Уведомить поисковики только об изменённых canonical**

  Отправить изменённые `/`, `/podbor/` и реально изменённые model canonical через существующий IndexNow flow. HTTP 202 сохранить как receipt, не считать индексированием или трафиком.

- [ ] **Step 6: Снять post-release evidence**

  Сохранить локально commit, workflow run ids, production hashes, TLS/HTTP результаты и browser evidence без секретов. Через доступные отчёты убедиться, что нет новых технических ошибок; delayed analytics не превращать в ноль.

- [ ] **Step 7: Завершить цель**

  Цель считается выполненной только когда код и artifact совпадают, CI/Pages зелёные, production E2E пройден и все публичные тексты/ссылки соответствуют ограничениям. После этого отметить goal complete и сообщить пользователю итог, production URL, ключевые проверки и оставшиеся измерительные ожидания.
