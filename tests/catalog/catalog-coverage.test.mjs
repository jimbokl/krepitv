import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  CatalogCoverageError,
  validateCoverageManifest,
} from "../../scripts/catalog/coverage-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [manifest, models] = await Promise.all(
  ["data/catalog-coverage.json", "data/tv_models.json"].map(async (relative) =>
    JSON.parse(await readFile(path.join(root, relative), "utf8")),
  ),
);

function copy(value) {
  return structuredClone(value);
}

test("current manifest reports the real growing catalog and blocks a premature full claim", () => {
  const result = validateCoverageManifest(manifest, models);

  assert.equal(result.catalog_status, "growing");
  assert.equal(result.full_catalog_claim, false);
  assert.equal(result.full_catalog_ready, false);
  assert.equal(result.actual.verified_models, 53);
  assert.deepEqual(result.actual.brands, ["Hisense", "LG", "Samsung", "TCL", "Xiaomi"]);
  assert.equal(result.actual.series.length, 31);
  assert.deepEqual(result.actual.diagonals_inches, [32, 42, 43, 50, 55, 65, 75]);
  assert.deepEqual(result.actual.model_years, [2024, 2025, 2026]);
  assert.equal(result.target.demand_status, "measured");
  assert.equal(result.target.models, 50);
  assert.equal(result.target.covered_models, 45);
  assert.equal(result.target.coverage_percent, 90);
  assert.ok(result.blockers.some((blocker) => blocker.includes("target coverage 90.0%/100%")));
  assert.ok(result.blockers.some((blocker) => blocker.includes("TCL 55P6K")));
});

test("the growing catalog cannot be relabelled as complete", () => {
  const candidate = copy(manifest);
  candidate.catalog_status = "complete";
  candidate.full_catalog_claim = true;

  assert.throws(
    () => validateCoverageManifest(candidate, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some(
        (issue) => issue.includes("full_catalog_claim") && issue.includes("target coverage 90.0%/100%"),
      ),
  );
});

test("the completion threshold cannot be lowered to make a demo pass", () => {
  const candidate = copy(manifest);
  candidate.completion_gate.minimum_verified_models = 2;
  candidate.completion_gate.minimum_brands = 2;
  candidate.completion_gate.minimum_series = 2;
  candidate.completion_gate.minimum_target_models = 0;

  assert.throws(
    () => validateCoverageManifest(candidate, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.filter((issue) => issue.includes("non-demo floor")).length === 4,
  );
});

test("every catalog model must have sourced series, diagonal and year dimensions", () => {
  const missing = copy(manifest);
  const removed = missing.catalog_models.pop();
  assert.throws(
    () => validateCoverageManifest(missing, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some((issue) => issue.includes(`missing coverage dimensions for ${removed.model_id}`)),
  );

  const mismatch = copy(manifest);
  mismatch.catalog_models[0].diagonal_inches = 65;
  assert.throws(
    () => validateCoverageManifest(mismatch, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some((issue) => issue.includes("must equal catalog diagonal 55")),
  );
});

test("unmeasured demand cannot contain an unsourced target list", () => {
  const candidate = copy(manifest);
  candidate.demand_snapshot = {
    status: "not-measured",
    source_url: null,
    source_label: null,
    checked_at: null,
    target_models: [
      {
        model_id: "invented-model",
        catalog_verified: true,
        brand: "Brand",
        model: "Model",
        series: "Series",
        diagonal_inches: 55,
        model_year: 2026,
        monthly_exact_searches: 100,
        demand_rank: 1,
        model_source_url: "https://example.com/model",
        model_source_label: "Invalid test target",
        model_checked_at: "2026-07-30",
        operator_query: "\"[Model]\"",
      },
    ],
  };

  assert.throws(
    () => validateCoverageManifest(candidate, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some((issue) => issue.includes("must be empty until demand is measured")),
  );
});

test("a measured target is ranked and bound to the exact catalog identity", () => {
  const candidate = copy(manifest);
  candidate.demand_snapshot = {
    status: "measured",
    source_url: "https://yandex.ru/support2/wordstat/ru/",
    source_label: "Test-only demand snapshot",
    checked_at: "2026-07-30",
    batch_sha256: "a".repeat(64),
    region_id: 225,
    period: "последние 30 дней",
    devices: "все устройства",
    selection_rule: "top-positive-exact-demand",
    candidate_pool_size: 1,
    target_limit: 50,
    target_models: [
      {
        model_id: "samsung-qe55q70dauxru",
        catalog_verified: true,
        brand: "Samsung",
        model: "QE55Q70DAUXRU",
        series: "Wrong series",
        diagonal_inches: 55,
        model_year: 2024,
        monthly_exact_searches: 100,
        demand_rank: 1,
        model_source_url:
          "https://www.samsung.com/ru/tvs/qled-tv/q70d-55-inch-qled-4k-tizen-os-smart-tv-qe55q70dauxru/",
        model_source_label: "Test-only official model source",
        model_checked_at: "2026-07-30",
        operator_query: "\"[QE55Q70DAUXRU]\"",
      },
    ],
  };

  assert.throws(
    () => validateCoverageManifest(candidate, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some((issue) => issue.includes("must match the exact catalog brand")),
  );

  candidate.demand_snapshot.target_models[0].series = "Q70D";
  candidate.demand_snapshot.target_models[0].demand_rank = 2;
  assert.throws(
    () => validateCoverageManifest(candidate, models),
    (error) =>
      error instanceof CatalogCoverageError &&
      error.issues.some((issue) => issue.includes("demand ranks must be contiguous from 1")),
  );
});
