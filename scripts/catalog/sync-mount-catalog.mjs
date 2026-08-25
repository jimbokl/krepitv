#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registerPath = path.join(root, "data/research/verified-mounts.json");
const catalogPath = path.join(root, "data/mounts.json");
const register = JSON.parse(await readFile(registerPath, "utf8"));
const operationalFields = [
  "id", "brand", "model", "title", "mechanism", "min_diagonal_in", "max_diagonal_in",
  "max_load_kg", "vesa", "wall_distance_min_mm", "wall_distance_max_mm", "source_url",
  "source_label", "checked_at",
];

const ids = new Set();
const models = new Set();
const sources = new Set();
for (const row of register) {
  if (ids.has(row.id)) throw new Error(`Duplicate mount id: ${row.id}`);
  if (models.has(`${row.brand}:${row.model}`)) throw new Error(`Duplicate mount model: ${row.brand} ${row.model}`);
  if (sources.has(row.source_url)) throw new Error(`Duplicate mount source: ${row.source_url}`);
  if (!row.source_fact?.trim()) throw new Error(`Missing source fact: ${row.id}`);
  ids.add(row.id);
  models.add(`${row.brand}:${row.model}`);
  sources.add(row.source_url);
}

const catalog = register.map((row) => ({
  ...Object.fromEntries(operationalFields.map((field) => [field, row[field]])),
  ...(row.technical_details ? { technical_details: row.technical_details } : {}),
}));
await writeFile(catalogPath, `${JSON.stringify(catalog, null, 2)}\n`);
process.stdout.write(`Synced ${catalog.length} verified mounts.\n`);
