import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("брендовый подбор оставляет только точные модели бренда и полезен без ссылки Маркета", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { BrandMountMatcher, selectBrandMounts } = await vite.ssrLoadModule(
      "/src/components/BrandMountMatcher.jsx",
    );
    const mounts = [
      { id: "onkron-tm6", brand: "ONKRON" },
      { id: "onkron-nn24", brand: "Onkron" },
      { id: "kromax-star-11", brand: "KROMAX" },
    ];
    assert.deepEqual(
      selectBrandMounts(mounts, "onkron").map((mount) => mount.id),
      ["onkron-tm6", "onkron-nn24"],
    );
    assert.deepEqual(selectBrandMounts(mounts, ""), []);

    const html = renderToStaticMarkup(React.createElement(BrandMountMatcher, {
      affiliateOffers: [],
      brand: "ONKRON",
      models: [],
      mounts,
      search: [],
    }));

    assert.equal(html.includes('data-brand-mount-matcher="ONKRON"'), true);
    assert.equal(html.includes("Какие ONKRON подходят к вашему телевизору"), true);
    assert.equal(html.includes("Моделей ONKRON в каталоге: 2"), true);
    assert.equal(html.includes("TM5 и TM5‑BW"), true);
    assert.equal(html.includes("Проверить ONKRON"), true);
    assert.equal(html.includes("https://market.yandex.ru"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});
