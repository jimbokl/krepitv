#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, validateSnapshot, writeJson } from "./lib.mjs";

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const publicFile = path.join(root, "data/affiliate/public-offers.json");
const inputFile = resolve(
  valueAfter(args, "--input") ?? ".private/market-affiliate-snapshot.json",
);
const outputFile = resolve(valueAfter(args, "--out") ?? publicFile);

if (inputFile !== privateRoot && !inputFile.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Validated affiliate snapshots may be read only from .private/");
}
if (outputFile !== publicFile) {
  throw new Error("Public affiliate snapshot has one audited destination");
}

const snapshot = validateSnapshot(await readJson(inputFile));
await writeJson(outputFile, snapshot);
console.log(
  `Опубликован снимок: ${snapshot.offers.length} предложений, ${snapshot.offers.filter((offer) => offer.publishable).length} активных.`,
);
