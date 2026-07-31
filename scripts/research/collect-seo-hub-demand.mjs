import { createHash } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const REGION_ID = "225";
const SOURCE_URL = "https://wordstat.yandex.ru/";
const SOURCE_LABEL =
  "Яндекс Wordstat через XMLRiver: Top queries, запрос в кавычках и квадратных скобках, Россия, все устройства";
const DEFAULT_SECRET = path.join(os.homedir(), ".codex/secrets/xmlriver-wordstat.json");
const observedAt = new Date().toISOString();
const date = observedAt.slice(0, 10);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

const seedPath = path.resolve(
  ROOT,
  argument("--seeds", "data/research/seo-hub-demand-seeds.json"),
);
const outputRoot = path.resolve(
  ROOT,
  argument("--output", `product-docs/research/raw/wordstat-seo-hubs-${date}`),
);
const manifestOutput = path.resolve(
  ROOT,
  argument("--manifest-output", "data/research/seo-hub-demand.json"),
);
const secretPath = argument("--secret", process.env.XMLRIVER_WORDSTAT_SECRET ?? DEFAULT_SECRET);
const reuseRaw = process.argv.includes("--reuse-raw");

function normalize(value) {
  return String(value)
    .toLocaleLowerCase("ru")
    .replace(/["!]/g, "")
    .replace(/[‐‑‒–—−-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function strictPhrase(query) {
  const clean = query.replaceAll('"', "").replaceAll("[", "").replaceAll("]", "").trim();
  return `"[${clean}]"`;
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
      throw new Error(
        `Wordstat failed for ${query}: HTTP ${response.status}, code ${payload?.code ?? "none"}`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, attempt * 1_500));
  }
  throw new Error(`Wordstat retry loop exhausted for ${query}`);
}

function readFrequency(payload, query) {
  const popular = payload?.popular ?? payload?.table?.tableData?.popular ?? [];
  const exact = popular.find((item) => normalize(item?.text) === normalize(query));
  if (exact) {
    return {
      frequency: Number(exact.value),
      returned_phrase: exact.text,
      frequency_status: "measured",
      match_method: "normalized_exact",
    };
  }
  if (popular.length === 1) {
    return {
      frequency: Number(popular[0].value),
      returned_phrase: popular[0].text,
      frequency_status: "measured",
      match_method: "single_operator_result",
    };
  }
  return {
    frequency: null,
    returned_phrase: null,
    frequency_status: popular.length === 0 ? "no_data" : "ambiguous",
    match_method: popular.length === 0 ? "no_result" : "multiple_results_without_match",
  };
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

const seeds = JSON.parse(await readFile(seedPath, "utf8"));
const secret = reuseRaw ? null : JSON.parse(await readFile(secretPath, "utf8"));
if (!Array.isArray(seeds) || !seeds.length) throw new Error("SEO hub seed list is empty");
if (!reuseRaw && (!secret?.baseUrl || !secret?.user || !secret?.key)) {
  throw new Error("Wordstat secret is incomplete");
}

const normalizedSeedKeys = new Set();
for (const seed of seeds) {
  if (!seed?.candidate_id || !seed?.candidate_path || !seed?.query || !seed?.variant) {
    throw new Error("Every seed requires candidate_id, candidate_path, query and variant");
  }
  const key = normalize(seed.query);
  if (normalizedSeedKeys.has(key)) throw new Error(`Duplicate query: ${seed.query}`);
  normalizedSeedKeys.add(key);
}

const landingCandidates = [...new Set(seeds.map((seed) => seed.candidate_path))]
  .sort((left, right) => left.localeCompare(right, "ru"))
  .map((pathname) => new URL(pathname, "https://krepitv.ru").href);

await mkdir(outputRoot, { recursive: true });
const savedRaw = reuseRaw
  ? JSON.parse(await readFile(path.join(outputRoot, "raw.json"), "utf8"))
  : [];
const savedRawByOperator = new Map(
  savedRaw.map((item) => [item.operator_query, item.response]),
);
const raw = [];
const normalized = [];

for (let index = 0; index < seeds.length; index += 1) {
  const seed = seeds[index];
  const operatorQuery = strictPhrase(seed.query);
  const response = reuseRaw
    ? savedRawByOperator.get(operatorQuery)
    : await fetchWordstat(secret, operatorQuery);
  if (!response) throw new Error(`No reusable raw response for ${operatorQuery}`);
  const frequencyResult = readFrequency(response, seed.query);
  raw.push({ seed, operator_query: operatorQuery, response });
  normalized.push({
    ...seed,
    operator_query: operatorQuery,
    seo_frequency: frequencyResult.frequency,
    returned_phrase: frequencyResult.returned_phrase,
    frequency_status: frequencyResult.frequency_status,
    match_method: frequencyResult.match_method,
    seo_region_id: Number(REGION_ID),
    seo_region: "Россия",
    seo_period: "последний месяц на дату сбора в Top queries",
    seo_devices: "все устройства",
    observed_at: observedAt,
    source_url: SOURCE_URL,
    source_label: SOURCE_LABEL,
  });
  await writeFile(path.join(outputRoot, "raw.partial.json"), `${JSON.stringify(raw, null, 2)}\n`);
  await writeFile(
    path.join(outputRoot, "normalized.partial.json"),
    `${JSON.stringify(normalized, null, 2)}\n`,
  );
  process.stdout.write(
    `${index + 1}/${seeds.length} ${seed.query}: ${frequencyResult.frequency ?? frequencyResult.frequency_status}\n`,
  );
  if (!reuseRaw) await new Promise((resolve) => setTimeout(resolve, 500));
}

normalized.sort(
  (left, right) =>
    left.candidate_id.localeCompare(right.candidate_id, "ru") ||
    Number(right.seo_frequency ?? -1) - Number(left.seo_frequency ?? -1) ||
    left.query.localeCompare(right.query, "ru"),
);
const batchSha256 = createHash("sha256").update(JSON.stringify(seeds)).digest("hex");
const manifest = {
  schema_version: 1,
  research_contract: {
    product: "KREPI TV — независимый подбор кронштейна по точной модели телевизора",
    landing_candidates: landingCandidates,
    intended_conversion:
      "Проверка совместимости в собственном сервисе и необязательный переход по прямой партнёрской ссылке на Яндекс Маркет",
    relevance_rule:
      "Запрос о выборе или покупке кронштейна для телевизора, представленного в проверенном каталоге; исключаются услуги монтажа, мебель, мониторы и несвязанные крепления",
    region_id: Number(REGION_ID),
    region: "Россия",
    period: "последний месяц на дату сбора в Top queries",
    devices: "все устройства",
    currency: "не применимо: CPC не собирался",
    search_scope: "поисковый спрос Wordstat Top queries; не CPC, не прогноз кликов и не награда",
    operator:
      "кавычки фиксируют число слов, квадратные скобки фиксируют порядок, ! фиксирует словоформу указанного слова",
    batch_size: seeds.length,
    authorization: "только исследование; запуск рекламы и расход не разрешены",
    interpretation:
      "Варианты одной посадочной могут пересекаться морфологически, поэтому их частоты нельзя автоматически складывать",
    history_exclusion:
      "Динамика Wordstat не используется для operator-sensitive частоты: по справке Яндекса там действует только оператор +",
    source_url: SOURCE_URL,
    source_label: SOURCE_LABEL,
    raw_output: path.relative(ROOT, outputRoot),
    normalized_output: path.relative(ROOT, manifestOutput),
  },
  observed_at: observedAt,
  batch_sha256: batchSha256,
  queries: normalized,
};
const columns = [
  "candidate_id",
  "candidate_path",
  "query",
  "variant",
  "operator_query",
  "seo_frequency",
  "returned_phrase",
  "frequency_status",
  "match_method",
  "seo_region_id",
  "seo_region",
  "seo_period",
  "seo_devices",
  "observed_at",
  "source_url",
];
const csv = [
  columns.join(","),
  ...normalized.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
].join("\n");

await Promise.all([
  writeFile(path.join(outputRoot, "raw.json"), `${JSON.stringify(raw, null, 2)}\n`),
  writeFile(path.join(outputRoot, "normalized.json"), `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(path.join(outputRoot, "normalized.csv"), `${csv}\n`),
  writeFile(manifestOutput, `${JSON.stringify(manifest, null, 2)}\n`),
]);
await Promise.all([
  unlink(path.join(outputRoot, "raw.partial.json")).catch(() => {}),
  unlink(path.join(outputRoot, "normalized.partial.json")).catch(() => {}),
]);

process.stdout.write(`Saved ${seeds.length} rows; batch ${batchSha256}; ${outputRoot}\n`);
