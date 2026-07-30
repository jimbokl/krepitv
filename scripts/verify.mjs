import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const docs = path.join(root, "docs");

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

const files = await walk(docs);
const htmlFiles = files.filter((file) => file.endsWith(".html"));
if (htmlFiles.length < 20) {
  throw new Error(`Ожидалось не менее 20 HTML-страниц, найдено ${htmlFiles.length}`);
}

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  if (!/<html\s+lang=["']ru["']/.test(html)) {
    throw new Error(`Не указан русский язык: ${path.relative(root, file)}`);
  }
  if (/\blang=["']en["']|\bPrototype\b|lorem ipsum/i.test(html)) {
    throw new Error(`Найдена служебная английская строка: ${path.relative(root, file)}`);
  }
  if (!/<meta\s+name=["']description["']/.test(html)) {
    throw new Error(`Нет описания страницы: ${path.relative(root, file)}`);
  }
  if (!/<h1(?:\s|>)/.test(html)) {
    throw new Error(`В HTML нет самостоятельного H1: ${path.relative(root, file)}`);
  }
  if (/href=["']\/go\//i.test(html)) {
    throw new Error(
      `Запрещён скрывающий назначение редирект: ${path.relative(root, file)}`,
    );
  }

  const marketLinks = html.match(
    /<a\b[^>]*href=["']https:\/\/market\.yandex\.ru\/[^"']*["'][^>]*>/gi,
  ) ?? [];
  for (const link of marketLinks) {
    if (!/\brel=["'][^"']*\bsponsored\b[^"']*["']/i.test(link)) {
      throw new Error(
        `Партнёрская ссылка без rel=sponsored: ${path.relative(root, file)}`,
      );
    }
    if (!/\brel=["'][^"']*\bnofollow\b[^"']*["']/i.test(link)) {
      throw new Error(
        `Партнёрская ссылка без rel=nofollow: ${path.relative(root, file)}`,
      );
    }
    if (!html.includes("Реклама") || !html.includes("erid:")) {
      throw new Error(
        `Партнёрская ссылка без видимой маркировки: ${path.relative(root, file)}`,
      );
    }
  }
}

const required = [
  "index.html",
  "podbor/index.html",
  "modeli/samsung-qe55q70dauxru/index.html",
  "modeli/lg-oled55c4rla/index.html",
  "o-proekte/index.html",
  "metodika/index.html",
  "kontakty/index.html",
  "politika-konfidencialnosti/index.html",
  "pkg/krepitv_engine_bg.wasm",
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

const sitemap = await readFile(path.join(docs, "sitemap.xml"), "utf8");
const models = JSON.parse(
  await readFile(path.join(docs, "data/tv-models.json"), "utf8"),
);
const mounts = JSON.parse(
  await readFile(path.join(docs, "data/mounts.json"), "utf8"),
);
const seoPages = JSON.parse(
  await readFile(path.join(docs, "data/seo-pages.json"), "utf8"),
);
const trustPages = JSON.parse(
  await readFile(path.join(docs, "data/trust-pages.json"), "utf8"),
);

for (const page of trustPages) {
  const html = await readFile(
    path.join(docs, page.path.replace(/^\/+|\/+$/g, ""), "index.html"),
    "utf8",
  );
  if (!html.includes(`<h1`) || !html.includes(page.h1)) {
    throw new Error(`В HTML нет самостоятельного содержимого: ${page.path}`);
  }
}

for (const page of seoPages) {
  const html = await readFile(
    path.join(docs, page.path.replace(/^\/+|\/+$/g, ""), "index.html"),
    "utf8",
  );
  if (
    !html.includes(page.h1) ||
    !page.faq.every(
      ([question, answer]) => html.includes(question) && html.includes(answer),
    )
  ) {
    throw new Error(`SEO-страница не содержит полного статического материала: ${page.path}`);
  }
}
const sitemapUrls = sitemap.match(/<loc>/g)?.length ?? 0;
const expectedUrls = 2 + models.length + seoPages.length + trustPages.length;
if (sitemapUrls !== expectedUrls) {
  throw new Error(`В sitemap ожидалось ${expectedUrls} URL, найдено ${sitemapUrls}`);
}
if (models.length !== 2 || mounts.length !== 3) {
  throw new Error("Неожиданный размер проверенного каталога");
}

console.log(
  `Проверено: ${htmlFiles.length} HTML-страниц, ${models.length} модели ТВ, ${mounts.length} кронштейна, ${seoPages.length} SEO-страниц, ${trustPages.length} доверительные страницы`,
);
