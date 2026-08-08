import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function match(id, brand, fitStatus, score, warning = "") {
  return {
    compatible: true,
    fit_status: fitStatus,
    score,
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
    const {
      CompatibilityResult,
      rankCompatibilityMatches,
      verifiedCompatibilityMatches,
    } = await vite.ssrLoadModule(
      "/src/pages/GuidedSelectionPage.jsx",
    );
    const model = { id: "tcl-55c7k", title: "TCL 55C7K" };
    const matches = [
      match("conditional-a", "ONKRON", "conditional-fit", 200, "Сверьте диагональ"),
      match("verified-a", "KROMAX", "verified-fit", 120),
      match("verified-b", "ONKRON", "verified-fit", 118),
      match("conditional-b", "KROMAX", "conditional-fit", 90, "Диапазон пограничный"),
      match("verified-c", "ITECH", "verified-fit", 110),
      match("verified-d", "ONKRON", "verified-fit", 100),
      match("verified-e", "KROMAX", "verified-fit", 118),
    ];
    const availableOfferMountIds = new Set(["verified-e", "conditional-a"]);
    assert.deepEqual(
      verifiedCompatibilityMatches(matches).map((item) => item.mount.id),
      ["verified-a", "verified-b", "verified-c", "verified-d", "verified-e"],
    );
    const ranked = rankCompatibilityMatches(matches, availableOfferMountIds);
    assert.deepEqual(ranked.map((item) => item.mount.id), [
      "verified-a",
      "verified-e",
      "verified-b",
      "verified-c",
      "verified-d",
      "conditional-a",
      "conditional-b",
    ]);
    assert.deepEqual(
      rankCompatibilityMatches(matches, new Set()).map((item) => item.mount.id),
      [
        "verified-a",
        "verified-b",
        "verified-e",
        "verified-c",
        "verified-d",
        "conditional-a",
        "conditional-b",
      ],
    );
    assert.deepEqual(
      rankCompatibilityMatches([
        match("tie-a", "KROMAX", "verified-fit", 100),
        match("tie-b", "ONKRON", "verified-fit", 100),
      ]).map((item) => item.mount.id),
      ["tie-a", "tie-b"],
    );

    const html = renderToStaticMarkup(React.createElement(CompatibilityResult, {
      availableOfferMountIds,
      compatibility: { status: "ready" },
      matches,
      model,
    }));

    assert.equal((html.match(/data-result-tier="featured_result"/g) ?? []).length, 3);
    assert.equal((html.match(/data-result-tier="compatibility_result"/g) ?? []).length, 2);
    assert.equal(html.includes("data-result-catalog=\"collapsed\""), true);
    assert.equal(html.includes("Показать ещё 2 варианта по брендам"), true);
    assert.equal(html.includes("Подтверждённых вариантов: 5"), true);
    assert.equal(html.includes("Полностью проверены: 2"), true);
    assert.equal(html.includes("При одинаковой технической оценке"), true);
    assert.equal((html.match(/data-market-card-available="true"/g) ?? []).length, 1);
    assert.equal((html.match(/На момент проверки есть точная карточка на Маркете/g) ?? []).length, 1);
    assert.equal(html.includes("Кронштейнов: 1"), true);
    assert.equal(html.includes("Сверьте диагональ"), false);
    assert.equal(html.includes("Диапазон пограничный"), false);
    assert.equal((html.match(/href="\/kronshteyny\//g) ?? []).length, 5 * 2);
    assert.ok(html.indexOf("verified-a") < html.indexOf("verified-e"));
    assert.ok(html.indexOf("verified-e") < html.indexOf("verified-b"));
    assert.equal(html.includes("conditional-a"), false);
    assert.equal(html.includes("conditional-b"), false);
    assert.equal(html.includes("Найдено совместимых вариантов"), false);
    assert.equal(html.includes("Открыть карточку модели"), false);
    assert.equal(html.includes("https://market.yandex.ru"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);

    const errorHtml = renderToStaticMarkup(React.createElement(CompatibilityResult, {
      compatibility: { status: "error", error: "Локальный модуль недоступен" },
      matches: [],
      model,
      onRetry: () => {},
    }));
    assert.equal(errorHtml.includes('data-guided-compatibility-state="error"'), true);
    assert.equal(errorHtml.includes('role="alert"'), true);
    assert.equal(errorHtml.includes("Повторить проверку"), true);
  } finally {
    await vite.close();
  }
});
