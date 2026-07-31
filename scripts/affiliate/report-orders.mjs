#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assertPrivatePath,
  buildMonthlyOrdersReport,
  writeJsonAtomic,
} from "./orders.mjs";

function usage() {
  return [
    "Usage:",
    "  node scripts/affiliate/report-orders.mjs --month 2026-07",
    "Optional: --state .private/affiliate-orders/state.json --out .private/affiliate-orders/reports/2026-07.json",
  ].join("\n");
}

function parseArgs(args) {
  const allowed = new Set(["--month", "--state", "--out"]);
  const result = {};
  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index];
    if (flag === "--help" || flag === "-h") return { help: true };
    if (!allowed.has(flag)) throw new Error(`Unknown argument: ${flag}\n${usage()}`);
    const value = args[index + 1];
    if (!value || value.startsWith("--")) {
      throw new Error(`Missing value for ${flag}\n${usage()}`);
    }
    result[flag.slice(2)] = value;
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
  args.out ?? path.join(root, `.private/affiliate-orders/reports/${month}.json`),
);
const report = buildMonthlyOrdersReport(await readJson(stateFile), month);
await writeJsonAtomic(outputFile, report);

console.log(
  [
    `Отчёт ${month}`,
    `подтверждено заказов: ${report.approved.orders}`,
    `вознаграждение: ${report.approved.payment_kopecks} коп.`,
    `ожидают решения: ${report.pending_current.new_orders + report.pending_current.on_hold_orders}`,
  ].join("; "),
);
