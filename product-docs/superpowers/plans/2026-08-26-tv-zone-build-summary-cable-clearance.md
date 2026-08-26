# KREPI TV TV-Zone Build Summary and Cable Clearance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** превратить текущий семисекционный результат `/podbor/` в компактную проверяемую сборку ТВ-зоны и добавить первый точный кабельный контроль: помещается ли выбранный задний штекер в минимальный зазор конкретного кронштейна.

**Architecture:** Rust/WASM остаётся единственным источником технического решения. Web-слой передаёт направление разъёма и измеренный пользователем габарит штекера с безопасным изгибом, получает контролируемый `CableClearanceAssessment` и только отображает его. React перегруппировывает уже рассчитанные секции в «необходимо / проверить»; секция необязательных улучшений в этом спринте не показывается, потому что ни одна категория аксессуаров ещё не прошла коммерческий и evidence-gate.

**Tech Stack:** Rust 1.93.1, `serde`, `wasm-bindgen`, React/Vite, Tailwind CSS, Node test runner, Rust unit tests, Яндекс Метрика, статический Rust sitegen, GitHub Pages.

**Spec:** `product-docs/superpowers/specs/2026-08-25-full-installation-kit-design.md`; уточнения и коммерческие gates — `product-docs/superpowers/backlogs/2026-08-25-installation-assistant-backlog.md` и `product-docs/roadmap-to-100k.md`.

## Global Constraints

- Публичный язык — только русский.
- Новых индексируемых URL и изменений sitemap — `0`.
- Cloud.ru, платная реклама и серверная база не используются.
- Технические решения выполняются локально в Rust/WASM; JavaScript не дублирует формулы.
- Прямой CTA Маркета остаётся только у точного свежего оффера выбранного кронштейна; редиректы, клоакинг и цены запрещены.
- Если выбран задний разъём, но габарит штекера не измерен, результат получает `needs-check`, а CTA этого кронштейна скрывается.
- Если измеренный габарит больше минимального зазора кронштейна, кабельная секция получает `blocked`, а CTA скрывается.
- Измерения, свободный текст, URL-параметры и ПДн не передаются в аналитику.
- Не добавлять саундбары, подсветку, сетевые адаптеры, чистящие средства или приставки в этот спринт.
- Не обещать «идеальную совместимость», безопасность проводки, медицинский эффект или рост дохода.
- Сохранить performance-gate: CLS `≤ 0,10`, LCP `≤ 2 500 мс`, TBT `≤ 200 мс`, `rootEmptyEvents=0`, `fullRootReplacements=0`.
- Каждый task заканчивается отдельным тестируемым коммитом; production публикуется только после полного gate.

---

### Task 1: Rust-контракт проверки кабельного зазора

**Files:**

- Modify: `crates/engine/src/installation_kit.rs`
- Modify: `crates/engine/src/lib.rs`
- Test: `crates/engine/src/installation_kit.rs` (`#[cfg(test)]`)

**Interfaces:**

- Consumes: `Mount.wall_distance_min_mm`, выбранный `connection_kind`, направление разъёма и измеренный пользователем общий габарит «штекер + безопасный изгиб».
- Produces: `ConnectorClearanceInput`, `CableClearanceAssessment`, поле `CableSection.clearance` и обновлённый `InstallationKitPlan.market_eligible`.

