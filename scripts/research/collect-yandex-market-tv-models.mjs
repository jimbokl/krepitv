import { createHash } from "node:crypto";
import { gunzip, gzip } from "node:zlib";
import { promisify } from "node:util";
import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  deduplicateMarketProducts,
  matchCatalogModel,
  parseMarketCategoryPage,
} from "./yandex-market-tv-lib.mjs";

const gzipAsync = promisify(gzip);
const gunzipAsync = promisify(gunzip);
const ROOT = path.resolve(import.meta.dirname, "../..");
const PUBLIC_SOURCE_URL = "https://market.yandex.ru/category/televizory-hd-tv";
const FETCH_URL = "https://marketapp.integration.market.yandex.ru/category/televizory-hd-tv";
const USER_AGENT = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36";
const observedAt = new Date().toISOString();
const date = observedAt.slice(0, 10);

function argument(name, fallback) {
  const index = process.argv.indexOf(name);
  return index === -1 ? fallback : process.argv[index + 1];
}

function integerArgument(name, fallback) {
  const value = Number(argument(name, fallback));
  if (!Number.isInteger(value) || value < 1) throw new Error(`${name} must be a positive integer`);
  return value;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pageUrl(page) {
  const url = new URL(FETCH_URL);
  if (page > 1) url.searchParams.set("page", String(page));
  return url;
}

async function fetchPage(page, attempts = 4) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(pageUrl(page), {
        redirect: "follow",
        headers: {
          "user-agent": USER_AGENT,
          "accept-language": "ru-RU,ru;q=0.9",
          accept: "text/html,application/xhtml+xml",
        },
        signal: AbortSignal.timeout(45_000),
      });
      const html = await response.text();
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const parsed = parseMarketCategoryPage(html, page);
      return { html, parsed };
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await sleep(attempt * 7_500);
    }
  }
  throw new Error(`Page ${page} failed after ${attempts} attempts: ${lastError?.message ?? lastError}`);
}

