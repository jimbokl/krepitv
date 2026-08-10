# Helpful Content Trust Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Добавить на все содержательные страницы KREPI TV правдивое видимое авторство, способ подготовки, дату проверки и закрытый статус физического испытания, а также публичную страницу редакции.

**Architecture:** Единый строгий JSON-контракт описывает редакцию и неизменяемые правила доказательности. Rust-генератор создаёт SSR-блок, а React-компонент восстанавливает тот же контракт после гидратации; дата и основание берутся из данных конкретной страницы, модели или кронштейна. Доверительные страницы расширяются без изменения партнёрской логики.

**Tech Stack:** Rust/Serde static generation, React 19 SSR hydration, Tailwind CSS, Node test runner, GitHub Pages, project design harness.

## Global Constraints

- Весь публичный текст только на русском языке.
- Не публиковать имя физического лица, квалификацию монтажника, ручную проверку или физическое испытание без доказательств.
- Статус физического теста по умолчанию закрыт и в этом релизе всегда равен «не проводился».
- Дата материала берётся из существующей даты источника/когорты; build time, offer refresh и IndexNow не являются датой проверки.
- Критический блок должен присутствовать в первичном HTML и сохраняться после React-гидратации.
- Прямые ссылки Маркета, affiliate fail-closed, отсутствие региональных цен и утверждённый Tailwind-дизайн не менять.
- Создаётся ровно один новый индексируемый URL: `/redaktsiya/`; новые SEO-интенты не создаются.

---

### Task 1: Строгий редакционный контракт и страница редакции

**Files:**
- Create: `data/editorial_policy.json`
- Modify: `data/trust_pages.json`
- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/tests/public-contact.test.mjs`
- Modify: `scripts/verify.mjs`

**Interfaces:**
- Consumes: существующие `TrustPage`, `read_json`, `validate_trust_pages`, sitemap generation.
- Produces: `EditorialPolicy`, `validate_editorial_policy(&EditorialPolicy)`, публичный `/data/editorial-policy.json`, trust route `/redaktsiya/`.

- [ ] **Step 1: Write the failing trust-route test**

Добавить в `web/tests/public-contact.test.mjs` проверку, что запись `id=editorial` имеет путь `/redaktsiya/`, содержит точные утверждения об автоматизации и отсутствие заявленного физического теста, а About/Methodology ссылаются на неё.

```javascript
const editorial = trustPages.find((page) => page.id === "editorial");
assert.equal(editorial?.path, "/redaktsiya/");
assert.match(editorial.sections.flatMap((section) => section.paragraphs).join(" "), /ИИ и автоматизац/);
assert.match(editorial.sections.flatMap((section) => section.paragraphs).join(" "), /физическ.*не провод/);
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `node --test web/tests/public-contact.test.mjs`  
Expected: FAIL because `editorial` is absent.

- [ ] **Step 3: Add the contract and trust copy**

`data/editorial_policy.json` contains `schema_version=1`, author name/path, automation disclosure, source policy, corrections path, physical-test default and `updated_at=2026-08-10`. Add `/redaktsiya/` to trust pages; revise About and Methodology with the approved truthful copy and `lastmod=2026-08-10`.

- [ ] **Step 4: Add Rust validation and publication**

Deserialize with `#[serde(deny_unknown_fields)]`, validate controlled paths/status/date, copy a sanitized JSON file to `web/public/data/editorial-policy.json`, and include the new trust URL in normal generation.

- [ ] **Step 5: Update artifact invariants and verify GREEN**

Change `baselineIndexableUrlCount` from `287` to `288`, trust-page minimum from `4` to `5`, and assert the editorial policy file is present and contains no person/credential claims. Run:

```bash
node --test web/tests/public-contact.test.mjs
cargo test -p krepitv-sitegen trust_pages -- --nocapture
```

Expected: PASS.

- [ ] **Step 6: Commit Task 1**

```bash
git add data/editorial_policy.json data/trust_pages.json crates/sitegen/src/main.rs web/tests/public-contact.test.mjs scripts/verify.mjs
git commit -m "feat: add transparent KREPI TV editorial policy"
```

