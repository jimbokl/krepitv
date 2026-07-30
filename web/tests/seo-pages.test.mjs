import assert from "node:assert/strict";
import test from "node:test";
import {
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

test("master page leads to the compatibility chain before generic calculators", () => {
  const catalog = [
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "full-motion-mount", kind: "mechanism", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["mounting-map", "vesa", "full-motion-mount", "mounting-height", "viewing-distance"],
  );
});

test("mounting map leads to the geometry and compatibility chain", () => {
  const catalog = [
    { id: "mounting-map", kind: "guide", indexable: true },
    { id: "viewing-distance", kind: "calculator", indexable: true },
    { id: "vesa", kind: "guide", indexable: true },
    { id: "how-to-find-vesa", kind: "guide", indexable: true },
    { id: "wall-mounted-tv", kind: "calculator", indexable: true },
    { id: "mounting-height", kind: "calculator", indexable: true },
  ];

  assert.deepEqual(
    getRelatedPages(catalog[0], catalog).map((page) => page.id),
    ["wall-mounted-tv", "mounting-height", "vesa", "how-to-find-vesa", "viewing-distance"],
  );
});
