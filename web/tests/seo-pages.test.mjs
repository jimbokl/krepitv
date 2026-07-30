import assert from "node:assert/strict";
import test from "node:test";
import {
  getModelContextPages,
  getRelatedPages,
  isIndexableSeoPage,
} from "../src/lib/seoPages.mjs";

const pages = [
  { id: "current", kind: "calculator", indexable: true },
  { id: "thin-same-kind", kind: "calculator", indexable: false },
  { id: "same-kind", kind: "calculator", indexable: true },
  { id: "other-kind", kind: "guide", indexable: true },
  { id: "missing-policy", kind: "guide" },
];

test("treats only explicitly indexable pages as indexable", () => {
  assert.equal(isIndexableSeoPage(pages[0]), true);
  assert.equal(isIndexableSeoPage(pages[1]), false);
  assert.equal(isIndexableSeoPage(pages[4]), false);
});

test("related pages exclude current and noindex pages", () => {
  assert.deepEqual(
    getRelatedPages(pages[0], pages).map((page) => page.id),
    ["same-kind", "other-kind"],
  );
});

test("model context links only to existing indexable brand, diagonal and VESA hubs", () => {
  const model = {
    brand: "LG",
    diagonal_inches: 55,
    vesa_width_mm: 300,
    vesa_height_mm: 200,
  };
  const catalog = [
    { id: "brand-lg", path: "/kronshteyn-dlya-televizora-lg/", indexable: true },
    { id: "diagonal-55", path: "/kronshteyn-dlya-televizora-55-dyuyma/", indexable: true },
    { id: "vesa-300x200", path: "/vesa/300x200/", indexable: true },
    { id: "vesa-200x200", path: "/vesa/200x200/", indexable: false },
  ];

  assert.deepEqual(getModelContextPages(model, catalog), [
    {
      id: "brand-lg",
      label: "Кронштейны для телевизоров LG",
      path: "/kronshteyn-dlya-televizora-lg/",
    },
    {
      id: "diagonal-55",
      label: "Кронштейны для телевизоров 55″",
      path: "/kronshteyn-dlya-televizora-55-dyuyma/",
    },
    {
      id: "vesa-300x200",
      label: "Модели с VESA 300×200",
      path: "/vesa/300x200/",
    },
  ]);
});

test("master page leads to the compatibility chain before generic calculators", () => {
  const catalog = [
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "full-motion-mount", kind: "mechanism", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-map", "tv-zone-sockets", "vesa", "full-motion-mount", "mounting-height", "viewing-distance"],
  );
});

test("mounting map leads to the geometry and compatibility chain", () => {
  const catalog = [
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["tv-zone-sockets", "wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa", "viewing-distance"],
  );
});

test("TV-zone socket page leads back to mounting geometry and compatibility", () => {
  const catalog = [
    { id: "tv-zone-sockets", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-map", "wall-mounted-tv", "mounting-height", "vesa"],
  );
});

test("tilt mount page leads to height, mounting, and mechanism checks", () => {
  const catalog = [
    { id: "tilt-mount", kind: "mechanism", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "fixed-mount", kind: "mechanism", indexable: true },
    { id: "full-motion-mount", kind: "mechanism", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-height", "mounting-map", "wall-mounted-tv", "fixed-mount", "full-motion-mount"],
  );
});

test("VESA matcher stays on the VESA hub and links to measurement guidance", () => {
  const catalog = [
    { id: "vesa", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "vesa-200x200", kind: "vesa", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["wall-mounted-tv", "how-to-find-vesa", "vesa-200x200"],
  );
});
