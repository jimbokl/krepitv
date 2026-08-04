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
const operationalModel = (row) => ({
  ...Object.fromEntries(operationalFields.map((field) => [field, row[field]])),
  ...(row.wall_mount_screws ? { wall_mount_screws: row.wall_mount_screws } : {}),
});

test("verified source register is the exact operational catalog source", () => {
  assert.equal(register.length, 85);
  assert.equal(new Set(register.map((row) => row.id)).size, register.length);
  assert.equal(new Set(register.map((row) => row.model)).size, register.length);
  assert.deepEqual(
    catalog,
    register.map(operationalModel),
  );
  assert.ok(register.every((row) => row.source_fact?.trim()));
  for (const id of [
    "tcl-55p6k",
    "tcl-55p7k",
    "tcl-43s5k",
    "hisense-65u7q",
    "hisense-55u8q",
    "tcl-32a400-pro",
    "tcl-55c755",
    "tcl-55c745",
    "hisense-75u7q",
    "tcl-55c765",
    "lg-oled55b5rla",
    "lg-65qned80a6a",
    "samsung-qe77s85faexru",
  ]) {
    assert.ok(register.some((row) => row.id === id), `missing demand-backed model ${id}`);
  }
});

test("verified mount register excludes unresolved identities and drives the catalog", () => {
  assert.equal(mountRegister.length, 23);
  assert.equal(new Set(mountRegister.map((row) => row.id)).size, mountRegister.length);
  assert.equal(new Set(mountRegister.map((row) => row.source_url)).size, mountRegister.length);
  assert.deepEqual(
    mounts,
    mountRegister.map((row) => Object.fromEntries(mountOperationalFields.map((field) => [field, row[field]]))),
  );
  assert.ok(mountRegister.every((row) => row.source_fact?.trim()));
  assert.ok(!mountRegister.some((row) => ["ONKRON M4", "ONKRON NP40", "Holder LCDS-5003"].includes(row.title)));
});

test("revenue-weighted mount wave preserves exact verified SKUs and specifications", () => {
  const byId = new Map(mountRegister.map((row) => [row.id, row]));
  const expected = {
    "onkron-tm5-bw": {
      model: "TM5-BW",
      mechanism: "tilt",
      diagonal: [32, 70],
      load: 60,
      distance: [35, 145],
      vesa: ["75x75", "100x100", "100x200", "200x100", "200x200", "200x300", "200x400", "300x100", "300x200", "300x300", "300x400", "400x200", "400x300", "400x400"],
    },
    "itech-slt-440": {
      model: "SLT-440",
      mechanism: "full-motion",
      diagonal: [32, 70],
      load: 40,
      distance: [67, 355],
      vesa: ["100x100", "100x150", "150x100", "100x200", "200x100", "150x150", "200x200", "200x300", "300x200", "200x400", "400x200", "300x300", "300x400", "400x400"],
    },
    "itech-ptrb440ln": {
      model: "PTRB440LN",
      mechanism: "full-motion",
      diagonal: [32, 55],
      load: 40,
      distance: [53, 464],
      vesa: ["75x75", "100x100", "100x150", "150x100", "100x200", "200x100", "150x150", "200x200", "200x300", "300x200", "200x400", "400x200", "300x300", "300x400", "400x400"],
    },
    "itech-plb440nt": {
      model: "PLB440NT",
      mechanism: "tilt",
      diagonal: [32, 75],
      load: 45,
      distance: [53, 53],
      vesa: ["200x200", "200x300", "300x200", "200x400", "400x200", "300x300", "300x400", "400x300", "400x400"],
    },
    "itech-plb640nt": {
      model: "PLB640NT",
      mechanism: "tilt",
      diagonal: [37, 86],
      load: 45,
      distance: [53, 53],
      vesa: ["200x200", "200x300", "200x400", "300x200", "300x300", "300x400", "400x200", "400x300", "400x400", "500x300", "500x400", "600x200", "600x300", "600x400"],
    },
    "onkron-nn24": {
      model: "NN24",
      mechanism: "fixed",
      diagonal: [32, 65],
      load: 50,
      distance: [30, 30],
      vesa: ["75x75", "100x100", "100x200", "200x100", "200x200", "200x300", "200x400", "300x100", "300x200", "300x300", "300x400", "400x200", "400x300", "400x400"],
    },
  };

  for (const [id, spec] of Object.entries(expected)) {
    const mount = byId.get(id);
    assert.ok(mount, `missing verified mount ${id}`);
    assert.equal(mount.model, spec.model);
    assert.equal(mount.mechanism, spec.mechanism);
    assert.deepEqual([mount.min_diagonal_in, mount.max_diagonal_in], spec.diagonal);
    assert.equal(mount.max_load_kg, spec.load);
    assert.deepEqual([mount.wall_distance_min_mm, mount.wall_distance_max_mm], spec.distance);
    assert.deepEqual(mount.vesa, spec.vesa);
  }

  assert.ok(!mountRegister.some((row) => ["TM5-W", "TM5-B"].includes(row.model)));
});

test("measured exact demand is preserved without inflating zero-frequency SKU", () => {
  assert.equal(demand.models.length, 89);
  const positive = demand.models.filter((row) => row.seo_frequency > 0);
  const zero = demand.models.filter((row) => row.seo_frequency === 0);
  assert.equal(positive.length, 81);
  assert.equal(zero.length, 8);
  assert.ok(zero.every((row) => row.brand === "Яндекс"));

  const identity = (row) => `${row.brand}\u0000${row.model}`;
  const registerByIdentity = new Map(register.map((row) => [identity(row), row]));
  const topDemand = [...positive]
    .sort(
      (left, right) =>
        right.seo_frequency - left.seo_frequency ||
        left.brand.localeCompare(right.brand, "ru") ||
        left.model.localeCompare(right.model, "ru"),
    )
    .slice(0, 50);

  assert.equal(coverage.demand_snapshot.target_models.length, 50);
  assert.deepEqual(
    coverage.demand_snapshot.target_models.map((row) => row.monthly_exact_searches),
    topDemand.map((row) => row.seo_frequency),
  );
  assert.deepEqual(
    coverage.demand_snapshot.target_models.map(({ brand, model }) => ({ brand, model })),
    topDemand.map(({ brand, model }) => ({ brand, model })),
  );
  for (const target of coverage.demand_snapshot.target_models) {
    const verified = registerByIdentity.get(identity(target));
    assert.equal(target.catalog_verified, Boolean(verified));
    assert.equal(target.model_id, verified?.id ?? null);
  }
  assert.equal(
    coverage.demand_snapshot.target_models.filter((row) => row.catalog_verified).length,
    50,
  );
  assert.ok(coverage.demand_snapshot.target_models.every((row) => row.monthly_exact_searches > 0));
});
