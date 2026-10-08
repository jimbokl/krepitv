import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";

// Isolated browser; the owner's Chrome and production analytics are not used.
let playwright;
try { playwright = await import("playwright"); } catch {
  playwright = createRequire("/Users/dmitrij/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json")("playwright");
}
const output = path.resolve(process.env.QA_OUTPUT ?? ".private/qa/monitor-mount-20261008");
const axeSource = await readFile(path.resolve(".private/qa-harness/node_modules/axe-core/axe.min.js"), "utf8");
await mkdir(output, { recursive: true });
const root = path.resolve("docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp", ".xml": "application/xml" };
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
const route = "/kronshteyn-dlya-monitora/";
const checks = [], accessibility = [];
async function context(viewport, javascript = true) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled: javascript });
  await ctx.route(/mc\.yandex\.(ru|com)|yandex\.ru\/clck|google-analytics\.com/, (route) => route.abort());
  if (javascript) await ctx.addInitScript(() => {
    localStorage.setItem("krepitv:metrika-consent", "denied");
    window.__monitorResults = [];
    window.__monitorStarts = [];
    window.addEventListener("krepitv:result-completed", (event) => window.__monitorResults.push(event.detail));
    window.addEventListener("krepitv:tool-usage", (event) => window.__monitorStarts.push(event.detail));
  });
  return ctx;
}
async function layout(page) {
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "horizontal overflow");
}
async function shot(page, name) { await layout(page); await page.screenshot({ path: path.join(output, `${name}.png`) }); }
async function scanAccessibility(page, state) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
  const describe = ({ id, nodes }) => ({ id, targets: nodes.map((node) => node.target) });
  accessibility.push({ state, viewport: page.viewportSize(), violations: result.violations.map(describe), incomplete: result.incomplete.map(describe) });
  assert.deepEqual(result.violations.map(describe), [], `accessibility ${state}`);
}
async function set(tool, values) {
  for (const [key, value] of Object.entries(values)) {
    const field = tool.locator(`[data-monitor-field="${key}"]`);
    if (await field.evaluate((element) => element.tagName === "SELECT")) await field.selectOption(value);
    else await field.fill(value);
  }
}
async function submit(tool, status) {
  await tool.getByRole("button", { name: /Проверить параметры|Повторить проверку/ }).click();
  await tool.locator(`[data-monitor-result="${status}"]`).waitFor();
  assert.ok(await tool.locator("[data-monitor-result] h4").evaluate((element) => element === document.activeElement), "result focus");
}
const valid = { vesa0: "100", kg0: "5", supported: "75,100", max: "9", mechanism: "gas", min: "2", desk: "25", deskMin: "10", deskMax: "50", material: "solid", access: "yes" };
try {
  for (const [name, viewport] of Object.entries({ mobile: { width: 320, height: 800 }, tablet: { width: 768, height: 1024 }, desktop: { width: 1440, height: 900 } })) {
    const ctx = await context(viewport);
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${base}${route}`);
    const tool = page.locator("[data-monitor-checker]");
    await tool.waitFor();
    await shot(page, `${name}-hero`);
    assert.equal(await page.locator("[data-mount-funnel-next-step]").count(), 0);
    assert.equal(await page.locator('a[href*="market.yandex"], a[href*="market.yandex.ru"]').count(), 0);
    await tool.scrollIntoViewIfNeeded();
    assert.ok(await tool.getByRole("button", { name: "Проверить параметры" }).isDisabled());
    await shot(page, `${name}-default`);
    await scanAccessibility(page, `${name}-default`);
    const firstSelect = tool.getByRole("combobox").first();
    await firstSelect.focus();
    assert.ok(await firstSelect.evaluate((element) => element === document.activeElement));
    await set(tool, valid);
    await submit(tool, "parameters_match");
    assert.match(await tool.locator("[data-monitor-result]").innerText(), /не подтверждение безопасности/);
    await shot(page, `${name}-result`);
    await scanAccessibility(page, `${name}-result`);
    const textStyle = await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; }" });
    await shot(page, `${name}-large-text`);
    await textStyle.evaluate((element) => element.remove());
    await set(tool, { min: "" });
    assert.equal(await tool.locator("[data-monitor-result]").count(), 0, "changed input clears stale result");
    await submit(tool, "needs_data");
    await set(tool, { min: "2", kg0: "1" });
    await submit(tool, "mismatch");
    await set(tool, { kg0: "5", count: "2", arms: "2", vesa1: "100", kg1: "10" });
    await submit(tool, "mismatch");
    assert.match(await tool.locator("[data-monitor-result]").innerText(), /Экран 2: масса выше максимума/);
    await set(tool, { count: "1", arms: "1", vesa0: "none" });
    await submit(tool, "needs_data");
    await set(tool, { vesa0: "100", material: "glass" });
    await submit(tool, "needs_data");
    await set(tool, { material: "solid", access: "no" });
    await submit(tool, "mismatch");
    await set(tool, { access: "yes", mounting: "grommet" });
    await submit(tool, "parameters_match");
    assert.match(await tool.locator("[data-monitor-result]").innerText(), /диаметр/);
    await set(tool, { mounting: "wall" });
    assert.equal(await tool.locator('[data-monitor-field="desk"]').count(), 0);
    await submit(tool, "parameters_match");
    assert.match(await tool.locator("[data-monitor-result]").innerText(), /Настольное основание не превращается/);
    await set(tool, { min: "10", max: "9" });
    await tool.getByRole("button", { name: "Проверить параметры" }).click();
    await tool.getByRole("alert").waitFor();
    await shot(page, `${name}-error`);
    await scanAccessibility(page, `${name}-error`);
    await set(tool, { min: "2" });
    await submit(tool, "parameters_match");
    const events = await page.evaluate(() => ({ results: window.__monitorResults, starts: window.__monitorStarts }));
    assert.ok(events.results.length >= 10);
    assert.ok(events.starts.some((event) => event.toolId === "monitor_mount_match"));
    assert.doesNotMatch(JSON.stringify(events), /"(?:screens|kg|vesa|values|input|email)"/);
    assert.deepEqual(errors, []);
    checks.push({ viewport: name, states: ["disabled", "focus", "parameters_match", "needs_data", "mismatch", "error", "retry"], completed: events.results.length, pageErrors: errors.length });
    await ctx.close();
  }
  const plain = await context({ width: 320, height: 800 }, false);
  const page = await plain.newPage();
  await page.goto(`${base}${route}`);
  assert.equal(await page.locator("[data-monitor-static]").count(), 1);
  assert.match(await page.locator("body").innerText(), /массу каждого экрана/);
  assert.equal(await page.locator('link[rel="canonical"]').getAttribute("href"), `https://krepitv.ru${route}`);
  assert.ok(await page.locator('a[href="https://www.asus.com/ru/support/faq/1048415/"]').count());
  const svg = await page.request.get(`${base}/assets/images/monitor-mount-workspace.svg`);
  assert.equal(svg.status(), 200);
  await shot(page, "mobile-no-javascript");
  await plain.close();
  checks.push({ staticHtml: true, canonical: true, sources: true, image: true });
  const retry = await context({ width: 768, height: 1024 });
  const retryPage = await retry.newPage();
  await retryPage.goto(`${base}${route}`);
  const retryTool = retryPage.locator("[data-monitor-checker]");
  await retryTool.waitFor();
  await set(retryTool, valid);
  let release;
  const pause = new Promise((resolve) => { release = resolve; });
  await retryPage.route("**/*.wasm*", async (request) => { await pause; await request.abort(); });
  await retryTool.getByRole("button", { name: "Проверить параметры" }).click();
  await retryTool.getByRole("status").waitFor();
  assert.ok(await retryTool.getByRole("button", { name: "Проверяем…" }).isDisabled());
  await shot(retryPage, "tablet-loading");
  release();
  await retryTool.getByRole("alert").waitFor();
  await shot(retryPage, "tablet-module-error");
  await retryPage.unroute("**/*.wasm*");
  await submit(retryTool, "parameters_match");
  await retry.close();
  checks.push({ moduleLoading: true, moduleFailure: true, moduleRetry: true });
  await writeFile(path.join(output, "report.json"), `${JSON.stringify({ date: "2026-10-08", target: process.env.QA_BASE_URL ? "production" : "local", checks, accessibility }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, viewports: 3, staticHtml: true, checks: checks.length, accessibilityScans: accessibility.length, output }));
} finally { await browser.close(); await new Promise((resolve) => server.close(resolve)); }
