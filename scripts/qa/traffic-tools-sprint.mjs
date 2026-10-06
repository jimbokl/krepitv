import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";

// An isolated browser: does not attach to the owner's Chrome or send analytics.
let playwright;
try { playwright = await import("playwright"); } catch {
  playwright = createRequire("/Users/dmitrij/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json")("playwright");
}
const output = path.resolve(process.env.QA_OUTPUT ?? ".design-harness/runs/20261006-traffic-tools-20261006/evidence");
await mkdir(path.join(output, "screenshots"), { recursive: true });
const root = path.resolve("docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".png": "image/png", ".xml": "application/xml" };
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
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const shots = [];
const checks = [];
const aspectPath = "/izobrazhenie-ne-na-ves-ekran-televizora/";
const screwPath = "/vinty-dlya-krepleniya-televizora/";

async function context(viewport, { javascript = true, analyticsQueue = false } = {}) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled: javascript });
  await ctx.route(/mc\.yandex\.(ru|com)|yandex\.ru\/clck|google-analytics\.com/, (route) => route.abort());
  if (javascript) await ctx.addInitScript(({ analyticsQueue }) => {
    localStorage.setItem("krepitv:metrika-consent", analyticsQueue ? "granted" : "denied");
    window.__qaResults = [];
    window.__qaStarts = [];
    window.addEventListener("krepitv:result-completed", (event) => window.__qaResults.push(event.detail));
    window.addEventListener("krepitv:tool-usage", (event) => window.__qaStarts.push(event.detail));
  }, { analyticsQueue });
  return ctx;
}