- [ ] **Step 1: Написать падающие Rust-тесты для четырёх исходов**

  В тестовом `base_input()` добавить `connector_clearance: None`, затем зафиксировать сценарии:

  ```rust
  #[test]
  fn rearward_connector_without_measurement_needs_check_and_hides_market() {
      let mut input = base_input();
      input.cables.connector_clearance = Some(ConnectorClearanceInput {
          connection_kind: "hdmi".into(),
          port_direction: PortDirection::Rearward,
          required_clearance_mm: None,
          fact_source: ClearanceFactSource::User,
      });
      let plan = build_installation_kit(&input).expect("bounded input");
      assert_eq!(plan.cables.clearance.as_ref().unwrap().verdict, CableClearanceVerdict::NeedsMeasurement);
      assert_eq!(plan.cables.status, KitSectionStatus::NeedsCheck);
      assert!(!plan.market_eligible);
  }

  #[test]
  fn measured_rearward_connector_blocks_mount_when_gap_is_too_small() {
      let mut input = base_input();
      input.mount.wall_distance_min_mm = 22.0;
      input.cables.connector_clearance = Some(ConnectorClearanceInput {
          connection_kind: "hdmi".into(),
          port_direction: PortDirection::Rearward,
          required_clearance_mm: Some(35.0),
          fact_source: ClearanceFactSource::User,
      });
      let plan = build_installation_kit(&input).expect("bounded input");
      let check = plan.cables.clearance.as_ref().unwrap();
      assert_eq!(check.verdict, CableClearanceVerdict::Conflict);
      assert_eq!(check.margin_mm, Some(-13.0));
      assert_eq!(plan.cables.status, KitSectionStatus::Blocked);
      assert!(!plan.market_eligible);
  }

  #[test]
  fn measured_rearward_connector_passes_when_gap_is_sufficient() {
      let mut input = base_input();
      input.mount.wall_distance_min_mm = 60.0;
      input.cables.connector_clearance = Some(ConnectorClearanceInput {
          connection_kind: "hdmi".into(),
          port_direction: PortDirection::Rearward,
          required_clearance_mm: Some(35.0),
          fact_source: ClearanceFactSource::User,
      });
      let plan = build_installation_kit(&input).expect("bounded input");
      assert_eq!(plan.cables.clearance.as_ref().unwrap().verdict, CableClearanceVerdict::Verified);
      assert_eq!(plan.cables.clearance.as_ref().unwrap().margin_mm, Some(25.0));
      assert!(plan.market_eligible);
  }

  #[test]
  fn connector_measurement_must_belong_to_a_selected_connection() {
      let mut input = base_input();
      input.cables.connections = vec!["power".into()];
      input.cables.connector_clearance = Some(ConnectorClearanceInput {
          connection_kind: "hdmi".into(),
          port_direction: PortDirection::Rearward,
          required_clearance_mm: Some(35.0),
          fact_source: ClearanceFactSource::User,
      });
      assert!(build_installation_kit(&input).is_err());
  }
  ```

- [ ] **Step 2: Запустить тест и подтвердить красный результат**

  Run: `cargo test -p krepitv-engine installation_kit::tests -- --nocapture`

  Expected: FAIL — новые типы и поле `connector_clearance` ещё не определены.

- [ ] **Step 3: Добавить сериализуемые типы без строковых догадок**

  В `installation_kit.rs` определить:

  ```rust
  #[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
  #[serde(rename_all = "kebab-case")]
  pub enum PortDirection { Sideways, Downward, Rearward, Unknown }

  #[derive(Clone, Debug, Deserialize, Serialize)]
  pub struct ModelPort {
      pub kind: String,
      pub position: String,
      pub direction: PortDirection,
  }

  #[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
  #[serde(rename_all = "kebab-case")]
  pub enum ClearanceFactSource { Passport, User, Unknown }

  #[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
  #[serde(rename_all = "kebab-case")]
  pub enum CableClearanceVerdict { Verified, NeedsMeasurement, Conflict }

  #[derive(Clone, Debug, Deserialize, Serialize)]
  pub struct ConnectorClearanceInput {
      pub connection_kind: String,
      pub port_direction: PortDirection,
      pub required_clearance_mm: Option<f64>,
      pub fact_source: ClearanceFactSource,
  }

  #[derive(Clone, Debug, Serialize)]
  pub struct CableClearanceAssessment {
      pub verdict: CableClearanceVerdict,
      pub reason_code: String,
      pub connection_kind: String,
      pub port_direction: PortDirection,
      pub fact_source: ClearanceFactSource,
      pub available_clearance_mm: f64,
      pub required_clearance_mm: Option<f64>,
      pub margin_mm: Option<f64>,
  }
  ```

  В `InstallationKitModel` добавить `#[serde(default)] pub ports: Vec<ModelPort>`, сохранив текущее `port_sides` для обратной совместимости одного релиза. В `CableInput` добавить `connector_clearance: Option<ConnectorClearanceInput>`, в `CableSection` — `clearance: Option<CableClearanceAssessment>`.

