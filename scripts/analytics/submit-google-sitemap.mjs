import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { submitGoogleSitemap } from "./google-search-console.mjs";
import {
  loadGoogleCredentials,
  writePrivateReport,
} from "./report-google-search-console.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const allowedArguments = new Set(["--credentials", "--out"]);

function parseArguments(argv) {
  const values = {};
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!allowedArguments.has(name) || !value || value.startsWith("--")) {
      throw new Error("Allowed arguments: --credentials <file> and --out <private-report>");
    }
    if (values[name]) throw new Error(`Duplicate argument: ${name}`);
    values[name] = value;
  }
  return values;
}

export async function main(argv = process.argv.slice(2)) {
  const argumentsMap = parseArguments(argv);
  const credentialsValue = argumentsMap["--credentials"]
    ?? process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS
    ?? process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const credentials = await loadGoogleCredentials(credentialsValue);
  const localSitemapXml = await readFile(path.join(root, "docs/sitemap.xml"), "utf8");
  const report = await submitGoogleSitemap({ credentials, localSitemapXml });
  const output = argumentsMap["--out"] ?? ".private/search/google-sitemap-submit-daily.json";
  await writePrivateReport(output, report);
  process.stdout.write(`${JSON.stringify({
    submitted_at: report.submitted_at,
    accepted_http_status: report.accepted_http_status,
    sitemap_urls: report.production_url_count,
    console_state: report.console.state,
    console_submitted_web_urls: report.console.submitted_web_urls,
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
