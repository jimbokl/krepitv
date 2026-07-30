import assert from "node:assert/strict";
import test from "node:test";
import { getCatalogItems } from "../src/lib/seoCatalogItems.mjs";

const catalog = {
  models: [],
  mounts: [
    { id: "onkron-arm", brand: "ONKRON", mechanism: "full-motion" },
    { id: "onkron-tilt", brand: "ONKRON", mechanism: "tilt" },
    { id: "other-arm", brand: "KROMAX", mechanism: "full-motion" },
    { id: "other-fixed", brand: "Holder", mechanism: "fixed" },
  ],
};

test("commercial SEO page receives the complete verified mount catalog", () => {
  const result = getCatalogItems({ id: "buy-tv-mount", kind: "commercial" }, catalog);
  assert.equal(result.type, "mounts");
  assert.deepEqual(result.values.map((item) => item.id), catalog.mounts.map((item) => item.id));
});

test("extendable SEO page receives only full-motion mounts", () => {
  const result = getCatalogItems({ id: "extendable-mount", kind: "mechanism" }, catalog);
  assert.deepEqual(result.values.map((item) => item.id), ["onkron-arm", "other-arm"]);
});

test("mount brand SEO page never mixes another brand", () => {
  const result = getCatalogItems({ id: "mount-brand-onkron", kind: "mount-brand" }, catalog);
  assert.deepEqual(result.values.map((item) => item.id), ["onkron-arm", "onkron-tilt"]);
});
