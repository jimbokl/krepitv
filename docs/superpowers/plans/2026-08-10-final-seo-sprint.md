# Final SEO Maturation Sprint Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Усилить существующие страницы KREPI TV видимой иерархией, справочным хабом, реальным содержанием и crawlable техническими изображениями, затем выдержать сайт месяц без новых URL.

**Architecture:** Rust sitegen является источником маршрутов, SSR, JSON-LD, sitemap и SVG. React повторяет ту же навигацию после гидратации через общий компонент. Новые данные выводятся только из уже проверенных каталогов и `seo_pages.json`.

**Tech Stack:** Rust 1.93.1, serde, React, Vite, Tailwind, Node test runner, GitHub Pages.

## Global Constraints

- Весь публичный текст только на русском.
- Не добавлять города, `LocalBusiness`, цены, рейтинги, отзывы или физический тест.
- Ссылки Маркета остаются прямыми и не влияют на техническую совместимость.
- Sitemap содержит только индексируемые canonical URL и точные substantive `lastmod`.
- Полный `npm run build` обязателен перед production.

---

### Task 1: Visible breadcrumbs contract

**Files:**
- Create: `web/src/components/Breadcrumbs.jsx`
- Modify: `web/src/pages/ModelPage.jsx`
- Modify: `web/src/pages/MountPage.jsx`
- Modify: `web/src/pages/SeoPage.jsx`
- Modify: `web/src/pages/CatalogIndexPage.jsx`
- Modify: `web/src/pages/GuidedSelectionPage.jsx`
- Modify: `crates/sitegen/src/main.rs`
- Test: `web/tests/seo-navigation.test.mjs`

**Interfaces:**
- Produces: `Breadcrumbs({ items })`, где `items` — массив `{ label, href? }`.
- Produces: Rust `visible_breadcrumbs_html(items: &[(&str, &str)]) -> String`.

- [ ] **Step 1: Write failing tests**

Проверить, что каждая индексируемая non-home страница содержит
`data-visible-breadcrumbs`, обычные ссылки на родителей и совпадающие названия
в `BreadcrumbList`.

- [ ] **Step 2: Run RED**

Run: `npm --prefix web test -- seo-navigation.test.mjs`
Expected: FAIL because entity pages have JSON-LD but no visible navigation.

- [ ] **Step 3: Implement minimal shared breadcrumb renderers**

Использовать иерархии `Главная → Модели → модель`, `Главная → Кронштейны →
кронштейн`, `Главная → Справочник → материал` и двухуровневые каталоги.

- [ ] **Step 4: Run GREEN and Rust tests**

Run: `npm --prefix web test -- seo-navigation.test.mjs && cargo test -p krepitv-sitegen --locked`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: expose crawlable page hierarchy"`

### Task 2: One real guide hub and guide contents

**Files:**
- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/src/pages/SeoPage.jsx`
- Modify: `web/src/main.jsx`
- Test: `web/tests/seo-navigation.test.mjs`
- Test: Rust unit tests in `crates/sitegen/src/main.rs`

**Interfaces:**
- Produces: canonical `/spravochnik/` generated from indexable `SeoPage` rows.
- Produces: deterministic category labels and stable `#shag-N`, `#granitsa`,
  `#istochniki`, `#svyazannye-materialy` anchors for evidence guides.

- [ ] **Step 1: Extend tests and verify RED**

Assert one indexable hub, every guide linked exactly once by its primary group,
no noindex page, native `<details>` for long tails, and a visible TOC on every
page with `guide`.

- [ ] **Step 2: Generate SSR hub and add it to sitemap**

Build grouping from existing `kind`, guide presence and page IDs; do not copy
titles into a second dataset.

- [ ] **Step 3: Add React parity and stable section IDs**

The guide TOC links only to rendered sections and remains useful without JS.

- [ ] **Step 4: Run focused tests**

Run: `npm --prefix web test -- seo-navigation.test.mjs && cargo test -p krepitv-sitegen --locked`
Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "feat: add guide hub and article contents"`

### Task 3: Site entity and technical image SEO

**Files:**
- Create: `docs/logo-512.svg` through the generator/source asset flow
- Modify: `crates/sitegen/src/main.rs`
- Modify: `web/src/pages/ModelPage.jsx`
- Modify: `web/src/pages/MountPage.jsx`
- Modify: `scripts/verify.mjs`
- Test: `web/tests/image-seo.test.mjs`
- Test: Rust unit tests in `crates/sitegen/src/main.rs`

**Interfaces:**
- Produces: `/images/modeli/<id>-vesa.svg` and
  `/images/kronshteyny/<id>-skhema.svg`.
- Produces: `Product.image` URLs matching visible `<img src>`.
- Produces: one home-page `Organization` node with `@id`, `name`,
  `alternateName`, `url` and `logo` only.

- [ ] **Step 1: Write image/entity failing tests**

Require one image per 151 verified models and 25 mounts, meaningful Russian
`alt`, fixed width/height, matching Product JSON-LD, sitemap image entries,
`og:site_name` and crawlable logo.

- [ ] **Step 2: Run RED**

Run: `npm --prefix web test -- image-seo.test.mjs`
Expected: FAIL because current pages contain no ordinary `<img>`.

- [ ] **Step 3: Generate deterministic technical SVG assets**

Escape every label, keep dimensions bounded, identify images as schemes and
never as photographs or physical tests.

- [ ] **Step 4: Add SSR/React/JSON-LD/sitemap references**

The same canonical image URL is used in HTML, Product and sitemap.

- [ ] **Step 5: Run GREEN and artifact verifier**

Run: `npm --prefix web test -- image-seo.test.mjs && node scripts/verify.mjs`
Expected: PASS.

- [ ] **Step 6: Commit**

`git commit -m "feat: publish source-backed technical images"`

### Task 4: Full release and one-month pause

**Files:**
- Modify only if required by generated artifact: `docs/**`
- Update recurring automation through the product automation API, not repository code.

**Interfaces:**
- Consumes: exact verified `docs/` artifact.
- Produces: GitHub Pages production and a monitoring resume date of 2026-09-10.

- [ ] **Step 1: Run full verification**

Run: `npm run build && git diff --check`
Expected: all Rust, web, catalog, affiliate, IndexNow and analytics tests PASS.

- [ ] **Step 2: Run visual/release harness and inspect representative captures**

Capture 320, 768 and 1440 CSS px for the hub, a model, a mount and a guide.

- [ ] **Step 3: Commit and push exact artifact**

Commit only intended source and generated files; push `main`.

- [ ] **Step 4: Verify CI, Pages, HTTPS and hashes**

Require both workflows green, HTTP→HTTPS, TLS verify 0, representative 200s,
matching local/production SHA-256 and sitemap count.

- [ ] **Step 5: Notify changed canonicals once**

IndexNow 200/202 is recorded only as an accepted notification.

- [ ] **Step 6: Pause daily monitoring**

Disable the current daily automation and create one resume/check execution on
2026-09-10. The resume check reports only mature Search Console, Yandex
Webmaster and consented Metrika evidence.