- [ ] **Step 4: Реализовать fail-closed расчёт в Rust**

  Добавить чистую функцию `assess_connector_clearance(mount, cables) -> Result<Option<CableClearanceAssessment>, String>`:

  - `connection_kind` обязан входить в `cables.connections`;
  - `required_clearance_mm`, если задан, конечен и лежит в диапазоне `1..=200`;
  - `available_clearance_mm` берётся только из `mount.wall_distance_min_mm`;
  - `rearward + None` → `needs-measurement`, `rear-port-envelope-missing`;
  - `rearward + required > available` → `conflict`, `rear-port-insufficient-clearance`;
  - `rearward + required <= available` → `verified`, `rear-port-clearance-ok`;
  - `sideways/downward` → `verified`, `non-rear-port`;
  - `unknown` → `needs-measurement`, `port-direction-unknown`.

  `CableSection.status` становится `blocked` для `conflict`, `needs-check` для `needs-measurement`; иначе сохраняет существующую проверку маршрута и паспортов. `market_eligible` равен `true` только при `compatibility=verified` и отсутствии `blocked/needs-measurement` у созданной cable-clearance проверки.

- [ ] **Step 5: Обновить WASM JSON-contract без второго вычислителя**

  Экспорт `build_installation_kit_json()` не меняет имя. Новые поля проходят через `serde`; JavaScript получает уже рассчитанные `verdict`, `reason_code`, `available_clearance_mm`, `required_clearance_mm` и `margin_mm`.

