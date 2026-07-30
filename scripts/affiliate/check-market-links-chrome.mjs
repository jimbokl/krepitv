#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { readFile, stat } from "node:fs/promises";
import path, { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildMarketAffiliateRequestUrl,
  marketTitleMatchesExpected,
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

function nullableInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function failedCheck(card, checkedAt, status, errorCode) {
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
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

function browserRequest(endpoint, oauthFile, appleScriptFile, chromeWindowId, chromeTabIndex) {
  const encodedEndpoint = Buffer.from(endpoint.toString(), "utf8").toString("base64");
  const result = spawnSync(
    "/usr/bin/osascript",
    [appleScriptFile, encodedEndpoint, oauthFile, String(chromeWindowId), String(chromeTabIndex)],
    {
      encoding: "utf8",
      maxBuffer: 2 * 1024 * 1024,
      timeout: 30_000,
    },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || "Chrome request failed");
  }
  const envelope = JSON.parse(result.stdout.trim());
  if (!envelope.ok) throw new Error(`Market HTTP ${envelope.status || 0}`);
  return JSON.parse(envelope.body);
}

async function checkCard(
  card,
  oauthFile,
  appleScriptFile,
  chromeWindowId,
  chromeTabIndex,
) {
  const checkedAt = new Date().toISOString();
  let payload;
  try {
    payload = browserRequest(
      buildMarketAffiliateRequestUrl(card),
      oauthFile,
      appleScriptFile,
      chromeWindowId,
      chromeTabIndex,
    );
  } catch {
    return failedCheck(card, checkedAt, "error", "http_error");
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
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
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

async function checkCardWithRetries(
  card,
  oauthFile,
  appleScriptFile,
  chromeWindowId,
  chromeTabIndex,
) {
  let result = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
    result = await checkCard(
      card,
      oauthFile,
      appleScriptFile,
      chromeWindowId,
      chromeTabIndex,
    );
    if (result.status !== "error") return result;
    if (attempt < RETRY_DELAYS_MS.length) {
      await new Promise((resolveDelay) =>
        setTimeout(resolveDelay, RETRY_DELAYS_MS[attempt]),
      );
    }
  }
  return result;
}

const args = process.argv.slice(2);
const root = resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const privateRoot = path.join(root, ".private");
const sourceFile = resolve(
  valueAfter(args, "--source") ?? "data/affiliate/market-products.json",
);
const outFile = resolve(
  valueAfter(args, "--out") ?? ".private/market-affiliate-batch.json",
);
const oauthFile = resolve(
  valueAfter(args, "--oauth-file") ?? ".private/yandex-market-affiliate-oauth",
);
const chromeWindowIdFile = resolve(
  valueAfter(args, "--chrome-window-id-file") ?? ".private/chrome-window-id",
);
const chromeTabIndex = Number(valueAfter(args, "--chrome-tab-index") ?? 5);
const appleScriptFile = path.join(
  root,
  "scripts/affiliate/chrome-market-request.applescript",
);

for (const [label, file] of [
  ["OAuth file", oauthFile],
  ["Chrome window ID file", chromeWindowIdFile],
  ["output", outFile],
]) {
  if (file !== privateRoot && !file.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error(`${label} must stay under .private/`);
  }
}
if (((await stat(oauthFile)).mode & 0o077) !== 0) {
  throw new Error("OAuth file permissions must be owner-only");
}
const chromeWindowId = Number((await readFile(chromeWindowIdFile, "utf8")).trim());
if (!Number.isSafeInteger(chromeWindowId) || chromeWindowId <= 0) {
  throw new Error("Chrome window ID must be a positive integer");
}
if (!Number.isSafeInteger(chromeTabIndex) || chromeTabIndex <= 0) {
  throw new Error("Chrome tab index must be a positive integer");
}

const [sourceData, catalogMounts] = await Promise.all([
  readJson(sourceFile),
  readJson(path.join(root, "data/mounts.json")),
]);
const source = validateSource(sourceData);
validateSourceAgainstMounts(source, catalogMounts);

const checks = [];
for (const [index, card] of source.cards.entries()) {
  if (index > 0) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, REQUEST_INTERVAL_MS));
  }
  checks.push(
    await checkCardWithRetries(
      card,
      oauthFile,
      appleScriptFile,
      chromeWindowId,
      chromeTabIndex,
    ),
  );
}

const batch = {
  schema_version: 2,
  generated_at: new Date().toISOString(),
  checks,
};
validateBatch(batch);
await writeJson(outFile, batch);
console.log(`Проверено через внешний Chrome: ${checks.length}; секреты не сохранены.`);
