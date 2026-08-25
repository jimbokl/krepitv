import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const model = {
  id: "tcl-65c7k",
  brand: "TCL",
  model: "65C7K",
  title: "TCL 65C7K",
  vesa_width_mm: 300,
  vesa_height_mm: 300,
  weight_kg: 18,
  weight_basis: "without_stand",
  diagonal_inches: 65,
  checked_at: "2026-08-05",
};

test("первый шаг объясняет полный комплект в инженерной оболочке без коммерческих обещаний", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const previousWindow = globalThis.window;
  globalThis.window = { location: { search: "" } };
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { GuidedSelectionPage } = await vite.ssrLoadModule(
      "/src/pages/GuidedSelectionPage.jsx",
    );
    const html = renderToStaticMarkup(React.createElement(GuidedSelectionPage, {
      catalog: {
        models: [model],
        mounts: [],
        affiliateOffers: [],
        modelPorts: null,
        wallFixingSystems: null,
      },
    }));

    assert.match(html, /data-kit-shell="true"/);
    assert.match(html, /data-kit-ruler="true"/);
    assert.match(html, /data-kit-outcome-preview="true"/);
    assert.match(html, /data-kit-outcome-mobile="true"/);
    assert.match(html, /data-kit-outcome-desktop="true"/);
    for (const label of [
      "Совместимость",
      "Винты",
      "Крепёж к стене",
      "Высота",
      "Кабели",
      "Порядок монтажа",
    ]) {
      assert.match(html, new RegExp(label));
    }
    assert.equal(/(?:₽|цена|стоимость)/iu.test(html), false);
  } finally {
    await vite.close();
    globalThis.window = previousWindow;
  }
});
