import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("133 наблюдения Маркета сведены в канонические, alias и проверенные маршруты", async () => {
  const manifest = JSON.parse(await readFile(
    new URL("../../data/market_tv_models.json", import.meta.url),
    "utf8",
  ));

  assert.equal(manifest.records.length, 133);
  assert.equal(manifest.summary.unique_identities, 126);
  assert.equal(manifest.summary.verified_routes, 67);
  assert.equal(manifest.summary.observed_canonicals, 59);
  assert.equal(manifest.summary.indexable_observed_canonicals, 0);
  assert.equal(manifest.summary.alias_routes, 7);
  assert.equal(manifest.summary.low_confidence_routes, 9);
  assert.equal(
    new Set(manifest.records.map((record) => record.record_id)).size,
    133,
  );
  assert.equal(
    manifest.records.some((record) => (
      Object.hasOwn(record, "vesa_width_mm")
      || Object.hasOwn(record, "weight_kg")
      || Object.hasOwn(record, "compatible_mounts")
    )),
    false,
  );
});

test("страница наблюдаемой модели полезна без выдуманной совместимости и партнёрского CTA", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const manifest = JSON.parse(await readFile(
    new URL("../../data/market_tv_models.json", import.meta.url),
    "utf8",
  ));
  const model = manifest.records.find(
    (record) => record.page_kind === "observed" && record.diagonal_inches,
  );
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { ObservedModelPage } = await vite.ssrLoadModule(
      "/src/pages/ObservedModelPage.jsx",
    );
    const html = renderToStaticMarkup(React.createElement(ObservedModelPage, {
      catalog: {
        search: [{
          id: model.id,
          title: model.title,
          href: model.route_path,
          search: `${model.brand} ${model.model} ${model.title}`,
        }],
      },
      model,
    }));

    assert.match(html, /data-market-model-page="true"/u);
    assert.match(html, /data-compatibility-status="unverified"/u);
    assert.match(html, /Точный крепёж пока не подтверждён/u);
    assert.match(html, /Как подобрать кронштейн без ошибки/u);
    assert.match(html, /Расчёт активной области 16:9/u);
    assert.match(html, /data-market-source="identity"/u);
    assert.equal(html.includes(model.market_url), true);
    assert.equal(/VESA\s+\d{2,4}\s*[×x]/iu.test(html), false);
    assert.equal(/data-affiliate-offer-id=/iu.test(html), false);
  } finally {
    await vite.close();
  }
});
