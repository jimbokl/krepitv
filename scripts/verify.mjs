import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { isDeepStrictEqual } from "node:util";
import { fileURLToPath } from "node:url";
import { validateCoverageManifest } from "./catalog/coverage-lib.mjs";
import { validateMarketModelPages } from "./catalog/market-model-page-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const origin = "https://krepitv.ru";
const maximumAffiliateAgeMs = 48 * 60 * 60 * 1000;
const affiliateFutureToleranceMs = 5 * 60 * 1000;
const corePagesUpdatedAt = "2026-08-20";
const marketModelsUpdatedAt = "2026-08-05";
const modelPagesUpdatedAt = "2026-08-20";
const trafficPagesUpdatedAt = "2026-08-06";
const seoFunnelUpdatedAt = "2026-08-08";
const maximumInitialJsBytes = 300 * 1024;
const maximumModelChunkBytes = 40 * 1024;
const maximumSeoChunkBytes = 400 * 1024;
const baselineIndexableUrlCount = 299;
const legacyVerifiedModelAliases = new Map([
  ["/modeli/tcl-v6c/", "/modeli/tcl-50v6c/"],
  ["/modeli/tcl-q6cs/", "/modeli/tcl-55q6cs/"],
  ["/modeli/tcl-t8d/", "/modeli/tcl-55t8d/"],
  ["/modeli/tcl-q7d/", "/modeli/tcl-65q7d/"],
]);
const legacyVerifiedModelRoutes = new Set(legacyVerifiedModelAliases.keys());
const removedAffiliateDisclaimerFragments = [
  "Партнёрская ссылка на Яндекс Маркет",
  "Если вы оформите заказ",
  "Крепи ТВ может получить вознаграждение",
  "Цена для вас не меняется",
];
const numericCurrencyPattern = /(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu;
const expectedCommercialProfiles = new Set([
  "mount:onkron-tm6:/kronshteyny/onkron-tm6/",
  "mount:onkron-tm5-bw:/kronshteyny/onkron-tm5-bw/",
  "mount:onkron-nn24:/kronshteyny/onkron-nn24/",
  "mount:itech-plb440nt:/kronshteyny/itech-plb440nt/",
  "mount:itech-ptrb440ln:/kronshteyny/itech-ptrb440ln/",
  "mount:itech-slt-460:/kronshteyny/itech-slt-460/",
  "model:tcl-55c6k:/modeli/tcl-55c6k/",
  "model:tuvio-td100ufbhh12:/modeli/tuvio-td100ufbhh12/",
  "model:tcl-55c7l:/modeli/tcl-55c7l/",
  "model:hisense-55u7s:/modeli/hisense-55u7s/",
  "model:hisense-65u7s:/modeli/hisense-65u7s/",
  "model:hisense-55u7s-pro:/modeli/hisense-55u7s-pro/",
  "model:hisense-55e77sl:/modeli/hisense-55e77sl/",
  "model:hisense-50u77sl:/modeli/hisense-50u77sl/",
  "model:hisense-65u77sl:/modeli/hisense-65u77sl/",
  "model:hisense-50e7s:/modeli/hisense-50e7s/",
  "model:hisense-55e7s:/modeli/hisense-55e7s/",
  "model:samsung-ue43u8000fuxru:/modeli/samsung-ue43u8000fuxru/",
  "model:samsung-ue50u8000fuxru:/modeli/samsung-ue50u8000fuxru/",
  "model:samsung-ue55u8000fuxru:/modeli/samsung-ue55u8000fuxru/",
  "model:tcl-55c7k:/modeli/tcl-55c7k/",
  "model:tcl-65c7k:/modeli/tcl-65c7k/",
  "model:tcl-75c6k:/modeli/tcl-75c6k/",
  "model:lg-oled55c5rla:/modeli/lg-oled55c5rla/",
  "model:samsung-qe43q7faauxru:/modeli/samsung-qe43q7faauxru/",
  "model:samsung-qe50q7faauxru:/modeli/samsung-qe50q7faauxru/",
  "model:samsung-ue32f6000fuxru:/modeli/samsung-ue32f6000fuxru/",
  "model:hisense-65u8q:/modeli/hisense-65u8q/",
  "model:hisense-65u7q:/modeli/hisense-65u7q/",
  "model:hisense-65ur9s:/modeli/hisense-65ur9s/",
  "model:tcl-55p6k:/modeli/tcl-55p6k/",
  "model:tcl-55p7k:/modeli/tcl-55p7k/",
  "model:tcl-43s5k:/modeli/tcl-43s5k/",
]);
const expectedWallMountScrewPassports = new Set([
  "candy-uno-32",
  "tcl-55c6k",
  "tcl-55c7l",
  "tcl-55c7k",
  "tcl-65c7k",
  "tcl-75c6k",
  "tcl-55p6k",
  "tcl-55p7k",
  "hisense-43e7s",
  "hisense-50e7s",
  "hisense-50u77sl",
  "hisense-55e7s",
  "hisense-55e77sl",
  "hisense-55u7q",
  "hisense-55u7s",
  "hisense-55u7s-pro",
  "hisense-65u7q",
  "hisense-65u7s",
  "hisense-65u77sl",
  "hisense-65u8q",
  "hisense-65ur9s",
  "samsung-qe43q7faauxru",
  "samsung-qe50q7faauxru",
  "samsung-ue32f6000fuxru",
  "samsung-ue43u8000fuxru",
  "samsung-ue50u8000fuxru",
  "samsung-ue55u8000fuxru",
]);
const seoHubAffiliatePaths = new Set([
  "/kronshteyny-onkron/",
  "/kupit-kronshteyn-dlya-televizora/",
  "/kronshteyny-kromax/",
  "/tipy-kronshteynov/vydvizhnoy/",
  "/kronshteyny-holder/",
  "/kronshteyny-itechmount/",
]);

async function walk(directory) {
  const entries = await readdir(directory);
  const files = [];
  for (const entry of entries) {
    const absolute = path.join(directory, entry);
    if ((await stat(absolute)).isDirectory()) files.push(...(await walk(absolute)));
    else files.push(absolute);
  }
  return files;
}

function assertMinimum(items, minimum, label) {
  if (items.length < minimum) {
    throw new Error(`${label}: ожидалось не менее ${minimum}, найдено ${items.length}`);
  }
}

function assertUnique(items, label) {
  const seen = new Set();
  for (const item of items) {
    if (!item || seen.has(item)) {
      throw new Error(`${label}: пустое или повторяющееся значение «${item ?? ""}»`);
    }
    seen.add(item);
  }
}

function routeFromHtmlFile(file) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  if (relative === "index.html") return "/";
  if (relative === "404.html") return "/404.html";
  return `/${relative.replace(/index\.html$/, "")}`;
}

function dataPageRoute(page) {
  return page.path;
}

function matchAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
}

