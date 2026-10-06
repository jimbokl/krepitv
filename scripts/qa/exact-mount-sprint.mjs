import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";

let playwright;
try { playwright = await import("playwright"); } catch {
  playwright = createRequire("/Users/dmitrij/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json")("playwright");
}
const output = path.resolve(process.env.QA_OUTPUT ?? ".design-harness/runs/20261006-exact-mount-match-20261006/evidence");
const axeSource = await readFile(path.resolve(".private/qa-harness/node_modules/axe-core/axe.min.js"), "utf8");
await mkdir(path.join(output, "screenshots"), { recursive: true });
const root = path.resolve("docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".avif": "image/avif", ".png": "image/png", ".xml": "application/xml" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    response.setHeader("Content-Type", types[path.extname(filename)] ?? "application/octet-stream");
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = process.env.QA_BASE_URL ?? `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const viewports = { mobile: { width: 320, height: 800 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } };
const paths = ["/vesa/200x200/", "/vesa/300x200/", "/tipy-kronshteynov/povorotnyy/"];
const newPages = JSON.parse(await readFile("data/seo_pages.json", "utf8")).slice(0, 10);
const checks = [], shots = [], pageErrors = [], accessibility = [];
async function context(viewport, javascript = true) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled: javascript });
  ctx.on("page", (page) => page.on("pageerror", (error) => pageErrors.push({ route: new URL(page.url()).pathname, message: error.message })));
  await ctx.route(/mc\.yandex\.(ru|com)|google-analytics\.com|yandex\.ru\/clck/, (route) => route.abort());
  if (javascript) await ctx.addInitScript(() => {
    if (!/^https?:$/.test(location.protocol)) return;
    localStorage.setItem("krepitv:metrika-consent", "denied");
    window.__qaResults = []; window.__qaStarts = [];
    window.addEventListener("krepitv:result-completed", (event) => window.__qaResults.push(event.detail));
    window.addEventListener("krepitv:tool-usage", (event) => window.__qaStarts.push(event.detail));
  });
  return ctx;
}
async function layout(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "no document overflow");
}
async function scanAccessibility(page, state, selector = "main") {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(async ({ selector }) => window.axe.run(selector, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }), { selector });
  accessibility.push({ route: new URL(page.url()).pathname, state, viewport: page.viewportSize(), version: result.testEngine.version, violations: result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map((node) => node.target) })), incomplete: result.incomplete.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })) });
  assert.deepEqual(result.violations.map(({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) })), [], `accessibility ${state} ${new URL(page.url()).pathname}`);
}
async function shot(page, viewport, state, prefix = "matcher") {
  await layout(page);
  const filename = `${prefix}-${viewport}-${state}.png`;
  await page.screenshot({ path: path.join(output, "screenshots", filename) });
  shots.push({ id: `shot-${prefix}-${viewport}-${state}`, path: `evidence/screenshots/${filename}`, state, viewport, width: page.viewportSize().width, height: page.viewportSize().height });
}
async function choose(tool) {
  const brand = tool.getByLabel("1. Бренд телевизора");
  const value = await brand.locator('option[value]:not([value=""])').first().getAttribute("value");
  await brand.selectOption(value);
  const model = tool.getByLabel("2. Модель телевизора");
  await model.selectOption(await model.locator('option[value]:not([value=""])').first().getAttribute("value"));
}
async function result(page, tool) {
  await tool.getByRole("button", { name: "Проверить крепления", exact: true }).click();
  await tool.locator("[data-exact-mount-result]").waitFor();
  await tool.locator('[data-guided-compatibility-state="success"]').waitFor();
  assert.ok(await tool.locator('a[href^="/kronshteyny/"]').count() > 0);
  assert.ok(await tool.locator("[data-exact-mount-result] h3[tabindex='-1']").evaluate((element) => element === document.activeElement));
}
try {
  for (const [viewportId, viewport] of Object.entries(viewports)) {
    const ctx = await context(viewport);
    const page = await ctx.newPage();
    await page.goto(`${base}${paths[0]}`);
    const tool = page.locator("[data-exact-mount-matcher]");
    await tool.waitFor(); await tool.scrollIntoViewIfNeeded();
    assert.ok(await tool.getByLabel("2. Модель телевизора").isDisabled());
    assert.ok(await tool.getByRole("button", { name: "Проверить крепления", exact: true }).isDisabled());
    await shot(page, viewportId, "default"); await shot(page, viewportId, "disabled");
    await scanAccessibility(page, "default");
    await tool.getByLabel("1. Бренд телевизора").focus();
    assert.ok(await tool.getByLabel("1. Бренд телевизора").evaluate((element) => element === document.activeElement));
    await shot(page, viewportId, "focus");
    let release; const pause = new Promise((resolve) => { release = resolve; });
    await page.route("**/*.wasm*", async (route) => { await pause; await route.continue(); });
    await choose(tool);
    await tool.getByLabel("1. Бренд телевизора").focus();
    await page.keyboard.press("Tab");
    assert.ok(await tool.getByLabel("2. Модель телевизора").evaluate((element) => element === document.activeElement));
    await page.keyboard.press("Tab");
    assert.ok(await tool.getByRole("button", { name: "Проверить крепления", exact: true }).evaluate((element) => element === document.activeElement));
    await page.keyboard.press("Enter");
    await tool.getByRole("status").waitFor();
    assert.equal(await page.evaluate(() => window.__qaResults.length), 0);
    await shot(page, viewportId, "loading"); release();
    await tool.locator('[data-guided-compatibility-state="success"]').waitFor();
    await tool.locator("[data-exact-mount-result]").scrollIntoViewIfNeeded();
    assert.match(await tool.locator("[data-exact-mount-result]").innerText(), /200×200/);
    assert.equal(await page.evaluate(() => window.__qaResults.filter((e) => e.toolId === "exact_mount_match").length), 1);
    await shot(page, viewportId, "success");
    await scanAccessibility(page, "success");
    for (const [stress, style] of [["resize", "html { font-size: 200% !important; }"], ["spacing", "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }"]]) {
      const tag = await page.addStyleTag({ content: style }); await layout(page);
      await tool.locator("[data-exact-mount-result]").scrollIntoViewIfNeeded();
      await shot(page, viewportId, "success", `matcher-${stress}`); await tag.evaluate((node) => node.remove());
    }
    await tool.getByLabel("2. Модель телевизора").selectOption("");
    assert.equal(await tool.locator("[data-exact-mount-result]").count(), 0);
    assert.ok(await tool.getByRole("button", { name: "Проверить крепления", exact: true }).isDisabled());
    for (const routePath of paths.slice(1)) {
      await page.goto(`${base}${routePath}`); const next = page.locator("[data-exact-mount-matcher]");
      await next.waitFor(); await choose(next); await result(page, next); await layout(page);
      await scanAccessibility(page, "success");
      if (routePath.includes("300x200")) assert.match(await next.locator("[data-exact-mount-result]").innerText(), /300×200/);
    }
    checks.push(`${viewportId}: three scoped Rust/WASM matchers, keyboard, loading, result focus, reset, text resize, privacy`);
    await ctx.close();

    const errorCtx = await context(viewport), errorPage = await errorCtx.newPage();
    await errorPage.route("**/*.wasm*", (route) => route.abort());
    await errorPage.goto(`${base}${paths[0]}`);
    const errorTool = errorPage.locator("[data-exact-mount-matcher]"); await choose(errorTool);
    await errorTool.getByRole("button", { name: "Проверить крепления", exact: true }).click();
    await errorTool.getByRole("alert").waitFor(); await errorTool.locator("[data-exact-mount-result]").scrollIntoViewIfNeeded();
    assert.equal(await errorPage.evaluate(() => window.__qaResults.length), 0);
    await shot(errorPage, viewportId, "error"); await errorPage.unroute("**/*.wasm*");
    await scanAccessibility(errorPage, "error");
    await errorTool.getByRole("button", { name: "Повторить проверку", exact: true }).click();
    await errorTool.locator('[data-guided-compatibility-state="success"]').waitFor();
    checks.push(`${viewportId}: real WASM failure and retry`); await errorCtx.close();

    // Explicit isolated no-stock catalogue fixture, never published or counted as traffic.
    const emptyCtx = await context(viewport), emptyPage = await emptyCtx.newPage();
    await emptyPage.route("**/data/mounts.json", (route) => route.fulfill({ status: 200, contentType: "application/json", body: "[]" }));
    await emptyPage.goto(`${base}${paths[0]}`); const emptyTool = emptyPage.locator("[data-exact-mount-matcher]"); await choose(emptyTool);
    await emptyTool.getByRole("button", { name: "Проверить крепления", exact: true }).click();
    await emptyTool.getByText("В проверенном каталоге нет подходящего варианта.", { exact: true }).waitFor();
    assert.equal(await emptyTool.locator('a[href^="/kronshteyny/"]').count(), 0);
    await emptyTool.locator("[data-exact-mount-result]").scrollIntoViewIfNeeded(); await shot(emptyPage, viewportId, "empty");
    await scanAccessibility(emptyPage, "empty");
    checks.push(`${viewportId}: no-match state via isolated empty-mount fixture, no fabricated recommendation`); await emptyCtx.close();

    const guideCtx = await context(viewport), guidePage = await guideCtx.newPage();
    for (const guide of newPages) {
      await guidePage.goto(`${base}${guide.path}`);
      const widget = guidePage.locator(`[data-intent-tool="${guide.id}"]`);
      await widget.waitFor();
      if (viewportId !== "tablet" && ["tv-wifi-5ghz", "tv-oled-qled-choice"].includes(guide.id)) {
        await guidePage.evaluate(() => scrollTo(0, 0));
        await shot(guidePage, viewportId, "default", `${guide.id}-overview`);
        const photo = guidePage.locator('main img[src*="/assets/images/"]').first();
        await photo.scrollIntoViewIfNeeded(); await photo.evaluate((node) => node.decode());
        assert.ok(await photo.evaluate((node) => node.naturalWidth > 0));
        await shot(guidePage, viewportId, "default", `${guide.id}-photo`);
        await guidePage.locator("[data-evidence-guide-table]").scrollIntoViewIfNeeded();
        await shot(guidePage, viewportId, "default", `${guide.id}-table`);
        const sources = guidePage.locator("details#istochniki");
        await sources.evaluate((node) => { node.open = true; });
        await sources.scrollIntoViewIfNeeded();
        await shot(guidePage, viewportId, "default", `${guide.id}-sources`);
        await sources.evaluate((node) => { node.open = false; });
      }
      await widget.scrollIntoViewIfNeeded();
      await shot(guidePage, viewportId, "default", guide.id);
      await widget.getByRole("button", { name: guide.guide.steps[0].label, exact: true }).focus();
      for (const [index, step] of guide.guide.steps.entries()) {
        const button = widget.getByRole("button", { name: step.label, exact: true });
        assert.ok(await button.evaluate((element) => element === document.activeElement));
        await guidePage.keyboard.press(index === 1 ? "Space" : "Enter");
        assert.ok((await widget.innerText()).includes(step.body));
        if (index < guide.guide.steps.length - 1) await guidePage.keyboard.press("Tab");
      }
      await widget.getByRole("button", { name: "Да", exact: true }).click();
      assert.match(await widget.locator("[data-intent-result]").innerText(), /Готово|Проверьте|Сравните|Сохраните/);
      await widget.getByRole("button", { name: "Нет или не удалось проверить", exact: true }).click();
      await shot(guidePage, viewportId, "success", guide.id);
      await scanAccessibility(guidePage, "success");
      assert.equal(await guidePage.locator("h1").count(), 1);
      assert.ok(await guidePage.locator("[data-evidence-guide-table]").count() > 0);
      assert.ok(await guidePage.locator("[data-evidence-guide-source]").count() >= 2);
      assert.equal(await guidePage.locator('link[rel="canonical"]').getAttribute("href"), `https://krepitv.ru${guide.path}`);
      await layout(guidePage);
      const tableRegion = guidePage.locator('[role="region"]').filter({ has: guidePage.locator('table[data-evidence-guide-table]') });
      assert.ok(await tableRegion.evaluate((element) => {
        const heading = document.getElementById(element.getAttribute("aria-labelledby"));
        return Boolean(heading?.textContent.trim());
      }), "scroll region references a real, nonempty heading");
      assert.equal(await tableRegion.getAttribute("tabindex"), "0");
      await tableRegion.focus();
      assert.ok(await tableRegion.evaluate((node) => node === document.activeElement));
      if (await tableRegion.evaluate((node) => node.scrollWidth > node.clientWidth)) {
        await guidePage.keyboard.press("ArrowRight");
        await guidePage.waitForFunction((node) => node.scrollLeft > 0, await tableRegion.elementHandle());
        await tableRegion.evaluate((node) => { node.scrollLeft = 0; });
      }
      for (const [stress, style] of [["resize", "html { font-size: 200% !important; }"], ["spacing", "* { line-height: 1.5 !important; letter-spacing: .12em !important; word-spacing: .16em !important; } p { margin-bottom: 2em !important; }"]]) {
        const tag = await guidePage.addStyleTag({ content: style }); await layout(guidePage);
        await widget.scrollIntoViewIfNeeded(); await shot(guidePage, viewportId, "success", `${guide.id}-${stress}`);
        await tag.evaluate((node) => node.remove());
      }
    }
    checks.push(`${viewportId}: ten guides, real Tab/Enter/Space and table ArrowRight scrolling, 30 personalized branches, follow-up, 200% text and spacing screenshots, sources, table, canonical`);
    await guideCtx.close();
  }
  const staticCtx = await context(viewports.mobile, false), staticPage = await staticCtx.newPage();
  for (const routePath of [...paths, ...newPages.map((page) => page.path)]) {
    const response = await staticPage.goto(`${base}${routePath}`); assert.equal(response.status(), 200);
    assert.equal(await staticPage.locator("h1").count(), 1);
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute("href"), `https://krepitv.ru${routePath}`);
    if (!paths.includes(routePath)) {
      assert.ok(await staticPage.locator("table").count() > 0);
      assert.ok(await staticPage.locator('a[href^="https://"]').count() >= 2);
      const image = staticPage.locator('main img[src*="/assets/images/"]').first(); await image.scrollIntoViewIfNeeded();
      await image.evaluate((node) => node.decode()); assert.ok(await image.evaluate((node) => node.naturalWidth > 0));
    } else assert.ok(await staticPage.locator('a[href^="/modeli/"]').count() > 0);
    await layout(staticPage);
  }
  checks.push("13 pages without JavaScript: real SSR answer, sources, image/model links, self-canonical"); await staticCtx.close();
  assert.deepEqual(pageErrors, [], "all matcher, error, empty, guide and static page runtime errors");
  await writeFile(path.join(output, "accessibility-report.json"), `${JSON.stringify({ scope: "13 changed routes: WCAG 2 A/AA, 2.1 A/AA and 2.2 AA automated rules; manual keyboard/text-resize review remains required", scans: accessibility }, null, 2)}\n`);
  await writeFile(path.join(output, "browser-report.json"), `${JSON.stringify({ base: new URL(base).hostname, checks, shots, pageErrors, accessibilityScans: accessibility.length }, null, 2)}\n`);
  console.log(`PASS: ${checks.length} browser contracts, ${shots.length} screenshots; 320/768/1440 CSS px, no real analytics sent`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