### Task 2: Общий React-компонент редакционной ответственности

**Files:**
- Create: `web/src/lib/editorialPolicy.mjs`
- Create: `web/src/components/EditorialAccountability.jsx`
- Create: `web/tests/editorial-accountability.test.mjs`
- Modify: `web/src/pages/SeoPage.jsx`
- Modify: `web/src/pages/ModelPage.jsx`
- Modify: `web/src/pages/MountPage.jsx`
- Modify: `web/src/pages/ObservedModelPage.jsx`

**Interfaces:**
- Consumes: `data/editorial_policy.json`, page/model/mount `checked_at`, optional `page.guide.updated_at`.
- Produces: `buildEditorialEvidence({ contentKind, checkedAt, hasEditorialReview })` and `<EditorialAccountability evidence={...} />` with `data-editorial-accountability`.

- [ ] **Step 1: Write failing behavior tests against real pages**

Render real `SeoPage`, `ModelPage`, `MountPage` and `ObservedModelPage` fixtures to HTML. Assert the author link, controlled basis, visible date, no-test label and methodology link. The mutation caught is removal of the visible accountability component while the rest of the page still renders.

```javascript
assert.match(html, /data-editorial-accountability="true"/);
assert.match(html, /href="\/redaktsiya\/"[^>]*>Редакция KREPI TV/);
assert.match(html, /Физический тест[^<]*не проводился/);
```

- [ ] **Step 2: Run and verify RED**

Run: `node --test web/tests/editorial-accountability.test.mjs`  
Expected: FAIL because the marker is absent from rendered pages.

- [ ] **Step 3: Implement the pure evidence builder**

The builder rejects unknown `contentKind`, invalid ISO dates and any physical-test value other than `not_tested`. It maps:

```javascript
seo-reviewed -> "Официальные инструкции и редакционная проверка"
seo-calculated -> "Источники, формула и перечисленные допущения"
verified-model -> "Официальные характеристики и расчёт совместимости"
mount -> "Паспорт кронштейна и граф совместимости"
observed-model -> "Наблюдение ассортимента без технической рекомендации"
```

- [ ] **Step 4: Implement the component and integrate page types**

Render a compact responsive metadata grid plus native `<details>`. Place it after the lead/verified summary and before any affiliate CTA. For SEO pages use `page.guide?.updated_at ?? "2026-08-08"`; for model/mount/observed pages use their `checked_at`.

- [ ] **Step 5: Run focused web tests and verify GREEN**

Run:

```bash
node --test web/tests/editorial-accountability.test.mjs
npm --prefix web run test:sites
```

Expected: all tests pass with no failed assertions.

- [ ] **Step 6: Commit Task 2**

```bash
git add web/src/lib/editorialPolicy.mjs web/src/components/EditorialAccountability.jsx web/src/pages web/tests/editorial-accountability.test.mjs
git commit -m "feat: show editorial accountability on content pages"
```

### Task 3: SSR parity and truthful structured data

**Files:**
- Modify: `crates/sitegen/src/main.rs`
- Modify: `scripts/verify.mjs`
- Modify: `web/tests/seo-pages.test.mjs`

**Interfaces:**
- Consumes: validated `EditorialPolicy`, `SeoPage`, `TvModel`, `Mount`, `MarketTvModel`.
- Produces: `editorial_accountability_html(policy, basis, checked_at) -> String`, exact visible/JSON-LD author parity.

- [ ] **Step 1: Add failing Rust SSR tests**

Add tests for representative SEO, verified model, observed model and mount HTML. Assert the block precedes the first Market section, contains a valid date and has no unsupported test claim. Add an Article JSON-LD assertion that visible author URL equals `/redaktsiya/`.

- [ ] **Step 2: Run targeted Rust tests and verify RED**

Run: `cargo test -p krepitv-sitegen editorial_accountability -- --nocapture`  
Expected: FAIL because the SSR marker/helper is absent.

- [ ] **Step 3: Implement one escaped SSR helper**

