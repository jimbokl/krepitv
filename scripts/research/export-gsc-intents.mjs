import { pathToFileURL } from "node:url";
import path from "node:path";
import { exchangeGoogleAccessToken } from "../analytics/google-search-console.mjs";
import { loadGoogleCredentials, writePrivateReport } from "../analytics/report-google-search-console.mjs";

const site = "https://krepitv.ru/";
const endpoint = `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site)}/searchAnalytics/query`;

function option(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index < 0 ? fallback : process.argv[index + 1];
}

function validDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T12:00:00Z`));
}

async function rowsFor(token, startDate, endDate, dimensions) {
  const rows = [];
  const limit = 25000;
  for (let startRow = 0; startRow < 100000; startRow += limit) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ startDate, endDate, dimensions, type: "web", dataState: "final", rowLimit: limit, startRow }),
    });
    if (!response.ok) throw new Error(`Search Console query failed: HTTP ${response.status}`);
    const payload = await response.json();
    const page = payload.rows ?? [];
    if (!Array.isArray(page)) throw new Error("Search Console returned invalid rows");
    rows.push(...page.map((row) => ({
      keys: row.keys,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })));
    if (page.length < limit) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

export async function main() {
  const startDate = option("--date1");
  const endDate = option("--date2");
  if (!validDate(startDate) || !validDate(endDate) || startDate > endDate) {
    throw new Error("Pass an ascending final --date1 and --date2 window");
  }
  const credentials = await loadGoogleCredentials(option("--credentials", process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS));
  const token = await exchangeGoogleAccessToken({ credentials });
  const [queries, queryPages] = await Promise.all([
    rowsFor(token, startDate, endDate, ["query"]),
    rowsFor(token, startDate, endDate, ["query", "page"]),
  ]);
  await writePrivateReport(option("--out", ".private/search/gsc-intents.json"), {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    window: { startDate, endDate, dataState: "final" },
    coverage: "visible_queries_only; anonymized queries are omitted by Search Console",
    queries,
    queryPages,
  });
  process.stdout.write(JSON.stringify({
    query_rows: queries.rows.length,
    query_page_rows: queryPages.rows.length,
    truncated: queries.truncated || queryPages.truncated,
  }) + "\n");
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
