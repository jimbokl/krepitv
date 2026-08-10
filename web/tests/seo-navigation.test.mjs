import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const docs = path.join(root, "docs");

function artifactFile(pathname) {
  return pathname === "/"
    ? path.join(docs, "index.html")
    : path.join(docs, pathname.replace(/^\//u, ""), "index.html");
}

function breadcrumbJson(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/gu)]
    .map((match) => JSON.parse(match[1]))
    .find((item) => item["@type"] === "BreadcrumbList");
}

test("каждый индексируемый non-home URL показывает ту же навигационную цепочку, что и JSON-LD", async () => {
  const sitemap = await readFile(path.join(docs, "sitemap.xml"), "utf8");
  const paths = [...sitemap.matchAll(/<loc>https:\/\/krepitv\.ru([^<]*)<\/loc>/gu)]
    .map((match) => match[1] || "/")
    .filter((pathname) => pathname !== "/");

  for (const pathname of paths) {
    const file = artifactFile(pathname);
    assert.equal(existsSync(file), true, `нет artifact ${pathname}`);
    const html = await readFile(file, "utf8");
    const breadcrumb = breadcrumbJson(html);
    assert.ok(breadcrumb, `нет BreadcrumbList ${pathname}`);
    assert.match(html, /<nav[^>]+data-visible-breadcrumbs="true"[^>]*>/u, pathname);
    assert.equal((html.match(/aria-label="Навигационная цепочка"/gu) ?? []).length, 1, `${pathname}: повтор breadcrumb landmark`);
    for (const item of breadcrumb.itemListElement) {
      assert.match(html, new RegExp(`>${item.name.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&")}<`, "u"), `${pathname}: ${item.name}`);
    }
  }
});

test("справочник группирует все индексируемые материалы и является их реальным breadcrumb-родителем", async () => {
  const guideIndexFile = path.join(docs, "spravochnik/index.html");
  assert.equal(existsSync(guideIndexFile), true, "нет artifact /spravochnik/");
  const [pages, sitemap, html] = await Promise.all([
    readFile(path.join(root, "data/seo_pages.json"), "utf8").then(JSON.parse),
    readFile(path.join(docs, "sitemap.xml"), "utf8"),
    readFile(guideIndexFile, "utf8"),
  ]);
  assert.match(sitemap, /<loc>https:\/\/krepitv\.ru\/spravochnik\/<\/loc>/u);
  assert.match(html, /data-guide-index="true"/u);
  const indexableCount = pages.filter((item) => item.indexable).length;
  assert.match(html, new RegExp(`>${indexableCount} полезных материалов<`, "u"));
  const guideIndexSource = await readFile(path.join(root, "web/src/pages/GuideIndexPage.jsx"), "utf8");
  assert.match(guideIndexSource, /\{pages\.length\} полезных материалов/u);
  assert.doesNotMatch(guideIndexSource, />105 полезных материалов</u);
  for (const page of pages.filter((item) => item.indexable)) {
    assert.equal(html.match(new RegExp(`data-guide-index-link="${page.path}"`, "gu"))?.length, 1, page.path);
    const pageHtml = await readFile(artifactFile(page.path), "utf8");
    const breadcrumb = breadcrumbJson(pageHtml);
    assert.equal(breadcrumb.itemListElement[1].item, "https://krepitv.ru/spravochnik/", page.path);
  }
});

test("каждое доказательное руководство имеет компактное содержание с существующими якорями", async () => {
  const pages = JSON.parse(await readFile(path.join(root, "data/seo_pages.json"), "utf8"));
  const guides = pages.filter((page) => page.indexable && page.guide);
  assert.equal(guides.length, 50);
  for (const page of guides) {
    const html = await readFile(artifactFile(page.path), "utf8");
    assert.match(html, /<nav[^>]+data-guide-toc="true"/u, page.path);
    for (const anchor of ["мастер", "granitsa", "istochniki", "svyazannye-materialy"]) {
      assert.match(html, new RegExp(`href="#${anchor}"`, "u"), `${page.path} href ${anchor}`);
      assert.match(html, new RegExp(`id="${anchor}"`, "u"), `${page.path} id ${anchor}`);
    }
  }
});