function csvCell(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

function csvFor(rows) {
  const columns = [
    "observed_rank", "page", "page_rank", "market_product_id", "brand", "model_candidate",
    "model_candidate_confidence", "market_title", "purchase_count", "purchase_label", "rating_value",
    "rating_count", "sponsored", "currently_listed", "already_in_catalog", "catalog_model_id",
    "catalog_model", "market_url", "observed_at",
  ];
  return [
    columns.join(","),
    ...rows.map((row) => columns.map((column) => csvCell(row[column])).join(",")),
  ].join("\n");
}

function reportFor(manifest) {
  const { summary, products } = manifest;
  const topMissing = products
    .filter((product) => !product.already_in_catalog)
    .sort((left, right) => (
      (right.purchase_count ?? -1) - (left.purchase_count ?? -1)
      || (right.rating_count ?? -1) - (left.rating_count ?? -1)
      || left.observed_rank - right.observed_rank
    ))
    .slice(0, 40);
  const lines = [
    `# Телевизоры в текущей выдаче Яндекс Маркета — ${date}`,
    "",
    `Собрано **${summary.unique_products}** уникальных доступных карточек с ${summary.pages_collected} страниц `
      + `категории. Маркет сообщил ${summary.reported_total_min}–${summary.reported_total_max} товаров; `
      + "внешняя SSR-выдача ограничивает просмотр тридцатью страницами, поэтому это верхний популярный срез, а не заявление о полном охвате каталога.",
    "",
    `С текущим проверенным каталогом KREPI TV совпало **${summary.matched_existing}** карточек. `
      + `Новых кандидатов: **${summary.missing_from_catalog}**.`,
    "",
    "## Как использовать",
    "",
    "- Сначала проверять модели с большим публичным счётчиком «купили»: это наиболее близкий к покупке телевизора сигнал.",
    "- Перед добавлением модели на сайт отдельно подтвердить точную модификацию, VESA, массу и крепёж по официальному источнику.",
    "- Не создавать SEO-страницу только по факту присутствия на Маркете: спрос query→page и отсутствие каннибализации остаются обязательными.",
    "- Цены и рекламные параметры намеренно не собирались; ссылки ниже канонические и не партнёрские.",
    "",
    "## Первые новые кандидаты по сигналу покупок",
    "",
    "| № | Бренд | Модель-кандидат | Публичный сигнал | Рейтинг | Карточка |",
    "|---:|---|---|---:|---:|---|",
    ...topMissing.map((row, index) => (
      `| ${index + 1} | ${row.brand ?? "—"} | ${row.model_candidate ?? row.market_title} | `
      + `${row.purchase_count ?? "—"} | ${row.rating_value ?? "—"} | [Маркет](${row.market_url}) |`
    )),
    "",
    "## Воспроизводимость",
    "",
    `- Публичная категория: <${PUBLIC_SOURCE_URL}>`,
    `- Наблюдение: ${manifest.observed_at}`,
    `- Страниц собрано: ${summary.pages_collected} из доступных ${summary.page_count_observed}`,
    `- Полнота прохода: ${summary.collection_complete ? "запрошенный диапазон пройден" : "частичный срез; причина записана в JSON-манифесте"}`,
    `- SHA-256 нормализованного набора: \`${manifest.batch_sha256}\``,
    "- Сырые HTML-снимки сжаты и сохранены только в `.private/research/`; в git не попадают.",
    "",
  ];
  return lines.join("\n");
}

const maxPages = integerArgument("--max-pages", 30);
const delayMs = integerArgument("--delay-ms", 2_500);
const attempts = integerArgument("--attempts", 4);
const resumePartialArgument = argument("--resume", null);
const resumePartialPath = resumePartialArgument ? path.resolve(ROOT, resumePartialArgument) : null;
const rawInputArgument = argument("--input-raw-dir", null);
const rawInputPath = rawInputArgument ? path.resolve(ROOT, rawInputArgument) : null;
const catalogPath = path.resolve(ROOT, argument("--catalog", "data/tv_models.json"));
const outputPath = path.resolve(ROOT, argument("--output", "data/research/yandex-market-tv-models.json"));
const csvPath = path.resolve(ROOT, argument("--csv", `product-docs/research/yandex-market-tv-models-${date}.csv`));
const reportPath = path.resolve(ROOT, argument("--report", `product-docs/research/yandex-market-tv-models-${date}.md`));
const rawDirectory = path.resolve(ROOT, argument(
  "--raw-dir",
  rawInputPath
    ? rawInputPath
    : resumePartialPath
    ? path.dirname(resumePartialPath)
    : `.private/research/yandex-market-tv-models-${observedAt.replaceAll(":", "-")}`,
));

const catalogModels = JSON.parse(await readFile(catalogPath, "utf8"));
if (!Array.isArray(catalogModels) || !catalogModels.length) throw new Error("TV catalog is empty");
await Promise.all([
  mkdir(path.dirname(outputPath), { recursive: true }),
  mkdir(path.dirname(csvPath), { recursive: true }),
  mkdir(path.dirname(reportPath), { recursive: true }),
  mkdir(rawDirectory, { recursive: true }),
]);

let resumed = resumePartialPath
  ? JSON.parse(await readFile(resumePartialPath, "utf8"))
  : { pages: [], products: [] };
if (rawInputPath) {
  const rawFiles = (await readdir(rawInputPath))
    .filter((file) => /^page-\d+\.html\.gz$/u.test(file))
    .sort();
  if (!rawFiles.length) throw new Error("Raw Market snapshot directory has no page HTML files");
  const pages = [];
  const products = [];
  for (const file of rawFiles) {
    const page = Number(file.match(/page-(\d+)/u)[1]);
    const html = (await gunzipAsync(await readFile(path.join(rawInputPath, file)))).toString("utf8");
    const parsed = parseMarketCategoryPage(html, page);
    pages.push(parsed.metadata);
    products.push(...parsed.products);
  }
  resumed = { observed_at: observedAt, pages, products };
  process.stdout.write(`Local reparse: ${pages.length} saved pages\n`);
}
const pageMetadata = Array.isArray(resumed.pages) ? resumed.pages : [];
const collected = Array.isArray(resumed.products) ? resumed.products : [];
let pageCount = rawInputPath
  ? pageMetadata.length
  : pageMetadata.length
  ? Math.min(maxPages, pageMetadata.at(-1).page_count)
  : maxPages;
const startPage = pageMetadata.length + 1;
let stopReason = rawInputPath
  ? "Локально пересчитаны сохранённые страницы; следующая страница источника ранее возвращала внутреннюю ошибку."
  : null;
if (startPage > 1) process.stdout.write(`Resume: ${pageMetadata.length} pages already collected\n`);
for (let page = startPage; page <= Math.min(maxPages, pageCount); page += 1) {
  let fetched;
  try {
    fetched = await fetchPage(page, attempts);
  } catch (error) {
    stopReason = `Сбор остановлен перед страницей ${page}: ${error.message}`;
    process.stderr.write(`${stopReason}\n`);
    break;
  }
  const { html, parsed } = fetched;
  pageCount = Math.min(maxPages, parsed.metadata.page_count);
  const rawPath = path.join(rawDirectory, `page-${String(page).padStart(2, "0")}.html.gz`);
  await writeFile(rawPath, await gzipAsync(html, { level: 9 }));
  pageMetadata.push(parsed.metadata);
  collected.push(...parsed.products);
  await writeFile(
    path.join(rawDirectory, "normalized.partial.json"),
    `${JSON.stringify({ observed_at: observedAt, pages: pageMetadata, products: collected }, null, 2)}\n`,
  );
  process.stdout.write(
    `${page}/${pageCount}: ${parsed.metadata.extracted_count} карточек, `
      + `Маркет сообщает ${parsed.metadata.reported_total}\n`,
  );
  if (page < pageCount) await sleep(delayMs);
}

const products = deduplicateMarketProducts(collected).map((product, index) => {
  const match = matchCatalogModel(product, catalogModels);
  return {
    ...product,
    observed_rank: index + 1,
    already_in_catalog: Boolean(match),
    ...(match ?? {
      catalog_model_id: null,
      catalog_brand: null,
      catalog_model: null,
      match_type: null,
    }),
    observed_at: observedAt,
  };
});
const batchSha256 = createHash("sha256").update(JSON.stringify(products)).digest("hex");
const reportedTotals = pageMetadata.map((page) => page.reported_total).filter(Number.isFinite);
const manifest = {
  schema_version: 1,
  research_contract: {
    product: "KREPI TV",
    purpose: "Найти телевизоры, которые сейчас присутствуют в верхней выдаче Маркета, для последующей проверки VESA и поискового спроса",
    public_source_url: PUBLIC_SOURCE_URL,
    actual_fetch_origin: new URL(FETCH_URL).origin,
    region_context: "Москва (контекст публичной SSR-выдачи источника)",
    scope: "Верхний срез популярной выдачи категории; не полный каталог и не прогноз трафика",
    exclusions: ["цены", "персональные данные", "cookie", "CPC и tracking-параметры", "партнёрские ссылки"],
    availability_rule: "Карточка присутствует в выдаче и содержит доступный оффер на момент сбора",
    catalog_match_rule: "Точный нормализованный токен модели и совместимый бренд; без нечёткого совпадения",
  },
  observed_at: observedAt,
  batch_sha256: batchSha256,
  summary: {
    pages_collected: pageMetadata.length,
    page_count_observed: Math.max(...pageMetadata.map((page) => page.page_count)),
    requested_max_pages: maxPages,
    collection_complete: !rawInputPath && pageMetadata.length >= Math.min(maxPages, pageCount),
    stop_reason: stopReason,
    reported_total_min: Math.min(...reportedTotals),
    reported_total_max: Math.max(...reportedTotals),
    extracted_rows: collected.length,
    unique_products: products.length,
    matched_existing: products.filter((product) => product.already_in_catalog).length,
    missing_from_catalog: products.filter((product) => !product.already_in_catalog).length,
    with_purchase_signal: products.filter((product) => product.purchase_count !== null).length,
  },
  pages: pageMetadata,
  products,
};

await Promise.all([
  writeFile(outputPath, `${JSON.stringify(manifest, null, 2)}\n`),
  writeFile(csvPath, `${csvFor(products)}\n`),
  writeFile(reportPath, reportFor(manifest)),
  writeFile(path.join(rawDirectory, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`),
]);
process.stdout.write(
  `Saved ${products.length} unique products; ${manifest.summary.matched_existing} already in catalog; `
    + `batch ${batchSha256}\n`,
);
