#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const root = resolve(process.cwd());
const forecastPaths = [
  resolve(root, "product-docs/research/yadirect/forecast-batch-1.csv"),
  resolve(root, "product-docs/research/yadirect/forecast-batch-2.csv"),
];
const candidatePath = resolve(root, "product-docs/research/yadirect/krepitv-direct-candidates.csv");
const combinedPath = resolve(root, "product-docs/research/yadirect/krepitv-direct-forecast.csv");
const shortlistPath = resolve(root, "product-docs/research/yadirect/krepitv-direct-cheap-shortlist.csv");

function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted && char === '"' && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (!quoted && char === ",") {
      row.push(cell);
      cell = "";
    } else if (!quoted && char === "\n") {
      row.push(cell);
      if (row.some(Boolean)) rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }
  const [headers, ...values] = rows;
  return values.map((value) => Object.fromEntries(headers.map((header, index) => [header, value[index] ?? ""])));
}

function toCsv(rows, columns) {
  const escape = (value) => {
    const text = String(value ?? "");
    return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
  };
  return [columns.join(","), ...rows.map((row) => columns.map((column) => escape(row[column])).join(","))].join("\n") + "\n";
}

const forecast = forecastPaths.flatMap((path) => parseCsv(readFileSync(path, "utf8")));
const candidates = parseCsv(readFileSync(candidatePath, "utf8"));
const frequencyByPhrase = new Map(candidates.map((row) => [row.keyword, row.seo_frequency]));

const classifications = [
  { match: /потолочн/, relevance: "исключить", intent: "вне текущего клина", reason: "KREPI TV начинает с настенного крепления" },
  { match: /^телевизор 55 диагональ размеры$/, relevance: "исключить", intent: "информационный", reason: "ищут размер телевизора, а не крепление" },
  { match: /^как /, relevance: "принять", intent: "информационный", reason: "подходит для SEO-руководства и мягкого входа в подбор" },
  { match: /стандарт|гипсокартон|vesa/i, relevance: "принять", intent: "информационный", reason: "совпадает с техническим клином KREPI TV" },
  { match: /купить|цена|сколько стоит|onkron/i, relevance: "принять", intent: "коммерческий", reason: "явный товарный или ценовой интент" },
  { match: /кронштейн|крепление/i, relevance: "принять", intent: "коммерческий", reason: "ядро подбора кронштейна" },
];

const atTrafficNine = forecast
  .filter((row) => row.traffic_volume === "9")
  .map((row) => {
    const classification = classifications.find((item) => item.match.test(row.phrase)) ?? {
      relevance: "исключить",
      intent: "не определён",
      reason: "нет явного соответствия продукту",
    };
    return {
      phrase: row.phrase,
      relevance: classification.relevance,
      intent: classification.intent,
      reason: classification.reason,
      wordstat_frequency_exact_input: frequencyByPhrase.get(row.phrase) ?? "",
      direct_forecast_queries_broad: row.forecast_queries,
      traffic_volume: row.traffic_volume,
      forecast_charged_cpc_rub: row.charged_amount_rub,
      forecast_avg_bid_rub: row.avg_bid_rub,
      forecast_impressions: row.impressions,
      forecast_clicks: row.clicks,
      forecast_budget_rub: row.budget_rub,
      region: row.region,
      period: row.period,
      platforms: row.platforms,
      captured_at: row.captured_at,
    };
  })
  .sort((a, b) => {
    if (a.relevance !== b.relevance) return a.relevance === "принять" ? -1 : 1;
    return Number(a.forecast_charged_cpc_rub) - Number(b.forecast_charged_cpc_rub);
  });

const forecastColumns = Object.keys(forecast[0]);
const shortlistColumns = Object.keys(atTrafficNine[0]);
mkdirSync(dirname(combinedPath), { recursive: true });
writeFileSync(combinedPath, toCsv(forecast, forecastColumns), "utf8");
writeFileSync(shortlistPath, toCsv(atTrafficNine, shortlistColumns), "utf8");

const accepted = atTrafficNine.filter((row) => row.relevance === "принять");
process.stdout.write(
  JSON.stringify({
    combined_rows: forecast.length,
    phrases_at_traffic_9: atTrafficNine.length,
    accepted: accepted.length,
    excluded: atTrafficNine.length - accepted.length,
    cheapest_accepted: accepted.slice(0, 10).map((row) => ({
      phrase: row.phrase,
      cpc: row.forecast_charged_cpc_rub,
      clicks: row.forecast_clicks,
    })),
    combinedPath,
    shortlistPath,
  }),
);