The helper accepts only validated controlled basis text and ISO `checked_at`, emits `data-editorial-accountability="true"`, visible author/date/no-test copy and links to editorial, methodology and corrections pages.

- [ ] **Step 4: Insert SSR blocks into all content templates**

Integrate into `seo_page_body`, `model_page_body`, `observed_model_page_body` and `mount_page_body`. Update HowTo/Article JSON-LD author from `KREPI TV` to `Редакция KREPI TV` with URL `https://krepitv.ru/redaktsiya/`; keep visible and structured dates identical.

- [ ] **Step 5: Extend whole-artifact assertions and verify GREEN**

`scripts/verify.mjs` scans every indexable SEO page, every verified model, every canonical observed model and all 25 mounts for the SSR block, valid author link and closed physical-test status. Run:

```bash
cargo test -p krepitv-sitegen editorial_accountability -- --nocapture
npm run build:content
node scripts/verify.mjs
```

Expected: PASS; sitemap has 288 URLs.

- [ ] **Step 6: Commit Task 3**

```bash
git add crates/sitegen/src/main.rs scripts/verify.mjs web/tests/seo-pages.test.mjs web/public
git commit -m "feat: prerender truthful editorial evidence"
```

### Task 4: Навигация, дизайн-gate и полный релиз

**Files:**
- Modify: `web/src/components/SiteFooter.jsx`
- Modify: `web/src/pages/TrustPage.jsx`
- Modify: `.design-harness/runs/20260810-helpful-content-trust-layer/*`
- Modify: generated `docs/**`

**Interfaces:**
- Consumes: `/redaktsiya/`, `EditorialAccountability`, verified production artifact.
- Produces: footer/editorial navigation, responsive visual evidence, deployable GitHub Pages artifact.

- [ ] **Step 1: Add failing navigation assertions**

Extend a real footer/trust-page test so removal of `/redaktsiya/` from either hydrated footer or trust related links fails.

- [ ] **Step 2: Run and verify RED**

Run: `npm --prefix web run test:sites`  
Expected: FAIL on the missing editorial footer link.

- [ ] **Step 3: Add the footer and trust-page attribution**

Add `Редакция` to the existing footer and a compact visible publisher line to `TrustPage`. Do not create a second header/footer design.

- [ ] **Step 4: Run design harness**

Create one bounded run for `helpful-content-trust-layer`, record allowed paths, capture:

```text
mobile: /kak-podklyuchit-televizor-k-internetu/ at 320 px
tablet: /modeli/tcl-65c7k/ at 768 px
desktop: /kronshteyny/kromax-atlantis-65/ at 1440 px
trust: /redaktsiya/ at 1440 px
```

Run spec, drift, final, seal and ship gates. Reject any document overflow, overlap or hidden accountability text.

- [ ] **Step 5: Run the full reproducible release gate**

Run: `npm run build`  
Expected: exit 0; Rust, WASM, web, Russian UI, static artifact, affiliate and security checks all pass; sitemap count is 288.

- [ ] **Step 6: Commit generated artifact and push**

```bash
git add -A
git commit -m "release: publish helpful-content trust layer"
git push origin main
```

- [ ] **Step 7: Verify CI and production**

Wait for Source CI and Pages deploy for the exact head SHA. Verify HTTPS, HTTP→HTTPS, `/redaktsiya/`, sitemap count 288, all four representative routes, and local/production hashes. Notify IndexNow only for `/redaktsiya/`, `/o-proekte/`, `/metodika/` and the templates whose visible content changed; treat HTTP 202 as a receipt only.

## Self-review

- Spec coverage: author, process, automation disclosure, date, no-test status, trust URL, structured data, content quota, responsive design and release verification are mapped to Tasks 1–4.
- Placeholder scan: no unresolved implementation placeholder is present; the design-harness run has the fixed id `20260810-helpful-content-trust-layer`.
- Type consistency: React `buildEditorialEvidence` and Rust `editorial_accountability_html` consume the same five controlled evidence kinds and the same ISO date/no-test policy.
