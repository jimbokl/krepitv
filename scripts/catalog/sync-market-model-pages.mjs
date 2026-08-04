import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMarketModelPages } from "./market-model-page-lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const researchPath = path.join(ROOT, "data/research/yandex-market-tv-models.json");
const verifiedPath = path.join(ROOT, "data/tv_models.json");
const outputPath = path.join(ROOT, "data/market_tv_models.json");
const check = process.argv.includes("--check");

const [research, verifiedModels] = await Promise.all([
  readFile(researchPath, "utf8").then(JSON.parse),
  readFile(verifiedPath, "utf8").then(JSON.parse),
]);
const output = `${JSON.stringify(buildMarketModelPages(research, verifiedModels), null, 2)}\n`;
if (check) {
  const current = await readFile(outputPath, "utf8").catch(() => "");
  if (current !== output) throw new Error("data/market_tv_models.json is stale; run npm run catalog:sync-market-models");
  process.stdout.write("Market model page dataset is current\n");
} else {
  await writeFile(outputPath, output);
  const manifest = JSON.parse(output);
  process.stdout.write(
    `Saved ${manifest.summary.market_observations} observations: `
      + `${manifest.summary.observed_canonicals} observed canonicals, `
      + `${manifest.summary.alias_routes} aliases, ${manifest.summary.verified_routes} verified routes\n`,
  );
}

