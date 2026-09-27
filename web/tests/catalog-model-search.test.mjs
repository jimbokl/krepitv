import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const model = {
  id: "tcl-55c7k",
  brand: "TCL",
  model: "55C7K",
  title: "TCL 55C7K",
  vesa_width_mm: 300,
  vesa_height_mm: 300,
  diagonal_inches: 55,
  weight_kg: 12,
  weight_basis: "without_stand",
};

const catalog = {
  models: [model],
  mounts: [],
  marketModels: [],
  search: [{
    id: model.id,
    brand: model.brand,
    model: model.model,
    title: model.title,
    href: `/modeli/${model.id}/`,
    search: `${model.brand} ${model.model} ${model.title}`,
  }],
};

test("поиск модели доступен в первом экране до загрузки приложения", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
  const html = await readFile(path.join(root, "docs/modeli/index.html"), "utf8");
  assert.match(html, /<h1[^>]*>Модели телевизоров<\/h1>/u);
  assert.match(html, /<form[^>]*action="\/modeli\/"[^>]*method="get"/u);
  assert.match(html, /<input[^>]*name="model"/u);
  assert.match(html, /id="checked-models"/u);
  assert.match(html, /technical-editorial-hero__media/u);
});

test("каталог показывает быстрый поиск и отвечает на запросы с других страниц", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  const previousWindow = globalThis.window;

  try {
    const { CatalogIndexPage } = await vite.ssrLoadModule("/src/pages/CatalogIndexPage.jsx");

    globalThis.window = { location: { search: "?model=TCL%2055C7K" } };
    const found = renderToStaticMarkup(React.createElement(CatalogIndexPage, { catalog, kind: "models" }));
    assert.match(found, /data-model-catalog-search="true"/u);
    assert.match(found, /data-model-catalog-query-result="true"/u);
    assert.match(found, /По запросу «TCL 55C7K» найдены модели/u);
    assert.match(found, /href="\/modeli\/tcl-55c7k\/"/u);
    assert.match(found, /Паспорт проверен/u);
    assert.match(found, /href="#checked-models"/u);

    globalThis.window = { location: { search: "?model=Unknown-999" } };
    const missing = renderToStaticMarkup(React.createElement(CatalogIndexPage, { catalog, kind: "models" }));
    assert.match(missing, /По запросу «Unknown-999» модель не нашлась/u);
    assert.doesNotMatch(missing, /href="\/modeli\/unknown-999\/"/u);

    globalThis.window = { location: { search: "" } };
    const defaultPage = renderToStaticMarkup(React.createElement(CatalogIndexPage, { catalog, kind: "models" }));
    assert.match(defaultPage, /Найдите свой телевизор/u);
    assert.doesNotMatch(defaultPage, /data-model-catalog-query-result/u);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    await vite.close();
  }
});
