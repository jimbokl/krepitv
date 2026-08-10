import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("страница кронштейна показывает автора, основание, дату и закрытый физический тест до Маркета", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { MountPage } = await vite.ssrLoadModule("/src/pages/MountPage.jsx");
    const model = {
      id: "test-tv",
      brand: "Тест",
      model: "TV-1",
      title: "Тест TV-1",
      diagonal_inches: 55,
      weight_kg: 12,
      vesa_width_mm: 300,
      vesa_height_mm: 300,
      checked_at: "2026-08-05",
    };
    const mount = {
      id: "test-mount",
      brand: "Тест",
      model: "M-1",
      title: "Тест M-1",
      mechanism: "tilt",
      vesa: ["300x300"],
      max_load_kg: 50,
      min_diagonal_in: 32,
      max_diagonal_in: 75,
      wall_distance_min_mm: 40,
      wall_distance_max_mm: 60,
      source_url: "https://example.com/test-mount",
      checked_at: "2026-08-05",
    };
    const html = renderToStaticMarkup(React.createElement(MountPage, {
      catalog: {
        affiliateOffers: [],
        commercialProfiles: [],
        compatibilityEdges: [{
          tv_id: model.id,
          mount_id: mount.id,
          compatible: true,
          fit_status: "verified-fit",
          required_load_kg: 15,
          reasons: ["VESA совпадает"],
          warnings: [],
        }],
        models: [model],
        mounts: [mount],
      },
      mountId: mount.id,
    }));

    assert.match(html, /data-editorial-accountability="true"/u);
    assert.match(html, /href="\/redaktsiya\/"[^>]*>Редакция KREPI TV/u);
    assert.match(html, /Паспорт кронштейна и граф совместимости/u);
    assert.match(html, /Физический тест не проводился/u);
    assert.match(html, /href="\/metodika\/"/u);
    assert.ok(
      html.indexOf("data-editorial-accountability") < html.indexOf("data-market-mount-section"),
    );
  } finally {
    await vite.close();
  }
});

test("редакционный evidence builder закрывается на неизвестном типе и неверной дате", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { buildEditorialEvidence } = await vite.ssrLoadModule(
      "/src/lib/editorialPolicy.mjs",
    );
    assert.throws(
      () => buildEditorialEvidence({ checkedAt: "2026-08-10", contentKind: "invented" }),
      /Неизвестное основание/u,
    );
    assert.throws(
      () => buildEditorialEvidence({ checkedAt: "2026-02-30", contentKind: "mount" }),
      /Некорректная дата/u,
    );
    assert.equal(
      buildEditorialEvidence({ checkedAt: "2026-08-10", contentKind: "mount" }).basis,
      "Паспорт кронштейна и граф совместимости",
    );
  } finally {
    await vite.close();
  }
});