async function checkLayout(page, label) {
  const dimensions = await page.evaluate(() => ({ width: innerWidth, content: document.documentElement.scrollWidth }));
  assert.ok(dimensions.content <= dimensions.width + 1, `${label}: horizontal overflow`);
}
async function shot(page, viewportId, state, prefix = "aspect") {
  await checkLayout(page, `${prefix}-${viewportId}-${state}`);
  const filename = `${prefix}-${viewportId}-${state}.png`;
  await page.screenshot({ path: path.join(output, "screenshots", filename) });
  shots.push({ id: `shot-${prefix}-${viewportId}-${state}`, path: `evidence/screenshots/${filename}`, state, viewport: viewportId, width: page.viewportSize().width, height: page.viewportSize().height });
}
async function checkTextOverrides(page, tool, viewportId, prefix) {
  const resizeStyle = await page.addStyleTag({ content: "html { font-size: 200% !important; }" });
  await tool.scrollIntoViewIfNeeded();
  await shot(page, viewportId, "success", `${prefix}-large-text`);
  await resizeStyle.evaluate((element) => element.remove());
  const spacingStyle = await page.addStyleTag({ content: "* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }" });
  await tool.scrollIntoViewIfNeeded();
  await shot(page, viewportId, "success", `${prefix}-text-spacing`);
  await spacingStyle.evaluate((element) => element.remove());
}
try {
  for (const [id, viewport] of Object.entries({ mobile: { width: 320, height: 800 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } })) {
    const ctx = await context(viewport);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}${aspectPath}`);
    const tool = page.locator("[data-aspect-simulator]");
    await tool.waitFor();
    await tool.scrollIntoViewIfNeeded();
    await shot(page, id, "default");
    assert.ok(await tool.getByRole("button", { name: "Показать разницу" }).isDisabled());
    await shot(page, id, "empty");
    await shot(page, id, "disabled");
    await tool.getByRole("combobox").focus();
    assert.ok(await tool.getByRole("combobox").evaluate((element) => element === document.activeElement));
    await shot(page, id, "focus");
    let release;
    const pause = new Promise((resolve) => { release = resolve; });
    await page.route("**/*.wasm*", async (route) => { await pause; await route.continue(); });
    // The operating-system popup is outside headless Chromium's DOM. Select its
    // native option explicitly, then verify real keyboard submit/result focus.
    await tool.getByRole("combobox").selectOption("4:3");
    await tool.getByRole("combobox").focus();
    assert.equal(await tool.getByRole("combobox").inputValue(), "4:3");
    await page.keyboard.press("Tab");
    assert.ok(await tool.getByRole("button", { name: "Показать разницу" }).evaluate((element) => element === document.activeElement));
    await page.keyboard.press("Enter");
    await tool.getByRole("status").waitFor();
    await shot(page, id, "loading");
    assert.equal(await page.evaluate(() => window.__qaResults.length), 0);
    release();
    await tool.locator("[data-aspect-result]").waitFor();
    assert.ok(await tool.locator("[data-aspect-result] h4").evaluate((element) => element === document.activeElement));
    assert.equal(await tool.locator("[data-aspect-preview]").count(), 3);
    assert.match(await tool.locator('[data-aspect-metric="fit"]').innerText(), /25%/);
    assert.match(await tool.locator('[data-aspect-metric="crop"]').innerText(), /25%/);
    await tool.locator("[data-aspect-result]").scrollIntoViewIfNeeded();
    await shot(page, id, "success");
    for (const format of ["16:9", "2.39:1", "9:16"]) {
      await tool.getByRole("combobox").selectOption(format);
      assert.equal(await tool.locator("[data-aspect-result]").count(), 0, "changing format clears old result");
      await tool.getByRole("button", { name: "Показать разницу" }).click();
      await tool.locator("[data-aspect-result]").waitFor();
    }
    const events = await page.evaluate(() => ({ starts: window.__qaStarts, results: window.__qaResults }));
    assert.equal(events.starts.filter((event) => event.toolId === "tv_aspect_ratio").length, 1, "one start per page lifecycle");
    assert.equal(events.results.filter((event) => event.toolId === "tv_aspect_ratio").length, 4, "result after each deliberate calculation");
    for (const event of events.results) assert.deepEqual(Object.keys(event).sort(), ["resultType", "sourcePath", "toolId"]);
    await checkTextOverrides(page, tool.locator("[data-aspect-result]"), id, "aspect");
    assert.deepEqual(errors, []);
    checks.push(`aspect-${id}: 4 formats, keyboard submit/result focus, loading, reset, geometry, privacy, 200% text and no overflow`);
    await ctx.close();

    const errorContext = await context(viewport);
    const errorPage = await errorContext.newPage();
    await errorPage.route("**/*.wasm*", (route) => route.abort());
    await errorPage.goto(`${base}${aspectPath}`);
    const errorTool = errorPage.locator("[data-aspect-simulator]");
    await errorTool.getByRole("combobox").selectOption("4:3");
    await errorTool.getByRole("button", { name: "Показать разницу" }).click();
    await errorTool.getByRole("alert").waitFor();
    await errorTool.scrollIntoViewIfNeeded();
    await shot(errorPage, id, "error");
    assert.equal(await errorPage.evaluate(() => window.__qaResults.length), 0, "error is not a completion");
    await errorPage.unroute("**/*.wasm*");
    await errorTool.getByRole("button", { name: "Повторить" }).click();
    await errorTool.locator("[data-aspect-result]").waitFor();
    checks.push(`aspect-${id}: blocked WASM and real retry passed`);
    await errorContext.close();

    const screwsContext = await context(viewport, { analyticsQueue: true });
    const screwsPage = await screwsContext.newPage();
    await screwsPage.goto(`${base}${screwPath}`);
    const screwTool = screwsPage.locator("[data-screw-catalog]");
    await screwTool.getByLabel("1. Бренд телевизора").waitFor();
    await screwTool.getByLabel("1. Бренд телевизора").scrollIntoViewIfNeeded();
    await shot(screwsPage, id, "default", "screws");
    assert.ok(await screwTool.getByLabel("2. Точная модель").isDisabled());
    await screwTool.getByLabel("1. Бренд телевизора").selectOption("TCL");
    assert.match(await screwTool.getByRole("status").innerText(), /Выбран бренд TCL/);
    await screwTool.getByLabel("2. Точная модель").focus();
    await shot(screwsPage, id, "focus", "screws");
    await screwTool.getByLabel("2. Точная модель").selectOption("tcl-65c7k");
    await screwTool.locator('[data-selected-screw-model="tcl-65c7k"]').waitFor();
    assert.match(await screwTool.getByRole("status").innerText(), /найден подтверждённый паспорт/);
    const verified = await screwsPage.evaluate(() => window.__qaResults.filter((event) => event.toolId === "screw_lookup"));
    assert.equal(verified.length, 1);
    assert.deepEqual(Object.keys(verified[0]).sort(), ["resultCount", "resultType", "sourcePath", "toolId"]);
    await screwTool.locator("[data-selected-screw-model]").scrollIntoViewIfNeeded();
    await shot(screwsPage, id, "success", "screws");
    await checkTextOverrides(screwsPage, screwTool, id, "screws");
    await screwTool.getByLabel("1. Бренд телевизора").selectOption("LG");
    assert.equal(await screwTool.locator("[data-selected-screw-model]").count(), 0);
    const unsupported = await screwTool.getByLabel("2. Точная модель").locator('option[value]:not([value=""])').first().getAttribute("value");
    await screwTool.getByLabel("2. Точная модель").selectOption(unsupported);
    await screwTool.locator("[data-known-model-without-screw-passport]").waitFor();
    assert.match(await screwTool.getByRole("status").innerText(), /пока не подтверждён/);
    assert.equal(await screwsPage.evaluate(() => window.__qaResults.filter((event) => event.toolId === "screw_lookup").length), 1);
    await screwTool.locator("[data-known-model-without-screw-passport]").scrollIntoViewIfNeeded();
    await shot(screwsPage, id, "empty", "screws");
    const queued = await screwsPage.evaluate(() => (window.ym?.a ?? []).filter(([, method, goal, params]) => method === "reachGoal" && params?.tool_id === "screw_lookup").map(([, , goal, params]) => ({ goal, params })));
    assert.equal(queued.filter((row) => row.goal === "tool_usage").length, 1);
    assert.equal(queued.filter((row) => row.goal === "result_completed").length, 1);
    for (const row of queued) assert.ok(Object.keys(row.params).every((key) => ["tool_id", "action", "source_path", "result_type", "result_count"].includes(key)), "no model or user input in queue");
    checks.push(`screws-${id}: native selects, exact passport, unsupported model, queue deduplication`);
    await screwsContext.close();

    const staticContext = await context(viewport, { javascript: false });
    const staticPage = await staticContext.newPage();
    await staticPage.goto(`${base}${aspectPath}`);
    assert.ok(await staticPage.locator("[data-aspect-static-example] table").isVisible());
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute("href"), `https://krepitv.ru${aspectPath}`);
    await checkLayout(staticPage, `static-${id}`);
    await staticPage.goto(`${base}${screwPath}`);
    const staticScrews = staticPage.locator("[data-screw-catalog]");
    assert.match(await staticScrews.textContent(), /M6/);
    assert.match(await staticScrews.textContent(), /M8/);
    assert.ok(await staticScrews.locator('a[href^="/modeli/"]').count() >= 27);
    assert.equal(await staticPage.locator('link[rel="canonical"]').getAttribute("href"), `https://krepitv.ru${screwPath}`);
    await checkLayout(staticPage, `static-screws-${id}`);
    checks.push(`no-JS-${id}: aspect table, verified screw cards/model links and self-canonical`);
    await staticContext.close();
  }
  await writeFile(path.join(output, "browser-report.json"), `${JSON.stringify({ base: new URL(base).hostname, checks, shots }, null, 2)}\n`);
  console.log(`PASS: ${checks.length} browser contracts; ${shots.length} screenshots; 320/768/1440 CSS px; no real analytics sent`);
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
