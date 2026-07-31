#!/usr/bin/env node

import { resolve } from "node:path";
import { readJson } from "./lib.mjs";
import {
  validateModelPlacementManifest,
  validateModelPrivateSnapshot,
  validateModelPublicSnapshot,
} from "./model-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const kind = valueAfter(args, "--kind") ?? "manifest";
const defaultInput = {
  manifest: "data/affiliate/model-page-placements.json",
  private: ".private/market-affiliate-model-snapshot.json",
  public: "data/affiliate/public-model-offers.json",
}[kind];
if (!defaultInput) throw new Error("--kind must be manifest, private or public");

const inputFile = resolve(args.find((arg) => !arg.startsWith("--") && arg !== kind) ?? defaultInput);
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/model-page-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const modelsFile = resolve(valueAfter(args, "--models") ?? "data/tv_models.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");

const [input, manifest, source, models, catalogMounts] = await Promise.all([
  readJson(inputFile),
  kind === "manifest" && inputFile === manifestFile ? Promise.resolve(null) : readJson(manifestFile),
  readJson(sourceFile),
  readJson(modelsFile),
  readJson(mountsFile),
]);
const options = {
  manifest: manifest ?? input,
  source,
  models,
  catalogMounts,
};

if (kind === "manifest") validateModelPlacementManifest(input, options);
if (kind === "private") validateModelPrivateSnapshot(input, options);
if (kind === "public") validateModelPublicSnapshot(input, options);

console.log(`Модельные размещения (${kind}) прошли строгую проверку: ${inputFile}`);
