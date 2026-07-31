import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function match(id, brand, fitStatus, warning = "") {
  return {
    compatible: true,
    fit_status: fitStatus,
    mount: { id, brand, title: `${brand} ${id}` },
    reasons: ["VESA совпадает", "Запас нагрузки достаточен", "Механизм подходит"],
    warnings: warning ? [warning] : [],
  };
}

test("результат подбора сначала показывает три проверенных варианта, остальные — по брендам под катом", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { CompatibilityResult } = await vite.ssrLoadModule(
      "/src/pages/GuidedSelectionPage.jsx",
    );
    const model = { id: "tcl-55c7k", title: "TCL 55C7K" };
    const matches = [
      match("conditional-a", "ONKRON", "conditional-fit", "Сверьте диагональ"),
      match("verified-a", "KROMAX", "verified-fit"),
      match("verified-b", "ONKRON", "verified-fit"),
      match("conditional-b", "KROMAX", "conditional-fit", "Диапазон пограничный"),
      match("verified-c", "ITECH", "verified-fit"),
      match("verified-d", "ONKRON", "verified-fit"),
      match("verified-e", "KROMAX", "verified-fit"),
    ];
    const html = renderToStaticMarkup(React.createElement(CompatibilityResult, {
      compatibility: { status: "ready" },
      matches,
      model,
    }));

    assert.equal((html.match(/data-result-tier="featured_result"/g) ?? []).length, 3);
    assert.equal((html.match(/data-result-tier="compatibility_result"/g) ?? []).length, 4);
    assert.equal(html.includes("data-result-catalog=\"collapsed\""), true);
    assert.equal(html.includes("Показать ещё 4 варианта по брендам"), true);
    assert.equal(html.includes("Полностью проверено: 5"), true);
    assert.equal(html.includes("Нужна сверка диагонали: 2"), true);
    assert.equal(html.includes("Полностью проверены: 2"), true);
    assert.equal(html.includes("Нужно сверить диагональ: 2"), true);
    assert.equal(html.includes("Кронштейнов: 1"), true);
    assert.equal(html.includes("Сверьте диагональ"), true);
    assert.equal(html.includes("Диапазон пограничный"), true);
    assert.equal((html.match(/href="\/kronshteyny\//g) ?? []).length, matches.length * 2);
    assert.ok(html.indexOf("verified-a") < html.indexOf("conditional-a"));
    assert.ok(html.indexOf("verified-b") < html.indexOf("conditional-a"));
    assert.ok(html.indexOf("verified-c") < html.indexOf("conditional-a"));
    assert.ok(html.indexOf("verified-d") < html.indexOf("conditional-a"));
    assert.ok(html.indexOf("verified-e") < html.indexOf("conditional-a"));
    assert.equal(html.includes("Найдено совместимых вариантов"), false);
    assert.equal(html.includes("Открыть карточку модели"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});