function decodeHtmlAttribute(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function escapeHtmlText(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function metaContent(html, name) {
  const tags = html.match(/<meta\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => matchAttribute(candidate, "name").toLowerCase() === name);
  return tag ? matchAttribute(tag, "content") : "";
}

function canonicalFromHtml(html) {
  const tags = html.match(/<link\b[^>]*>/gi) ?? [];
  const tag = tags.find((candidate) => matchAttribute(candidate, "rel").toLowerCase() === "canonical");
  return tag ? matchAttribute(tag, "href") : "";
}

function titleFromHtml(html) {
  return html.match(/<title>([^<]+)<\/title>/i)?.[1].trim() ?? "";
}

function jsonLdFromHtml(html, route) {
  const blocks = [
    ...html.matchAll(
      /<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  ].map((match) => match[1].trim());
  if (blocks.length === 0) {
    throw new Error(`Нет JSON-LD: ${route}`);
  }
  return blocks.map((raw) => {
    if (/[<>&]/.test(raw)) {
      throw new Error(`JSON-LD содержит небезопасный HTML-символ: ${route}`);
    }
    try {
      return JSON.parse(raw);
    } catch (error) {
      throw new Error(`Некорректный JSON-LD на ${route}: ${error.message}`);
    }
  });
}

function normalizeInternalHref(href, sourceRoute) {
  if (!href || /^(?:#|mailto:|tel:|javascript:)/i.test(href)) return null;
  let url;
  try {
    url = new URL(href, `${origin}${sourceRoute}`);
  } catch {
    return null;
  }
  if (url.origin !== origin) return null;
  // Downloadable files are verified as build artifacts separately; they are not HTML routes.
  if (path.posix.extname(url.pathname)) return null;
  return url.pathname.endsWith("/") ? url.pathname : `${url.pathname}/`;
}

function assertHttpsSource(item, label) {
  let url;
  try {
    url = new URL(item.source_url);
  } catch {
    throw new Error(`${label}: некорректный URL источника ${item.source_url ?? ""}`);
  }
  if (url.protocol !== "https:" || !url.hostname) {
    throw new Error(`${label}: источник должен быть доступен по HTTPS`);
  }
}

function assertExactKeys(value, expected, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label}: ожидался объект`);
  }
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  if (actual.length !== wanted.length || actual.some((key, index) => key !== wanted[index])) {
    throw new Error(
      `${label}: неверный набор полей (${actual.join(", ") || "пусто"})`,
    );
  }
}

function assertNonEmptyString(value, label) {
  if (typeof value !== "string" || !value.trim() || value !== value.trim()) {
    throw new Error(`${label}: ожидалась непустая строка без внешних пробелов`);
  }
}

function assertNoNumericPrice(profile) {
  const text = [
    profile.title,
    profile.description,
    profile.kicker,
    profile.heading,
    profile.answer,
    ...profile.faq.flatMap((item) => [item.question, item.answer]),
  ].join("\n");
  const currency = /(?:₽|\bруб(?:\.|ль|ля|лей)?\b)/iu;
  const numericPrice = /\b(?:цена|стоимость)\s*(?::|—|–|-)?\s*(?:от\s+|до\s+)?\d/iu;
  if (currency.test(text) || numericPrice.test(text)) {
    throw new Error(
      `Коммерческий профиль ${profile.entity_kind}:${profile.entity_id} содержит числовую цену или обозначение рублей`,
    );
  }
}

function containsNumberToken(value, number) {
  const escaped = String(number).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(?:^|\\D)${escaped}(?:\\D|$)`, "u").test(value);
}

async function assertRouteChunkBudget(files, pattern, maximumBytes, label) {
  const matches = files.filter((file) => pattern.test(path.basename(file)));
  if (matches.length !== 1) {
    throw new Error(`Ожидался один отдельный JS-чанк для «${label}», найдено ${matches.length}`);
  }
  const bytes = (await stat(matches[0])).size;
  if (bytes > maximumBytes) {
    throw new Error(`JS-чанк «${label}» слишком велик: ${bytes} байт из ${maximumBytes}`);
  }
}

const files = await walk(docs);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
const yandexVerificationFiles = htmlFiles.filter((file) =>
  /^yandex_[a-f0-9]+\.html$/i.test(path.basename(file)),
);
const googleVerificationFiles = htmlFiles.filter((file) =>
  /^google[a-z0-9_-]+\.html$/i.test(path.basename(file)),
);
const verificationFiles = [...yandexVerificationFiles, ...googleVerificationFiles];
const pageHtmlFiles = htmlFiles.filter((file) => !verificationFiles.includes(file));
assertMinimum(pageHtmlFiles, 25, "HTML-страницы");

const entryScriptPaths = new Set();
for (const file of pageHtmlFiles) {
  const html = await readFile(file, "utf8");
  const entryScripts = [...html.matchAll(/<script\b[^>]*>/giu)]
    .map((match) => match[0])
    .filter((tag) => matchAttribute(tag, "type") === "module")
    .map((tag) => matchAttribute(tag, "src"))
    .filter((src) => /^\/assets\/main-[A-Za-z0-9_-]+\.js$/u.test(src));
  if (entryScripts.length !== 1) {
    throw new Error(
      `Страница ${path.relative(docs, file)} должна подключать ровно один начальный JS-бандл`,
    );
  }
  entryScriptPaths.add(entryScripts[0]);
}
if (entryScriptPaths.size !== 1) {
  throw new Error("HTML-страницы подключают разные начальные JS-бандлы");
}
const [entryScriptPath] = entryScriptPaths;
const entryScriptFile = path.join(docs, entryScriptPath.replace(/^\//u, ""));
const entryScriptBytes = (await stat(entryScriptFile)).size;
if (entryScriptBytes > maximumInitialJsBytes) {
  throw new Error(
    `Начальный JS-бандл слишком велик: ${entryScriptBytes} байт из ${maximumInitialJsBytes}`,
  );
}

const assetFiles = files.filter((file) => file.startsWith(path.join(docs, "assets")));
await assertRouteChunkBudget(
  assetFiles,
  /^ModelPage-[A-Za-z0-9_-]+\.js$/u,
  maximumModelChunkBytes,
  "модель",
);
await assertRouteChunkBudget(
  assetFiles,
  /^SeoPage-[A-Za-z0-9_-]+\.js$/u,
  maximumSeoChunkBytes,
  "SEO-страница",
);

const runtimeTextFiles = files.filter((file) => /\.(?:html|js|json)$/u.test(file));
for (const file of runtimeTextFiles) {
  const contents = await readFile(file, "utf8");
  const removedFragment = removedAffiliateDisclaimerFragments.find((fragment) =>
    contents.toLocaleLowerCase("ru-RU").includes(fragment.toLocaleLowerCase("ru-RU")),
  );
  if (removedFragment) {
    throw new Error(
      `Удалённый партнёрский дисклеймер вернулся в runtime-артефакт: ${path.relative(root, file)}`,
    );
  }
  if (numericCurrencyPattern.test(contents)) {
    throw new Error(`Числовая цена попала в runtime-артефакт: ${path.relative(root, file)}`);
  }
}

for (const file of yandexVerificationFiles) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  if (relative !== path.basename(file)) {
    throw new Error(`Файл подтверждения Яндекса должен лежать в корне: ${relative}`);
  }
  const token = path.basename(file).match(/^yandex_([a-f0-9]+)\.html$/i)?.[1];
  const html = await readFile(file, "utf8");
  if (!token || !html.includes(`Verification: ${token}`)) {
    throw new Error(`Неверное содержимое файла подтверждения Яндекса: ${relative}`);
  }
  if (/<(?:script|iframe|form)\b|\b(?:src|href)=["']https?:/i.test(html)) {
    throw new Error(`Файл подтверждения Яндекса содержит лишний исполняемый код: ${relative}`);
  }
}

for (const file of googleVerificationFiles) {
  const relative = path.relative(docs, file).split(path.sep).join("/");
  if (relative !== path.basename(file)) {
    throw new Error(`Файл подтверждения Google должен лежать в корне: ${relative}`);
  }
  const html = await readFile(file, "utf8");
  const expected = `google-site-verification: ${path.basename(file)}`;
  if (html.trim() !== expected) {
    throw new Error(`Неверное содержимое файла подтверждения Google: ${relative}`);
  }
  if (/<(?:script|iframe|form)\b|\b(?:src|href)=["']https?:/i.test(html)) {
    throw new Error(`Файл подтверждения Google содержит лишний исполняемый код: ${relative}`);
  }
}

const required = [
  "index.html",
  "podbor/index.html",
  "modeli/index.html",
  "kronshteyny/index.html",
  "o-proekte/index.html",
  "metodika/index.html",
  "kontakty/index.html",
  "politika-konfidencialnosti/index.html",
  "rozetki-pod-televizor-na-stene/index.html",
  "televizor-na-stene/index.html",
  "krepitv-engine-loader.js",
  "pkg/krepitv_engine_bg.wasm",
  "pkg/krepitv_engine.js",
  "data/compatibility-graph.json",
  "data/catalog-coverage.json",
  "data/affiliate-offers.json",
  "data/affiliate-hub-offers.json",
  "data/affiliate-model-offers.json",
  "data/commercial-profiles.json",
  "data/market-tv-models.json",
  "data/tv-vesa-sizes.csv",
  "data/tv-vesa-sizes.json",
  "favicon.svg",
  "robots.txt",
  "sitemap.xml",
  "CNAME",
  ".nojekyll",
];
for (const relative of required) {
  if (!files.includes(path.join(docs, relative))) {
    throw new Error(`В релизе отсутствует ${relative}`);
  }
}

const guidedSelectionHtml = await readFile(path.join(docs, "podbor/index.html"), "utf8");
const guidedCanonicals = (guidedSelectionHtml.match(/<link\b[^>]*rel=["']canonical["'][^>]*>/giu) ?? [])
  .map((tag) => matchAttribute(tag, "href"));
if (
  guidedCanonicals.length !== 1
  || guidedCanonicals[0] !== `${origin}/podbor/`
) {
  throw new Error("Страница /podbor/ должна иметь один self-canonical");
}
if ((guidedSelectionHtml.match(/<h1\b/giu) ?? []).length !== 1) {
  throw new Error("Страница /podbor/ должна содержать ровно один SSR H1");
}
if (!guidedSelectionHtml.includes('data-guided-selection-island="true"')) {
  throw new Error("Страница /podbor/ потеряла SSR-first guided-selection island");
}
const guidedExplanation = "Сервис раздельно проверит совместимость, винты, настенный крепёж, высоты, кабели, инструменты и порядок монтажа.";
const guidedExplanationIndex = guidedSelectionHtml.indexOf(guidedExplanation);
if (guidedExplanationIndex === -1) {
  throw new Error("На /podbor/ нет русскоязычного SSR-объяснения до гидратации");
}
if (/саундбар|подсветк|чистящ|приставк|сетев(?:ой|ые)\s+адаптер/iu.test(guidedSelectionHtml)) {
  throw new Error("На /podbor/ появился неразрешённый accessory CTA");
}
if (numericCurrencyPattern.test(guidedSelectionHtml)) {
  throw new Error("На /podbor/ появилась числовая цена");
}

if (files.includes(path.join(docs, "pkg/.gitignore"))) {
  throw new Error("Публикуемый WASM-пакет не должен быть скрыт локальным .gitignore");
}

const models = JSON.parse(await readFile(path.join(docs, "data/tv-models.json"), "utf8"));
const sourceVesaCsvRaw = await readFile(
  path.join(root, "datasets/ru-tv-vesa-sizes/v1/tv-vesa-sizes.csv"),
  "utf8",
);
const publicVesaCsvRaw = await readFile(path.join(docs, "data/tv-vesa-sizes.csv"), "utf8");
const sourceVesaJsonRaw = await readFile(
  path.join(root, "datasets/ru-tv-vesa-sizes/v1/tv-vesa-sizes.json"),
  "utf8",
);
const publicVesaJsonRaw = await readFile(path.join(docs, "data/tv-vesa-sizes.json"), "utf8");
const sourceMarketModelsRaw = await readFile(path.join(root, "data/market_tv_models.json"), "utf8");
const publicMarketModelsRaw = await readFile(path.join(docs, "data/market-tv-models.json"), "utf8");
const marketModelsManifest = JSON.parse(publicMarketModelsRaw);
validateMarketModelPages(marketModelsManifest, models);
const modelSearch = JSON.parse(
  await readFile(path.join(docs, "data/model-search.json"), "utf8"),
);
const expectedIndexableUrlCount = baselineIndexableUrlCount
  + marketModelsManifest.summary.indexable_observed_canonicals;
const mounts = JSON.parse(await readFile(path.join(docs, "data/mounts.json"), "utf8"));
const compatibilityEdges = JSON.parse(
  await readFile(path.join(docs, "data/compatibility-graph.json"), "utf8"),
);
const coverageManifest = JSON.parse(
  await readFile(path.join(docs, "data/catalog-coverage.json"), "utf8"),
);
const seoPages = JSON.parse(await readFile(path.join(docs, "data/seo-pages.json"), "utf8"));
const dailySeoCohorts = await Promise.all(
  ["2026-08-06", "2026-08-07", "2026-08-08", "2026-08-09", "2026-08-10"].map(async (date) => JSON.parse(
    await readFile(path.join(root, `data/research/daily-seo-cohort-${date}.json`), "utf8"),
  )),
);
const trustPages = JSON.parse(await readFile(path.join(docs, "data/trust-pages.json"), "utf8"));
const sourceEditorialPolicyRaw = await readFile(
  path.join(root, "data/editorial_policy.json"),
  "utf8",
);
const publicEditorialPolicyRaw = await readFile(
  path.join(docs, "data/editorial-policy.json"),
  "utf8",
);
if (sourceEditorialPolicyRaw !== publicEditorialPolicyRaw) {
  throw new Error("Публичная редакционная политика отличается от проверенного источника");
}
const editorialPolicy = JSON.parse(publicEditorialPolicyRaw);
const sourceCommercialProfilesRaw = await readFile(
  path.join(root, "data/commercial_profiles.json"),
  "utf8",
);
const publicCommercialProfilesRaw = await readFile(
  path.join(docs, "data/commercial-profiles.json"),
  "utf8",
);
const commercialProfilesManifest = JSON.parse(publicCommercialProfilesRaw);
const affiliateSnapshot = JSON.parse(
  await readFile(path.join(docs, "data/affiliate-offers.json"), "utf8"),
);
const sourceHubAffiliateRaw = await readFile(
  path.join(root, "data/affiliate/public-hub-offers.json"),
  "utf8",
);
const publicHubAffiliateRaw = await readFile(
  path.join(docs, "data/affiliate-hub-offers.json"),
  "utf8",
);
const hubAffiliateSnapshot = JSON.parse(publicHubAffiliateRaw);
const sourceModelAffiliateRaw = await readFile(
  path.join(root, "data/affiliate/public-model-offers.json"),
  "utf8",
);
const publicModelAffiliateRaw = await readFile(
  path.join(docs, "data/affiliate-model-offers.json"),
  "utf8",
);
const modelAffiliateSnapshot = JSON.parse(publicModelAffiliateRaw);

if (sourceCommercialProfilesRaw !== publicCommercialProfilesRaw) {
  throw new Error("Публичная копия commercial-profiles.json отличается от исходного файла");
}
if (sourceVesaCsvRaw !== publicVesaCsvRaw || sourceVesaJsonRaw !== publicVesaJsonRaw) {
  throw new Error("Публичные файлы открытого VESA-датасета отличаются от проверенных исходников");
}
if (sourceMarketModelsRaw !== publicMarketModelsRaw) {
  throw new Error("Публичная копия market-tv-models.json отличается от исходного файла");
}
if (sourceHubAffiliateRaw !== publicHubAffiliateRaw) {
  throw new Error("Публичная копия affiliate-hub-offers.json отличается от исходного файла");
}
if (sourceModelAffiliateRaw !== publicModelAffiliateRaw) {
  throw new Error("Публичная копия affiliate-model-offers.json отличается от исходного файла");
}
assertExactKeys(
  modelAffiliateSnapshot,
  ["schema_version", "generated_at", "placements"],
  "Публичный снимок размещений моделей",
);
if (
  modelAffiliateSnapshot.schema_version !== 1
  || !Number.isFinite(Date.parse(modelAffiliateSnapshot.generated_at ?? ""))
  || !Array.isArray(modelAffiliateSnapshot.placements)
) {
  throw new Error("Некорректный публичный снимок размещений моделей");
}

const modelOfferShardKey = (modelId) => {
  const key = typeof modelId !== "string"
    ? ""
    : /^samsung-qe\d/u.test(modelId)
      ? "samsung-qe"
      : /^samsung-ue\d/u.test(modelId)
        ? "samsung-ue"
        : modelId.split("-", 1)[0];
  if (!/^[a-z0-9]{2,20}(?:-[a-z0-9]{2,20})?$/u.test(key)) {
    throw new Error(`Небезопасный ключ шарда модельного оффера: ${modelId}`);
  }
  return key;
};
const expectedModelOfferShardKeys = [...new Set(models.map((model) => modelOfferShardKey(model.id)))].sort();
const modelOfferShardDirectory = path.join(docs, "data/affiliate-model-offers");
const actualModelOfferShardFiles = (await readdir(modelOfferShardDirectory))
  .filter((file) => file.endsWith(".json"))
  .sort();
const expectedModelOfferShardFiles = expectedModelOfferShardKeys.map((key) => `${key}.json`);
if (JSON.stringify(actualModelOfferShardFiles) !== JSON.stringify(expectedModelOfferShardFiles)) {
  throw new Error("Набор брендовых шардов модельных офферов не совпадает с каталогом моделей");
}
const combinedModelPlacements = [];
for (const key of expectedModelOfferShardKeys) {
  const relative = path.join("data/affiliate-model-offers", `${key}.json`);
  const raw = await readFile(path.join(docs, relative), "utf8");
  if (Buffer.byteLength(raw) > 150 * 1024) {
    throw new Error(`Шард модельных офферов слишком велик: ${relative}`);
  }
  const shard = JSON.parse(raw);
  assertExactKeys(shard, ["schema_version", "generated_at", "placements"], `Шард ${key}`);
  const expectedPlacements = modelAffiliateSnapshot.placements.filter(
    (placement) => modelOfferShardKey(placement.model_id) === key,
  );
  if (
    shard.schema_version !== modelAffiliateSnapshot.schema_version
    || shard.generated_at !== modelAffiliateSnapshot.generated_at
    || !isDeepStrictEqual(shard.placements, expectedPlacements)
  ) {
    throw new Error(`Шард ${key} не является точной выборкой полного модельного снимка`);
  }
  combinedModelPlacements.push(...shard.placements);
}
if (!isDeepStrictEqual(combinedModelPlacements,
  expectedModelOfferShardKeys.flatMap((key) => modelAffiliateSnapshot.placements.filter(
    (placement) => modelOfferShardKey(placement.model_id) === key,
  )),
)) {
  throw new Error("Модельные офферы потеряны или продублированы между шардами");
}
assertExactKeys(
  hubAffiliateSnapshot,
  ["schema_version", "generated_at", "placements"],
  "Публичный снимок размещений SEO-хабов",
);
if (
  hubAffiliateSnapshot.schema_version !== 1 ||
  !Number.isFinite(Date.parse(hubAffiliateSnapshot.generated_at ?? "")) ||
  !Array.isArray(hubAffiliateSnapshot.placements)
) {
  throw new Error("Некорректный публичный снимок размещений SEO-хабов");
}
assertExactKeys(
  commercialProfilesManifest,
  ["schema_version", "updated_at", "profiles"],
  "Манифест коммерческих профилей",
);
if (
  commercialProfilesManifest.schema_version !== 1 ||
  !/^\d{4}-\d{2}-\d{2}$/u.test(commercialProfilesManifest.updated_at ?? "") ||
  !Array.isArray(commercialProfilesManifest.profiles)
) {
  throw new Error(
    "Манифест коммерческих профилей: ожидаются schema_version=1, updated_at и массив profiles",
  );
}
const commercialProfiles = commercialProfilesManifest.profiles;
if (commercialProfiles.length !== expectedCommercialProfiles.size) {
  throw new Error(
    `Коммерческие профили: ожидалось ровно ${expectedCommercialProfiles.size}, найдено ${commercialProfiles.length}`,
  );
}

for (const profile of commercialProfiles) {
  const identity = `${profile?.entity_kind}:${profile?.entity_id}:${profile?.path}`;
  const profileKeys = [
    "entity_kind",
    "entity_id",
    "path",
    "title",
    "description",
    "kicker",
    "heading",
    "answer",
    "faq",
  ];
  if (profile.updated_at !== undefined) profileKeys.push("updated_at");
  assertExactKeys(
    profile,
    profileKeys,
    `Коммерческий профиль ${identity}`,
  );
  for (const field of [
    "entity_kind",
    "entity_id",
    "path",
    "title",
    "description",
    "kicker",
    "heading",
    "answer",
  ]) {
    assertNonEmptyString(profile[field], `Коммерческий профиль ${identity}, поле ${field}`);
  }
  if (
    profile.updated_at !== undefined
    && (
      !/^\d{4}-\d{2}-\d{2}$/u.test(profile.updated_at)
      || profile.updated_at > commercialProfilesManifest.updated_at
    )
  ) {
    throw new Error(`Коммерческий профиль ${identity}: некорректный updated_at`);
  }
  if (!expectedCommercialProfiles.has(identity)) {
    throw new Error(`Коммерческий профиль вне разрешённого набора: ${identity}`);
  }
  const entityExists =
    profile.entity_kind === "model"
      ? models.some((model) => model.id === profile.entity_id)
      : mounts.some((mount) => mount.id === profile.entity_id);
  if (!entityExists) {
    throw new Error(`Коммерческий профиль ссылается на неизвестную сущность: ${identity}`);
  }
  if (profile.title.length > 65) {
    throw new Error(`Коммерческий профиль ${identity}: title длиннее 65 символов`);
  }
  if (profile.description.length > 160) {
    throw new Error(`Коммерческий профиль ${identity}: description длиннее 160 символов`);
  }
  for (const [field, maximumLength] of [
    ["kicker", 80],
    ["heading", 160],
    ["answer", 1_200],
  ]) {
    if (profile[field].length > maximumLength) {
      throw new Error(
        `Коммерческий профиль ${identity}: ${field} длиннее ${maximumLength} символов`,
      );
    }
  }
  if (!Array.isArray(profile.faq) || profile.faq.length !== 3) {
    throw new Error(`Коммерческий профиль ${identity}: FAQ должен содержать ровно 3 пары`);
  }
  profile.faq.forEach((item, index) => {
    assertExactKeys(
      item,
      ["question", "answer"],
      `Коммерческий профиль ${identity}, FAQ ${index + 1}`,
    );
    assertNonEmptyString(
      item.question,
      `Коммерческий профиль ${identity}, вопрос FAQ ${index + 1}`,
    );
    assertNonEmptyString(
      item.answer,
      `Коммерческий профиль ${identity}, ответ FAQ ${index + 1}`,
    );
    if (item.question.length > 180 || item.answer.length > 600) {
      throw new Error(
        `Коммерческий профиль ${identity}, FAQ ${index + 1}: превышен клиентский лимит текста`,
      );
    }
  });
  const verifiedCount = compatibilityEdges.filter(
    (edge) =>
      edge.fit_status === "verified-fit" &&
      (profile.entity_kind === "model"
        ? edge.tv_id === profile.entity_id
        : edge.mount_id === profile.entity_id),
  ).length;
  if (
    verifiedCount < 1 ||
    !containsNumberToken(profile.answer, verifiedCount) ||
    !containsNumberToken(profile.description, verifiedCount)
  ) {
    throw new Error(
      `Коммерческий профиль ${identity}: заявленное число совместимых позиций не совпадает с графом (${verifiedCount})`,
    );
  }
  assertNoNumericPrice(profile);
}
assertUnique(
  commercialProfiles.map((profile) => `${profile.entity_kind}:${profile.entity_id}`),
  "Коммерческие профили, kind:id",
);
assertUnique(
  commercialProfiles.map((profile) => profile.path),
  "Коммерческие профили, пути",
);
assertUnique(
  commercialProfiles.map((profile) => `${profile.entity_kind}:${profile.entity_id}:${profile.path}`),
  "Коммерческие профили, полная идентичность",
);
const affiliateNow = Date.now();
const declaredPublishableAffiliateOffers = (affiliateSnapshot.offers ?? []).filter(
  (offer) => offer.publishable && offer.eligibility === "publishable",
);
const declaredPublishableHubAffiliateOffers = (hubAffiliateSnapshot.placements ?? [])
  .map((placement) => placement.offer)
  .filter((offer) => offer?.publishable && offer.eligibility === "publishable");
const isFreshAffiliateOffer = (offer) => {
  const checkedAt = Date.parse(offer.checked_at ?? "");
  const age = affiliateNow - checkedAt;
  return Number.isFinite(checkedAt)
    && age >= -affiliateFutureToleranceMs
    && age <= maximumAffiliateAgeMs;
};
const publishableAffiliateOffers = declaredPublishableAffiliateOffers.filter(isFreshAffiliateOffer);
const publishableHubAffiliateOffers = declaredPublishableHubAffiliateOffers.filter(isFreshAffiliateOffer);
const publishableMarketOffers = [
  ...publishableAffiliateOffers,
  ...publishableHubAffiliateOffers,
];
const publishableAffiliateHrefs = new Set(
  publishableMarketOffers.map((offer) => offer.affiliate_href),
);

assertMinimum(models, 2, "Проверенные модели телевизоров");
assertMinimum(mounts, 3, "Проверенные кронштейны");
assertMinimum(seoPages, 12, "SEO-материалы");
assertMinimum(trustPages, 5, "Доверительные страницы");
if (
  editorialPolicy.schema_version !== 1
  || editorialPolicy.author?.name !== "Редакция KREPI TV"
  || editorialPolicy.author?.path !== "/redaktsiya/"
  || editorialPolicy.physical_test?.status !== "not_tested"
  || editorialPolicy.physical_test?.label !== "Физический тест не проводился"
  || !/^\d{4}-\d{2}-\d{2}$/u.test(editorialPolicy.updated_at ?? "")
) {
  throw new Error("Редакционная политика не соответствует публичному trust-контракту");
}
const editorialPolicyText = JSON.stringify(editorialPolicy).toLocaleLowerCase("ru-RU");
for (const unsupportedClaim of [
  "сертифицированный монтажник",
  "инженер по установке",
  "лично установил",
  "испытано редакцией",
]) {
  if (editorialPolicyText.includes(unsupportedClaim)) {
    throw new Error(`Редакционная политика содержит неподтверждённое утверждение: ${unsupportedClaim}`);
  }
}
const coverageSummary = validateCoverageManifest(coverageManifest, models);

for (const [items, label] of [
  [models, "Модели телевизоров"],
  [mounts, "Кронштейны"],
  [seoPages, "SEO-материалы"],
  [trustPages, "Доверительные страницы"],
]) {
  assertUnique(items.map((item) => item.id), `${label}, идентификаторы`);
}
assertUnique(seoPages.map((page) => page.path), "SEO-материалы, пути");
assertUnique(seoPages.map((page) => page.title), "SEO-материалы, title");
assertUnique(trustPages.map((page) => page.path), "Доверительные страницы, пути");
assertUnique(trustPages.map((page) => page.title), "Доверительные страницы, title");
assertUnique(models.map((item) => item.source_url), "Модели телевизоров, источники");
assertUnique(mounts.map((item) => item.source_url), "Кронштейны, источники");
assertUnique(
  publishableAffiliateOffers.map((offer) => offer.id),
  "Affiliate offers, идентификаторы",
);
assertUnique(
  publishableAffiliateOffers.map((offer) => offer.page_path),
  "Affiliate offers, страницы кронштейнов",
);

for (const offer of [
  ...declaredPublishableAffiliateOffers,
  ...declaredPublishableHubAffiliateOffers,
]) {
  const checkedAt = Date.parse(offer.checked_at ?? "");
  const age = affiliateNow - checkedAt;
  if (
    !Number.isFinite(checkedAt) ||
    age < -affiliateFutureToleranceMs
  ) {
    throw new Error(`Affiliate offer имеет неверную или будущую дату: ${offer.id}`);
  }
  if (
    offer.entity_kind !== "mount" ||
    offer.page_path !== `/kronshteyny/${offer.entity_id}/` ||
    !mounts.some((mount) => mount.id === offer.entity_id)
  ) {
    throw new Error(`Affiliate offer ссылается на неизвестную страницу кронштейна: ${offer.id}`);
  }
}

const actualWallMountScrewPassports = new Set();
const expectedConservativeWeightBasis = new Map([
  ["bbk-32lem-1045-ts2c", "with_stand"],
  ["bbk-32lem-1075-ts2c", "with_stand"],
  ["bbk-32lex-7235-fts2c", "with_stand"],
  ["bbk-32lex-7244-ts2c", "with_stand"],
  ["bbk-40lem-1030-fts2c", "with_stand"],
  ["bbk-43lex-7247-fts2c", "with_stand"],
  ["hi-hx-24h01fb", "published_unspecified"],
  ["hi-hx-43f01fb", "published_unspecified"],
  ["skyline-43lst6575", "published_unspecified"],
  ["harper-24r470t", "published_unspecified"],
  ["harper-32r670t", "published_unspecified"],
  ["harper-43f670ts", "published_unspecified"],
  ["harper-40f720t", "published_unspecified"],
  ["topdevice-tdhtv32gfd-bk", "published_unspecified"],
  ["topdevice-tdhtv32ghd-bk", "published_unspecified"],
  ["topdevice-tdhtv24y1hd-bk", "published_unspecified"],
  ["hyundai-h-led32bs5002", "published_unspecified"],
  ["hyundai-h-led32bs5003", "published_unspecified"],
  ["akai-ta32bh500", "with_stand"],
  ["bq-32f40b", "published_unspecified"],
  ["blackton-bt-24fs34b", "published_unspecified"],
  ["yasin-32e9000", "with_stand"],
  ["tuvio-tm75ufgch52", "with_stand"],
  ["tuvio-td50ufbhh12", "with_stand"],
  ["tuvio-td32hfbch12", "with_stand"],
  ["tuvio-td55ufbth51", "published_unspecified"],
  ["tuvio-td24hbch11", "with_stand"],
  ["asano-32lh1110t", "published_unspecified"],
]);
for (const model of models) {
  assertHttpsSource(model, `Модель ${model.id}`);
  if (!model.source_label?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(model.checked_at ?? "")) {
    throw new Error(`Модель ${model.id}: нет подписи источника или даты проверки`);
  }
  const expectedWeightBasis = expectedConservativeWeightBasis.get(model.id);
  if (
    (expectedWeightBasis && model.weight_basis !== expectedWeightBasis)
    || (!expectedWeightBasis && model.weight_basis != null)
  ) {
    throw new Error(`Модель ${model.id}: неверно обозначено основание массы`);
  }
  const hardware = model.wall_mount_screws;
  if (hardware) {
    actualWallMountScrewPassports.add(model.id);
    const groups = hardware.groups;
    const locations = new Set(groups?.map((group) => group.location?.trim().toLocaleLowerCase("ru-RU")));
    const effectiveRangeLabels = new Set(
      Array.isArray(groups)
        ? groups
          .filter((group) => Number.isFinite(group.engagement_min_mm))
          .map((group) => group.range_label ?? "L")
        : [],
    );
    if (
      !Array.isArray(groups) ||
      groups.length < 1 ||
      groups.length > 4 ||
      groups.reduce((total, group) => total + group.quantity, 0) !== 4 ||
      locations.size !== groups.length ||
      effectiveRangeLabels.size > 1 ||
      groups.some((group) => {
        const hasExactLength = Number.isInteger(group.length_mm);
        const hasUnknownLength = group.length_unknown === true;
        const hasEngagementRange =
          Number.isFinite(group.engagement_min_mm)
          && Number.isFinite(group.engagement_max_mm);
        return (
          !group.location?.trim()
          || !/^M\d{1,2}$/.test(group.thread ?? "")
          || [hasExactLength, hasUnknownLength, hasEngagementRange].filter(Boolean).length !== 1
          || (group.length_unknown !== undefined && group.length_unknown !== true)
          || (hasExactLength && (group.length_mm < 4 || group.length_mm > 100))
          || (hasEngagementRange && (
            group.engagement_min_mm < 1
            || group.engagement_max_mm > 100
            || group.engagement_min_mm >= group.engagement_max_mm
          ))
          || (!hasEngagementRange && (
            group.engagement_min_mm !== undefined
            || group.engagement_max_mm !== undefined
          ))
          || (group.range_label !== undefined && (
            !hasEngagementRange
            || !["L", "C"].includes(group.range_label)
          ))
          || !Number.isInteger(group.quantity)
          || group.quantity < 1
          || group.quantity > 4
        );
      }) ||
      (hardware.requires_adapters !== undefined
        && typeof hardware.requires_adapters !== "boolean") ||
      (hardware.required_parts_note !== undefined && !hardware.required_parts_note?.trim()) ||
      (hardware.vesa_conflict !== undefined && (
        !hardware.vesa_conflict?.catalog_value?.trim()
        || !hardware.vesa_conflict?.manual_value?.trim()
        || hardware.vesa_conflict.catalog_value === hardware.vesa_conflict.manual_value
        || !hardware.vesa_conflict?.note?.trim()
      )) ||
      !hardware.source_region?.trim() ||
      !hardware.source_url?.startsWith("https://") ||
      !hardware.source_label?.trim() ||
      ((hardware.secondary_source_url === undefined) !== (hardware.secondary_source_label === undefined)) ||
      (hardware.secondary_source_url !== undefined && (
        !hardware.secondary_source_url?.startsWith("https://")
        || !hardware.secondary_source_label?.trim()
      )) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(hardware.checked_at ?? "") ||
      !hardware.note?.trim()
    ) {
      throw new Error(`Модель ${model.id}: некорректный паспорт настенного монтажа`);
    }
  }
}
if (
  actualWallMountScrewPassports.size !== expectedWallMountScrewPassports.size
  || [...actualWallMountScrewPassports].some((id) => !expectedWallMountScrewPassports.has(id))
) {
  throw new Error(
    `Набор паспортов винтов не совпадает с разрешённым: ${[...actualWallMountScrewPassports].sort().join(", ")}`,
  );
}

const modelById = new Map(models.map((model) => [model.id, model]));
const mountById = new Map(mounts.map((mount) => [mount.id, mount]));
const modelWeightSuffix = (model) => {
  if (model.weight_basis === "with_stand") return "с подставкой, консервативно";
  if (model.weight_basis === "published_unspecified") return "тип не указан, консервативно";
  return "без подставки";
};
for (const [id, modelName, fileId] of [
  ["samsung-qe43q7faauxru", "QE43Q7FAAU", "10108131"],
  ["samsung-qe50q7faauxru", "QE50Q7FAAU", "10108143"],
]) {
  const hardware = modelById.get(id)?.wall_mount_screws;
  const group = hardware?.groups?.[0];
  if (
    group?.thread !== "M8"
    || group?.engagement_min_mm !== 19
    || group?.engagement_max_mm !== 21
    || group?.range_label !== "C"
    || !hardware?.source_url?.includes(`ModelName=${modelName}`)
    || !hardware?.source_url?.includes(`CttFileID=${fileId}`)
  ) {
    throw new Error(`${id}: потерян точный паспорт M8/C 19–21 мм или связь с исходным файлом`);
  }
}
const f6000 = modelById.get("samsung-ue32f6000fuxru")?.wall_mount_screws;
if (
  f6000?.groups?.[0]?.thread !== "M8"
  || f6000?.groups?.[0]?.engagement_min_mm !== 21
  || f6000?.groups?.[0]?.engagement_max_mm !== 23
  || !f6000?.source_url?.includes("ModelName=UE32F6000FU")
  || !f6000?.source_url?.includes("CttFileID=10080407")
  || !f6000?.note?.includes("M4×L14")
  || !f6000?.note?.includes("ножкам")
) {
  throw new Error("samsung-ue32f6000fuxru: потерян паспорт M8/C 21–23 мм или оговорка о ножках");
}
for (const [id, pdfFragment, supportId] of [
  ["hisense-65u8q", "/U8Q/65-75U8Q.pdf", "ID=8669"],
  ["hisense-65u7q", "/u7q/U7Q.pdf", "ID=8663"],
  ["hisense-65ur9s", "/UR9S/20221782_65-75-85UR9S_Rus.pdf", "ID=9197"],
]) {
  const model = modelById.get(id);
  const hardware = modelById.get(id)?.wall_mount_screws;
  const group = hardware?.groups?.[0];
  if (
    model?.vesa_width_mm !== 400
    || model?.vesa_height_mm !== 400
    || hardware?.groups?.length !== 1
    || group?.thread !== "M6"
    || group?.engagement_min_mm !== 9.5
    || group?.engagement_max_mm !== 11.5
    || group?.range_label !== "L"
    || group?.quantity !== 4
    || group?.length_mm !== undefined
    || group?.length_unknown !== undefined
    || hardware?.requires_adapters !== undefined
    || !hardware?.source_url?.includes(pdfFragment)
    || !hardware?.secondary_source_url?.includes(supportId)
    || !hardware?.required_parts_note?.includes("промежуточные вставки")
    || !hardware?.required_parts_note?.includes("количество, размер и комплектность не указаны")
    || !hardware?.note?.includes("Полная длина и шаг резьбы")
  ) {
    throw new Error(`${id}: потерян паспорт M6/L 9,5–11,5 мм или требование вставок`);
  }
}
const p6k = modelById.get("tcl-55p6k")?.wall_mount_screws;
if (
  p6k?.groups?.length !== 2
  || p6k.groups.some((group) => group.thread !== "M6" || group.length_unknown !== true)
  || !p6k.secondary_source_url
  || p6k.requires_adapters !== undefined
  || !p6k.required_parts_note?.includes("Не используйте M6×12")
  || !p6k.note?.includes("11–28 мм")
  || !p6k.note?.includes("максимум 26 мм")
) {
  throw new Error("tcl-55p6k: потеряна безопасная фиксация конфликта длины 26/28 мм");
}
const p7k = modelById.get("tcl-55p7k")?.wall_mount_screws;
const p7kLengths = p7k?.groups?.map((group) => group.length_mm).sort((a, b) => a - b);
if (
  JSON.stringify(p7kLengths) !== JSON.stringify([16, 30])
  || p7k?.source_region !== "Новая Зеландия"
  || p7k?.groups?.some((group) => !group.location.includes("ряд не указан"))
  || !p7k?.secondary_source_label?.includes("Российская спецификация точной модели")
  || !p7k?.required_parts_note?.includes("не распределяет пары")
  || !p7k?.note?.includes("российского экземпляра")
) {
  throw new Error("tcl-55p7k: потеряны размеры M6×16/M6×30 или cross-region оговорка");
}
for (const mount of mounts) {
  assertHttpsSource(mount, `Кронштейн ${mount.id}`);
  if (
    !mount.brand?.trim() ||
    !mount.model?.trim() ||
    !mount.source_label?.trim() ||
    !/^\d{4}-\d{2}-\d{2}$/.test(mount.checked_at ?? "") ||
    !Array.isArray(mount.vesa) ||
    mount.vesa.length === 0
  ) {
    throw new Error(`Кронштейн ${mount.id}: неполная идентичность, VESA или источник`);
  }
}

assertMinimum(
  compatibilityEdges,
  Math.max(models.length, mounts.length),
  "Полезные рёбра совместимости",
);
assertUnique(
  compatibilityEdges.map((edge) => `${edge.tv_id}:${edge.mount_id}`),
  "Граф совместимости, пары",
);
for (const edge of compatibilityEdges) {
  if (!models.some((model) => model.id === edge.tv_id)) {
    throw new Error(`Граф ссылается на неизвестный телевизор ${edge.tv_id}`);
  }
  if (!mounts.some((mount) => mount.id === edge.mount_id)) {
    throw new Error(`Граф ссылается на неизвестный кронштейн ${edge.mount_id}`);
  }
  if (!edge.compatible || !["verified-fit", "conditional-fit"].includes(edge.fit_status)) {
    throw new Error(`Граф содержит неизвестный статус ${edge.fit_status}`);
  }
}
for (const model of models) {
  const verifiedEdges = compatibilityEdges.filter(
    (edge) => edge.tv_id === model.id && edge.compatible && edge.fit_status === "verified-fit",
  );
  if (verifiedEdges.length < 2) {
    throw new Error(
      `Проверенная модель должна иметь минимум два подтверждённых кронштейна: ${model.id} (${verifiedEdges.length})`,
    );
  }
  for (const edge of verifiedEdges) {
    const mount = mountById.get(edge.mount_id);
    const exactVesa = `${model.vesa_width_mm}x${model.vesa_height_mm}`;
    if (!mount?.vesa.includes(exactVesa)) {
      throw new Error(`Пара ${model.id}:${edge.mount_id} не содержит точную VESA ${exactVesa}`);
    }
    if (mount.max_load_kg + Number.EPSILON < model.weight_kg * 1.25) {
      throw new Error(`Пара ${model.id}:${edge.mount_id} не выдерживает паспортную массу с запасом 25%`);
    }
    if (
      model.diagonal_inches < mount.min_diagonal_in
      || model.diagonal_inches > mount.max_diagonal_in
    ) {
      throw new Error(`Подтверждённая пара ${model.id}:${edge.mount_id} выходит за диапазон диагонали`);
    }
  }
}
for (const page of seoPages) {
  if (typeof page.indexable !== "boolean") {
    throw new Error(`SEO-материал ${page.id}: поле indexable должно быть boolean`);
  }
  const filter = (() => {
    if (page.kind === "mount-brand") {
      const brand = page.id.replace(/^mount-brand-/i, "").toLocaleLowerCase("ru-RU");
      return {
        minimum: 4,
        entityIds: mounts
          .filter((mount) => mount.brand.toLocaleLowerCase("ru-RU") === brand)
          .map((mount) => mount.id),
        edgeKey: "mount_id",
      };
    }
    if (page.kind === "brand") {
      const brand = page.id.replace(/^brand-/i, "").toLocaleLowerCase("ru-RU");
      return {
        minimum: 5,
        entityIds: models
          .filter((model) => model.brand.toLocaleLowerCase("ru-RU") === brand)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    if (page.kind === "diagonal") {
      const diagonal = Number(page.id.replace(/^diagonal-/i, ""));
      return {
        minimum: 4,
        entityIds: models
          .filter((model) => Math.abs(model.diagonal_inches - diagonal) < 0.05)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    if (page.kind === "vesa") {
      const [width, height] = page.id.replace(/^vesa-/i, "").split("x").map(Number);
      return {
        minimum: 5,
        entityIds: models
          .filter((model) => model.vesa_width_mm === width && model.vesa_height_mm === height)
          .map((model) => model.id),
        edgeKey: "tv_id",
      };
    }
    return null;
  })();
  if (page.indexable && filter) {
    if (filter.entityIds.length < filter.minimum) {
      throw new Error(
        `SEO-материал ${page.id}: индексируемый фильтр слишком тонкий (${filter.entityIds.length} < ${filter.minimum})`,
      );
    }
    const entityIds = new Set(filter.entityIds);
    const verifiedPairs = compatibilityEdges.filter(
      (edge) => edge.fit_status === "verified-fit" && entityIds.has(edge[filter.edgeKey]),
    ).length;
    if (verifiedPairs < 25) {
      throw new Error(`SEO-материал ${page.id}: недостаточно подтверждённых пар (${verifiedPairs} < 25)`);
    }
  }
}

const sourceFiles = (await walk(path.join(root, "web/src"))).filter((file) =>
  /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/.test(file),
);
const affiliateComponent = path.join(root, "web/src/components/AffiliateOffer.jsx");
const affiliateConsumers = new Set([
  path.join(root, "web/src/components/SiteFooter.jsx"),
  path.join(root, "web/src/pages/ModelPage.jsx"),
  path.join(root, "web/src/components/ModelOffersIsland.jsx"),
  path.join(root, "web/src/pages/MountPage.jsx"),
  path.join(root, "web/src/pages/SeoPage.jsx"),
  path.join(root, "web/src/components/installation-kit/InstallationKitResult.jsx"),
  path.join(root, "web/src/components/installation-kit/InstallationKitBuildSummary.jsx"),
]);
for (const file of sourceFiles) {
  if (file === affiliateComponent || affiliateConsumers.has(file)) continue;
  const source = await readFile(file, "utf8");
  if (/\bAffiliateOffer\b/.test(source)) {
    throw new Error(
      `AffiliateOffer нельзя подключать без интеграционного теста финального DOM: ${path.relative(root, file)}`,
    );
  }
}

const htmlByRoute = new Map();
for (const file of pageHtmlFiles) {
  const route = routeFromHtmlFile(file);
  const html = await readFile(file, "utf8");
  htmlByRoute.set(route, html);

  if (!/<html\s+lang=["']ru["']/.test(html)) {
    throw new Error(`Не указан русский язык: ${path.relative(root, file)}`);
  }
  if (/\blang=["']en["']|\bPrototype\b|lorem ipsum/i.test(html)) {
    throw new Error(`Найдена служебная английская строка: ${path.relative(root, file)}`);
  }
  const description = metaContent(html, "description");
  if (!description) {
    throw new Error(`Нет описания страницы: ${path.relative(root, file)}`);
  }
  if (/data-page-kind=["']mount["']/.test(html) && description.length > 160) {
    throw new Error(`Слишком длинное описание кронштейна: ${path.relative(root, file)}`);
  }
  if (!/<h1(?:\s|>)/.test(html)) {
    throw new Error(`В HTML нет самостоятельного H1: ${path.relative(root, file)}`);
  }
  if (/href=["']\/go\//i.test(html)) {
    throw new Error(`Запрещён скрывающий назначение редирект: ${path.relative(root, file)}`);
  }
  if (
    !coverageSummary.full_catalog_claim &&
    /(?:все\s+популярные\s+(?:модели|телевизоры)|полный\s+каталог\s+(?:моделей|телевизоров))/i.test(
      html,
    )
  ) {
    throw new Error(
      `Пилотный каталог нельзя публично называть полным: ${path.relative(root, file)}`,
    );
  }

  const marketLinks = html.match(
    /<a\b[^>]*href=["']https:\/\/market\.yandex\.ru\/[^"']*["'][^>]*>/gi,
  ) ?? [];
  if (/\bdata-affiliate-offer-id=/i.test(html)) {
    throw new Error(`Действующий affiliate CTA попал в статический HTML: ${path.relative(root, file)}`);
  }
  for (const link of marketLinks) {
    const marketHref = decodeHtmlAttribute(matchAttribute(link, "href"));
    if (matchAttribute(link, "data-market-source") === "identity") {
      const sourceUrl = new URL(marketHref);
      if (
        sourceUrl.origin !== "https://market.yandex.ru"
        || sourceUrl.search
        || sourceUrl.hash
        || !/\brel=["'][^"']*\bnofollow\b[^"']*["']/i.test(link)
        || !/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(link)
        || !/\brel=["'][^"']*\bnoreferrer\b[^"']*["']/i.test(link)
      ) {
        throw new Error(`Источник модели Маркета оформлен небезопасно: ${path.relative(root, file)}`);
      }
      continue;
    }
    if (matchAttribute(link, "data-market-link") === "search") {
      const searchUrl = new URL(marketHref);
      const rel = new Set((matchAttribute(link, "rel") ?? "").split(/\s+/u));
      if (
        searchUrl.origin !== "https://market.yandex.ru"
        || searchUrl.pathname !== "/search"
        || !searchUrl.searchParams.get("text")
        || [...searchUrl.searchParams.keys()].join(",") !== "text"
        || matchAttribute(link, "target") !== "_blank"
        || !rel.has("nofollow")
        || !rel.has("noopener")
        || !rel.has("noreferrer")
      ) {
        throw new Error(`Поиск модели в Маркете оформлен небезопасно: ${path.relative(root, file)}`);
      }
      continue;
    }
    if (publishableAffiliateHrefs.has(marketHref)) {
      throw new Error(`Партнёрский URL попал в статический HTML: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bsponsored\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=sponsored: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnofollow\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=nofollow: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnoopener\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=noopener: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnoreferrer\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=noreferrer: ${path.relative(root, file)}`);
    }
    const mode = link.match(/\bdata-affiliate-mode=["']([^"']+)["']/i)?.[1];
    if (mode === "advertising") {
      if (!/\bdata-erid=["'][^"']+["']/i.test(link)) {
        throw new Error(`Рекламная ссылка без ERID: ${path.relative(root, file)}`);
      }
      if (!html.includes("Реклама") || !html.includes("erid:")) {
        throw new Error(`Рекламная ссылка без видимой маркировки: ${path.relative(root, file)}`);
      }
    } else if (mode === "non_ad_storefront") {
      if (/\bdata-erid=/i.test(link) || !/\bdata-clid=["']\d{5,20}["']/i.test(link)) {
        throw new Error(`Нерекламная витринная ссылка с неверной атрибуцией: ${path.relative(root, file)}`);
      }
    } else {
      throw new Error(`Партнёрская ссылка без режима размещения: ${path.relative(root, file)}`);
    }
  }
}

const editorialRoutes = [
  ...seoPages.filter((page) => page.indexable).map((page) => ({
    basis: page.guide
      ? "Официальные инструкции и редакционная проверка"
      : "Источники, формула и перечисленные допущения",
    checkedAt: page.guide?.updated_at ?? seoFunnelUpdatedAt,
    route: page.path,
  })),
  ...models.map((model) => ({
    basis: "Официальные характеристики и расчёт совместимости",
    checkedAt: model.checked_at,
    route: `/modeli/${model.id}/`,
  })),
  ...mounts.map((mount) => ({
    basis: "Паспорт кронштейна и граф совместимости",
    checkedAt: mount.checked_at,
    route: `/kronshteyny/${mount.id}/`,
  })),
  ...marketModelsManifest.records
    .filter((record) => record.page_kind === "observed")
    .map((record) => ({
      basis: "Наблюдение ассортимента без технической рекомендации",
      checkedAt: record.checked_at,
      route: record.route_path,
    })),
];
for (const { basis, checkedAt, route } of editorialRoutes) {
  const html = htmlByRoute.get(route) ?? "";
  if ((html.match(/data-editorial-accountability="true"/gu) ?? []).length !== 1) {
    throw new Error(`Страница должна иметь ровно один SSR-блок редакционной ответственности: ${route}`);
  }
  for (const requiredFragment of [
    'href="/redaktsiya/">Редакция KREPI TV',
    basis,
    `<time datetime="${checkedAt}">`,
    "Физический тест не проводился",
    'href="/metodika/">методика</a>',
    'href="/kontakty/">сообщить об ошибке</a>',
  ]) {
    if (!html.includes(requiredFragment)) {
      throw new Error(`SSR-блок ${route} не содержит обязательное основание: ${requiredFragment}`);
    }
  }
}
const editorialTrustHtml = htmlByRoute.get("/redaktsiya/") ?? "";
for (const requiredFragment of [
  'data-trust-publisher="true"',
  'href="/redaktsiya/">Редакция KREPI TV',
  "Организационный автор проекта",
]) {
  if (!editorialTrustHtml.includes(requiredFragment)) {
    throw new Error(`Страница редакции не содержит публичную ответственность издателя: ${requiredFragment}`);
  }
}
for (const [route, html] of htmlByRoute) {
  if (!html.includes('href="/redaktsiya/">Редакция</a>')) {
    throw new Error(`Публичный footer не ведёт на страницу редакции: ${route}`);
  }
}
for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const html = htmlByRoute.get(route) ?? "";
  if (
    html.indexOf("data-editorial-accountability") < 0
    || html.indexOf("data-editorial-accountability") > html.indexOf("data-market-mount-section")
  ) {
    throw new Error(`Редакционное основание должно находиться до выхода на Маркет: ${route}`);
  }
}
for (const page of seoPages.filter((item) => item.guide)) {
  const html = htmlByRoute.get(page.path) ?? "";
  if (
    !html.includes('"@type":["Article","HowTo"]')
    || !html.includes('"name":"Редакция KREPI TV"')
    || !html.includes('"url":"https://krepitv.ru/redaktsiya/"')
    || !html.includes(`"dateModified":"${page.guide.updated_at}"`)
  ) {
    throw new Error(`Article/HowTo JSON-LD не совпадает с видимым автором и датой: ${page.path}`);
  }
}

const observedMarketModels = marketModelsManifest.records.filter(
  (record) => record.page_kind === "observed",
);
const routedMarketModels = marketModelsManifest.records.filter(
  (record) => record.page_kind !== "verified",
);
if (modelSearch.length !== models.length + observedMarketModels.length) {
  throw new Error(
    `Поиск моделей должен содержать ${models.length + observedMarketModels.length} канонических моделей, получено ${modelSearch.length}`,
  );
}
assertUnique(modelSearch.map((item) => item.id), "Поиск моделей, идентификаторы");

for (const record of routedMarketModels) {
  const html = htmlByRoute.get(record.route_path) ?? "";
  if (
    !html.includes('data-market-model-page="true"')
    || !html.includes(escapeHtmlText(record.title))
    || !html.includes(record.market_url)
    || !html.includes("Как подобрать кронштейн без ошибки")
    || !html.includes("Что зафиксировано в источнике")
    || !html.includes("data-market-source=\"identity\"")
  ) {
    throw new Error(`Модель Маркета не получила полноценную SSR-страницу: ${record.route_path}`);
  }
  if (canonicalFromHtml(html) !== `${origin}${record.canonical_path}`) {
    throw new Error(`Модель Маркета имеет неверный canonical: ${record.route_path}`);
  }
  const robots = metaContent(html, "robots");
  if (record.indexable === /\bnoindex\b/iu.test(robots)) {
    throw new Error(`Индексируемость модели Маркета не совпадает с manifest: ${record.route_path}`);
  }
  if (record.page_kind === "alias" && !html.includes('data-market-model-alias="true"')) {
    throw new Error(`Алиас модели не объясняет переход к canonical: ${record.route_path}`);
  }
  if (
    /VESA\s+\d{2,4}\s*[×x]/iu.test(html)
    || /\d+(?:[.,]\d+)?\s*кг\s+без\s+подставки/iu.test(html)
    || /"@type"\s*:\s*"Product"/u.test(html)
    || /\bdata-affiliate-offer-id=/iu.test(html)
  ) {
    throw new Error(`Страница модели содержит неподтверждённый товарный факт или CTA: ${record.route_path}`);
  }
}

const modelCatalogHtml = htmlByRoute.get("/modeli/") ?? "";
if (
  !modelCatalogHtml.includes('data-market-model-catalog="true"')
  || !modelCatalogHtml.includes(`Найдены в выдаче Маркета · ${observedMarketModels.length}`)
  || !modelCatalogHtml.includes("<details")
) {
  throw new Error("Каталог моделей не содержит сворачиваемый реестр наблюдаемых моделей Маркета");
}

const profilesByMarker = new Map(
  commercialProfiles.map((profile) => [
    `${profile.entity_kind}:${profile.entity_id}`,
    profile,
  ]),
);
for (const [route, html] of htmlByRoute) {
  const markerTags = html.match(
    /<[a-z][^>]*\bdata-commercial-profile=["'][^"']+["'][^>]*>/gi,
  ) ?? [];
  for (const tag of markerTags) {
    const marker = matchAttribute(tag, "data-commercial-profile");
    const profile = profilesByMarker.get(marker);
    if (!profile || profile.path !== route) {
      throw new Error(`Неожиданный SSR-маркер коммерческого профиля ${marker} на ${route}`);
    }
  }
}

for (const route of seoHubAffiliatePaths) {
  const html = htmlByRoute.get(route);
  if (!html) {
    throw new Error(`Нет статического SEO-хаба для клиентской витрины: ${route}`);
  }
  if (
    /\bdata-affiliate-(?:hub|slot|offer-id|mode)=/iu.test(html) ||
    [...publishableAffiliateHrefs].some((href) => html.includes(href))
  ) {
    throw new Error(`Действующая клиентская витрина попала в статический HTML: ${route}`);
  }
}

for (const profile of commercialProfiles) {
  const identity = `${profile.entity_kind}:${profile.entity_id}`;
  const html = htmlByRoute.get(profile.path);
  if (!html) {
    throw new Error(`Нет статического URL коммерческого профиля: ${profile.path}`);
  }
  const markerTags = (html.match(
    /<[a-z][^>]*\bdata-commercial-profile=["'][^"']+["'][^>]*>/gi,
  ) ?? []).filter(
    (tag) => matchAttribute(tag, "data-commercial-profile") === identity,
  );
  if (markerTags.length !== 1) {
    throw new Error(
      `Коммерческий профиль ${identity} должен иметь ровно один SSR-маркер на ${profile.path}`,
    );
  }
  if (decodeHtmlAttribute(titleFromHtml(html)) !== profile.title) {
    throw new Error(`Коммерческий профиль ${identity}: HTML title не совпадает с манифестом`);
  }
  if (decodeHtmlAttribute(metaContent(html, "description")) !== profile.description) {
    throw new Error(
      `Коммерческий профиль ${identity}: meta description не совпадает с манифестом`,
    );
  }
  if (decodeHtmlAttribute(canonicalFromHtml(html)) !== `${origin}${profile.path}`) {
    throw new Error(`Коммерческий профиль ${identity}: неверный canonical`);
  }
  const requiredStaticText = [
    profile.kicker,
    profile.heading,
    profile.answer,
    ...profile.faq.flatMap((item) => [item.question, item.answer]),
  ];
  if (!requiredStaticText.every((value) => html.includes(escapeHtmlText(value)))) {
    throw new Error(`Коммерческий профиль ${identity}: SSR содержит не весь материал`);
  }
}

let modelContextLinkCount = 0;
for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const html = htmlByRoute.get(route);
  if (!html) throw new Error(`Нет страницы модели для проверки перелинковки: ${model.id}`);

  const candidateIds = [
    `brand-${String(model.brand).trim().toLocaleLowerCase("ru-RU")}`,
    `diagonal-${Number(model.diagonal_inches)}`,
    `vesa-${model.vesa_width_mm}x${model.vesa_height_mm}`,
  ];
  const expectedPages = candidateIds
    .map((id) => seoPages.find((page) => page.id === id && page.indexable))
    .filter(Boolean);
  const contextNav = html.match(
    /<nav\b[^>]*aria-label=["']Связанные подборы["'][^>]*>([\s\S]*?)<\/nav>/i,
  )?.[1] ?? "";

  for (const page of expectedPages) {
    if (!new RegExp(`href=["']${page.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}["']`).test(contextNav)) {
      throw new Error(`Модель ${model.id} не ссылается на контекстный хаб ${page.id}`);
    }
    modelContextLinkCount += 1;
  }
  const contextHrefs = [...contextNav.matchAll(/href=["']([^"']+)["']/g)].map((match) => match[1]);
  for (const href of contextHrefs) {
    if (!seoPages.some((page) => page.path === href && page.indexable)) {
      throw new Error(`Модель ${model.id} ссылается на noindex или неизвестный хаб ${href}`);
    }
  }
}
assertMinimum(modelContextLinkCount, 100, "Контекстные ссылки модель → SEO-хаб");

for (const offer of publishableAffiliateOffers) {
  const html = htmlByRoute.get(offer.page_path);
  if (!html) {
    throw new Error(`Нет mount page для publishable affiliate offer: ${offer.id}`);
  }
  const matchingSlots = (html.match(/<aside\b[^>]*>/gi) ?? []).filter(
    (tag) => matchAttribute(tag, "data-affiliate-slot") === offer.id,
  );
  if (matchingSlots.length !== 1) {
    throw new Error(
      `Publishable affiliate offer должен иметь ровно один безопасный static slot: ${offer.id}`,
    );
  }
  const slot = matchingSlots[0];
  if (
    matchAttribute(slot, "data-entity-kind") !== "mount" ||
    matchAttribute(slot, "data-entity-id") !== offer.entity_id
  ) {
    throw new Error(`Статический affiliate slot потерял идентичность изделия: ${offer.id}`);
  }
  if (/\bhref\s*=/.test(slot) || html.includes(`data-affiliate-offer-id="${offer.id}"`)) {
    throw new Error(`Статический affiliate slot не должен содержать активную ссылку: ${offer.id}`);
  }
  const slotPosition = html.indexOf(`data-affiliate-slot="${offer.id}"`);
  const modelListPosition = html.indexOf("Подтверждённые популярные телевизоры");
  if (slotPosition < 0 || modelListPosition < 0 || slotPosition > modelListPosition) {
    throw new Error(`Affiliate slot расположен после списка телевизоров: ${offer.id}`);
  }
  const leakedLink = (html.match(/<a\b[^>]*>/gi) ?? []).find(
    (tag) => decodeHtmlAttribute(matchAttribute(tag, "href")) === offer.affiliate_href,
  );
  if (leakedLink) {
    throw new Error(`Партнёрский URL попал в статический HTML: ${offer.id}`);
  }
}

for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const html = htmlByRoute.get(route);
  if (!html) throw new Error(`Нет страницы кронштейна для проверки Маркета: ${mount.id}`);

  const untrackedMarketSearchLinks = (html.match(/<a\b[^>]*>/gi) ?? []).filter(
    (tag) => matchAttribute(tag, "data-market-mount-search") === "true",
  );
  if (untrackedMarketSearchLinks.length !== 0) {
    throw new Error(
      `Страница ${route} содержит конкурирующую непартнёрскую ссылку поиска Маркета`,
    );
  }

  const exactOffer = publishableAffiliateOffers.find(
    (offer) => offer.page_path === route && offer.entity_id === mount.id,
  );
  const internalFallbacks = (html.match(/<a\b[^>]*>/gi) ?? []).filter(
    (tag) => matchAttribute(tag, "data-market-fallback-internal") === "true",
  );
  if (exactOffer) {
    if (internalFallbacks.length !== 0) {
      throw new Error(`Страница ${route} дублирует точный affiliate slot внутренним fallback`);
    }
  } else if (
    internalFallbacks.length !== 1
    || matchAttribute(internalFallbacks[0], "href") !== "/podbor/"
  ) {
    throw new Error(`Страница ${route} без точного оффера должна вести во внутренний подбор`);
  }
}

const titles = [...htmlByRoute.entries()].map(([route, html]) => ({
  route,
  value: titleFromHtml(html),
}));
assertUnique(titles.map(({ value }) => value), "HTML-страницы, title");
const canonicals = [...htmlByRoute.entries()].map(([route, html]) => ({
  route,
  value: canonicalFromHtml(html),
}));
const marketAliasRoutes = new Set(
  [
    ...marketModelsManifest.records
      .filter((record) => record.page_kind === "alias")
      .map((record) => record.route_path),
    ...legacyVerifiedModelRoutes,
  ],
);
assertUnique(
  canonicals
    .filter(({ route }) => !marketAliasRoutes.has(route))
    .map(({ value }) => value),
  "HTML-страницы, canonical без технических alias",
);
if (titleFromHtml(htmlByRoute.get("/")) === titleFromHtml(htmlByRoute.get("/podbor/"))) {
  throw new Error("Главная и /podbor/ должны иметь разные title");
}

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(model.title) || !html.includes(escapeHtmlText(model.source_url))) {
    throw new Error(`Нет статической страницы модели с источником: ${route}`);
  }
  const compatibleMountIds = compatibilityEdges
    .filter((edge) => edge.tv_id === model.id && edge.compatible)
    .map((edge) => edge.mount_id);
  if (!compatibleMountIds.every((id) => html.includes(`/kronshteyny/${id}/`))) {
    throw new Error(`Страница модели не содержит все взаимные ссылки: ${route}`);
  }
  const verifiedMountIds = compatibilityEdges
    .filter((edge) => edge.tv_id === model.id && edge.fit_status === "verified-fit")
    .map((edge) => edge.mount_id);
  if (
    verifiedMountIds.length < 2
    || !html.includes("data-page-kind=\"model\"")
    || !html.includes(`VESA ${model.vesa_width_mm}×${model.vesa_height_mm}`)
    || !html.includes(`${model.weight_kg} кг`)
    || !html.includes(modelWeightSuffix(model))
    || !html.includes("Подходящие кронштейны")
    || !html.includes("Размеры модели")
    || !html.includes("Что подтверждено источником")
    || (html.match(/<section\b/gu) ?? []).length < 5
    || html.length < 7_500
  ) {
    throw new Error(`Карточка проверенной модели выглядит как заглушка: ${route}`);
  }
}
for (const record of marketModelsManifest.records) {
  const html = htmlByRoute.get(record.route_path);
  if (!html) {
    throw new Error(`Нет страницы для наблюдения Маркета: ${record.route_path}`);
  }
  if (record.page_kind === "verified") {
    const verifiedModel = modelById.get(record.verified_model_id);
    const hasVerifiedMount = compatibilityEdges.some(
      (edge) => edge.tv_id === verifiedModel?.id && edge.fit_status === "verified-fit",
    );
    if (!verifiedModel || !hasVerifiedMount || !html.includes("Подходящие кронштейны")) {
      throw new Error(`Наблюдение Маркета не ведёт на полноценную проверенную модель: ${record.record_id}`);
    }
    continue;
  }
  if (
    !/\bnoindex\b/iu.test(metaContent(html, "robots"))
    || !html.includes("data-compatibility-status=\"unverified\"")
    || !html.includes("Как подобрать кронштейн без ошибки")
    || !html.includes("Что зафиксировано в источнике")
    || !html.includes(escapeHtmlText(record.market_url))
    || !html.includes("Точный крепёж пока не подтверждён")
    || html.includes("data-affiliate-slot=")
    || html.includes("data-affiliate-offer-id=")
    || (html.match(/<section\b/gu) ?? []).length < 4
    || html.length < 6_000
  ) {
    throw new Error(`Непроверенная карточка Маркета тонкая или выдаёт догадку за совместимость: ${record.route_path}`);
  }
}
for (const [legacyRoute, verifiedRoute] of legacyVerifiedModelAliases) {
  const html = htmlByRoute.get(legacyRoute);
  const modelId = verifiedRoute.split("/").at(-2);
  const model = models.find((item) => item.id === modelId);
  const compatibleMountIds = compatibilityEdges
    .filter((edge) => edge.tv_id === modelId && edge.compatible)
    .map((edge) => edge.mount_id);
  if (
    !model
    || !html
    || !/<meta\s+name="robots"\s+content="noindex,follow"/u.test(html)
    || canonicalFromHtml(html) !== `${origin}${verifiedRoute}`
    || !html.includes(escapeHtmlText(model.source_url))
    || !compatibleMountIds.every((id) => html.includes(`/kronshteyny/${id}/`))
  ) {
    throw new Error(`Прежний адрес модели не содержит полный noindex alias: ${legacyRoute}`);
  }
}
for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(mount.title) || !html.includes(escapeHtmlText(mount.source_url))) {
    throw new Error(`Нет статической страницы кронштейна с источником: ${route}`);
  }
  const compatibleModelIds = compatibilityEdges
    .filter((edge) => edge.mount_id === mount.id && edge.compatible)
    .map((edge) => edge.tv_id);
  if (!compatibleModelIds.every((id) => html.includes(`/modeli/${id}/`))) {
    throw new Error(`Страница кронштейна не содержит все взаимные ссылки: ${route}`);
  }
}
for (const page of trustPages) {
  const html = htmlByRoute.get(dataPageRoute(page));
  if (!html?.includes(page.h1)) {
    throw new Error(`В HTML нет самостоятельного содержимого: ${page.path}`);
  }
}
for (const page of seoPages) {
  const html = htmlByRoute.get(dataPageRoute(page));
  if (
    !html?.includes(page.h1) ||
    !page.faq.every(([question, answer]) => html.includes(question) && html.includes(answer))
  ) {
    throw new Error(`SEO-страница не содержит полного статического материала: ${page.path}`);
  }

  const funnelMarkers = html.match(/data-mount-funnel-next-step="true"/g) ?? [];
  const funnelSection = html.match(/<section\b[^>]*data-mount-funnel-next-step="true"[^>]*>[\s\S]*?<\/section>/i)?.[0] ?? "";
  if (
    funnelMarkers.length !== 1
    || !funnelSection.includes('href="/podbor/"')
    || !funnelSection.includes("От результата мастера — к совместимому кронштейну")
    || !funnelSection.includes("Маркет откроется только после выбора подтверждённого совместимого кронштейна")
    || funnelSection.includes("market.yandex.ru")
  ) {
    throw new Error(`SEO-страница не содержит безопасную цепочку мастер → подбор → кронштейн → Маркет: ${page.path}`);
  }
}

const dailyEvidenceGuidePages = seoPages.filter((page) => page.guide);
const expectedDailyGuideCount = dailySeoCohorts.reduce((total, cohort) => total + cohort.pages.length, 0);
if (dailyEvidenceGuidePages.length !== expectedDailyGuideCount) {
  throw new Error(`Ежедневные SEO-когорты должны содержать ${expectedDailyGuideCount} evidence guide, получено ${dailyEvidenceGuidePages.length}`);
}
const dailyCohortIds = new Set();
for (const cohort of dailySeoCohorts) {
  if (cohort.pages.length !== 10) {
    throw new Error(`SEO-когорта ${cohort.cohort_date} должна содержать ровно 10 страниц`);
  }
  for (const expected of cohort.pages) {
    if (dailyCohortIds.has(expected.id)) {
      throw new Error(`Страница ${expected.id} повторяется между ежедневными SEO-когортами`);
    }
    dailyCohortIds.add(expected.id);
    const page = dailyEvidenceGuidePages.find((item) => item.id === expected.id);
    if (!page || page.path !== expected.path || page.guide.updated_at !== cohort.cohort_date) {
      throw new Error(`SEO-когорта ${cohort.cohort_date} не совпадает с canonical ${expected.id}`);
    }
    if (!Number.isFinite(expected.frequency) || expected.frequency <= 0 || !expected.evidence_file) {
      throw new Error(`SEO-когорта ${cohort.cohort_date} не содержит проверяемого спроса для ${expected.id}`);
    }
  }
}
for (const page of dailyEvidenceGuidePages) {
  const html = htmlByRoute.get(dataPageRoute(page)) ?? "";
  if (
    page.guide.steps.length !== 3
    || page.guide.sources.length < 2
    || !html.includes(`data-evidence-guide="${page.id}"`)
    || !html.includes('data-evidence-guide-table="true"')
    || (html.match(/data-evidence-guide-step=/g) ?? []).length !== 3
    || !html.includes("Таблица решений по наблюдаемому признаку")
    || !html.includes("/metodika/")
    || !html.includes(page.guide.updated_at)
  ) {
    throw new Error(`Evidence guide не содержит самостоятельный SSR-результат: ${page.path}`);
  }
  for (const source of page.guide.sources) {
    if (!source.url.startsWith("https://") || !html.includes(escapeHtmlText(source.url))) {
      throw new Error(`Evidence guide не содержит официальный HTTPS-источник ${source.id}: ${page.path}`);
    }
  }
  if (html.includes("market.yandex.ru")) {
    throw new Error(`Evidence guide не должен зависеть от партнёрской ссылки: ${page.path}`);
  }
}

const screwLookupPage = seoPages.find((page) => page.id === "tv-mount-screws");
if (
  !screwLookupPage
  || screwLookupPage.path !== "/vinty-dlya-krepleniya-televizora/"
  || screwLookupPage.kind !== "screws"
  || screwLookupPage.indexable !== true
) {
  throw new Error("Нет единой индексируемой страницы подбора винтов по точной модели");
}
const screwModels = models.filter((model) => model.wall_mount_screws?.groups?.length);
if (screwModels.length !== 27) {
  throw new Error(`Ожидалось 27 официальных паспортов винтов, получено ${screwModels.length}`);
}
const screwLookupHtml = htmlByRoute.get(screwLookupPage.path) ?? "";
if (!screwLookupHtml.includes('data-screw-catalog="true"') || !screwLookupHtml.includes("<details")) {
  throw new Error("Страница подбора винтов не содержит самостоятельный сворачиваемый каталог");
}
for (const required of [
  `data-searchable-model-count="${models.length}"`,
  `data-model-search-count="${models.length}"`,
  'data-known-model-fallback="true"',
  "паспорт винтов ещё не подтверждён",
  "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.1.0/tv-vesa-screws.csv",
  "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.1.0/tv-vesa-screws.json",
]) {
  if (!screwLookupHtml.includes(required)) {
    throw new Error(`Сырой HTML страницы винтов не содержит обязательный фрагмент: ${required}`);
  }
}
if ((screwLookupHtml.match(/<option value=/g) ?? []).length !== models.length) {
  throw new Error("Сырой HTML поиска винтов не содержит все известные модели");
}
if (
  screwLookupHtml.indexOf('data-screw-catalog="true"')
  > screwLookupHtml.indexOf("Что проверить")
) {
  throw new Error("Интерактивный ответ должен находиться раньше общего списка проверок");
}
for (const model of screwModels) {
  const modelRoute = `/modeli/${model.id}/`;
  if (
    !screwLookupHtml.includes(`href="${modelRoute}"`)
    || !screwLookupHtml.includes(escapeHtmlText(model.wall_mount_screws.source_url))
  ) {
    throw new Error(`Страница винтов не содержит модель и официальный источник: ${model.id}`);
  }
  const modelHtml = htmlByRoute.get(modelRoute) ?? "";
  if (!modelHtml.includes('href="/vinty-dlya-krepleniya-televizora/"')) {
    throw new Error(`Нет обратной ссылки из паспорта винтов модели: ${model.id}`);
  }
}
const screwCatalogOutsideDetails = screwLookupHtml.replace(/<details\b[\s\S]*?<\/details>/gi, "");
if (screwModels.some((model) => screwCatalogOutsideDetails.includes(`href="/modeli/${model.id}/"`))) {
  throw new Error("Длинный список моделей винтов выведен вне сворачиваемых брендов");
}
if (screwLookupHtml.includes("market.yandex.ru")) {
  throw new Error("Технический справочник винтов не должен быть партнёрской витриной");
}

const heightPage = seoPages.find((page) => page.id === "mounting-height");
const heightHtml = heightPage ? (htmlByRoute.get(heightPage.path) ?? "") : "";
for (const required of [
  'data-height-planning-guide="true"',
  'data-height-room-scenarios="true"',
  'data-height-reference-table="true"',
  'data-height-table-scroll-hint="true"',
  "1. Гостиная",
  "2. Спальня",
  "3. Кухня",
  "Это не готовая рекомендация по высоте",
  "Таблица прокручивается вправо →",
]) {
  if (!heightPage?.indexable || !heightHtml.includes(required)) {
    throw new Error(`Сырой HTML страницы высоты не содержит обязательный фрагмент: ${required}`);
  }
}
if ((heightHtml.match(/scope="row"/g) ?? []).length !== 6) {
  throw new Error("Справочная таблица высоты должна содержать шесть диагоналей");
}

const wallPlannerPage = seoPages.find((page) => page.id === "wall-planner");
const wallPlannerHtml = wallPlannerPage ? (htmlByRoute.get(wallPlannerPage.path) ?? "") : "";
if (
  !wallPlannerPage?.indexable
  || wallPlannerPage.path !== "/televizor-na-stene/"
  || decodeHtmlAttribute(canonicalFromHtml(wallPlannerHtml)) !== `${origin}/televizor-na-stene/`
  || (wallPlannerHtml.match(/<h1(?:\s|>)/g) ?? []).length !== 1
) {
  throw new Error("Нет единой индексируемой канонической страницы планировщика стены");
}
for (const required of [
  'data-wall-planner-answer="true"',
  'data-wall-planner-static-examples="true"',
  'data-wall-planner-example="43"',
  'data-wall-planner-example="55"',
  'data-wall-planner-example="65"',
  "точную модель или экран 16:9",
  "не назначает высоту, точки сверления, анкеры и розетки",
  'href="/na-kakoy-vysote-veshat-televizor/"',
  'href="/kak-povesit-televizor-na-stenu/"',
  'href="/rozetki-pod-televizor-na-stene/"',
]) {
  if (!wallPlannerHtml.includes(required)) {
    throw new Error(`Сырой HTML планировщика не содержит обязательный фрагмент: ${required}`);
  }
}
if (
  (wallPlannerHtml.match(/data-wall-planner-example=/g) ?? []).length !== 3
  || wallPlannerHtml.includes("market.yandex.ru")
) {
  throw new Error("Планировщик должен иметь три статических примера и не быть партнёрской витриной");
}
for (const competingIntent of [
  "на какой высоте",
  "как повесить",
  "розетки",
  "подбор кронштейна",
]) {
  if (
    wallPlannerPage.title.toLocaleLowerCase("ru-RU").includes(competingIntent)
    || wallPlannerPage.h1.toLocaleLowerCase("ru-RU").includes(competingIntent)
  ) {
    throw new Error(`Планировщик каннибализирует соседний интент в title/H1: ${competingIntent}`);
  }
}

const tvDimensionsPage = seoPages.find((page) => page.id === "tv-dimensions");
const tvDimensionsHtml = tvDimensionsPage
  ? (htmlByRoute.get(tvDimensionsPage.path) ?? "")
  : "";
if (
  !tvDimensionsPage?.indexable
  || tvDimensionsPage.path !== "/razmery-televizora-po-diagonali/"
  || decodeHtmlAttribute(canonicalFromHtml(tvDimensionsHtml)) !== `${origin}/razmery-televizora-po-diagonali/`
  || (tvDimensionsHtml.match(/<h1(?:\s|>)/g) ?? []).length !== 1
) {
  throw new Error("Нет единой индексируемой канонической страницы размеров телевизора");
}
for (const required of [
  "Размеры телевизоров по диагонали: таблица и калькулятор — KREPI TV",
  "Размеры телевизоров по диагонали в сантиметрах",
  'data-tv-dimensions-answer="true"',
  'data-tv-dimensions-reference-table="true"',
  'data-tv-dimensions-table-scroll-hint="true"',
  "Таблица показывает экран, а не корпус",
  'href="/televizor-na-stene/"',
  'href="/rasstoyanie-do-televizora-i-diagonal/"',
  'href="/modeli/"',
]) {
  if (!tvDimensionsHtml.includes(required)) {
    throw new Error(`Сырой HTML страницы размеров не содержит обязательный фрагмент: ${required}`);
  }
}
for (const diagonal of [32, 43, 50, 55, 65, 75, 85]) {
  if (!tvDimensionsHtml.includes(`data-tv-dimensions-row="${diagonal}"`)) {
    throw new Error(`В справочной таблице размеров нет диагонали ${diagonal} дюймов`);
  }
}
if (
  (tvDimensionsHtml.match(/data-tv-dimensions-row=/g) ?? []).length !== 7
  || tvDimensionsHtml.includes("market.yandex.ru")
) {
  throw new Error("Страница размеров должна иметь семь строк и не быть партнёрской витриной");
}
for (const sourceRoute of [
  "/",
  "/televizor-na-stene/",
  "/rasstoyanie-do-televizora-i-diagonal/",
  "/modeli/",
  "/kronshteyn-dlya-televizora-43-dyuyma/",
  "/kronshteyn-dlya-televizora-55-dyuyma/",
  "/kronshteyn-dlya-televizora-65-dyuyma/",
]) {
  const sourceHtml = htmlByRoute.get(sourceRoute) ?? "";
  if (!sourceHtml.includes('href="/razmery-televizora-po-diagonali/"')) {
    throw new Error(`Нет целевой внутренней ссылки на размеры телевизора: ${sourceRoute}`);
  }
}

const vesaLookupPage = seoPages.find((page) => page.id === "vesa");
if (
  !vesaLookupPage
  || vesaLookupPage.path !== "/vesa/"
  || vesaLookupPage.indexable !== true
) {
  throw new Error("Нет единой индексируемой страницы проверки VESA");
}
const vesaLookupHtml = htmlByRoute.get(vesaLookupPage.path) ?? "";
for (const required of [
  'data-vesa-model-catalog="true"',
  `data-searchable-model-count="${models.length}"`,
  `data-vesa-model-search-count="${models.length}"`,
  "Найдите VESA по модели телевизора",
  "Таблица VESA телевизоров",
  "https://github.com/jimbokl/krepitv/releases/download/datasets-v2.2.0/tv-vesa-sizes.csv",
  "https://github.com/jimbokl/krepitv/releases/download/datasets-v2.2.0/tv-vesa-sizes.json",
]) {
  if (!vesaLookupHtml.includes(required)) {
    throw new Error(`Сырой HTML страницы VESA не содержит обязательный фрагмент: ${required}`);
  }
}
if ((vesaLookupHtml.match(/<option value=/g) ?? []).length !== models.length) {
  throw new Error("Сырой HTML поиска VESA не содержит все известные модели");
}
if (
  vesaLookupHtml.indexOf('data-vesa-model-catalog="true"')
  > vesaLookupHtml.indexOf("Что проверить")
) {
  throw new Error("Поиск VESA по модели должен находиться раньше общего списка проверок");
}
if (
  vesaLookupHtml.indexOf('data-vesa-model-catalog="true"')
  > vesaLookupHtml.indexOf("Сравнить VESA телевизора и кронштейна")
) {
  throw new Error("Поиск VESA по модели должен быть первым режимом существующей страницы");
}
if (!vesaLookupHtml.includes("автоподбор остановлен")) {
  throw new Error("Конфликт официальных VESA должен останавливать автоматический подбор");
}
for (const model of models) {
  const route = `/modeli/${model.id}/`;
  if (
    !vesaLookupHtml.includes(`href="${route}"`)
    || !vesaLookupHtml.includes(escapeHtmlText(model.source_url))
  ) {
    throw new Error(`Таблица VESA не содержит модель и официальный источник: ${model.id}`);
  }
  const modelHtml = htmlByRoute.get(route) ?? "";
  if (!modelHtml.includes('href="/vesa/"')) {
    throw new Error(`Нет обратной ссылки из карточки модели в поиск VESA: ${model.id}`);
  }
}
const vesaCatalogOutsideDetails = vesaLookupHtml.replace(/<details\b[\s\S]*?<\/details>/gi, "");
if (models.some((model) => vesaCatalogOutsideDetails.includes(`href="/modeli/${model.id}/"`))) {
  throw new Error("Длинная таблица VESA выведена вне сворачиваемых брендов");
}
if (vesaLookupHtml.includes("market.yandex.ru")) {
  throw new Error("Технический поиск VESA не должен быть партнёрской витриной");
}

function hasVerifiedModel(modelId) {
  return compatibilityEdges.some(
    (edge) => edge.tv_id === modelId && edge.compatible && edge.fit_status === "verified-fit",
  );
}

function hasVerifiedMount(mountId) {
  return compatibilityEdges.some(
    (edge) => edge.mount_id === mountId && edge.compatible && edge.fit_status === "verified-fit",
  );
}

function seoCatalogExpectation(page) {
  if (page.kind === "mechanism") {
    const mechanism = {
      "fixed-mount": "fixed",
      "tilt-mount": "tilt",
      "full-motion-mount": "full-motion",
    }[page.id];
    return mechanism
      ? {
          label: "кронштейнов",
          routes: mounts
            .filter((mount) => mount.mechanism === mechanism && hasVerifiedMount(mount.id))
            .map((mount) => `/kronshteyny/${mount.id}/`),
        }
      : null;
  }

  if (page.kind === "vesa") {
    const match = page.id.match(/^vesa-(\d+)x(\d+)$/);
    if (!match) return null;
    const [, width, height] = match;
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            model.vesa_width_mm === Number(width) &&
            model.vesa_height_mm === Number(height) &&
            hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  if (page.kind === "diagonal") {
    const diagonal = Number(page.id.replace(/^diagonal-/, ""));
    if (!Number.isFinite(diagonal)) return null;
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            Math.abs(model.diagonal_inches - diagonal) < 0.05 && hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  if (page.kind === "brand") {
    const brand = page.id.replace(/^brand-/, "").toLocaleLowerCase("ru-RU");
    return {
      label: "моделей",
      routes: models
        .filter(
          (model) =>
            String(model.brand).trim().toLocaleLowerCase("ru-RU") === brand &&
            hasVerifiedModel(model.id),
        )
        .map((model) => `/modeli/${model.id}/`),
    };
  }

  return null;
}

for (const page of seoPages) {
  const expected = seoCatalogExpectation(page);
  if (!expected) continue;
  const html = htmlByRoute.get(page.path);
  if (!html.includes("Данные проверенного каталога") || !html.includes("<details")) {
    throw new Error(`SEO-страница не содержит статический каталог ${expected.label}: ${page.path}`);
  }
  for (const route of expected.routes) {
    if (!html.includes(`href="${route}"`)) {
      throw new Error(`Статический каталог на ${page.path} не содержит ${route}`);
    }
  }
  const outsideDetails = html.replace(/<details\b[\s\S]*?<\/details>/gi, "");
  if (expected.routes.some((route) => outsideDetails.includes(`href="${route}"`))) {
    throw new Error(`Длинный каталог на ${page.path} выведен вне сворачиваемых групп`);
  }
}

const sitemap = await readFile(path.join(docs, "sitemap.xml"), "utf8");
const sitemapEntries = [...sitemap.matchAll(
  /<url>\s*<loc>([^<]+)<\/loc>\s*<lastmod>([^<]+)<\/lastmod>\s*<\/url>/g,
)].map((match) => ({ url: match[1], lastmod: match[2] }));
const sitemapUrlElementCount = [...sitemap.matchAll(/<url>/g)].length;
if (sitemapEntries.length !== sitemapUrlElementCount) {
  throw new Error("Каждый URL sitemap должен иметь соседний точный lastmod");
}
const sitemapUrls = sitemapEntries.map((entry) => entry.url);
const sitemapLastmods = new Map(sitemapEntries.map((entry) => [new URL(entry.url).pathname, entry.lastmod]));
assertMinimum(sitemapUrls, 15, "URL в sitemap");
if (sitemapUrls.length !== expectedIndexableUrlCount) {
  throw new Error(
    `Ожидалось ${expectedIndexableUrlCount} индексируемых URL, получено ${sitemapUrls.length}`,
  );
}
assertUnique(sitemapUrls, "Sitemap URL");
assertUnique(
  sitemapEntries.map((entry) => new URL(entry.url).pathname),
  "Sitemap pathname",
);
const todayIso = new Date().toISOString().slice(0, 10);
const newestCoreDependency = [
  ...models.map((model) => model.checked_at),
  ...mounts.map((mount) => mount.checked_at),
  commercialProfilesManifest.updated_at,
].sort().at(-1);
if (corePagesUpdatedAt < newestCoreDependency) {
  throw new Error("Дата основных страниц старше зависимого каталога");
}
for (const { url: urlValue, lastmod } of sitemapEntries) {
  const url = new URL(urlValue);
  if (url.origin !== origin || !htmlByRoute.has(url.pathname)) {
    throw new Error(`Sitemap содержит внешний или несуществующий URL: ${urlValue}`);
  }
  const canonical = canonicalFromHtml(htmlByRoute.get(url.pathname));
  if (url.username || url.password || url.search || url.hash || url.href !== canonical) {
    throw new Error(`Sitemap URL не совпадает с canonical страницы: ${urlValue}`);
  }
  const parsedLastmod = new Date(`${lastmod}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}$/u.test(lastmod) ||
    Number.isNaN(parsedLastmod.valueOf()) ||
    parsedLastmod.toISOString().slice(0, 10) !== lastmod ||
    lastmod > todayIso
  ) {
    throw new Error(`Sitemap содержит неверный или будущий lastmod: ${urlValue} → ${lastmod}`);
  }
  if (/\bnoindex\b/i.test(metaContent(htmlByRoute.get(url.pathname), "robots"))) {
    throw new Error(`Sitemap содержит noindex URL: ${urlValue}`);
  }
}

for (const route of ["/", "/podbor/", "/kronshteyny/"]) {
  if (sitemapLastmods.get(route) !== corePagesUpdatedAt) {
    throw new Error(`Основная страница имеет неточный sitemap lastmod: ${route}`);
  }
}
if (sitemapLastmods.get("/modeli/") !== marketModelsUpdatedAt) {
  throw new Error("Каталог моделей имеет неточный sitemap lastmod");
}
const sitemapPaths = new Set(sitemapUrls.map((value) => new URL(value).pathname));

for (const record of routedMarketModels) {
  const present = sitemapPaths.has(record.route_path);
  if (present !== (record.page_kind === "observed" && record.indexable)) {
    throw new Error(`Sitemap неверно обрабатывает модель Маркета: ${record.route_path}`);
  }
  if (present && sitemapLastmods.get(record.route_path) !== record.checked_at) {
    throw new Error(`Модель Маркета имеет неточный sitemap lastmod: ${record.route_path}`);
  }
}

const notFoundHtml = htmlByRoute.get("/404.html");
if (!notFoundHtml) {
  throw new Error("Нет собственной русской страницы 404.html");
}
if (
  !/<html\b[^>]*\blang=["']ru["']/i.test(notFoundHtml) ||
  !/<h1\b[^>]*>Страница не найдена<\/h1>/i.test(notFoundHtml) ||
  !/\bnoindex\b/i.test(metaContent(notFoundHtml, "robots")) ||
  !/\bfollow\b/i.test(metaContent(notFoundHtml, "robots")) ||
  canonicalFromHtml(notFoundHtml) !== `${origin}/404.html` ||
  sitemapPaths.has("/404.html")
) {
  throw new Error("Русская 404 должна быть noindex,follow, иметь точный canonical и отсутствовать в sitemap");
}
for (const href of ["/podbor/", "/modeli/", "/vesa/"]) {
  if (!notFoundHtml.includes(`href="${href}"`)) {
    throw new Error(`Русская 404 не содержит полезный выход ${href}`);
  }
}

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const indexable = compatibilityEdges.some(
    (edge) => edge.tv_id === model.id && edge.fit_status === "verified-fit",
  );
  const robots = metaContent(htmlByRoute.get(route), "robots");
  if (indexable && (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(route))) {
    throw new Error(`Модель с подтверждённым совпадением закрыта от индекса: ${route}`);
  }
  if (!indexable && (!/\bnoindex\b/i.test(robots) || sitemapPaths.has(route))) {
    throw new Error(`Модель без подтверждённого совпадения должна быть noindex: ${route}`);
  }
  if (indexable) {
    const profile = commercialProfiles.find(
      (item) => item.entity_kind === "model" && item.entity_id === model.id,
    );
    const expectedLastmod = [
      model.checked_at,
      model.wall_mount_screws?.checked_at,
      profile ? (profile.updated_at ?? commercialProfilesManifest.updated_at) : undefined,
      modelPagesUpdatedAt,
    ].filter(Boolean).sort().at(-1);
    if (sitemapLastmods.get(route) !== expectedLastmod) {
      throw new Error(`Модель имеет неточный sitemap lastmod: ${route}`);
    }
  }
}

for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const indexable = compatibilityEdges.some(
    (edge) => edge.mount_id === mount.id && edge.fit_status === "verified-fit",
  );
  const robots = metaContent(htmlByRoute.get(route), "robots");
  if (indexable && (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(route))) {
    throw new Error(`Кронштейн с подтверждённым совпадением закрыт от индекса: ${route}`);
  }
  if (!indexable && (!/\bnoindex\b/i.test(robots) || sitemapPaths.has(route))) {
    throw new Error(`Кронштейн без подтверждённого совпадения должен быть noindex: ${route}`);
  }
  if (indexable) {
    const profile = commercialProfiles.find(
      (item) => item.entity_kind === "mount" && item.entity_id === mount.id,
    );
    const expectedLastmod = profile
      ? [mount.checked_at, profile.updated_at ?? commercialProfilesManifest.updated_at].sort().at(-1)
      : mount.checked_at;
    if (sitemapLastmods.get(route) !== expectedLastmod) {
      throw new Error(`Кронштейн имеет неточный sitemap lastmod: ${route}`);
    }
  }
}

const indexableSeoPages = seoPages.filter((page) => page.indexable);
const noindexSeoPages = seoPages.filter((page) => !page.indexable);
assertMinimum(indexableSeoPages, 8, "Индексируемые SEO-материалы");
for (const page of indexableSeoPages) {
  const robots = metaContent(htmlByRoute.get(page.path), "robots");
  if (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(page.path)) {
    throw new Error(`Индексируемая SEO-страница отсутствует в sitemap или закрыта: ${page.path}`);
  }
  const contentLastmod = page.guide
    ? page.guide.updated_at
    : [
    "phone-to-tv",
    "tv-no-signal",
    "tv-sound-no-picture",
    "tv-no-sound",
    "tv-remote-not-working",
    "tv-turns-off",
    "tv-no-internet",
    "tv-usb-not-seen",
    "laptop-to-tv",
    "digital-channels",
    "picture-setup",
    "soundbar-to-tv",
    "screen-cleaning",
    "smart-tv-box",
    "tv-speakers",
    "tv-headphones",
    "tv-energy-consumption",
    "tv-firmware-update",
    "tv-app-install",
    "tv-factory-reset",
    "vesa",
    "tv-mount-screws",
    "mounting-height",
    "wall-planner",
    "tv-dimensions",
      ].includes(page.id)
      ? trafficPagesUpdatedAt
      : corePagesUpdatedAt;
  const expectedLastmod = [contentLastmod, seoFunnelUpdatedAt].sort().at(-1);
  if (sitemapLastmods.get(page.path) !== expectedLastmod) {
    throw new Error(`SEO-страница имеет неточный sitemap lastmod: ${page.path}`);
  }
}
for (const page of trustPages) {
  if (sitemapLastmods.get(page.path) !== page.lastmod) {
    throw new Error(`Доверительная страница имеет неточный sitemap lastmod: ${page.path}`);
  }
}
for (const page of noindexSeoPages) {
  const robots = metaContent(htmlByRoute.get(page.path), "robots");
  if (!/\bnoindex\b/i.test(robots) || !/\bfollow\b/i.test(robots)) {
    throw new Error(`Тонкая SEO-страница должна иметь noindex,follow: ${page.path}`);
  }
  if (sitemapPaths.has(page.path)) {
    throw new Error(`Тонкая SEO-страница не должна входить в sitemap: ${page.path}`);
  }
}

const incoming = new Map(indexableSeoPages.map((page) => [page.path, new Set()]));
for (const [sourceRoute, html] of htmlByRoute) {
  const hrefs = [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map(
    (match) => match[1],
  );
  for (const href of hrefs) {
    const targetRoute = normalizeInternalHref(href, sourceRoute);
    if (targetRoute && !htmlByRoute.has(targetRoute)) {
      throw new Error(`Внутренняя ссылка ведёт на отсутствующую страницу: ${sourceRoute} → ${targetRoute}`);
    }
    if (!sitemapPaths.has(sourceRoute)) continue;
    if (targetRoute && targetRoute !== sourceRoute && incoming.has(targetRoute)) {
      incoming.get(targetRoute).add(sourceRoute);
    }
  }
}
for (const [route, sources] of incoming) {
  if (sources.size === 0) {
    throw new Error(`У индексируемой SEO-страницы нет входящей статической ссылки: ${route}`);
  }
}

for (const [route, html] of htmlByRoute) {
  const jsonLd = jsonLdFromHtml(html, route);
  const canonical = canonicalFromHtml(html);
  if (route === "/") {
    const homeEntities = jsonLd.flatMap((item) => Array.isArray(item["@graph"]) ? item["@graph"] : [item]);
    const website = homeEntities.find((item) => item["@type"] === "WebSite");
    const organization = homeEntities.find((item) => item["@type"] === "Organization");
    if (!website || website.url !== canonical || website.inLanguage !== "ru-RU") {
      throw new Error("На главной нет корректного WebSite JSON-LD");
    }
    if (!organization || organization.url !== canonical || organization.logo !== "https://krepitv.ru/logo-512.svg") {
      throw new Error("На главной нет корректного Organization JSON-LD");
    }
    continue;
  }

  const breadcrumbs = jsonLd.find((item) => item["@type"] === "BreadcrumbList");
  const elements = breadcrumbs?.itemListElement;
  if (!Array.isArray(elements) || elements.length < 2) {
    throw new Error(`На внутренней странице нет корректного BreadcrumbList: ${route}`);
  }
  elements.forEach((element, index) => {
    if (
      element?.["@type"] !== "ListItem" ||
      element.position !== index + 1 ||
      !element.name ||
      !element.item
    ) {
      throw new Error(`Некорректный элемент BreadcrumbList: ${route}`);
    }
  });
  if (elements.at(-1).item !== canonical) {
    throw new Error(`Последний элемент BreadcrumbList не совпадает с canonical: ${route}`);
  }

  const datasetRoutes = new Map([
    ["/vesa/", {
      files: ["tv-vesa-sizes.csv", "tv-vesa-sizes.json"],
      version: "2.2.0",
      downloadBase: "https://github.com/jimbokl/krepitv/releases/download/datasets-v2.2.0/",
    }],
    ["/vinty-dlya-krepleniya-televizora/", {
      files: ["tv-vesa-screws.csv", "tv-vesa-screws.json"],
      version: "1.1.0",
      downloadBase: "https://github.com/jimbokl/krepitv/releases/download/datasets-v1.1.0/",
    }],
  ]);
  const expectedDataset = datasetRoutes.get(route);
  const dataset = jsonLd.find((item) => item["@type"] === "Dataset");
  if (expectedDataset) {
    if (
      !dataset ||
      dataset.url !== canonical ||
      dataset.version !== expectedDataset.version ||
      dataset.isAccessibleForFree !== true ||
      dataset.license !==
        "https://github.com/jimbokl/krepitv/blob/2f19d58ef793ffc1e26c8c8fdb6d53f2a20edbfe/LICENSE" ||
      !Array.isArray(dataset.distribution) ||
      dataset.distribution.length !== 2
    ) {
      throw new Error(`Некорректный Dataset JSON-LD: ${route}`);
    }
    const filenames = dataset.distribution.map((item) => {
      if (
        item?.["@type"] !== "DataDownload" ||
        !["text/csv", "application/json"].includes(item.encodingFormat) ||
        !item.contentUrl?.startsWith(expectedDataset.downloadBase) ||
        item.contentUrl.includes("?")
      ) {
        throw new Error(`Некорректный DataDownload JSON-LD: ${route}`);
      }
      return new URL(item.contentUrl).pathname.split("/").at(-1);
    });
    if (filenames.join("|") !== expectedDataset.files.join("|")) {
      throw new Error(`Dataset ссылается не на те файлы: ${route}`);
    }
  } else if (dataset) {
    throw new Error(`Dataset JSON-LD появился на посторонней странице: ${route}`);
  }
}

const robotsTxt = await readFile(path.join(docs, "robots.txt"), "utf8");
if (!robotsTxt.includes("Sitemap: https://krepitv.ru/sitemap.xml")) {
  throw new Error("robots.txt не содержит канонический адрес sitemap");
}
if (!robotsTxt.includes("Sitemap: https://krepitv.ru/image-sitemap.xml")) {
  throw new Error("robots.txt не содержит канонический адрес image sitemap");
}

console.log(
  `Проверено: ${pageHtmlFiles.length} HTML-страниц (минимум 25), ${yandexVerificationFiles.length} файл подтверждения Яндекса и ${googleVerificationFiles.length} файл подтверждения Google, ${models.length} модели ТВ, ${mounts.length} кронштейна, ${compatibilityEdges.length} рёбер графа, ${seoPages.length} SEO-материалов; в sitemap ${sitemapUrls.length} индексируемых URL; полнота каталога: ${coverageSummary.catalog_status}, полный=${coverageSummary.full_catalog_ready}`,
);
