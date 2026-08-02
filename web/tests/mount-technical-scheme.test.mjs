import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function mount(mechanism) {
  return {
    id: `test-${mechanism}`,
    brand: "Тест",
    model: `M-${mechanism}`,
    title: `Тестовый кронштейн ${mechanism}`,
    mechanism,
    min_diagonal_in: 43,
    max_diagonal_in: 75,
    max_load_kg: 68.2,
    vesa: ["200x200", "300x300", "400x400"],
    wall_distance_min_mm: mechanism === "fixed" ? 22 : 35,
    wall_distance_max_mm: mechanism === "fixed" ? 22 : 465.5,
    source_url: "https://example.com/mount",
    source_label: "Тестовый источник",
    checked_at: "2026-08-01",
  };
}

test("React-схема честно показывает три типа механизма и не изображает фото товара", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { MountTechnicalScheme } = await vite.ssrLoadModule(
      "/src/components/MountTechnicalScheme.jsx",
    );
    const expectedParts = {
      fixed: "fixed-rails",
      tilt: "tilt-joint",
      "full-motion": "articulated-arm",
    };

    for (const [mechanism, part] of Object.entries(expectedParts)) {
      const item = mount(mechanism);
      const html = renderToStaticMarkup(
        React.createElement(MountTechnicalScheme, { mount: item }),
      );

      assert.equal(html.includes(`data-mount-technical-scheme="${item.id}"`), true);
      assert.equal(html.includes(`data-mount-mechanism="${mechanism}"`), true);
      assert.equal(html.includes(`data-mechanism-part="${part}"`), true);
      assert.equal(html.includes("Техническая схема, не фотография"), true);
      assert.equal(html.includes("role=\"img\""), true);
      assert.equal(html.includes("viewBox=\"0 0 640 340\""), true);
      assert.equal(html.includes("block h-auto w-full max-w-full"), true);
      assert.equal(html.includes("43–75″"), true);
      assert.equal(html.includes("до 68,2 кг"), true);
      assert.equal(html.includes("3 схем"), true);
      assert.equal(html.includes(mechanism === "fixed" ? "22 мм" : "35–465,5 мм"), true);
      assert.equal(html.includes("Габариты деталей, длина рычагов и углы условные"), true);
      assert.equal(html.includes("<img"), false);
      assert.equal(html.includes("market.yandex"), false);
      assert.equal(html.includes("href="), false);
      assert.equal(html.includes(item.source_url), false);
    }
  } finally {
    await vite.close();
  }
});

test("страница кронштейна сохраняет техническую схему после React-рендера", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { MountPage } = await vite.ssrLoadModule("/src/pages/MountPage.jsx");
    const item = mount("full-motion");
    const catalog = {
      mounts: [item],
      models: [],
      compatibilityEdges: [],
      affiliateOffers: [],
      commercialProfiles: [],
    };
    const html = renderToStaticMarkup(
      React.createElement(MountPage, { catalog, mountId: item.id }),
    );

    assert.equal((html.match(/data-mount-technical-scheme=/gu) ?? []).length, 1);
    assert.equal(html.includes("data-mechanism-part=\"articulated-arm\""), true);
    assert.equal(html.includes("Техническая схема, не фотография"), true);

    const source = await readFile(
      new URL("../src/pages/MountPage.jsx", import.meta.url),
      "utf8",
    );
    assert.ok(source.indexOf("<MountTechnicalScheme") < source.indexOf("{affiliateOffer ?"));
  } finally {
    await vite.close();
  }
});
