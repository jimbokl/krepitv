import { randomBytes } from "node:crypto";
import { chmod, lstat, mkdir, readFile, realpath, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  fetchGoogleSearchConsoleReport,
  validateServiceAccountCredentials,
} from "./google-search-console.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");

function argument(name, fallback = null) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function isoDateDaysBefore(value, days) {
  const date = new Date(value);
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().slice(0, 10);
}

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

async function loadCredentials(value) {
  if (!value) throw new Error("Pass --credentials or GOOGLE_SEARCH_CONSOLE_CREDENTIALS");
  const requested = path.resolve(value);
  const resolved = await realpath(requested);
  if (isInside(root, resolved)) throw new Error("Google credentials must be outside the repository");
  const metadata = await stat(resolved);
  if (!metadata.isFile() || (metadata.mode & 0o077) !== 0) {
    throw new Error("Google credentials must be a regular owner-only file");
  }
  return validateServiceAccountCredentials(JSON.parse(await readFile(resolved, "utf8")));
}

export async function writePrivateReport(outputValue, report) {
  const privateRoot = path.join(root, ".private");
  await mkdir(privateRoot, { recursive: true, mode: 0o700 });
  const privateMetadata = await lstat(privateRoot);
  if (
    privateMetadata.isSymbolicLink()
    || !privateMetadata.isDirectory()
    || (privateMetadata.mode & 0o077) !== 0
    || (typeof process.getuid === "function" && privateMetadata.uid !== process.getuid())
  ) {
    throw new Error(".private must be a real owner-only directory");
  }
  const resolvedPrivateRoot = await realpath(privateRoot);
  const output = path.resolve(root, outputValue);
  if (!isInside(privateRoot, output) || output === privateRoot) {
    throw new Error("Search Console report must be written under .private");
  }
  const relativeParent = path.relative(privateRoot, path.dirname(output));
  let current = privateRoot;
  for (const component of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    try {
      const metadata = await lstat(current);
      if (
        metadata.isSymbolicLink()
        || !metadata.isDirectory()
        || (metadata.mode & 0o077) !== 0
        || (typeof process.getuid === "function" && metadata.uid !== process.getuid())
      ) {
        throw new Error("Search Console report path contains an unsafe directory");
      }
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
      await mkdir(current, { mode: 0o700 });
    }
  }
  const resolvedParent = await realpath(path.dirname(output));
  if (!isInside(resolvedPrivateRoot, resolvedParent)) {
    throw new Error("Search Console report directory escapes .private");
  }
  const temporary = path.join(resolvedParent, `.${path.basename(output)}.${randomBytes(8).toString("hex")}.tmp`);
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  await chmod(temporary, 0o600);
  await rename(temporary, output);
  await chmod(output, 0o600);
  return output;
}

export async function main() {
  const now = new Date();
  const credentialsValue = argument(
    "--credentials",
    process.env.GOOGLE_SEARCH_CONSOLE_CREDENTIALS ?? process.env.GOOGLE_APPLICATION_CREDENTIALS,
  );
  const siteUrl = argument("--site", "https://krepitv.ru/");
  const sitemapFile = path.resolve(root, argument("--sitemap-file", "docs/sitemap.xml"));
  const sitemapUrl = argument("--sitemap-url", "https://krepitv.ru/sitemap.xml");
  const skipUrlInspection = process.argv.includes("--skip-url-inspection");
  const date2Default = isoDateDaysBefore(now, 2);
  const date2 = argument("--date2", date2Default);
  const date1 = argument("--date1", isoDateDaysBefore(`${date2}T12:00:00Z`, 27));
  const outputValue = argument("--out", ".private/search/google-search-console-daily.json");
  const credentials = await loadCredentials(credentialsValue);
  const localSitemapXml = await readFile(sitemapFile, "utf8");
  const report = await fetchGoogleSearchConsoleReport({
    credentials,
    date1,
    date2,
    localSitemapXml,
    now,
    siteUrl,
    sitemapUrl,
    skipUrlInspection,
  });
  await writePrivateReport(outputValue, report);
  process.stdout.write(`${JSON.stringify({
    generated_at: report.generated_at,
    search: report.search_analytics.totals,
    sitemap_urls: report.sitemap.production_url_count,
    inspection_state: report.url_inspection.state,
    inspected: report.url_inspection.inspected_count,
    indexed_pass: report.url_inspection.indexed_pass_count,
    observed_indexed_pass: report.url_inspection.observed_indexed_pass_count,
    page_opportunities: report.search_analytics.page_rows.rows.length,
    query_page_opportunities: report.search_analytics.query_page_rows.rows.length,
  }, null, 2)}\n`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
