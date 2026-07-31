import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("страница винтов объясняет диапазон полной длины без товарного округления", async () => {
  const pages = JSON.parse(await readFile(
    new URL("../../data/seo_pages.json", import.meta.url),
    "utf8",
  ));
  const page = pages.find((item) => item.id === "tv-mount-screws");

  assert.ok(page);
  assert.match(page.description, /диапазон полной длины/u);
  assert.match(page.lead, /без округления до товарного размера/u);
  assert.ok(page.faq.some(([question, answer]) => (
    question === "Как рассчитать полную длину винта для кронштейна телевизора?"
    && answer.includes("фактический винт должен находиться внутри него")
  )));
});

test("калькулятор показывается только для паспортного диапазона зацепления", async () => {
  const vite = await createServer({
    root: new URL("..", import.meta.url).pathname,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { ScrewLengthCalculator, engagementGroups } = await vite.ssrLoadModule(
      "/src/components/ScrewLengthCalculator.jsx",
    );
    const eligible = [{
      location: "Четыре точки VESA",
      thread: "M8",
      engagement_min_mm: 19,
      engagement_max_mm: 21,
      quantity: 4,
    }];
    const fixed = [{
      location: "Четыре точки VESA",
      thread: "M6",
      length_mm: 16,
      quantity: 4,
    }];

    assert.equal(engagementGroups(eligible).length, 1);
    assert.equal(engagementGroups(fixed).length, 0);
    const html = renderToStaticMarkup(
      React.createElement(ScrewLengthCalculator, {
        groups: eligible,
        requiresSpacerMeasurement: true,
      }),
    );
    assert.equal(html.includes('data-screw-length-calculator="true"'), true);
    assert.equal(html.includes("Диапазон полной длины винта"), true);
    assert.equal(html.includes("Измерьте пакет именно у проверяемой точки"), true);
    assert.equal(html.includes("market.yandex.ru"), false);
    assert.equal(
      renderToStaticMarkup(React.createElement(ScrewLengthCalculator, { groups: fixed })),
      "",
    );
  } finally {
    await vite.close();
  }
});

test("результат калькулятора сбрасывается при выборе другой модели", async () => {
  const source = await readFile(
    new URL("../src/components/TvMountScrewCatalog.jsx", import.meta.url),
    "utf8",
  );

  assert.match(
    source,
    /<WallMountScrews\s+key=\{selectedModel\.id\}/u,
    "WallMountScrews должен перемонтироваться вместе с точной моделью",
  );
});
