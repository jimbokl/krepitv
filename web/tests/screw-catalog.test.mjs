import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("официальный датасет содержит 26 паспортов винтов трёх брендов", async () => {
  const models = JSON.parse(await readFile(
    new URL("../../data/tv_models.json", import.meta.url),
    "utf8",
  ));
  const eligible = models.filter((model) => model.wall_mount_screws?.groups?.length);

  assert.equal(eligible.length, 26);
  assert.deepEqual([...new Set(eligible.map((model) => model.brand))].sort(), [
    "Hisense",
    "Samsung",
    "TCL",
  ]);
  for (const model of eligible) {
    assert.match(model.wall_mount_screws.source_url, /^https:\/\//);
    assert.ok(model.wall_mount_screws.groups.every((group) => group.quantity > 0));
  }
});

test("React-каталог держит модели под брендами и не превращается в витрину Маркета", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { TvMountScrewCatalog } = await vite.ssrLoadModule(
      "/src/components/TvMountScrewCatalog.jsx",
    );
    const models = [
      screwModel("samsung-test", "Samsung", "M8", 20),
      screwModel("hisense-test", "Hisense", "M6", null),
      screwModel("tcl-test", "TCL", "M6", 16),
    ];
    const search = models.map((model) => ({
      id: model.id,
      title: model.title,
      search: `${model.brand} ${model.model}`,
      href: `/modeli/${model.id}/`,
    }));
    const html = renderToStaticMarkup(
      React.createElement(TvMountScrewCatalog, { models, search }),
    );

    assert.equal(html.includes("data-screw-catalog=\"true\""), true);
    assert.equal((html.match(/<details/g) ?? []).length, 3);
    for (const model of models) {
      assert.equal(html.includes(`href=\"/modeli/${model.id}/\"`), true);
      assert.equal(html.includes(model.wall_mount_screws.source_url), true);
    }
    assert.equal(html.includes("market.yandex.ru"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});

function screwModel(id, brand, thread, length) {
  return {
    id,
    brand,
    model: id.toUpperCase(),
    title: `${brand} ${id.toUpperCase()}`,
    vesa_width_mm: 200,
    vesa_height_mm: 200,
    wall_mount_screws: {
      groups: [{
        location: "Четыре точки VESA",
        thread,
        ...(length == null
          ? { engagement_min_mm: 10, engagement_max_mm: 12, range_label: "L" }
          : { length_mm: length }),
        quantity: 4,
      }],
      source_region: "Россия",
      source_url: `https://example.com/${id}.pdf`,
      source_label: `Руководство ${brand}`,
      checked_at: "2026-07-31",
      note: "Проверено по официальному руководству.",
    },
  };
}
