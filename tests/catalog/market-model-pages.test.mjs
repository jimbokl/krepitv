import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMarketModelPages,
  extractDiagonal,
  slugifyMarketModel,
  validateMarketModelPages,
} from "../../scripts/catalog/market-model-page-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

test("diagonal extraction ignores model years and uses explicit screen size", () => {
  assert.equal(extractDiagonal({ market_title: "Телевизор Xiaomi TV A Pro 55 2026, 4K" }), 55);
  assert.equal(extractDiagonal({ market_title: "Телевизор Haier 40 Smart TV D1 Full HD" }), 40);
});

test("route slug is deterministic for Cyrillic and punctuation", () => {
  assert.equal(slugifyMarketModel("Витязь D24HN01BF"), "vityaz-d24hn01bf");
  assert.equal(slugifyMarketModel("BBK 24LEM-1047/TS2C"), "bbk-24lem-1047-ts2c");
});

test("real Market snapshot resolves all observations without unverified compatibility facts", async () => {
  const [research, verifiedModels, committed] = await Promise.all([
    readFile(path.join(ROOT, "data/research/yandex-market-tv-models.json"), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, "data/tv_models.json"), "utf8").then(JSON.parse),
    readFile(path.join(ROOT, "data/market_tv_models.json"), "utf8").then(JSON.parse),
  ]);
  const generated = buildMarketModelPages(research, verifiedModels);
  assert.deepEqual(committed, generated);
  assert.equal(generated.records.length, 133);
  assert.equal(generated.summary.verified_routes, 22);
  assert.ok(generated.summary.observed_canonicals >= 104);
  assert.ok(generated.summary.alias_routes >= 5);
  assert.equal(generated.summary.indexable_observed_canonicals, 0);
  assert.equal(validateMarketModelPages(generated, verifiedModels), true);
  const duplicatedVerifiedModel = generated.records.filter(
    (record) => record.market_product_id === "1388541761" || record.market_product_id === "4939838850",
  );
  assert.deepEqual(
    duplicatedVerifiedModel.map((record) => record.page_kind).sort(),
    ["alias", "verified"],
  );
  assert.equal(
    duplicatedVerifiedModel.every(
      (record) => record.canonical_path === "/modeli/sber-sdx-32h3114/",
    ),
    true,
  );
  assert.equal(new Set(duplicatedVerifiedModel.map((record) => record.route_path)).size, 2);
  assert.ok(generated.records.every((record) => !Object.hasOwn(record, "weight_kg")));
  assert.ok(generated.records.every((record) => !Object.hasOwn(record, "vesa_width_mm")));
  assert.ok(generated.records.filter((record) => record.page_kind === "alias").every((record) => !record.indexable));
  assert.ok(generated.records.filter((record) => record.page_kind === "observed").every((record) => !record.indexable));
});
