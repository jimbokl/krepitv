#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateModelPublicSnapshot } from "./model-placements.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const readJson = async (relative) => JSON.parse(await readFile(path.join(ROOT, relative), "utf8"));
const [snapshot, manifest, source, models, catalogMounts] = await Promise.all([
  readJson("data/affiliate/public-model-offers.json"),
  readJson("data/affiliate/model-page-placements.json"),
  readJson("data/affiliate/market-products.json"),
  readJson("data/tv_models.json"),
  readJson("data/mounts.json"),
]);

const allowed = new Set(manifest.models.flatMap((model) => (
  model.placements.map((placement) => placement.placement_id)
)));
const placements = snapshot.placements.filter((placement) => allowed.has(placement.placement_id));
const next = { ...snapshot, placements };
validateModelPublicSnapshot(next, { manifest, source, models, catalogMounts });
await writeFile(
  path.join(ROOT, "data/affiliate/public-model-offers.json"),
  `${JSON.stringify(next, null, 2)}\n`,
);
process.stdout.write(`Сохранено ${placements.length}/${snapshot.placements.length} ранее проверенных размещений.\n`);
