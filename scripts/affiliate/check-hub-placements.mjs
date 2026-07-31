#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMarketAffiliateFailure,
  buildMarketAffiliateRequestUrl,
  classifyMarketAffiliatePayload,
  readJson,
  validateBatch,
  writeJson,
} from "./lib.mjs";
import { expandHubPlacementCards } from "./hub-placements.mjs";

const REQUEST_INTERVAL_MS = 220;
const RETRY_DELAYS_MS = [1_000, 3_000];

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function usage() {
  return [
    "Usage:",
    "  YANDEX_MARKET_AFFILIATE_OAUTH=... \\",
    "  node scripts/affiliate/check-hub-placements.mjs \\",
    "    --manifest data/affiliate/seo-hub-placements.json \\",
    "    --source data/affiliate/market-products.json \\",
    "    --out .private/market-affiliate-hub-batch.json",
  ].join("\n");
}

async function checkCard(card, token) {
  const checkedAt = new Date().toISOString();
  const url = buildMarketAffiliateRequestUrl(card);
  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return buildMarketAffiliateFailure(card, checkedAt, "error", "http_error");
  }

  if (!response.ok) {
    const unavailable = response.status === 404 || response.status === 410;
    return buildMarketAffiliateFailure(
      card,
      checkedAt,
      unavailable ? "unavailable" : "error",
      "http_error",
    );
  }

  let payload;
  try {
    payload = await response.json();
  } catch {
    return buildMarketAffiliateFailure(card, checkedAt, "error", "invalid_payload");
  }
  return classifyMarketAffiliatePayload(card, payload, checkedAt);
}

async function checkCardWithRetries(card, token) {
  let result = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    result = await checkCard(card, token);
    if (result.status !== "error") return result;
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, RETRY_DELAYS_MS[attempt]));
    }
  }
  return result;
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
const outFile = resolve(
  valueAfter(args, "--out") ?? ".private/market-affiliate-hub-batch.json",
);
const token = process.env.YANDEX_MARKET_AFFILIATE_OAUTH;
if (!token) throw new Error(usage());
if (outFile !== privateRoot && !outFile.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Hub placement check batches may be written only under .private/");
}

const [manifest, source, seoPages, catalogMounts] = await Promise.all([
  readJson(manifestFile),
  readJson(sourceFile),
  readJson(seoPagesFile),
  readJson(mountsFile),
]);
const placements = expandHubPlacementCards(manifest, {
  source,
  seoPages,
  catalogMounts,
});
const checks = [];
for (const [index, placement] of placements.entries()) {
  if (index > 0) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, REQUEST_INTERVAL_MS));
  }
  checks.push(await checkCardWithRetries(placement.card, token));
}

const batch = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  checks,
};
validateBatch(batch);
await writeJson(outFile, batch);
console.log(
  `Проверено размещений SEO-хабов: ${checks.length}; результат сохранён без секретов.`,
);
