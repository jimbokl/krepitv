#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./lib.mjs";
import { buildModelPrivateSnapshot } from "./model-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/model-page-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const modelsFile = resolve(valueAfter(args, "--models") ?? "data/tv_models.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");
const batchFile = resolve(
  valueAfter(args, "--batch") ?? ".private/market-affiliate-model-batch.json",
);
const outFile = resolve(
  valueAfter(args, "--out") ?? ".private/market-affiliate-model-snapshot.json",
);

for (const [label, file] of [["batch", batchFile], ["snapshot", outFile]]) {
  if (file !== privateRoot && !file.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error(`Model placement ${label} must stay under .private/`);
  }
}

const [manifest, source, models, catalogMounts, batch] = await Promise.all([
  readJson(manifestFile),
  readJson(sourceFile),
  readJson(modelsFile),
  readJson(mountsFile),
  readJson(batchFile),
]);
const snapshot = buildModelPrivateSnapshot({
  manifest,
  source,
  models,
  catalogMounts,
  batch,
});
await writeJson(outFile, snapshot);
console.log(
  `Собрано решений модельных размещений: ${snapshot.placements.length} -> ${outFile}`,
);
