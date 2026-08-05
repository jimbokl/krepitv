#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registerPath = path.join(ROOT, "data/research/verified-tv-models.json");
const marketResearchPath = path.join(ROOT, "data/research/yandex-market-tv-models.json");
const marketManifestPath = path.join(ROOT, "data/market_tv_models.json");
const batchPaths = [
  "data/research/market-observed-verification-batch-a-2026-08-05.json",
  "data/research/market-observed-verification-batch-b-2026-08-05.json",
  "data/research/market-observed-verification-batch-c-2026-08-05.json",
].map((relative) => path.join(ROOT, relative));

const EXPECTED_PROMOTIONS = new Set([
  "bbk-32lem-1045-ts2c",
  "bbk-32lem-1075-ts2c",
  "bbk-32lex-7235-fts2c",
  "bbk-32lex-7244-ts2c",
  "bbk-40lem-1030-fts2c",
  "bbk-43lex-7247-fts2c",
  "hi-hx-24h01fb",
  "hi-hx-43f01fb",
  "xiaomi-tv-a-pro-32-2026",
  "hisense-50e77sl-pro",
  "tuvio-td50ufbhh11",
  "candy-uno-43-uhd",
  "skyline-43lst6575",
  "candy-uno-32",
]);

const readJson = async (file) => JSON.parse(await readFile(file, "utf8"));
const [register, marketResearch, marketManifest, ...batches] = await Promise.all([
  readJson(registerPath),
  readJson(marketResearchPath),
  readJson(marketManifestPath),
  ...batchPaths.map(readJson),
]);

const rawRecords = batches.flatMap((batch) => Array.isArray(batch) ? batch : batch.records);
const verified = rawRecords.filter((record) => record.status === "verified");
const verifiedIds = new Set(verified.map((record) => record.id));
if (verified.length !== EXPECTED_PROMOTIONS.size
  || verifiedIds.size !== EXPECTED_PROMOTIONS.size
  || [...EXPECTED_PROMOTIONS].some((id) => !verifiedIds.has(id))) {
  throw new Error("Набор подтверждённых Market-моделей изменился: требуется ручная проверка контракта");
}

const requiredFields = [
  "id", "brand", "model", "title", "series", "model_year", "diagonal_inches",
  "weight_kg", "weight_basis", "width_mm", "height_mm", "depth_mm",
  "vesa_width_mm", "vesa_height_mm", "source_url", "source_label", "source_fact",
  "checked_at",
];
for (const record of verified) {
  for (const field of requiredFields) {
    if (record[field] === undefined) throw new Error(`${record.id}: отсутствует ${field}`);
  }
  if (!/^https:\/\//u.test(record.source_url)) throw new Error(`${record.id}: источник должен быть HTTPS`);
  if (!(record.diagonal_inches > 0 && record.weight_kg > 0
    && record.width_mm > 0 && record.height_mm > 0 && record.depth_mm > 0
    && record.vesa_width_mm > 0 && record.vesa_height_mm > 0)) {
    throw new Error(`${record.id}: паспортные поля должны быть положительными`);
  }
  if (!["without_stand", "with_stand", "published_unspecified"].includes(record.weight_basis)) {
    throw new Error(`${record.id}: некорректная база массы`);
  }
}

const operationalRecord = (record) => ({
  id: record.id,
  brand: record.brand,
  model: record.model,
  title: record.title,
  series: record.series,
  model_year: record.model_year,
  diagonal_inches: record.diagonal_inches,
  weight_kg: record.weight_kg,
  ...(record.weight_basis === "without_stand" ? {} : { weight_basis: record.weight_basis }),
  width_mm: record.width_mm,
  height_mm: record.height_mm,
  depth_mm: record.depth_mm,
  vesa_width_mm: record.vesa_width_mm,
  vesa_height_mm: record.vesa_height_mm,
  ...(record.wall_mount_screws ? { wall_mount_screws: record.wall_mount_screws } : {}),
  source_url: record.source_url,
  source_label: record.source_label,
  source_fact: record.source_fact,
  checked_at: record.checked_at,
  ...(record.source_region ? { source_region: record.source_region } : {}),
  ...(record.limitations?.length ? { limitations: record.limitations } : {}),
  ...(record.sources?.length ? { sources: record.sources } : {}),
});

const promoted = verified.map(operationalRecord);
const promotedById = new Map(promoted.map((record) => [record.id, record]));
const existingIds = new Set(register.map((record) => record.id));
const nextRegister = register
  .map((record) => promotedById.get(record.id) ?? record)
  .concat(promoted.filter((record) => !existingIds.has(record.id)));

const duplicateIds = nextRegister.map((record) => record.id)
  .filter((id, index, all) => all.indexOf(id) !== index);
const duplicateModels = nextRegister.map((record) => `${record.brand}\u0000${record.model}`)
  .filter((identity, index, all) => all.indexOf(identity) !== index);
if (duplicateIds.length || duplicateModels.length) {
  throw new Error(`После продвижения появились дубли: ids=${duplicateIds.join(",")}; models=${duplicateModels.join(",")}`);
}

const manifestRecords = marketManifest.records;
const relatedProductIds = new Map();
for (const source of verified) {
  const identityHints = new Set([
    source.observed_id,
    ...(source.observed_ids ?? []),
  ].filter(Boolean));
  const productIds = new Set();
  if (source.market_product_id) productIds.add(String(source.market_product_id));
  for (const product of marketResearch.products) {
    if (product.catalog_model_id === source.id) productIds.add(String(product.market_product_id));
  }
  for (const record of manifestRecords) {
    if (identityHints.has(record.id) || identityHints.has(record.canonical_id)) {
      productIds.add(String(record.record_id));
    }
  }
  if (!productIds.size) throw new Error(`${source.id}: не найдена исходная карточка Маркета`);
  relatedProductIds.set(source.id, productIds);
}

const modelByProductId = new Map();
for (const source of verified) {
  for (const productId of relatedProductIds.get(source.id)) {
    if (modelByProductId.has(productId)) throw new Error(`Карточка ${productId} связана с двумя моделями`);
    modelByProductId.set(productId, source);
  }
}
const nextProducts = marketResearch.products.map((product) => {
  const source = modelByProductId.get(String(product.market_product_id));
  if (!source) return product;
  return {
    ...product,
    already_in_catalog: true,
    catalog_model_id: source.id,
    catalog_brand: source.brand,
    catalog_model: source.model,
    match_type: "verified-exact-market-observation",
  };
});
const promotedObservationCount = nextProducts.filter(
  (product) => modelByProductId.has(String(product.market_product_id))
    && product.catalog_model_id === modelByProductId.get(String(product.market_product_id)).id,
).length;
const expectedObservationCount = new Set([...modelByProductId.keys()]).size;
if (promotedObservationCount !== expectedObservationCount) {
  throw new Error(`Продвинуто ${promotedObservationCount}/${expectedObservationCount} наблюдений Маркета`);
}

await Promise.all([
  writeFile(registerPath, `${JSON.stringify(nextRegister, null, 2)}\n`),
  writeFile(marketResearchPath, `${JSON.stringify({ ...marketResearch, products: nextProducts }, null, 2)}\n`),
]);

process.stdout.write(
  `Продвинуто ${promoted.length} точных моделей и ${promotedObservationCount} наблюдений Маркета.\n`,
);
