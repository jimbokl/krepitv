import assert from "node:assert/strict";
import http from "node:http";
import path from "node:path";
import { createRequire } from "node:module";
import { readFile, mkdir, writeFile } from "node:fs/promises";

// Separate test browser. Never use the owner's Chrome or send test analytics.
let playwright;
try { playwright = await import("playwright"); } catch {
  playwright = createRequire("/Users/dmitrij/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/package.json")("playwright");
}
const output = path.resolve(process.env.QA_OUTPUT ?? ".private/qa/subtitles-20261013");
await mkdir(output, { recursive: true });
const root = path.resolve("docs");
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".wasm": "application/wasm", ".svg": "image/svg+xml", ".woff2": "font/woff2", ".webp": "image/webp" };
const server = http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const filename = path.resolve(root, `.${pathname.endsWith("/") ? `${pathname}index.html` : pathname}`);
    if (!filename.startsWith(`${root}${path.sep}`)) { response.writeHead(403).end(); return; }
    response.setHeader("Content-Type", types[path.extname(filename)] ?? "application/octet-stream");
    response.end(await readFile(filename));
  } catch { response.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = process.env.QA_BASE_URL ?? `http://127.0.0.1:${server.address().port}`;
const browser = await playwright.chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: true });
const axeSource = await readFile(path.resolve(".private/qa-harness/node_modules/axe-core/axe.min.js"), "utf8");
const cases = [
  ["main", "/kak-otklyuchit-subtitry-na-televizore/", "dialogue", "broadcast", "captions", "broadcast"],
  ["teletext", "/kak-ubrat-teletext-i-skrytye-subtitry/", "notice", "broadcast", "announcement", "notice"],
  ["youtube", "/kak-otklyuchit-subtitry-youtube-na-televizore/", "dialogue", "youtube", "cc_available", "youtube"],
  ["usb", "/kak-otklyuchit-subtitry-v-filme-s-fleshki/", "dialogue", "usb", "sidecar", "usb_file"],
];
const checks = [], accessibility = [];
async function context(viewport, javaScriptEnabled = true) {
  const ctx = await browser.newContext({ viewport, javaScriptEnabled, reducedMotion: "reduce" });
  await ctx.route(/mc\.yandex\.(ru|com)|yandex\.ru\/clck|google-analytics\.com/, route => route.abort());
  if (javaScriptEnabled) await ctx.addInitScript(() => {
    localStorage.setItem("krepitv:metrika-consent", "denied");
    window.__subtitleResults = [];
    window.addEventListener("krepitv:result-completed", event => window.__subtitleResults.push(event.detail));
  });
  return ctx;
}
async function layout(page) { assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "horizontal overflow"); }
async function scan(page, state) {
  await page.addScriptTag({ content: axeSource });
  const result = await page.evaluate(() => window.axe.run("main", { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] } }));
  const describe = ({ id, nodes }) => ({ id, targets: nodes.map(node => node.target) });
  accessibility.push({ state, violations: result.violations.map(describe), incomplete: result.incomplete.map(describe) });
  assert.deepEqual(result.violations.map(describe), [], state);
}
try {
  for (const width of [320, 768, 1440]) {
    for (const [name, route, appearance, source, observation, expected] of cases) {
      const ctx = await context({ width, height: 950 });
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", error => errors.push(error.message));
      await page.goto(`${base}${route}`);
      const tool = page.locator("[data-subtitle-wizard]");
      await tool.waitFor();
      assert.equal(await page.locator("[data-subtitle-wizard]").count(), 1);
      await page.evaluate(() => document.fonts.ready);
      await layout(page);
      await scan(page, `${name}-${width}-default`);
      if (name === "main") {
        await tool.evaluate(element => window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 12));
        await page.screenshot({ path: path.join(output, `${name}-${width}-default.png`) });
      }
      const goal = tool.getByRole("button", { name: "Включить", exact: true });
      await goal.focus(); await page.keyboard.press("Tab");
      const firstChoice = tool.locator('[data-subtitle-step="appearance"] button').first();
      assert.ok(await firstChoice.evaluate(element => element === document.activeElement && element.matches(":focus-visible")));
      await tool.locator(`[data-subtitle-step="appearance"] [data-subtitle-choice="${appearance}"]`).focus();
      await page.keyboard.press("Enter");
      await tool.locator(`[data-subtitle-step="source"] [data-subtitle-choice="${source}"]`).click();
      await tool.locator(`[data-subtitle-step="observation"] [data-subtitle-choice="${observation}"]`).click();
      await tool.locator("[data-subtitle-calculate]").click();
      const result = tool.locator("[data-subtitle-result]");
      await result.locator("h4").waitFor();
      await page.waitForFunction(() => document.activeElement?.matches("[data-subtitle-result]"));
      assert.ok(await result.evaluate(element => element === document.activeElement));
      assert.equal(await page.evaluate(() => window.__subtitleResults[0].resultType), `subtitle_${expected}`);
      await result.scrollIntoViewIfNeeded();
      await scan(page, `${name}-${width}-result`);
      await page.screenshot({ path: path.join(output, `${name}-${width}-result.png`) });
      if (name === "main" && width === 320) {
        await page.addStyleTag({ content: "html { font-size: 200% !important; } * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }" });
        await layout(page);
        await tool.scrollIntoViewIfNeeded();
        await page.screenshot({ path: path.join(output, "main-320-large-text.png"), fullPage: true });
      }
      await tool.locator('[data-subtitle-step="observation"] [data-subtitle-choice="unclear"]').click();
      assert.equal(await result.locator("h4").count(), 0, "changed answers clear stale instructions");
      await page.reload();
      await page.locator("[data-subtitle-wizard]").waitFor();
      assert.equal(await page.locator('[data-subtitle-choice="unclear"][aria-pressed="true"]').count(), 1);
      assert.equal(await page.locator("[data-subtitle-result] h4").count(), 0, "session restore must not manufacture a completion");
      if (name === "main") {
        const restored = page.locator("[data-subtitle-wizard]");
        await restored.getByRole("button", { name: "Включить", exact: true }).click();
        await restored.locator('[data-subtitle-step="observation"] [data-subtitle-choice="no_text"]').click();
        await restored.locator("[data-subtitle-calculate]").click();
        await restored.locator("[data-subtitle-result] h4").waitFor();
        assert.match(await restored.locator("[data-subtitle-result]").innerText(), /«Вкл\.»/u);
        await restored.getByRole("button", { name: "Убрать", exact: true }).click();
        assert.equal(await restored.locator('[data-subtitle-choice="no_text"]').count(), 0);
        assert.equal(await restored.locator("[data-subtitle-result] h4").count(), 0);
        assert.equal(await restored.locator("[data-subtitle-calculate]").isDisabled(), true);
      }
      assert.deepEqual(errors, []);
      checks.push({ name, width, keyboard: true, result: true, persistence: true });
      await ctx.close();
    }
  }
  for (const [name, route] of cases) {
    const ctx = await context({ width: 320, height: 950 }, false);
    const page = await ctx.newPage();
    const response = await page.goto(`${base}${route}`);
    assert.equal(response.status(), 200);
    assert.equal(await page.locator("h1").count(), 1);
    assert.ok(await page.locator("main table").count() >= 1);
    assert.ok(await page.locator('#istochniki a[href^="https://"]').count() >= 2);
    assert.match(await page.locator("main").innerText(), /без JavaScript/);
    if (name === "main") {
      await page.locator("[data-subtitle-platform-reference] summary").click();
      assert.equal(await page.locator("[data-subtitle-platform-reference] tbody tr").count(), 7);
    }
    await layout(page);
    await page.screenshot({ path: path.join(output, `${name}-no-js.png`) });
    checks.push({ name, staticHtml: true });
    await ctx.close();
  }
  await writeFile(path.join(output, "report.json"), `${JSON.stringify({ date: "2026-10-13", target: process.env.QA_BASE_URL ? "production" : "local", checks, accessibility }, null, 2)}\n`);
  console.log(JSON.stringify({ passed: true, cases: checks.length, accessibilityScans: accessibility.length, output }));
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)); }
