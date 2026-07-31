#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMarketAffiliateFailure,
  buildMarketAffiliateRequestUrl,
  classifyMarketAffiliatePayload,
  readJson,
  validateBatch,
  validateSource,
  validateSourceAgainstMounts,
  writeJson,
} from "./lib.mjs";

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
    "  node scripts/affiliate/check-market-links.mjs \\",
    "    --source data/affiliate/market-products.json \\",
    "    --out .private/market-affiliate-batch.json",
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
    return buildMarketAffiliateFailure(
      card,
      checkedAt,
      "error",
      "invalid_payload",
    );
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
const sourceFile = resolve(valueAfter(args, "--source") ?? "data/affiliate/market-products.json");
const outFile = resolve(valueAfter(args, "--out") ?? ".private/market-affiliate-batch.json");
const token = process.env.YANDEX_MARKET_AFFILIATE_OAUTH;
if (!token) throw new Error(usage());

const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
if (outFile !== privateRoot && !outFile.startsWith(`${privateRoot}${path.sep}`)) {
  throw new Error("Affiliate check batches may be written only under .private/");
}

const [sourceData, catalogMounts] = await Promise.all([
  readJson(sourceFile),
  readJson(path.join(root, "data/mounts.json")),
]);
const source = validateSource(sourceData);
validateSourceAgainstMounts(source, catalogMounts);
const checks = [];
for (const [index, card] of source.cards.entries()) {
  if (index > 0) await new Promise((resolveDelay) => setTimeout(resolveDelay, REQUEST_INTERVAL_MS));
  checks.push(await checkCardWithRetries(card, token));
}

const batch = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  checks,
};
validateBatch(batch);
await writeJson(outFile, batch);
console.log(`Проверено предложений: ${checks.length}; результат сохранён без секретов.`);
