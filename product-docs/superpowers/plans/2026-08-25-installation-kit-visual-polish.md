# Installation Kit Visual Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Перенести выбранный визуальный язык «инженерная редакция + мобильный монтажный прибор + монтажный паспорт» в существующий шестишаговый `/podbor/`, не меняя расчёты, SEO-архитектуру и fail-closed монетизацию.

**Architecture:** Существующие React-компоненты и Tailwind-токены получают единый visual contract. Новый `KitOutcomePreview` объясняет ценность без пользовательских данных; `GuidedSelectionPage` и шаговые компоненты отвечают за mobile-first flow; `InstallationKitResult` и `KitSection` превращают семь доменных секций в один читаемый документ. Rust/WASM, reducer, каталоги и партнёрские ссылки остаются без изменений.

**Tech Stack:** React, Vite, Tailwind CSS, Phosphor Icons, Node test runner, Rust/WASM, in-app Browser, GitHub Pages.

**Spec:** `product-docs/superpowers/specs/2026-08-25-installation-kit-visual-design.md`

## Global Constraints

- [ ] Весь публичный текст остаётся русским.
- [ ] Не создавать новые URL, query-параметры, localStorage-состояние или hydration boundary.
- [ ] Не менять Rust/WASM-формулы, статусы секций и порядок семи секций.
- [ ] Не показывать цену, логотип Маркета, редирект или партнёрскую ссылку без текущего fail-closed offer.
- [ ] Не показывать точки сверления или точные значения, отсутствующие в плане.
- [ ] Использовать существующие React/Tailwind/Phosphor-конвенции; не добавлять UI-фреймворк или внешний webfont.
- [ ] Минимальная touch target — 44px, primary mobile action — 52px; focus-visible обязателен.
- [ ] Каждое изменение поведения или DOM-контракта начинается с падающего теста.
- [ ] Референсы служат только визуальной целью и не попадают в production bundle.

---

### Task 1: Visual contract, tokens and value preview

