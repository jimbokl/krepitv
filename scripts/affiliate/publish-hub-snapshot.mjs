#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./lib.mjs";
import {
  buildHubPublicSnapshot,
  validateHubPlacementManifest,
} from "./hub-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const auditedPublicFile = path.join(root, "data/affiliate/public-hub-offers.json");
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/seo-hub-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const seoPagesFile = resolve(valueAfter(args, "--seo-pages") ?? "data/seo_pages.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");
const inputFile = resolve(
  valueAfter(args, "--input") ?? ".private/market-affiliate-hub-snapshot.json",
);
const outputFile = resolve(valueAfter(args, "--out") ?? auditedPublicFile);

if (inputFile !== privateRoot && !inputFile.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Validated hub snapshots may be read only from .private/");
}
if (outputFile !== auditedPublicFile) {
  throw new Error("Public hub placement snapshot has one audited destination");
}

const [manifest, source, seoPages, catalogMounts, privateSnapshot] = await Promise.all([
  readJson(manifestFile),
  readJson(sourceFile),
  readJson(seoPagesFile),
  readJson(mountsFile),
  readJson(inputFile),
]);
validateHubPlacementManifest(manifest, {
  source,
  seoPages,
  catalogMounts,
});
const snapshot = buildHubPublicSnapshot(privateSnapshot, { manifest, source });
await writeJson(outputFile, snapshot);
console.log(
  `Опубликовано размещений SEO-хабов: ${snapshot.placements.length}; приватные числа удалены.`,
);
