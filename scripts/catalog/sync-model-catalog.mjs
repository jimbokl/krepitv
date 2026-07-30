#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registerPath = path.join(root, "data/research/verified-tv-models.json");
const demandPath = path.join(root, "data/research/tv-model-demand.json");
const catalogPath = path.join(root, "data/tv_models.json");
const coveragePath = path.join(root, "data/catalog-coverage.json");

const [register, demand, coverage] = await Promise.all(
  [registerPath, demandPath, coveragePath].map(async (file) =>
    JSON.parse(await readFile(file, "utf8")),
  ),
);

const demandIdentity = (row) => `${row.brand}\u0000${row.model}`;
const demandByIdentity = new Map(demand.models.map((row) => [demandIdentity(row), row]));
const seenIds = new Set();
const seenModels = new Set();
for (const row of register) {
  if (seenIds.has(row.id)) throw new Error(`Duplicate TV id: ${row.id}`);
  if (seenModels.has(row.model)) throw new Error(`Duplicate exact TV model: ${row.model}`);
  seenIds.add(row.id);
  seenModels.add(row.model);
}

const catalog = register.map((row) => ({
  id: row.id,
  brand: row.brand,
  model: row.model,
  title: row.title,
  series: row.series,
  model_year: row.model_year,
  diagonal_inches: row.diagonal_inches,
  weight_kg: row.weight_kg,
  width_mm: row.width_mm,
  height_mm: row.height_mm,
  depth_mm: row.depth_mm,
  vesa_width_mm: row.vesa_width_mm,
  vesa_height_mm: row.vesa_height_mm,
  source_url: row.source_url,
  source_label: row.source_label,
  checked_at: row.checked_at,
}));

const registerByIdentity = new Map(register.map((row) => [demandIdentity(row), row]));
const rankedDemand = demand.models
  .filter((row) => Number.isInteger(row.seo_frequency) && row.seo_frequency > 0)
  .sort(
    (left, right) =>
      right.seo_frequency - left.seo_frequency ||
      left.brand.localeCompare(right.brand, "ru") ||
      left.model.localeCompare(right.model, "ru"),
  )
  .slice(0, coverage.completion_gate.minimum_target_models);

for (const row of register) {
  const demandRow = demandByIdentity.get(demandIdentity(row));
  if (demandRow && demandRow.diagonal_inches !== row.diagonal_inches) {
    throw new Error(`Demand identity mismatch for ${row.brand} ${row.model}`);
  }
}

const nextCoverage = {
  ...coverage,
  schema_version: 2,
  catalog_status: "growing",
  full_catalog_claim: false,
  updated_at: demand.observed_at.slice(0, 10),
  demand_snapshot: {
    status: "measured",
    source_url: demand.research_contract.source_url,
    source_label: demand.research_contract.source_label,
    checked_at: demand.observed_at.slice(0, 10),
    batch_sha256: demand.batch_sha256,
    region_id: demand.research_contract.region_id,
    period: demand.research_contract.period,
    devices: demand.research_contract.devices,
    selection_rule: "top-positive-exact-demand",
    candidate_pool_size: demand.models.filter((row) => row.seo_frequency > 0).length,
    target_limit: coverage.completion_gate.minimum_target_models,
    target_models: rankedDemand.map((demandRow, index) => {
      const row = registerByIdentity.get(demandIdentity(demandRow));
      return {
        model_id: row?.id ?? null,
        catalog_verified: Boolean(row),
        brand: demandRow.brand,
        model: demandRow.model,
        series: row?.series ?? demandRow.series,
        diagonal_inches: demandRow.diagonal_inches,
        model_year: row?.model_year ?? null,
        monthly_exact_searches: demandRow.seo_frequency,
        demand_rank: index + 1,
        model_source_url: row?.source_url ?? null,
        model_source_label: row?.source_label ?? null,
        model_checked_at: row?.checked_at ?? null,
        operator_query: demandRow.operator_query,
      };
    }),
  },
  catalog_models: register.map((row) => ({
    model_id: row.id,
    brand: row.brand,
    series: row.series,
    diagonal_inches: row.diagonal_inches,
    model_year: row.model_year,
    catalog_source_url: row.source_url,
    dimension_source_url: row.source_url,
    dimension_source_label: row.source_label,
    checked_at: row.checked_at,
  })),
};

await Promise.all([
  writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`),
  writeFile(coveragePath, `${JSON.stringify(nextCoverage, null, 2)}\n`),
]);

process.stdout.write(
  `Synced ${catalog.length} verified TVs; ${rankedDemand.filter((row) => registerByIdentity.has(demandIdentity(row))).length}/${rankedDemand.length} top demand targets covered.\n`,
);
