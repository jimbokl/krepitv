import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const models = [
  {
    id: "tcl-65c7k",
    brand: "TCL",
    model: "65C7K",
    title: "TCL 65C7K",
    vesa_width_mm: 300,
    vesa_height_mm: 300,
    weight_kg: 18,
    weight_basis: "without_stand",
    diagonal_inches: 65,
    series: "C7K",
    model_year: 2025,
    width_mm: 1444,
    height_mm: 832,
    depth_mm: 57,
    source_label: "Официальные характеристики TCL",
    checked_at: "2026-08-05",
  },
  {
    id: "tcl-55c7k",
    brand: "TCL",
    model: "55C7K",
    title: "TCL 55C7K",
  },
  {
    id: "hisense-65u7q",
    brand: "Hisense",
    model: "65U7Q",
    title: "Hisense 65U7Q",
  },
  {
    id: "samsung-qe55q70dauxru",
    brand: "Samsung",
    model: "QE55Q70DAUXRU",
    title: "Samsung QE55Q70DAUXRU",
  },
  {
    id: "samsung-qe43q7faauxru",
    brand: "Samsung",
    model: "QE43Q7FAAUXRU",
    title: "Samsung QE43Q7FAAUXRU",
  },
  {
    id: "samsung-ue43u8000fuxru",
    brand: "Samsung",
    model: "UE43U8000FUXRU",
    title: "Samsung UE43U8000FUXRU",
  },
];

const search = models.map((model) => ({
  id: model.id,
  brand: model.brand,
  model: model.model,
  title: model.title,
  href: `/modeli/${model.id}/`,
  search: `${model.brand} ${model.model}`,
}));

function catalog() {
  return {
    models,
    search,
    mounts: [],
    affiliateOffers: [],
  };
}

async function loadGuidedSelection() {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  const module = await vite.ssrLoadModule("/src/pages/GuidedSelectionPage.jsx");
  return { module, vite };
}

test("марки сортируются по числу моделей, а список моделей остаётся внутри марки", async () => {
  const { module, vite } = await loadGuidedSelection();
  try {
    assert.deepEqual(module.getGuidedBrandOptions(models), [
      { brand: "Samsung", count: 3 },
      { brand: "TCL", count: 2 },
      { brand: "Hisense", count: 1 },
    ]);
    assert.deepEqual(
      module.getGuidedModelOptions(models, "TCL").map((item) => item.id),
      ["tcl-55c7k", "tcl-65c7k"],
    );
    assert.deepEqual(module.getGuidedModelOptions(models, ""), []);
    assert.deepEqual(module.getGuidedModelOptions(models, "Неизвестная марка"), []);
    assert.equal(module.findGuidedModel(models, "TCL", "hisense-65u7q"), null);
    assert.equal(module.findGuidedModel(models, "TCL", "tcl-65c7k")?.id, "tcl-65c7k");
  } finally {
    await vite.close();
  }
});

test("свежий подбор начинается с марки и не подставляет случайную модель", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { search: "" } };
  const { module, vite } = await loadGuidedSelection();
  try {
    const html = renderToStaticMarkup(
      React.createElement(module.GuidedSelectionPage, { catalog: catalog() }),
    );
    assert.equal(html.includes("data-guided-brand-step=\"true\""), true);
    assert.equal(html.includes("Шаг 1 из 6"), true);
    assert.equal(html.includes("Сначала выберите марку телевизора"), true);
    assert.equal(html.includes("<option value=\"\" selected=\"\">Выберите марку</option>"), true);
    assert.equal(html.includes("Результат для модели"), false);
    assert.equal(html.includes("id=\"guided-tv-model\""), false);
  } finally {
    globalThis.window = previousWindow;
    await vite.close();
  }
});

test("точная deep link выбирает марку и оставляет подтверждение модели", async () => {
  const previousWindow = globalThis.window;
  globalThis.window = { location: { search: "?model=tcl-65c7k" } };
  const { module, vite } = await loadGuidedSelection();
  try {
    const html = renderToStaticMarkup(
      React.createElement(module.GuidedSelectionPage, { catalog: catalog() }),
    );
    assert.equal(html.includes("Шаг 2 из 6"), true);
    assert.equal(html.includes("Теперь выберите точную модель TCL"), true);
    assert.equal(html.includes("data-guided-model-count=\"2\""), true);
    assert.equal(html.includes("id=\"guided-tv-model\""), true);
    assert.equal(html.includes("<option value=\"tcl-65c7k\" selected=\"\">TCL 65C7K</option>"), true);
    assert.equal(html.includes("Hisense 65U7Q"), false);
    assert.equal(html.includes("Samsung QE55Q70DAUXRU"), false);
    assert.equal(html.includes("Выбранная модель"), true);
    assert.equal(html.includes("Шаг 3 из 6"), false);
  } finally {
    globalThis.window = previousWindow;
    await vite.close();
  }
});
