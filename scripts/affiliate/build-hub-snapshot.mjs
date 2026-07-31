#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "./lib.mjs";
import { buildHubPrivateSnapshot } from "./hub-placements.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const manifestFile = resolve(
  valueAfter(args, "--manifest") ?? "data/affiliate/seo-hub-placements.json",
);
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const seoPagesFile = resolve(valueAfter(args, "--seo-pages") ?? "data/seo_pages.json");
const mountsFile = resolve(valueAfter(args, "--mounts") ?? "data/mounts.json");
const batchFile = resolve(
  valueAfter(args, "--batch") ?? ".private/market-affiliate-hub-batch.json",
);
const outFile = resolve(
  valueAfter(args, "--out") ?? ".private/market-affiliate-hub-snapshot.json",
);

for (const [label, file] of [["batch", batchFile], ["snapshot", outFile]]) {
  if (file !== privateRoot && !file.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error(`Hub placement ${label} must stay under .private/`);
  }
}

const [manifest, source, seoPages, catalogMounts, batch] = await Promise.all([
  readJson(manifestFile),
  readJson(sourceFile),
  readJson(seoPagesFile),
  readJson(mountsFile),
  readJson(batchFile),
]);
const snapshot = buildHubPrivateSnapshot({
  manifest,
  source,
  seoPages,
  catalogMounts,
  batch,
});
await writeJson(outFile, snapshot);
console.log(
  `Собрано решений размещений: ${snapshot.placements.length} -> ${outFile}`,
);
