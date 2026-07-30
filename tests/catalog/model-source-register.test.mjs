import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(root, relative), "utf8"));
const [register, catalog, mountRegister, mounts, coverage, demand] = await Promise.all([
  readJson("data/research/verified-tv-models.json"),
  readJson("data/tv_models.json"),
  readJson("data/research/verified-mounts.json"),
  readJson("data/mounts.json"),
  readJson("data/catalog-coverage.json"),
  readJson("data/research/tv-model-demand.json"),
]);

const operationalFields = [
  "id", "brand", "model", "title", "series", "model_year", "diagonal_inches",
  "weight_kg", "width_mm", "height_mm", "depth_mm", "vesa_width_mm",
  "vesa_height_mm", "source_url", "source_label", "checked_at",
];
const mountOperationalFields = [
  "id", "brand", "model", "title", "mechanism", "min_diagonal_in", "max_diagonal_in",
  "max_load_kg", "vesa", "wall_distance_min_mm", "wall_distance_max_mm", "source_url",
  "source_label", "checked_at",
];

test("verified source register is the exact operational catalog source", () => {
  assert.equal(register.length, 34);
  assert.equal(new Set(register.map((row) => row.id)).size, register.length);
  assert.equal(new Set(register.map((row) => row.model)).size, register.length);
  assert.deepEqual(
    catalog,
    register.map((row) => Object.fromEntries(operationalFields.map((field) => [field, row[field]]))),
  );
  assert.ok(register.every((row) => row.source_fact?.trim()));
});

test("verified mount register excludes unresolved identities and drives the catalog", () => {
  assert.equal(mountRegister.length, 17);
  assert.equal(new Set(mountRegister.map((row) => row.id)).size, mountRegister.length);
  assert.equal(new Set(mountRegister.map((row) => row.source_url)).size, mountRegister.length);
  assert.deepEqual(
    mounts,
    mountRegister.map((row) => Object.fromEntries(mountOperationalFields.map((field) => [field, row[field]]))),
  );
  assert.ok(mountRegister.every((row) => row.source_fact?.trim()));
  assert.ok(!mountRegister.some((row) => ["ONKRON M4", "ONKRON NP40", "Holder LCDS-5003"].includes(row.title)));
});

test("measured exact demand is preserved without inflating zero-frequency SKU", () => {
  assert.equal(demand.models.length, 40);
  const positive = demand.models.filter((row) => row.seo_frequency > 0);
  const zero = demand.models.filter((row) => row.seo_frequency === 0);
  assert.equal(positive.length, 32);
  assert.equal(zero.length, 8);
  assert.ok(zero.every((row) => row.brand === "Яндекс"));

  assert.equal(coverage.demand_snapshot.target_models.length, positive.length);
  assert.deepEqual(
    coverage.demand_snapshot.target_models.map((row) => row.monthly_exact_searches),
    [...positive].sort((left, right) => right.seo_frequency - left.seo_frequency || left.model.localeCompare(right.model, "ru")).map((row) => row.seo_frequency),
  );
  assert.ok(coverage.demand_snapshot.target_models.every((row) => row.monthly_exact_searches > 0));
});
