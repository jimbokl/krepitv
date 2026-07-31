#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./lib.mjs";
import {
  buildModelPublicSnapshot,
  validateModelPlacementManifest,
} from "./model-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const auditedPublicFile = path.join(root, "data/affiliate/public-model-offers.json");
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/model-page-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const modelsFile = resolve(valueAfter(args, "--models") ?? "data/tv_models.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");
const inputFile = resolve(
  valueAfter(args, "--input") ?? ".private/market-affiliate-model-snapshot.json",
);
const outputFile = resolve(valueAfter(args, "--out") ?? auditedPublicFile);

if (inputFile !== privateRoot && !inputFile.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Validated model snapshots may be read only from .private/");
}
if (outputFile !== auditedPublicFile) {
  throw new Error("Public model placement snapshot has one audited destination");
}

const [manifest, source, models, catalogMounts, privateSnapshot] = await Promise.all([
  readJson(manifestFile),
  readJson(sourceFile),
  readJson(modelsFile),
  readJson(mountsFile),
  readJson(inputFile),
]);
validateModelPlacementManifest(manifest, {
  source,
  models,
  catalogMounts,
});
const snapshot = buildModelPublicSnapshot(privateSnapshot, {
  manifest,
  source,
  models,
  catalogMounts,
});
await writeJson(outputFile, snapshot);
console.log(
  `Опубликовано размещений модельных страниц: ${snapshot.placements.length}; приватные числа удалены.`,
);
