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

const demandByModel = new Map(demand.models.map((row) => [row.model, row]));
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

const rankedDemand = register
  .map((row) => ({ row, demand: demandByModel.get(row.model) }))
  .filter(({ demand: demandRow }) => Number.isInteger(demandRow?.seo_frequency) && demandRow.seo_frequency > 0)
  .sort(
    (left, right) =>
      right.demand.seo_frequency - left.demand.seo_frequency ||
      left.row.model.localeCompare(right.row.model, "ru"),
  );

const nextCoverage = {
  ...coverage,
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
    target_models: rankedDemand.map(({ row, demand: demandRow }, index) => ({
      model_id: row.id,
      brand: row.brand,
      model: row.model,
      series: row.series,
      diagonal_inches: row.diagonal_inches,
      model_year: row.model_year,
      monthly_exact_searches: demandRow.seo_frequency,
      demand_rank: index + 1,
      model_source_url: row.source_url,
      model_source_label: row.source_label,
      model_checked_at: row.checked_at,
      operator_query: demandRow.operator_query,
    })),
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
  `Synced ${catalog.length} verified TVs; ${rankedDemand.length} demand-ranked exact models.\n`,
);
