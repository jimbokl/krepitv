#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildSnapshot, readJson, writeJson } from "./lib.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/build-snapshot.mjs \\",
    "    --source data/affiliate/market-products.json \\",
    "    --batch .private/market-affiliate-batch.json \\",
    "    --out .private/market-affiliate-snapshot.json",
    "  add --allow-example-hosts only for tests/fixtures",
  ].join("\n");
}

const args = process.argv.slice(2);
const sourceFile = valueAfter(args, "--source");
const batchFile = valueAfter(args, "--batch");
const outFile = valueAfter(args, "--out");
const allowExampleHosts = args.includes("--allow-example-hosts");

if (!sourceFile || !batchFile || !outFile) throw new Error(usage());

const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const fixtureRoot = path.join(root, "tests/fixtures");
const resolvedSource = resolve(sourceFile);
const resolvedBatch = resolve(batchFile);
const resolvedOut = resolve(outFile);
if (resolvedOut !== privateRoot && !resolvedOut.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Affiliate snapshots may be written only under .private/");
}
if (allowExampleHosts) {
  for (const file of [resolvedSource, resolvedBatch]) {
    if (file !== fixtureRoot && !file.startsWith(`${fixtureRoot}${path.sep}`)) {
      throw new Error("--allow-example-hosts is restricted to tests/fixtures");
    }
  }
} else if (
  resolvedBatch !== privateRoot &&
  !resolvedBatch.startsWith(`${privateRoot}${path.sep}`)
) {
  throw new Error("Production affiliate batches must be read from .private/");
}

const [source, batch, catalogMounts] = await Promise.all([
  readJson(resolvedSource),
  readJson(resolvedBatch),
  allowExampleHosts ? Promise.resolve(null) : readJson(path.join(root, "data/mounts.json")),
]);
const snapshot = buildSnapshot(source, batch, {
  allowExampleHosts,
  catalogMounts,
});
await writeJson(resolvedOut, snapshot);
console.log(
  `Built ${snapshot.offers.length} affiliate checks (${snapshot.offers.filter((offer) => offer.publishable).length} publishable) -> ${resolvedOut}`,
);
