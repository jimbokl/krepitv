import { chmod, mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { buildPlacementAttributionIndex } from "../affiliate/orders.mjs";
import { parseSitemapUrls } from "./google-search-console.mjs";
import { reconcileMetrikaGoals } from "./metrika-goals.mjs";
import { fetchMetrikaFunnel } from "./metrika-funnel.mjs";

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const counterId = argument("--counter", process.env.KREPITV_METRIKA_COUNTER_ID ?? "111176777");
const credentialsValue = argument("--credentials", process.env.YANDEX_ANALYTICS_CREDENTIALS);
const date1 = argument("--date1");
const date2 = argument("--date2");
const outputValue = argument("--out");
const siteUrl = "https://krepitv.ru/";

if (!credentialsValue || !date1 || !date2) {
  throw new Error("Pass --credentials (or YANDEX_ANALYTICS_CREDENTIALS), --date1 and --date2");
}

const credentials = JSON.parse(await readFile(path.resolve(credentialsValue), "utf8"));
const sitemap = await readFile(path.resolve("docs/sitemap.xml"), "utf8");
const [affiliateManifest, hubPlacementManifest, modelPlacementManifest] = await Promise.all([
  readFile(path.resolve("data/affiliate/market-products.json"), "utf8").then(JSON.parse),
  readFile(path.resolve("data/affiliate/seo-hub-placements.json"), "utf8").then(JSON.parse),
  readFile(path.resolve("data/affiliate/model-page-placements.json"), "utf8").then(JSON.parse),
]);
const allowedLandingPaths = new Set(
  parseSitemapUrls(sitemap, siteUrl).map((url) => new URL(url).pathname),
);
const expectedClid = affiliateManifest.cards?.[0]?.clid;
const placementAttributionIndex = buildPlacementAttributionIndex(
  affiliateManifest,
  [hubPlacementManifest, modelPlacementManifest],
  expectedClid,
);
const goals = await reconcileMetrikaGoals({
  apply: false,
  counterId,
  token: credentials.access_token,
});
if (goals.plan.some((item) => item.status !== "satisfied" || !item.goalId)) {
  throw new Error("Required Metrika goals are not uniquely configured");
}
const goalIds = Object.fromEntries(goals.plan.map((item) => [item.eventId, item.goalId]));
const report = await fetchMetrikaFunnel({
  allowedLandingPaths,
  counterId,
  date1,
  date2,
  goalIds,
  placementAttributionIndex,
  token: credentials.access_token,
});
const serialized = `${JSON.stringify(report, null, 2)}\n`;
if (outputValue) {
  const outputPath = path.resolve(outputValue);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, serialized, { mode: 0o600 });
  // `mode` only applies when a file is first created. Enforce it again so an
  // existing report with broader permissions cannot remain world-readable.
  await chmod(outputPath, 0o600);
}
process.stdout.write(serialized);
