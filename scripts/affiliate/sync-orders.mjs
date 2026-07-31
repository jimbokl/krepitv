#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertPrivatePath,
  collectKnownVids,
  runOrdersSync,
  writeJsonAtomic,
} from "./orders.mjs";

function usage() {
  return [
    "Usage:",
    "  YANDEX_MARKET_AFFILIATE_OAUTH=... \\",
    "  KREPITV_ORDER_HMAC_SECRET=... \\",
    "  node scripts/affiliate/sync-orders.mjs \\",
    "    --clid 15238076 \\",
    "    --backfill-start 2026-07-30T00:00:00+03:00",
    "",
    "--backfill-start is mandatory only for the first successful sync.",
    "Optional: --manifest, --hub-placements, --state, --snapshot.",
  ].join("\n");
}

function parseArgs(args) {
  const allowed = new Set([
    "--clid",
    "--backfill-start",
    "--manifest",
    "--hub-placements",
    "--state",
    "--snapshot",
  ]);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag}\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}\n${usage()}`);
    }
    result[flag.slice(2).replaceAll("-", "_")] = value;
    index += 1;
  }
  return result;
}

async function readJson(file) {
  const raw = await readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${file}: invalid JSON`);
  }
}

async function readOptionalJson(file) {
  try {
    return await readJson(file);
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw error;
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const token = process.env.YANDEX_MARKET_AFFILIATE_OAUTH;
const secret = process.env.KREPITV_ORDER_HMAC_SECRET;
const clid = args.clid ?? process.env.YANDEX_MARKET_AFFILIATE_CLID;
if (!token || !secret || !clid) throw new Error(usage());

const manifestFile = path.resolve(
  args.manifest ?? path.join(root, "data/affiliate/market-products.json"),
);
const hubPlacementsFile = path.resolve(
  args.hub_placements ?? path.join(root, "data/affiliate/seo-hub-placements.json"),
);
const stateFile = assertPrivatePath(
  root,
  args.state ?? path.join(root, ".private/affiliate-orders/state.json"),
);
const snapshotFile = assertPrivatePath(
  root,
  args.snapshot ?? path.join(root, ".private/affiliate-orders/latest.json"),
);

const [manifest, hubPlacements, state] = await Promise.all([
  readJson(manifestFile),
  readJson(hubPlacementsFile),
  readOptionalJson(stateFile),
]);
const knownVids = collectKnownVids(manifest, hubPlacements, clid);

// The library fixes runEnd before its first request. The existing state is not
// mutated, so a failed page or retry can never advance the persisted cursor.
const result = await runOrdersSync({
  state,
  clid,
  token,
  secret,
  knownVids,
  backfillStart: args.backfill_start,
});

// Publish the non-authoritative snapshot first. The cursor advances only with
// the final atomic state rename.
await writeJsonAtomic(snapshotFile, result.snapshot);
await writeJsonAtomic(stateFile, result.state);

console.log(
  [
    `Заказы синхронизированы: ${result.snapshot.records}`,
    `страниц API: ${result.snapshot.pages}`,
    `в карантине: ${result.snapshot.quarantined_records}`,
    `окно до: ${result.snapshot.window.update_end}`,
  ].join("; "),
);
