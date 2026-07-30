import { createHash } from "node:crypto";
import { readFile, mkdir, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const REGION_ID = "225";
const SOURCE_URL = "https://wordstat.yandex.ru/";
const SOURCE_LABEL = "Яндекс Wordstat через XMLRiver: запрос в кавычках, Россия, все устройства";
const DEFAULT_SECRET = path.join(os.homedir(), ".codex/secrets/xmlriver-wordstat.json");
const checkedAt = new Date().toISOString();
const date = checkedAt.slice(0, 10);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const seedPath = path.resolve(ROOT, argument("--seeds", "data/research/tv-model-demand-seeds.json"));
const outputRoot = path.resolve(
  ROOT,
  argument("--output", `product-docs/research/raw/wordstat-tv-models-${date}`),
);
const secretPath = argument("--secret", process.env.XMLRIVER_WORDSTAT_SECRET ?? DEFAULT_SECRET);

function normalize(value) {
  return String(value)
    .toLocaleLowerCase("ru")
    .replace(/["!]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function strictPhrase(model) {
  return `"[${model.replaceAll('"', "").replaceAll("[", "").replaceAll("]", "")}]"`;
}

function requestUrl(secret, query) {
  const url = new URL(secret.baseUrl);
  url.searchParams.set("user", secret.user);
  url.searchParams.set("key", secret.key);
  url.searchParams.set("query", query);
  url.searchParams.set("regions", REGION_ID);
  url.searchParams.set("pagetype", "words");
  return url;
}

async function fetchWordstat(secret, query) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const response = await fetch(requestUrl(secret, query), { redirect: "follow" });
    const body = await response.text();
    let payload;
    try {
      payload = JSON.parse(body);
    } catch {
      if (attempt === 5) throw new Error(`Wordstat returned non-JSON for ${query}`);
      await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
      continue;
    }
    if (response.ok && !payload?.error && !payload?.code) return payload;
    const retryable = [101, 110, 115, 500].includes(Number(payload?.code));
    if (!retryable || attempt === 5) {
      throw new Error(`Wordstat failed for ${query}: HTTP ${response.status}, code ${payload?.code ?? "none"}`);
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
  }
  throw new Error(`Wordstat retry loop exhausted for ${query}`);
}

function readFrequency(payload, model) {
  const popular = payload?.popular ?? payload?.table?.tableData?.popular ?? [];
  const exact = popular.find((item) => normalize(item?.text) === normalize(model));
  return exact ? Number(exact.value) : 0;
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const seeds = JSON.parse(await readFile(seedPath, "utf8"));
const secret = JSON.parse(await readFile(secretPath, "utf8"));
if (!Array.isArray(seeds) || !seeds.length) throw new Error("Demand seed list is empty");
if (!secret?.baseUrl || !secret?.user || !secret?.key) throw new Error("Wordstat secret is incomplete");

await mkdir(outputRoot, { recursive: true });
const raw = [];
const normalized = [];

for (let index = 0; index < seeds.length; index += 1) {
  const seed = seeds[index];
  const operatorQuery = strictPhrase(seed.model);
  const response = await fetchWordstat(secret, operatorQuery);
  const seoFrequency = readFrequency(response, seed.model);
  raw.push({ seed, operator_query: operatorQuery, response });
  normalized.push({
    ...seed,
    operator_query: operatorQuery,
    seo_frequency: seoFrequency,
    seo_region_id: Number(REGION_ID),
    seo_region: "Россия",
    seo_period: "последние 30 дней на дату сбора",
    seo_devices: "все устройства",
    observed_at: checkedAt,
    source_url: SOURCE_URL,
    source_label: SOURCE_LABEL,
  });
  await writeFile(path.join(outputRoot, "raw.partial.json"), `${JSON.stringify(raw, null, 2)}\n`);
  await writeFile(path.join(outputRoot, "normalized.partial.json"), `${JSON.stringify(normalized, null, 2)}\n`);
  process.stdout.write(`${index + 1}/${seeds.length} ${seed.model}: ${seoFrequency}\n`);
  await new Promise((resolve) => setTimeout(resolve, 500));
}

normalized.sort((left, right) => right.seo_frequency - left.seo_frequency || left.model.localeCompare(right.model, "ru"));
const batchSha256 = createHash("sha256")
  .update(JSON.stringify(seeds.map(({ brand, model }) => ({ brand, model }))))
  .digest("hex");
const manifest = {
  schema_version: 1,
  research_contract: {
    product: "KREPI TV",
    landing_page: "https://krepitv.ru/modeli/",
    intended_conversion: "Переход к подходящему кронштейну на Яндекс Маркете после технической проверки",
    relevance_rule: "Точная модель телевизора или точное поколение модели; без смешивания региональных суффиксов",
    region_id: Number(REGION_ID),
    region: "Россия",
    period: "последние 30 дней на дату сбора",
    devices: "все устройства",
    scope: "поисковый спрос Wordstat; не CPC и не прогноз кликов",
    operator: "кавычки фиксируют число слов, квадратные скобки фиксируют их порядок",
    source_url: SOURCE_URL,
    source_label: SOURCE_LABEL,
  },
  observed_at: checkedAt,
  batch_sha256: batchSha256,
  models: normalized,
};
const columns = [
  "demand_rank", "brand", "model", "series", "diagonal_inches", "operator_query",
  "seo_frequency", "seo_region_id", "seo_region", "seo_period", "seo_devices",
  "observed_at", "source_url",
];
const csv = [
  columns.join(","),
  ...normalized.map((row, index) => columns.map((column) => csvCell(column === "demand_rank" ? index + 1 : row[column])).join(",")),
].join("\n");

await Promise.all([
  writeFile(path.join(outputRoot, "raw.json"), `${JSON.stringify(raw, null, 2)}\n`),
  writeFile(path.join(outputRoot, "normalized.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(path.join(outputRoot, "normalized.csv"), `${csv}\n`),
  writeFile(path.join(ROOT, "data/research/tv-model-demand.json"), `${JSON.stringify(manifest, null, 2)}\n`),
]);
await Promise.all([
  unlink(path.join(outputRoot, "raw.partial.json")).catch(() => {}),
  unlink(path.join(outputRoot, "normalized.partial.json")).catch(() => {}),
]);

process.stdout.write(`Saved ${seeds.length} rows; batch ${batchSha256}; ${outputRoot}\n`);
