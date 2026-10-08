import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";
import { getRelatedPages } from "../src/lib/seoPages.mjs";
import { toolUsageDetail } from "../src/lib/toolUsage.mjs";

test("мониторный помощник не подменяет неизвестное подтверждением и работает через Rust", async () => {
  const vite = await createServer({ root: path.resolve(path.dirname(fileURLToPath(import.meta.url)), ".."), logLevel: "silent", server: { middlewareMode: true }, appType: "custom" });
  try {
    const { MonitorMountChecker, normalizeMonitorMountPlan } = await vite.ssrLoadModule("/src/components/MonitorMountChecker.jsx");
    const html = renderToStaticMarkup(React.createElement(MonitorMountChecker));
    assert.match(html, /data-monitor-checker="true"/);
    assert.match(html, /<button[^>]*disabled/);
    assert.ok(html.includes("Пока не знаю"));
    assert.ok(html.includes("пустое поле означает"));
    assert.doesNotMatch(html, /market\.yandex|data-monitor-result/);
    const valid = { status: "needs_data", screen_count: 1, checks: ["arms", "vesa_0", "weight_0", "wall"].map((id) => ({ id, state: "unknown", text: "Нужна дополнительная проверка" })) };
    assert.equal(normalizeMonitorMountPlan(valid), valid);
    for (const change of [(p) => { p.status = "compatible"; }, (p) => { p.checks[0].state = "fail"; }, (p) => { p.checks[0].id = "email"; }, (p) => { p.screen_count = 3; }, (p) => { p.checks.pop(); }, (p) => { p.checks[1].id = "arms"; }]) {
      const invalid = structuredClone(valid); change(invalid); assert.throws(() => normalizeMonitorMountPlan(invalid));
    }
  } finally { await vite.close(); }
  const source = await readFile(new URL("../src/components/MonitorMountChecker.jsx", import.meta.url), "utf8");
  assert.match(source, /calculateMonitorMountPlan/);
  assert.match(source, /request !== generation\.current/);
  const event = source.match(/emitResultCompleted\(window, \{([^}]+)\}\)/)?.[1];
  assert.match(event, /toolId: "monitor_mount_match"/);
  assert.doesNotMatch(event, /vesa|kg|values|screens|input/);
  assert.ok(toolUsageDetail({ action: "started", toolId: "monitor_mount_match" }, "/kronshteyn-dlya-monitora/"));
});

test("мониторный canonical уникален, имеет источники и входящие ссылки из VESA", async () => {
  const pages = JSON.parse(await readFile(new URL("../../data/seo_pages.json", import.meta.url), "utf8"));
  const page = pages.find((p) => p.id === "monitor-mount");
  assert.equal(pages.filter((p) => p.path === page.path).length, 1);
  assert.ok(page.indexable && page.facts.length >= 5 && page.guide.steps.length >= 6);
  assert.equal(page.guide.updated_at, "2026-10-08");
  assert.ok(page.guide.sources.every((source) => /^https:\/\//.test(source.url)));
  for (const id of ["vesa", "how-to-find-vesa"]) assert.ok(getRelatedPages(pages.find((p) => p.id === id), pages).some((p) => p.id === page.id));
  assert.ok(getRelatedPages(page, pages).some((p) => p.id === "vesa"));
});
