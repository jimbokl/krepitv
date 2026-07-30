import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const demandFile = path.join(ROOT, "data/research/mount-model-demand.json");
const rewardFile = path.join(ROOT, "data/research/market-referral-mount-rewards-ui-2026-07-30.json");
const outputFile = path.join(ROOT, "product-docs/research/mount-opportunity-2026-07-30.csv");

function normalize(value) {
  return String(value ?? "")
    .toLocaleLowerCase("ru")
    .replace(/[‐‑‒–—−-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function key(row) {
  return `${normalize(row.brand)}|${normalize(row.model)}`;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const demand = JSON.parse(await readFile(demandFile, "utf8"));
const rewards = JSON.parse(await readFile(rewardFile, "utf8"));
const rewardByIdentity = new Map(
  rewards.items.filter((item) => item.brand).map((item) => [key(item), item]),
);

const rows = demand.models.map((item) => {
  const reward = rewardByIdentity.get(key(item));
  const displayedReward = reward?.displayed_reward_rub ?? null;
  return {
    brand: item.brand,
    model: item.model,
    query: item.query,
    seo_frequency: item.seo_frequency,
    displayed_reward_rub: displayedReward,
    displayed_price_rub: reward?.displayed_price_rub ?? null,
    market_purchases: reward?.purchases ?? null,
    catalog_id: item.catalog_id,
    opportunity_index: displayedReward === null ? null : item.seo_frequency * displayedReward,
    demand_observed_at: item.observed_at,
    reward_observed_at: rewards.observed_at,
  };
});

rows.sort((left, right) =>
  (right.opportunity_index ?? -1) - (left.opportunity_index ?? -1)
  || right.seo_frequency - left.seo_frequency
  || left.query.localeCompare(right.query, "ru"));

const columns = [
  "opportunity_rank", "brand", "model", "query", "seo_frequency",
  "displayed_reward_rub", "displayed_price_rub", "market_purchases", "catalog_id",
  "opportunity_index", "demand_observed_at", "reward_observed_at",
];
const csv = [
  columns.join(","),
  ...rows.map((row, index) =>
    columns.map((column) => csvCell(column === "opportunity_rank" ? index + 1 : row[column])).join(",")),
].join("\n");

await writeFile(outputFile, `${csv}\n`);
process.stdout.write(`Saved ${rows.length} joined opportunities -> ${outputFile}\n`);
