#!/usr/bin/env node

import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  marketTitleMatchesExpected,
  readJson,
  validateBatch,
  validateSource,
  validateSourceAgainstMounts,
  writeJson,
} from "./lib.mjs";

const ENDPOINT = "https://api.content.market.yandex.ru/v3/affiliate/partner/link/create";
const REQUEST_INTERVAL_MS = 220;
const RETRY_DELAYS_MS = [1_000, 3_000];

function valueAfter(args, flag) {
  const index = args.indexOf(flag);
  return index === -1 ? null : args[index + 1] ?? null;
}

function usage() {
  return [
    "Usage:",
    "  YANDEX_MARKET_AFFILIATE_OAUTH=... YANDEX_MARKET_PLACE_ID=... \\",
    "  node scripts/affiliate/check-market-links.mjs \\",
    "    --source data/affiliate/market-products.json \\",
    "    --out .private/market-affiliate-batch.json",
  ].join("\n");
}

function nullableInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function failedCheck(card, checkedAt, status, errorCode) {
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    status,
    affiliate_href: null,
    page_name: null,
    title: null,
    product_photo: null,
    promise: null,
    price: null,
    stock: null,
    checked_at: checkedAt,
    error_code: errorCode,
  };
}

async function checkCard(card, token, placeId) {
  const checkedAt = new Date().toISOString();
  const url = new URL(ENDPOINT);
  url.searchParams.set("url", card.market_source_url);
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("vid", card.vid);
  url.searchParams.set("format", "json");
  if (card.creative.erid) url.searchParams.set("erid", card.creative.erid);

  let response;
  try {
    response = await fetch(url, {
      headers: { Authorization: `OAuth ${token}` },
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return failedCheck(card, checkedAt, "error", "http_error");
  }

  if (!response.ok) {
    const unavailable = response.status === 404 || response.status === 410;
    return failedCheck(
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
    return failedCheck(card, checkedAt, "error", "invalid_payload");
  }

  if (payload?.status !== "OK") {
    return failedCheck(card, checkedAt, "error", "api_error");
  }

  const promise = nullableInteger(payload.promise);
  const price = nullableInteger(payload.price);
  const stock = nullableInteger(payload.stockAmount);
  const affiliateHref = payload.link?.url;
  const pageName = payload.link?.pageName;
  const title = payload.link?.title;
  const productPhoto = payload.link?.productPhoto;
  if (
    typeof affiliateHref !== "string" ||
    pageName !== "POKUPKI_PRODUCT" ||
    typeof title !== "string" ||
    !title.trim() ||
    typeof productPhoto !== "string" ||
    promise === null ||
    price === null ||
    stock === null
  ) {
    return failedCheck(card, checkedAt, "error", "invalid_payload");
  }
  if (!marketTitleMatchesExpected(title, card.expected_title_tokens)) {
    return failedCheck(card, checkedAt, "unavailable", "wrong_product");
  }

  return {
    id: card.id,
    market_source_url: card.market_source_url,
    status: "ok",
    affiliate_href: affiliateHref,
    page_name: pageName,
    title,
    product_photo: productPhoto,
    promise,
    price,
    stock,
    checked_at: checkedAt,
    error_code: null,
  };
}

async function checkCardWithRetries(card, token, placeId) {
  let result = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    result = await checkCard(card, token, placeId);
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
const placeId = process.env.YANDEX_MARKET_PLACE_ID;
if (!token || !/^\d+$/.test(placeId ?? "")) throw new Error(usage());

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
  checks.push(await checkCardWithRetries(card, token, placeId));
}

const batch = {
  schema_version: 1,
  generated_at: new Date().toISOString(),
  checks,
};
validateBatch(batch);
await writeJson(outFile, batch);
console.log(`Проверено предложений: ${checks.length}; результат сохранён без секретов.`);