**Files:**
- Create: `web/tests/installation-kit-visual-contract.test.mjs`
- Create: `web/src/components/installation-kit/KitOutcomePreview.jsx`
- Modify: `web/src/styles.css`
- Modify: `web/tailwind.config.js`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`

**Interfaces:**
- Consumes: существующий `GuidedSelectionPage({ catalog })` и статический русский список результатов.
- Produces: `KitOutcomePreview({ compact?: boolean })`, hooks `data-kit-shell`, `data-kit-ruler`, `data-kit-outcome-preview`.

- [ ] **Step 1: Write the failing visual-contract test**

```js
test("первый шаг объясняет полный комплект и размечает инженерную оболочку", async () => {
  const html = renderGuidedSelection({ search: "" });
  assert.match(html, /data-kit-shell="true"/);
  assert.match(html, /data-kit-ruler="true"/);
  assert.match(html, /data-kit-outcome-preview="true"/);
  for (const label of ["Совместимость", "Винты", "Крепёж к стене", "Высота", "Кабели", "Порядок монтажа"]) {
    assert.match(html, new RegExp(label));
  }
  assert.equal(/(?:₽|цена|стоимость)/iu.test(html), false);
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `node --test web/tests/installation-kit-visual-contract.test.mjs`

Expected: FAIL because `data-kit-shell`, `data-kit-ruler` and `KitOutcomePreview` do not exist.

- [ ] **Step 3: Implement the preview and tokens**

Implement `KitOutcomePreview` as a semantic list with Phosphor icons and no invented values. Add Tailwind colors `warning` and `surface`, tabular-number utility, ruler background class, refined button/input states and reduced-motion guard. Render the preview only on step 1: open beside the form at desktop, collapsed in `details` below it on mobile.

- [ ] **Step 4: Run targeted tests and verify GREEN**

Run: `node --test web/tests/installation-kit-visual-contract.test.mjs web/tests/guided-selection-flow.test.mjs`

Expected: PASS with no warnings other than the existing Node local-storage harness warning.

- [ ] **Step 5: Commit**

```bash
git add web/tests/installation-kit-visual-contract.test.mjs web/src/components/installation-kit/KitOutcomePreview.jsx web/src/styles.css web/tailwind.config.js web/src/pages/GuidedSelectionPage.jsx
git commit -m "design: add installation kit visual language"
```

---

### Task 2: Mobile-first wizard and calibrated progress

**Files:**
- Modify: `web/tests/guided-selection-flow.test.mjs`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `web/src/components/installation-kit/KitStepRail.jsx`
- Modify: `web/src/components/installation-kit/WallProfileStep.jsx`
- Modify: `web/src/components/installation-kit/MountChoiceStep.jsx`
- Modify: `web/src/components/installation-kit/PlacementCableStep.jsx`

**Interfaces:**
- Consumes: существующий reducer, `canAdvance`, `getCompletedSteps`, native select/radio semantics.
- Produces: responsive hooks `data-kit-step-layout`, `data-kit-selected-model`, `data-kit-primary-action`; visual state does not introduce new state fields.

- [ ] **Step 1: Add failing DOM/accessibility assertions**

```js
assert.match(stepOneHtml, /data-kit-step-layout="true"/);
assert.match(stepOneHtml, /data-kit-primary-action="true"/);
assert.equal(stepOneHtml.includes("autofocus"), false);
assert.match(deepLinkHtml, /data-kit-selected-model="true"/);
assert.match(wallHtml, /aria-label="Бетон"/);
```

- [ ] **Step 2: Run the flow test and verify RED**

Run: `node --test web/tests/guided-selection-flow.test.mjs`

Expected: FAIL on the new data hooks and wall option accessible label.

- [ ] **Step 3: Implement the calibrated wizard layout**

Refactor class composition only: wider desktop sidebar, compact mobile progress, stable action row, full-width mobile CTA, selected-model strip, list-like wall/mount choices and tabular numeric inputs. Keep native controls, existing text and reducer calls. Add `aria-label` to each choice label/input as required by the test.

- [ ] **Step 4: Run flow and state tests and verify GREEN**

Run: `node --test web/tests/guided-selection-flow.test.mjs web/tests/installation-kit-state.test.mjs web/tests/installation-kit-engine.test.mjs`

Expected: PASS; reducer state and WASM adapter output unchanged.

- [ ] **Step 5: Commit**

```bash
git add web/tests/guided-selection-flow.test.mjs web/src/pages/GuidedSelectionPage.jsx web/src/components/installation-kit/KitStepRail.jsx web/src/components/installation-kit/WallProfileStep.jsx web/src/components/installation-kit/MountChoiceStep.jsx web/src/components/installation-kit/PlacementCableStep.jsx
git commit -m "design: polish mobile installation wizard"
```

---

### Task 3: Installation passport result hierarchy

**Files:**
- Modify: `web/tests/guided-selection-result.test.mjs`
- Modify: `web/src/components/installation-kit/InstallationKitResult.jsx`
- Modify: `web/src/components/installation-kit/KitSection.jsx`
- Modify: `web/src/components/installation-kit/CompatibilityPanel.jsx`
- Modify: `web/src/components/installation-kit/ScrewPanel.jsx`
- Modify: `web/src/components/installation-kit/WallFixingPanel.jsx`
- Modify: `web/src/components/installation-kit/PlacementPanel.jsx`
- Modify: `web/src/components/installation-kit/CablePanel.jsx`
- Modify: `web/src/components/installation-kit/ToolsPanel.jsx`
- Modify: `web/src/components/installation-kit/PrintableChecklist.jsx`

**Interfaces:**
- Consumes: `plan.overall_status`, the seven named plan sections, exact model/mount, `offer`.
- Produces: `data-installation-passport`, `data-kit-status-nav`, unchanged seven `data-kit-section` nodes and exactly one eligible direct Market link.

- [ ] **Step 1: Add failing result-contract assertions**

```js
assert.match(html, /data-installation-passport="true"/);
assert.match(html, /data-kit-status-nav="true"/);
assert.match(html, /Ваш монтажный паспорт/);
assert.match(html, /Совместимость подтверждена/);
assert.equal((html.match(/data-kit-section=/g) ?? []).length, 7);
assert.equal((html.match(/href="https:\/\/market\.yandex\.ru/g) ?? []).length, 1);
```

Add the blocked counterpart and assert zero Market links and visible `Нужно проверить`/`Остановиться` labels.

- [ ] **Step 2: Run the result test and verify RED**

Run: `node --test web/tests/guided-selection-result.test.mjs`

Expected: FAIL because the passport header and status navigation do not exist.

- [ ] **Step 3: Implement the passport header and section framing**

Render overall status, exact pair, print action and eligible affiliate action in one semantic header. Add an anchor navigation derived from the seven existing sections. Update `KitSection` with Phosphor status icons, status text and stable anchors. Give factual values tabular numerals; keep warnings visible and sources external. Do not change any panel decision logic.

- [ ] **Step 4: Run result, affiliate and verifier tests and verify GREEN**

Run: `node --test web/tests/guided-selection-result.test.mjs web/tests/site-footer-affiliate.test.mjs`

Run: `node scripts/verify.mjs`

Expected: PASS; seven sections remain, exact direct Market link count remains 0 or 1 according to eligibility.

- [ ] **Step 5: Commit**

```bash
git add web/tests/guided-selection-result.test.mjs web/src/components/installation-kit
git commit -m "design: turn result into installation passport"
```

---

### Task 4: Visual QA, production artifact and release evidence

**Files:**
- Modify: `design-qa.md`
- Modify: `web/index.html`
- Modify: `docs/**`
- Create: `.private/design-qa/2026-08-25-installation-kit-visual/**` (gitignored evidence)

**Interfaces:**
- Consumes: selected references, local build, in-app browser and existing GitHub Pages flow.
- Produces: `final result: passed`, reproducible screenshots, generated artifact matching source HEAD.

- [ ] **Step 1: Run the complete build**

Run: `npm run build`

Expected: exit 0; 366 HTML pages, 299 sitemap URLs, 161 models, 25 mounts and 3200 compatibility edges remain.

- [ ] **Step 2: Start local artifact server and capture matching states**

Serve `docs/` with the existing local server command. In the in-app Browser capture:

- first step at 390×844 and 1440×1024;
- selected wall at 390×844;
- final passport at 390×844, 768×1024 and 1440×1024.

Complete the actual six-step flow with TCL 65C7K and one verified offered mount. Confirm keyboard focus, sticky/full-width mobile action and no horizontal overflow.

- [ ] **Step 3: Run blocking design comparison**

Open each selected reference and same-state implementation capture. Write `design-qa.md` with measured differences. Fix all P0/P1/P2 issues, rebuild and recapture until it contains exactly `final result: passed`. Leave only optional P3 notes.

- [ ] **Step 4: Verify artifact integrity**

Run: `git diff --check`

Run: `node scripts/verify.mjs`

Compare SHA-256 for local `/podbor/index.html` and its referenced main CSS/JS after deployment.

- [ ] **Step 5: Commit source evidence and artifact**

```bash
git add design-qa.md product-docs/design-references product-docs/superpowers/specs product-docs/superpowers/plans
git commit -m "docs: record installation kit visual design"
git add web/index.html docs
git commit -m "build: publish polished installation kit"
```

- [ ] **Step 6: Integrate and deploy**

Merge `codex/full-installation-kit` into the repository's production branch using the documented finishing workflow, push, wait for the exact source CI and Pages run, then verify HTTPS, HTTP→HTTPS, canonical, robots, sitemap and production browser flow. Do not use Cloud.ru.