- [ ] **Step 6: Запустить Rust-gate**

  Run: `cargo fmt --all --check`

  Run: `cargo test -p krepitv-engine installation_kit::tests -- --nocapture`

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add crates/engine/src/installation_kit.rs crates/engine/src/lib.rs
  git commit -m "feat: calculate connector wall clearance"
  ```

---

### Task 2: Web-adapter и детерминированное состояние измерения

**Files:**

- Modify: `web/src/lib/installationKit.js`
- Modify: `web/src/lib/installationKitState.js`
- Modify: `web/tests/installation-kit-engine.test.mjs`
- Modify: `web/tests/installation-kit-state.test.mjs`

**Interfaces:**

- Consumes: существующий `model_ports.json` с `kind/position/direction`, пользовательский `connectorClearance` и `mount.wall_distance_min_mm`.
- Produces: Rust-shaped `cables.connector_clearance` и безопасный сброс измерения при смене модели, кронштейна или набора подключений.

- [ ] **Step 1: Написать падающие adapter-тесты**

  Добавить паспортную фикстуру с `ports: [{ kind: "hdmi", position: "rear", direction: "rearward" }]` и проверить:

  ```javascript
  assert.deepEqual(input.model.ports, [{
    kind: "hdmi",
    position: "rear",
    direction: "rearward",
  }]);
  assert.deepEqual(input.cables.connector_clearance, {
    connection_kind: "hdmi",
    port_direction: "rearward",
    required_clearance_mm: 35,
    fact_source: "passport",
  });
  ```

  Отдельно проверить, что повреждённый passport evidence не передаёт `model.ports`, а явный выбор пользователя получает `fact_source: "user"`.

- [ ] **Step 2: Написать падающие reducer-тесты**

  Зафиксировать, что `connectorClearance`:

  - допускает только выбранный тип подключения;
  - сбрасывается при смене модели, кронштейна и списка `connections`;
  - не сохраняется в URL или `localStorage`;
  - увеличивает `revision` ровно один раз при изменении.

- [ ] **Step 3: Запустить два тестовых файла**

  Run: `node --test web/tests/installation-kit-engine.test.mjs web/tests/installation-kit-state.test.mjs`

  Expected: FAIL — adapter пока теряет направление портов, reducer не знает измерение.

- [ ] **Step 4: Сохранить подробный паспорт портов**

  В `buildModel()` дополнить плоский `port_sides` массивом `ports`; удалить старое поле можно будет только отдельным совместимым релизом. Передавать только записи из паспорта с валидным HTTPS evidence и контролируемыми `kind`, `position`, `direction`.

  Для выбранного `connection_kind` использовать паспортное направление только когда все подходящие порты дают одно и то же направление. При нескольких направлениях не угадывать: в input передаётся явный выбор пользователя.

- [ ] **Step 5: Добавить чистую нормализацию connector-clearance**

  Экспортировать из `installationKit.js`:

  ```javascript
  export function buildConnectorClearanceInput({
    connections,
    modelPortPassport,
    connectorClearance,
  }) { /* returns Rust shape or null */ }
  ```

  Функция не считает margin и не сравнивает миллиметры — это делает только Rust.

- [ ] **Step 6: Расширить reducer без скрытого persistence**

  В состоянии шага 6 хранить `cables.connectorClearance`. Action `set-cables` валидирует controlled tokens `power|hdmi|ethernet|antenna|optical|usb`, направления `sideways|downward|rearward|unknown` и число `1..=200` либо `null`.

- [ ] **Step 7: Запустить web-логику**

  Run: `node --test web/tests/installation-kit-engine.test.mjs web/tests/installation-kit-state.test.mjs`

  Expected: PASS.

- [ ] **Step 8: Commit**

  ```bash
  git add web/src/lib/installationKit.js web/src/lib/installationKitState.js web/tests/installation-kit-engine.test.mjs web/tests/installation-kit-state.test.mjs
  git commit -m "feat: pass connector clearance to wasm"
  ```

---

### Task 3: Короткий UX замера на шестом шаге

**Files:**

- Modify: `web/src/components/installation-kit/PlacementCableStep.jsx`
- Modify: `web/tests/guided-selection-result.test.mjs`
- Modify: `web/src/styles.css`

**Interfaces:**

- Consumes: выбранные `connections`, однозначное паспортное направление при наличии и текущий `connectorClearance`.
- Produces: один компактный объект замера для самого тесного подключаемого штекера; длинных списков и товарных советов нет.

- [ ] **Step 1: Добавить падающий SSR/UI-тест**

  Проверить русские подписи и progressive disclosure:

  ```javascript
  assert.match(html, /Проверка самого тесного штекера/);
  assert.match(html, /Куда направлен разъём/);
  assert.match(html, /Не знаю/);
  assert.doesNotMatch(html, /купить|лучший|идеальный|HDMI 2\.1/i);
  ```

  В browser-state фикстуре проверить, что поле «Габарит штекера с изгибом, мм» появляется только для `rearward`, принимает `1..200`, сообщает об ошибке через связанный `aria-describedby` и не блокирует сохранение безопасного `unknown`.

- [ ] **Step 2: Запустить UI-тест**

  Run: `node --test web/tests/guided-selection-result.test.mjs`

  Expected: FAIL — поля ещё отсутствуют.

- [ ] **Step 3: Реализовать один измерительный блок**

  В `PlacementCableStep` после выбора подключений добавить:

  1. select типа проверяемого соединения из уже выбранных `connections`;
  2. select направления: «сбоку», «вниз», «назад к стене», «не знаю»;
  3. для «назад к стене» — number input общего габарита штекера вместе с необходимым изгибом;
  4. подсказку: измерять от корпуса ТВ до самой дальней точки подключённого штекера с кабелем, не выпрямляя кабель насильно.

  Если паспорт точной модели однозначно задаёт направление, показать «Направление взято из паспорта модели» и оставить пользователю возможность выбрать «на моём ТВ иначе», переключив `fact_source` на `user`.

- [ ] **Step 4: Сохранить визуальную плотность**

  Блок закрыт в один `<details>` до выбора хотя бы одного кабеля. На мобильном — одна колонка, на desktop — не более двух. Не использовать горизонтальный скролл, sticky CTA и модальное окно.

- [ ] **Step 5: Запустить компонентный тест и русский gate**

  Run: `node --test web/tests/guided-selection-result.test.mjs`

  Run: `npm --prefix web run check:ru`

  Expected: PASS.

- [ ] **Step 6: Commit**

  ```bash
  git add web/src/components/installation-kit/PlacementCableStep.jsx web/src/styles.css web/tests/guided-selection-result.test.mjs
  git commit -m "feat: add connector clearance measurement"
  ```

---

### Task 4: Компактная сборка «необходимо / проверить»

**Files:**

- Create: `web/src/components/installation-kit/InstallationKitBuildSummary.jsx`
- Modify: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Modify: `web/src/components/installation-kit/CablePanel.jsx`
- Modify: `web/src/components/installation-kit/KitSection.jsx`
- Modify: `web/tests/guided-selection-result.test.mjs`
- Modify: `web/tests/installation-kit-visual-contract.test.mjs`

**Interfaces:**

- Consumes: только готовый `InstallationKitPlan`, выбранные model/mount и точный `offer`.
- Produces: `InstallationKitBuildSummary`, controlled anchors к семи существующим секциям и понятный кабельный verdict. Технических вычислений в React нет.

- [ ] **Step 1: Написать падающие summary-тесты**

  Для `verified`, `needs-check` и `blocked` планов проверить:

  - в «Необходимо» ровно одна пара ТВ + кронштейн и один основной следующий шаг;
  - «Проверить перед покупкой» содержит только секции не в статусе `verified`;
  - список проверок свёрнут после трёх пунктов;
  - «Необязательное» полностью отсутствует;
  - Market CTA отсутствует при `clearance.verdict=needs-measurement|conflict`;
  - Market CTA остаётся прямым и единственным при полностью подтверждённой сборке;
  - ни одна цена не попадает в HTML.

- [ ] **Step 2: Запустить result-тесты**

  Run: `node --test web/tests/guided-selection-result.test.mjs web/tests/installation-kit-visual-contract.test.mjs`

  Expected: FAIL — summary-компонента ещё нет.

- [ ] **Step 3: Реализовать presentation-only summary**

  `InstallationKitBuildSummary` получает `{ model, mount, offer, plan }`. Он не сравнивает размеры и не меняет `market_eligible`; только отображает уже рассчитанные статусы.

  Порядок:

  - **Необходимо:** точная пара, VESA, масса/нагрузка из compatibility panel и основной CTA либо безопасная причина его отсутствия;
  - **Проверить перед покупкой:** ссылки-якоря на `needs-check/blocked` секции с их существующим предупреждением;
  - **Необязательное:** не рендерится до отдельного одобренного коммерческого спринта.

  Существующие семь панелей остаются ниже как подробный паспорт; summary не дублирует их длинные таблицы.

- [ ] **Step 4: Отобразить cable-clearance без товарной подмены**

  `CablePanel` показывает:

  - доступный зазор кронштейна;
  - измеренный габарит штекера, если он есть;
  - запас или дефицит в миллиметрах;
  - один из текстов: «помещается по введённому замеру», «измерьте штекер с изгибом», «этот штекер не помещается».

  Для `conflict` следующий шаг: выбрать другой доступный порт, другой кабельный форм-фактор или другой кронштейн и повторить расчёт. Ссылку на конкретный адаптер не добавлять.

- [ ] **Step 5: Сохранить доступность и печать**

  Статус передаётся текстом и иконкой, не одним цветом. Summary использует существующие anchors `#kit-*`. В `@media print` остаётся короткая сборка, предупреждения и подробный чек-лист; кнопки и Market CTA скрываются.

