import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validateCoverageManifest } from "./catalog/coverage-lib.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");
const origin = "https://krepitv.ru";

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
  return `/${relative.replace(/index\.html$/, "")}`;
}

function dataPageRoute(page) {
  return page.path;
}

function matchAttribute(tag, name) {
  return tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, "i"))?.[1] ?? "";
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

const files = await walk(docs);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
assertMinimum(htmlFiles, 25, "HTML-страницы");

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
  "krepitv-engine-loader.js",
  "pkg/krepitv_engine_bg.wasm",
  "pkg/krepitv_engine.js",
  "data/compatibility-graph.json",
  "data/catalog-coverage.json",
  "data/affiliate-offers.json",
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

if (files.includes(path.join(docs, "pkg/.gitignore"))) {
  throw new Error("Публикуемый WASM-пакет не должен быть скрыт локальным .gitignore");
}

const models = JSON.parse(await readFile(path.join(docs, "data/tv-models.json"), "utf8"));
const mounts = JSON.parse(await readFile(path.join(docs, "data/mounts.json"), "utf8"));
const compatibilityEdges = JSON.parse(
  await readFile(path.join(docs, "data/compatibility-graph.json"), "utf8"),
);
const coverageManifest = JSON.parse(
  await readFile(path.join(docs, "data/catalog-coverage.json"), "utf8"),
);
const seoPages = JSON.parse(await readFile(path.join(docs, "data/seo-pages.json"), "utf8"));
const trustPages = JSON.parse(await readFile(path.join(docs, "data/trust-pages.json"), "utf8"));

assertMinimum(models, 2, "Проверенные модели телевизоров");
assertMinimum(mounts, 3, "Проверенные кронштейны");
assertMinimum(seoPages, 12, "SEO-материалы");
assertMinimum(trustPages, 4, "Доверительные страницы");
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

for (const model of models) {
  assertHttpsSource(model, `Модель ${model.id}`);
  if (!model.source_label?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(model.checked_at ?? "")) {
    throw new Error(`Модель ${model.id}: нет подписи источника или даты проверки`);
  }
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
for (const page of seoPages) {
  if (typeof page.indexable !== "boolean") {
    throw new Error(`SEO-материал ${page.id}: поле indexable должно быть boolean`);
  }
}

const sourceFiles = (await walk(path.join(root, "web/src"))).filter((file) =>
  /\.(?:[cm]?js|jsx|[cm]?ts|tsx)$/.test(file),
);
const affiliateComponent = path.join(root, "web/src/components/AffiliateOffer.jsx");
const affiliateConsumers = new Set([
  path.join(root, "web/src/pages/ModelPage.jsx"),
  path.join(root, "web/src/pages/MountPage.jsx"),
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
for (const file of htmlFiles) {
  const route = routeFromHtmlFile(file);
  const html = await readFile(file, "utf8");
  htmlByRoute.set(route, html);

  if (!/<html\s+lang=["']ru["']/.test(html)) {
    throw new Error(`Не указан русский язык: ${path.relative(root, file)}`);
  }
  if (/\blang=["']en["']|\bPrototype\b|lorem ipsum/i.test(html)) {
    throw new Error(`Найдена служебная английская строка: ${path.relative(root, file)}`);
  }
  if (!metaContent(html, "description")) {
    throw new Error(`Нет описания страницы: ${path.relative(root, file)}`);
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
  for (const link of marketLinks) {
    if (!/\brel=["'][^"']*\bsponsored\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=sponsored: ${path.relative(root, file)}`);
    }
    if (!/\brel=["'][^"']*\bnofollow\b[^"']*["']/i.test(link)) {
      throw new Error(`Партнёрская ссылка без rel=nofollow: ${path.relative(root, file)}`);
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
      if (!html.includes("Партнёрская ссылка на Яндекс Маркет")) {
        throw new Error(`Партнёрская ссылка без пояснения: ${path.relative(root, file)}`);
      }
    } else {
      throw new Error(`Партнёрская ссылка без режима размещения: ${path.relative(root, file)}`);
    }
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
assertUnique(canonicals.map(({ value }) => value), "HTML-страницы, canonical");
if (titleFromHtml(htmlByRoute.get("/")) === titleFromHtml(htmlByRoute.get("/podbor/"))) {
  throw new Error("Главная и /podbor/ должны иметь разные title");
}

for (const model of models) {
  const route = `/modeli/${model.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(model.title) || !html.includes(model.source_url)) {
    throw new Error(`Нет статической страницы модели с источником: ${route}`);
  }
  const compatibleMountIds = compatibilityEdges
    .filter((edge) => edge.tv_id === model.id && edge.compatible)
    .map((edge) => edge.mount_id);
  if (!compatibleMountIds.every((id) => html.includes(`/kronshteyny/${id}/`))) {
    throw new Error(`Страница модели не содержит все взаимные ссылки: ${route}`);
  }
}
for (const mount of mounts) {
  const route = `/kronshteyny/${mount.id}/`;
  const html = htmlByRoute.get(route);
  if (!html || !html.includes(mount.title) || !html.includes(mount.source_url)) {
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
}

const sitemap = await readFile(path.join(docs, "sitemap.xml"), "utf8");
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
assertMinimum(sitemapUrls, 15, "URL в sitemap");
assertUnique(sitemapUrls, "Sitemap URL");
for (const urlValue of sitemapUrls) {
  const url = new URL(urlValue);
  if (url.origin !== origin || !htmlByRoute.has(url.pathname)) {
    throw new Error(`Sitemap содержит внешний или несуществующий URL: ${urlValue}`);
  }
  if (/\bnoindex\b/i.test(metaContent(htmlByRoute.get(url.pathname), "robots"))) {
    throw new Error(`Sitemap содержит noindex URL: ${urlValue}`);
  }
}
const sitemapPaths = new Set(sitemapUrls.map((value) => new URL(value).pathname));

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
}

const indexableSeoPages = seoPages.filter((page) => page.indexable);
const noindexSeoPages = seoPages.filter((page) => !page.indexable);
assertMinimum(indexableSeoPages, 8, "Индексируемые SEO-материалы");
for (const page of indexableSeoPages) {
  const robots = metaContent(htmlByRoute.get(page.path), "robots");
  if (/\bnoindex\b/i.test(robots) || !sitemapPaths.has(page.path)) {
    throw new Error(`Индексируемая SEO-страница отсутствует в sitemap или закрыта: ${page.path}`);
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
    const website = jsonLd.find((item) => item["@type"] === "WebSite");
    if (!website || website.url !== canonical || website.inLanguage !== "ru-RU") {
      throw new Error("На главной нет корректного WebSite JSON-LD");
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
}

const robotsTxt = await readFile(path.join(docs, "robots.txt"), "utf8");
if (!robotsTxt.includes("Sitemap: https://krepitv.ru/sitemap.xml")) {
  throw new Error("robots.txt не содержит канонический адрес sitemap");
}

console.log(
  `Проверено: ${htmlFiles.length} HTML-страниц (минимум 25), ${models.length} модели ТВ, ${mounts.length} кронштейна, ${compatibilityEdges.length} рёбер графа, ${seoPages.length} SEO-материалов; в sitemap ${sitemapUrls.length} индексируемых URL; полнота каталога: ${coverageSummary.catalog_status}, полный=${coverageSummary.full_catalog_ready}`,
);
