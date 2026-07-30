#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function inputPaths() {
  const marker = process.argv.indexOf("--inputs");
  if (marker === -1) throw new Error("Usage: --inputs <manifest...> [--output <path>]");
  const values = [];
  for (let index = marker + 1; index < process.argv.length; index += 1) {
    if (process.argv[index].startsWith("--")) break;
    values.push(path.resolve(ROOT, process.argv[index]));
  }
  if (!values.length) throw new Error("At least one demand manifest is required");
  return values;
}

function identity(row) {
  return `${row.brand}\u0000${row.model}`;
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

function stableContract(contract) {
  return JSON.stringify(stableValue(contract));
}

const inputs = inputPaths();
const output = path.resolve(ROOT, argument("--output", "data/research/tv-model-demand.json"));
if (inputs.includes(output)) {
  throw new Error("Output must not overwrite one of the source batch manifests");
}
const manifests = await Promise.all(inputs.map(async (file) => ({
  file,
  value: JSON.parse(await readFile(file, "utf8")),
})));
const referenceContract = stableContract(manifests[0].value.research_contract);
const rows = new Map();

for (const { file, value } of manifests) {
  if (value.schema_version !== 1 || !Array.isArray(value.models)) {
    throw new Error(`Invalid demand manifest: ${file}`);
  }
  if (stableContract(value.research_contract) !== referenceContract) {
    throw new Error(`Demand contract mismatch: ${file}`);
  }
  for (const row of value.models) {
    const key = identity(row);
    const previous = rows.get(key);
    if (previous && previous.seo_frequency !== row.seo_frequency) {
      throw new Error(`Frequency conflict for ${row.brand} ${row.model}`);
    }
    rows.set(key, row);
  }
}

const models = [...rows.values()].sort(
  (left, right) =>
    right.seo_frequency - left.seo_frequency ||
    left.brand.localeCompare(right.brand, "ru") ||
    left.model.localeCompare(right.model, "ru"),
);
const observedAt = manifests
  .map(({ value }) => value.observed_at)
  .sort()
  .at(-1);
const sourceBatches = manifests.map(({ file, value }) => ({
  file: path.relative(ROOT, file),
  batch_sha256: value.batch_sha256,
  observed_at: value.observed_at,
  rows: value.models.length,
}));
const batchSha256 = createHash("sha256")
  .update(JSON.stringify(sourceBatches))
  .update(JSON.stringify(models.map((row) => [row.brand, row.model, row.seo_frequency])))
  .digest("hex");
const merged = {
  schema_version: 1,
  research_contract: manifests[0].value.research_contract,
  observed_at: observedAt,
  batch_sha256: batchSha256,
  source_batches: sourceBatches,
  models,
};

await writeFile(output, `${JSON.stringify(merged, null, 2)}\n`);
process.stdout.write(
  `Merged ${manifests.length} batches into ${models.length} exact-model rows; ${output}\n`,
);
