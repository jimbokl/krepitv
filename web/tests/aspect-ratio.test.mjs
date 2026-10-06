import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("сравнение форматов доступно до загрузки WASM и не обещает универсального меню", async () => {
  const vite = await createServer({ root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const { TvAspectRatioSimulator, normalizeAspectRatioPlan } = await vite.ssrLoadModule("/src/components/TvAspectRatioSimulator.jsx");
    const html = renderToStaticMarkup(React.createElement(TvAspectRatioSimulator));
    assert.match(html, /data-aspect-static-example="true"/);
    assert.match(html, /<button[^>]*disabled/);
    for (const text of ["Без искажений", "Обрезать края", "Растянуть", "названия режимов зависят от модели"]) assert.ok(html.includes(text));
    assert.ok(html.includes("<table"));
    assert.doesNotMatch(html, /market\.yandex|data-aspect-result/);
    const valid = { format: "4:3", source_width: 240, source_height: 180, screen_width: 320, screen_height: 180, views: [
      { mode: "fit", x: 40, y: 0, width: 240, height: 180, bars_percent: 25, cropped_percent: 0, distorted: false },
      { mode: "crop", x: 0, y: -30, width: 320, height: 240, bars_percent: 0, cropped_percent: 25, distorted: false },
      { mode: "stretch", x: 0, y: 0, width: 320, height: 180, bars_percent: 0, cropped_percent: 0, distorted: true },
    ] };
    assert.equal(normalizeAspectRatioPlan(valid), valid);
    for (const change of [ (plan) => { plan.format = "unknown"; }, (plan) => { plan.views[0].width = NaN; }, (plan) => { plan.views[0].bars_percent = 100; }, (plan) => { plan.views[0].x = 0; }, (plan) => { plan.views.pop(); } ]) {
      const invalid = structuredClone(valid); change(invalid);
      assert.throws(() => normalizeAspectRatioPlan(invalid));
    }
  } finally { await vite.close(); }
});

test("формат рассчитывает Rust, событие содержит только контролируемый тип результата", async () => {
  const source = await readFile(new URL("../src/components/TvAspectRatioSimulator.jsx", import.meta.url), "utf8");
  assert.match(source, /calculateAspectRatioPlan\(format\)/);
  const event = source.match(/emitResultCompleted\(window, \{([^}]+)\}\)/)?.[1];
  assert.ok(event);
  assert.match(event, /toolId: "tv_aspect_ratio"/);
  assert.match(event, /resultType: "format_comparison_shown"/);
  assert.doesNotMatch(event, /format,|query|source_width|modelId/);
  assert.match(source, /request !== generation\.current/);
  const sitegen = await readFile(new URL("../../crates/sitegen/src/main.rs", import.meta.url), "utf8");
  assert.match(sitegen, /fn seo_aspect_ratio_example_html/);
  assert.match(sitegen, /if page\.id == "tv-aspect-ratio"/);
});
