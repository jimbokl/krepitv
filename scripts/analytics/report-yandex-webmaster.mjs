import { randomBytes } from "node:crypto";
import {
  chmod,
  lstat,
  mkdir,
  readFile,
  realpath,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  fetchYandexWebmasterReport,
  validateYandexWebmasterCredentials,
} from "./yandex-webmaster.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const ARGUMENTS = new Set([
  "--credentials",
  "--date1",
  "--date2",
  "--out",
  "--site",
  "--sitemap-file",
  "--sitemap-url",
]);

function isInside(parent, candidate) {
  const relative = path.relative(parent, candidate);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function asDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new Error("Invalid report clock");
  return date;
}

function shiftUtcDate(value, days) {
  const date = asDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function defaultYandexWebmasterWindow(now = new Date()) {
  const date2 = shiftUtcDate(now, -1);
  return { date1: shiftUtcDate(`${date2}T12:00:00.000Z`, -13), date2 };
}

export function parseYandexWebmasterArguments(argv, now = new Date(), credentialsDefault = null) {
  const values = new Map();
  for (let index = 0; index < argv.length; index += 2) {
    const name = argv[index];
    const value = argv[index + 1];
    if (!ARGUMENTS.has(name)) throw new Error(`Unknown argument: ${name ?? "<empty>"}`);
    if (values.has(name)) throw new Error(`Duplicate argument: ${name}`);
    if (!value || value.startsWith("--")) throw new Error(`Argument ${name} requires a value`);
    values.set(name, value);
  }
  const credentials = values.get("--credentials") ?? credentialsDefault;
  if (!credentials) throw new Error("Pass --credentials or YANDEX_WEBMASTER_CREDENTIALS");

  const defaultWindow = defaultYandexWebmasterWindow(now);
  const date2 = values.get("--date2") ?? defaultWindow.date2;
  const date1 = values.get("--date1") ?? shiftUtcDate(`${date2}T12:00:00.000Z`, -13);
  return {
    credentials,
    date1,
    date2,
    output: values.get("--out") ?? ".private/search/yandex-webmaster-daily.json",
    siteUrl: values.get("--site") ?? "https://krepitv.ru/",
    sitemapFile: values.get("--sitemap-file") ?? "docs/sitemap.xml",
    sitemapUrl: values.get("--sitemap-url") ?? "https://krepitv.ru/sitemap.xml",
  };
}

function ownerMatches(metadata) {
  return typeof process.getuid !== "function" || metadata.uid === process.getuid();
}

function isOwnerOnly(metadata) {
  return (metadata.mode & 0o077) === 0 && ownerMatches(metadata);
}

export async function loadYandexWebmasterCredentials(credentialsValue, {
  projectRoot = ROOT,
} = {}) {
  if (!credentialsValue) {
    throw new Error("Pass --credentials or YANDEX_WEBMASTER_CREDENTIALS");
  }
  const requested = path.resolve(credentialsValue);
  const requestedMetadata = await lstat(requested);
  if (requestedMetadata.isSymbolicLink()) {
    const privateRoot = path.join(path.resolve(projectRoot), ".private");
    if (!isInside(privateRoot, requested)) {
      throw new Error("Yandex Webmaster credential alias must stay under .private");
    }
    let current = privateRoot;
    for (const component of path.relative(privateRoot, path.dirname(requested)).split(path.sep).filter(Boolean)) {
      current = path.join(current, component);
      const metadata = await lstat(current);
      if (metadata.isSymbolicLink() || !metadata.isDirectory() || !isOwnerOnly(metadata)) {
        throw new Error("Yandex Webmaster credential alias path is unsafe");
      }
    }
    const privateMetadata = await lstat(privateRoot);
    if (privateMetadata.isSymbolicLink() || !privateMetadata.isDirectory() || !isOwnerOnly(privateMetadata)) {
      throw new Error("Yandex Webmaster credential alias path is unsafe");
    }
  }
  const [resolvedCredentials, resolvedProject] = await Promise.all([
    realpath(requested),
    realpath(projectRoot),
  ]);
  if (isInside(resolvedProject, resolvedCredentials)) {
    throw new Error("Yandex Webmaster credentials must be outside the repository");
  }
  const metadata = await stat(resolvedCredentials);
  if (!metadata.isFile() || !isOwnerOnly(metadata)) {
    throw new Error("Yandex Webmaster credentials must be a regular owner-only file");
  }
  let parsed;
  try {
    parsed = JSON.parse(await readFile(resolvedCredentials, "utf8"));
  } catch {
    throw new Error("Yandex Webmaster credentials contain invalid JSON");
  }
  return validateYandexWebmasterCredentials(parsed);
}

async function ensurePrivateDirectory(directory) {
  try {
    const metadata = await lstat(directory);
    if (metadata.isSymbolicLink() || !metadata.isDirectory() || !isOwnerOnly(metadata)) {
      throw new Error("Yandex Webmaster report path contains an unsafe directory");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
    await mkdir(directory, { mode: 0o700 });
    const metadata = await lstat(directory);
    if (!metadata.isDirectory() || !isOwnerOnly(metadata)) {
      throw new Error("Yandex Webmaster report directory is not owner-only");
    }
  }
}

export async function writePrivateYandexWebmasterReport(outputValue, report, {
  projectRoot = ROOT,
} = {}) {
  const root = path.resolve(projectRoot);
  const privateRoot = path.join(root, ".private");
  await ensurePrivateDirectory(privateRoot);
  const resolvedPrivateRoot = await realpath(privateRoot);
  const output = path.resolve(root, outputValue);
  if (!isInside(privateRoot, output) || output === privateRoot) {
    throw new Error("Yandex Webmaster report must be written under .private");
  }

  const relativeParent = path.relative(privateRoot, path.dirname(output));
  let current = privateRoot;
  for (const component of relativeParent.split(path.sep).filter(Boolean)) {
    current = path.join(current, component);
    await ensurePrivateDirectory(current);
  }
  const resolvedParent = await realpath(path.dirname(output));
  if (!isInside(resolvedPrivateRoot, resolvedParent)) {
    throw new Error("Yandex Webmaster report directory escapes .private");
  }

  try {
    const existing = await lstat(output);
    if (existing.isSymbolicLink() || !existing.isFile() || !ownerMatches(existing)) {
      throw new Error("Yandex Webmaster report target is unsafe");
    }
  } catch (error) {
    if (error?.code !== "ENOENT") throw error;
  }

  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  const temporary = path.join(
    resolvedParent,
    `.${path.basename(output)}.${randomBytes(8).toString("hex")}.tmp`,
  );
  try {
    await writeFile(temporary, serialized, { flag: "wx", mode: 0o600 });
    await chmod(temporary, 0o600);
    await rename(temporary, output);
    await chmod(output, 0o600);
  } finally {
    await rm(temporary, { force: true });
  }
  return output;
}

export function yandexWebmasterStdoutSummary(report) {
  const queryRows = report.search_analytics.query_url_rows;
  return {
    generated_at: report.generated_at,
    domain: report.domain,
    access_state: report.access.state,
    host_data_status: report.access.host_data_status,
    sitemap_urls: report.sitemap.production_url_count,
    robot_discovered_sitemap_state: report.sitemap.robot_discovered?.target?.state ?? "unknown",
    user_added_sitemap_state: report.sitemap.user_added?.target?.state ?? "unknown",
    indexation_state: report.indexation.state,
    searchable_pages: report.indexation.summary.searchable_pages_count ?? null,
    excluded_pages: report.indexation.summary.excluded_pages_count ?? null,
    search_state: report.search_analytics.state,
    impressions: report.search_analytics.totals.impressions,
    clicks: report.search_analytics.totals.clicks,
    query_url_state: queryRows.state,
    query_url_opportunities: queryRows.state === "available" ? queryRows.rows.length : null,
  };
}

export async function runYandexWebmasterCli({
  argv = process.argv.slice(2),
  env = process.env,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  projectRoot = ROOT,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
  stdout = process.stdout,
} = {}) {
  const options = parseYandexWebmasterArguments(
    argv,
    now,
    env.YANDEX_WEBMASTER_CREDENTIALS ?? null,
  );
  const credentials = await loadYandexWebmasterCredentials(options.credentials, { projectRoot });
  const localSitemapXml = await readFile(path.resolve(projectRoot, options.sitemapFile), "utf8");
  const report = await fetchYandexWebmasterReport({
    credentials,
    date1: options.date1,
    date2: options.date2,
    fetchImpl,
    localSitemapXml,
    now,
    siteUrl: options.siteUrl,
    sitemapUrl: options.sitemapUrl,
    sleepImpl,
  });
  await writePrivateYandexWebmasterReport(options.output, report, { projectRoot });
  stdout.write(`${JSON.stringify(yandexWebmasterStdoutSummary(report), null, 2)}\n`);
  return report;
}

export async function main() {
  await runYandexWebmasterCli();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  await main();
}
