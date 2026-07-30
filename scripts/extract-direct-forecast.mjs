#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

const batch = Number(process.argv[2]);
const outputPath = resolve(process.argv[3] ?? `product-docs/research/yadirect/forecast-batch-${batch}.csv`);

if (!Number.isInteger(batch) || batch < 1) {
  throw new Error("Укажите номер батча первым аргументом.");
}

const identity = execFileSync(
  "osascript",
  ["-e", 'tell application "Google Chrome" to get {title, URL} of active tab of front window'],
  { encoding: "utf8" },
).trim();

if (
  !identity.includes("Оценка бюджета кампании") ||
  !identity.includes("direct.yandex.ru/registered/main.pl?cmd=advancedForecast")
) {
  throw new Error("Проверка активной вкладки не пройдена; выгрузка отменена.");
}

const browserCode = String.raw`JSON.stringify({
  settings: {
    geo: (document.querySelector('#geo') || {}).value || '',
    summary: (document.body.innerText.match(/Выбраны параметры:[\s\S]*?3\. Прогноз по выбранным ключевым фразам/) || [''])[0]
  },
  rows: Array.from(document.querySelectorAll('.b-advanced-forecast__result-table__table tbody tr.js-phrase-row-template'))
    .filter((tr) => !tr.innerText.includes('{collapsedPhrase}'))
    .map((tr) => Array.from(tr.children).map((td) => td.innerText.trim()))
})`;

const appleScript = `on run argv
 tell application "Google Chrome"
  tell active tab of front window
   return execute javascript (item 1 of argv)
  end tell
 end tell
end run
`;

const snapshot = JSON.parse(
  execFileSync("osascript", ["-", browserCode], {
    encoding: "utf8",
    input: appleScript,
    maxBuffer: 10 * 1024 * 1024,
  }),
);

if (
  snapshot.settings.geo !== "225" ||
  !snapshot.settings.summary.includes("30 дней") ||
  !snapshot.settings.summary.includes("Площадки: все") ||
  !snapshot.settings.summary.includes("российские рубли")
) {
  throw new Error("Параметры прогноза не совпадают с исследовательским контрактом.");
}

const positions = [0, 1, 2, 3, 4];
const outputRows = [];

for (const cells of snapshot.rows) {
  const phrase = cells[2];
  const forecastQueries = cells[4].replaceAll(" ", "");
  const traffic = cells[5].split("\n");
  const averageBid = cells[6].split("\n");
  const chargedAmount = cells[7].split("\n");
  const ctr = cells[9].split("\n");
  const impressions = cells[10].split("\n");
  const clicks = cells[11].split("\n");
  const budget = cells[12].split("\n");

  for (const index of positions) {
    outputRows.push({
      batch,
      phrase,
      forecast_queries: forecastQueries,
      traffic_volume: traffic[index],
      avg_bid_rub: averageBid[index],
      charged_amount_rub: chargedAmount[index],
      ctr_percent: ctr[index],
      impressions: impressions[index].replaceAll(" ", ""),
      clicks: clicks[index].replaceAll(" ", ""),
      budget_rub: budget[index].replaceAll(" ", ""),
      region: "Россия",
      period: "30 дней",
      platforms: "все",
      currency: "RUB",
      captured_at: new Date().toISOString(),
      source: "Яндекс Директ — Оценка бюджета кампании",
    });
  }
}

const columns = Object.keys(outputRows[0] ?? {});
const escapeCsv = (value) => {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
};
const csv = [
  columns.join(","),
  ...outputRows.map((row) => columns.map((column) => escapeCsv(row[column])).join(",")),
].join("\n") + "\n";

mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, csv, "utf8");
process.stdout.write(
  JSON.stringify({ outputPath, phrases: snapshot.rows.length, rows: outputRows.length, settings: snapshot.settings }),
);
