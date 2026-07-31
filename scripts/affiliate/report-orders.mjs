#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertPrivatePath,
  buildMonthlyOrdersReport,
  buildPlacementAttributionIndex,
  buildSafeMonthlyOrdersAggregate,
  formatSafeOrdersAggregateSummary,
  writeJsonAtomic,
} from "./orders.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/report-orders.mjs --month 2026-07",
    "Optional: --state .private/affiliate-orders/state.json --out .private/affiliate-orders/reports/2026-07.json",
    "          --aggregate-only writes upload-safe totals and attribution winners without private identifiers",
    "          --manifest data/affiliate/market-products.json",
    "          --hub-placements data/affiliate/seo-hub-placements.json",
    "          --model-placements data/affiliate/model-page-placements.json",
  ].join("\n");
}

function parseArgs(args) {
  const allowed = new Set([
    "--month",
    "--state",
    "--out",
    "--manifest",
    "--hub-placements",
    "--model-placements",
  ]);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (flag === "--aggregate-only") {
      result.aggregate_only = true;
      continue;
    }
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

function currentMoscowMonth() {
  return new Date(Date.now() + 3 * 60 * 60 * 1_000).toISOString().slice(0, 7);
}

async function readJson(file) {
  const raw = await readFile(file, "utf8");
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`${file}: invalid JSON`);
  }
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const args = parseArgs(process.argv.slice(2));
if (args.help) {
  console.log(usage());
  process.exit(0);
}

const month = args.month ?? currentMoscowMonth();
const stateFile = assertPrivatePath(
  root,
  args.state ?? path.join(root, ".private/affiliate-orders/state.json"),
);
const outputFile = assertPrivatePath(
  root,
  args.out ??
    path.join(
      root,
      args.aggregate_only
        ? `.private/affiliate-orders/aggregates/${month}.json`
        : `.private/affiliate-orders/reports/${month}.json`,
    ),
);
const manifestFile = path.resolve(
  args.manifest ?? path.join(root, "data/affiliate/market-products.json"),
);
const hubPlacementsFile = path.resolve(
  args.hub_placements ?? path.join(root, "data/affiliate/seo-hub-placements.json"),
);
const modelPlacementsFile = path.resolve(
  args.model_placements ??
    path.join(root, "data/affiliate/model-page-placements.json"),
);
const [state, manifest, hubPlacements, modelPlacements] = await Promise.all([
  readJson(stateFile),
  readJson(manifestFile),
  readJson(hubPlacementsFile),
  readJson(modelPlacementsFile),
]);
const placementIndex = buildPlacementAttributionIndex(
  manifest,
  [hubPlacements, modelPlacements],
  state.clid,
);
let report;
if (args.aggregate_only) {
  report = buildSafeMonthlyOrdersAggregate(
    state,
    month,
    new Date(),
    placementIndex,
  );
} else {
  report = buildMonthlyOrdersReport(
    state,
    month,
    new Date(),
    placementIndex,
  );
}
await writeJsonAtomic(outputFile, report);

console.log(
  args.aggregate_only
    ? formatSafeOrdersAggregateSummary(report)
    : [
        `Отчёт ${month}`,
        `подтверждено заказов: ${report.approved.orders}`,
        `вознаграждение: ${report.approved.payment_kopecks} коп.`,
        `ожидают решения: ${report.pending_current.new_orders + report.pending_current.on_hold_orders}`,
      ].join("; "),
);
