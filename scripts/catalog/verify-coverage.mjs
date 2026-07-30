#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatCoverageReport, validateCoverageManifest } from "./coverage-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const [manifestArgument, modelsArgument] = process.argv.slice(2);
const manifestPath = path.resolve(root, manifestArgument ?? "data/catalog-coverage.json");
const modelsPath = path.resolve(root, modelsArgument ?? "data/tv_models.json");

const [manifest, models] = await Promise.all(
  [manifestPath, modelsPath].map(async (file) => JSON.parse(await readFile(file, "utf8"))),
);
const summary = validateCoverageManifest(manifest, models);
console.log(formatCoverageReport(summary));