- [ ] **Step 6: Запустить UI-gate**

  Run: `node --test web/tests/guided-selection-result.test.mjs web/tests/installation-kit-visual-contract.test.mjs`

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add web/src/components/installation-kit web/tests/guided-selection-result.test.mjs web/tests/installation-kit-visual-contract.test.mjs
  git commit -m "feat: summarize the verified tv zone build"
  ```

---

### Task 5: Обезличенная аналитика использования сборки

**Files:**

- Create: `web/src/lib/installationKitInteraction.mjs`
- Modify: `web/src/components/installation-kit/InstallationKitBuildSummary.jsx`
- Modify: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Modify: `web/src/lib/metrika.mjs`
- Modify: `web/tests/metrika.test.mjs`
- Modify: `web/tests/result-instrumentation.test.mjs`
- Modify: `scripts/analytics/manage-metrika-goals.mjs`
- Modify: `tests/analytics/metrika-goals.test.mjs`
- Modify: `scripts/analytics/report-metrika-funnel.mjs`
- Modify: `tests/analytics/metrika-funnel.test.mjs`

**Interfaces:**

- Consumes: controlled action/status/section tokens from summary UI.
- Produces: browser event `krepitv:installation-kit-interaction`, Metrika goal `installation_kit_interaction` и отдельные агрегаты без размеров или ПДн.

- [ ] **Step 1: Написать падающие allowlist-тесты**

  Разрешённый payload:

  ```javascript
  {
    action: "checks_opened", // checks_opened | cable_check_opened | print_started
    section: "summary",      // summary | cables | print
    status: "needs-check",   // verified | needs-check | blocked
  }
  ```

  Тест обязан доказать удаление `modelId`, `mountId`, `requiredClearance`, `availableClearance`, `margin`, `query`, `href`, свободного текста и ПДн.

- [ ] **Step 2: Запустить аналитические тесты**

  Run: `node --test web/tests/metrika.test.mjs web/tests/result-instrumentation.test.mjs tests/analytics/metrika-goals.test.mjs tests/analytics/metrika-funnel.test.mjs`

  Expected: FAIL — событие и цель не определены.

- [ ] **Step 3: Реализовать emitter и Metrika allowlist**

  `emitInstallationKitInteraction(windowObject, detail)` создаёт CustomEvent только для трёх действий, трёх секций и трёх статусов. `metrika.mjs` передаёт в `reachGoal` только `action`, `section`, `status`.

- [ ] **Step 4: Инструментировать три явных действия**

  Отправлять событие только при пользовательском клике:

  - раскрытие списка проверок;
  - переход к кабельной проверке;
  - запуск печати.

  Обычный render, scroll, изменение input и автоматический расчёт событий не создают.

- [ ] **Step 5: Добавить управляемую цель и отчёт**

  `manage-metrika-goals.mjs` проверяет/создаёт JavaScript-event goal `installation_kit_interaction`. `report-metrika-funnel.mjs` выводит counts по трём controlled actions отдельно от `result_completed`, `market_click` и заказов; нулевые данные не интерпретируются как доход.

- [ ] **Step 6: Запустить полный аналитический тест**

  Run: `node --test web/tests/metrika.test.mjs web/tests/result-instrumentation.test.mjs tests/analytics/metrika-goals.test.mjs tests/analytics/metrika-funnel.test.mjs`

  Expected: PASS.

- [ ] **Step 7: Commit**

  ```bash
  git add web/src/lib/installationKitInteraction.mjs web/src/lib/metrika.mjs web/src/components/installation-kit web/tests scripts/analytics tests/analytics
  git commit -m "analytics: measure installation kit summary use"
  ```

---

### Task 6: Design, performance, SEO и production release gate

**Files:**

- Create: `.design-harness/runs/` entry through the harness `new` command
- Create: `product-docs/design-qa/2026-08-26-tv-zone-build-summary/mobile-390.png`
- Create: `product-docs/design-qa/2026-08-26-tv-zone-build-summary/desktop-1440.png`
- Create: `product-docs/design-qa/2026-08-26-tv-zone-build-summary/print.png`
- Create: `product-docs/design-qa/2026-08-26-tv-zone-build-summary/README.md`
- Modify: `scripts/qa/capture-page.mjs`
- Modify: `scripts/verify.mjs`
- Modify: `tests/qa/layout-stability.test.mjs`
- Modify: `web/tests/guided-selection-capture.test.mjs`
- Modify: `product-docs/superpowers/backlogs/2026-08-25-installation-assistant-backlog.md`

**Interfaces:**

- Consumes: completed tasks 1–5 and current stable `/podbor/` island architecture.
- Produces: sealed design evidence, full local release artifact, production deployment and verified no-regression report.

- [ ] **Step 1: Создать bounded design-harness run**

  Run:

  ```bash
  ./.design-harness/design-harness new --workspace "$PWD" --slug tv-zone-build-summary --kind ui
  RUN="$(find .design-harness/runs -mindepth 1 -maxdepth 1 -type d -name '*tv-zone-build-summary*' | sort | tail -1)"
  ./.design-harness/design-harness check --workspace "$PWD" --run "$RUN" --phase spec
  ```

  В run зафиксировать mobile-first структуру, четыре состояния `verified / needs-check / blocked / no-offer`, reference на текущую инженерно-редакционную визуальную систему и запрет коммерческой простыни.

- [ ] **Step 2: Добавить статические release-инварианты**

  `scripts/verify.mjs` должен проверять production `/podbor/index.html`:

  - один canonical `/podbor/`;
  - один SSR H1;
  - сохранённый `data-guided-selection-island`;
  - отсутствие цен и новых accessory CTA;
  - отсутствие нового URL в sitemap;
  - наличие русскоязычного explanation copy до JavaScript.

- [ ] **Step 3: Выполнить полный локальный build**

  Run: `npm run build`

  Expected: все Rust, WASM reproducibility, web, data, affiliate, SEO и analytics gates проходят; tracked `docs/` соответствует исходникам.

- [ ] **Step 4: Расширить воспроизводимый screenshot-state**

  В `capture-page.mjs` добавить controlled состояния `cable-verified`, `cable-needs-check`, `cable-blocked`. Каждое состояние проходит мастер до результата с фиксированными неперсональными значениями. Добавить аргумент `--media screen|print`; для `print` вызывать CDP `Emulation.setEmulatedMedia` до снимка. `guided-selection-capture.test.mjs` проверяет allowlist состояний, отсутствие сетевого mock товара и deterministic заполнение полей.

- [ ] **Step 5: Запустить preview и снять три состояния**

  Terminal A: `npm --prefix web run preview -- --host 127.0.0.1 --port 4173`

  Terminal B:

  ```bash
  node scripts/qa/capture-page.mjs --url 'http://127.0.0.1:4173/podbor/?model=tcl-65c7k' --output product-docs/design-qa/2026-08-26-tv-zone-build-summary/mobile-390.png --width 390 --height 1000 --guided-selection-state cable-needs-check
  node scripts/qa/capture-page.mjs --url 'http://127.0.0.1:4173/podbor/?model=tcl-65c7k' --output product-docs/design-qa/2026-08-26-tv-zone-build-summary/desktop-1440.png --width 1440 --height 1100 --guided-selection-state cable-verified
  node scripts/qa/capture-page.mjs --url 'http://127.0.0.1:4173/podbor/?model=tcl-65c7k' --output product-docs/design-qa/2026-08-26-tv-zone-build-summary/print.png --width 1440 --height 1600 --guided-selection-state cable-blocked --media print
  ```

  README фиксирует viewport, состояние, дату и проверку отсутствия горизонтального overflow.

- [ ] **Step 6: Проверить performance budget три раза**

  Run:

  ```bash
  node scripts/qa/measure-layout-stability.mjs --url http://127.0.0.1:4173 --runs 3 --routes '/,/modeli/tcl-55c6k/,/podbor/?model=tcl-55c6k'
  ```

  Expected: каждый маршрут проходит CLS/LCP/TBT budgets; `rootEmptyEvents=0`, `fullRootReplacements=0`.

- [ ] **Step 7: Завершить design gate**

  Run:

  ```bash
  ./.design-harness/design-harness scan-drift --workspace "$PWD" --run "$RUN"
  ./.design-harness/design-harness check --workspace "$PWD" --run "$RUN" --phase final
  ./.design-harness/design-harness seal --workspace "$PWD" --run "$RUN"
  ./.design-harness/design-harness check --workspace "$PWD" --run "$RUN" --phase ship
  ```

- [ ] **Step 8: Обновить backlog фактическим результатом**

  Перенести «Компактная сборка ТВ-зоны» и «первый cable-clearance check» из NEXT в реализованное только после зелёных gates. Саундбары, подсветка, питание, уход и приставки остаются P2.

- [ ] **Step 9: Commit и deploy**

  ```bash
  git add crates web data schemas scripts tests docs product-docs .design-harness
  git commit -m "feat: ship verified tv zone build summary"
  git push origin main
  gh run watch --repo jimbokl/krepitv "$(gh run list --repo jimbokl/krepitv --workflow pages.yml --limit 1 --json databaseId --jq '.[0].databaseId')" --exit-status
  ```

- [ ] **Step 10: Production verification**

  Run:

  ```bash
  curl --fail --silent --show-error --location --output /dev/null --write-out '%{http_code}\n' https://krepitv.ru/podbor/
  curl --fail --silent --show-error https://krepitv.ru/robots.txt
  curl --fail --silent --show-error https://krepitv.ru/sitemap.xml | rg -c '<loc>'
  ```

  Expected: `/podbor/` — `200`, TLS verify проходит, robots/sitemap доступны, число sitemap URL не изменилось. В production browser повторить verified, needs-check и blocked cable scenarios; Market CTA присутствует только в verified.

---

## Sprint success criteria

- Пользователь видит короткую сборку до семи подробных секций.
- При заднем разъёме сервис сравнивает только измеренный габарит с паспортным минимальным зазором кронштейна.
- Неизвестный габарит не превращается в рекомендацию товара.
- Подтверждённый кабельный конфликт скрывает CTA несовместимого кронштейна.
- В релизе нет новых категорий товаров, цен и SEO-страниц.
- Аналитика различает раскрытие проверок, переход к кабельной секции и печать без передачи измерений или идентификаторов пользователя.
- Полный build, design harness, performance gate, GitHub Pages и production smoke проходят.

## Explicitly out of scope

- Партнёрские ссылки на кабели, адаптеры, саундбары, подсветку, реле, приставки и средства ухода.
- Автоматическая рекомендация углового HDMI только по малому зазору.
- Скрытая проводка 230 В, подбор розетки или инструкции электромонтажа.
- Новые страницы по модели × кабелю, модели × кронштейну или модели × аксессуару.
- PDF 1:1, QR-код и шаблон отверстий.
- Любые прогнозы среднего чека и дохода до фактических `APPROVED payment`.
