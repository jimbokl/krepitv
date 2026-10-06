import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { INTENT_TOOLS } from "../src/lib/intentTools.mjs";
import { getInternalVisual } from "../src/lib/internalVisualPages.mjs";
import { getRelatedPages } from "../src/lib/seoPages.mjs";
const pages = JSON.parse(readFileSync(new URL("../../data/seo_pages.json", import.meta.url)));
const adjacent = JSON.parse(readFileSync(new URL("../../data/adjacent_tools.json", import.meta.url)));
const ids = ["tv-wifi-5ghz", "tv-usb-wifi-adapter", "tv-wifi-drops", "tv-internet-speed", "tv-vrr-enable", "tv-allm-enable", "tv-dual-headphones", "tv-home-recommendations", "tv-start-screen", "tv-oled-qled-choice"];
test("широкая таблица решений доступна клавиатурой в SSG и React", () => {
  const react = readFileSync(new URL("../src/pages/SeoPage.jsx", import.meta.url), "utf8");
  const ssg = readFileSync(new URL("../../crates/sitegen/src/main.rs", import.meta.url), "utf8");
  assert.match(react, /overflow-x-auto border-2 border-ink" tabIndex=\{0\} role="region" aria-labelledby=\{`\$\{pageId\}-guide-table-title`\}/);
  assert.ok(react.includes('id={`${pageId}-guide-table-title`}'), "область прокрутки ссылается на существующий заголовок");
  assert.ok(ssg.includes('overflow-x-auto border-2 border-ink\\" tabindex=\\"0\\" role=\\"region\\" aria-labelledby=\\"evidence-guide-table-title\\"'));
});
test("10 самостоятельных ТВ-помощников: источники, таблица, инструмент и иллюстрация", () => {
  assert.equal(new Set(pages.map((page) => page.path)).size, pages.length);
  assert.equal(new Set([...pages, ...adjacent].map((page) => page.path)).size, pages.length + adjacent.length, "два реестра не должны публиковать конкурирующий URL");
  assert.equal(pages.find((page) => page.id === "tv-wifi-5ghz").path, "/tv-ne-vidit-wifi-5ghz/", "усиление сохраняет прежний canonical");
  assert.equal(adjacent.some((page) => page.id === "adj-tv-ne-vidit-wifi-5ghz"), false);
  for (const id of ids) {
    const page = pages.find((item) => item.id === id);
    assert.ok(page?.indexable);
    assert.equal(page.updated_at, "2026-10-06");
    assert.ok(page.facts.length >= 4 && page.faq.length >= 3);
    assert.equal(page.guide.steps.length, 3);
    assert.ok(page.guide.stop);
    assert.ok(page.guide.sources.length >= 2);
    for (const source of page.guide.sources) assert.ok(source.url.startsWith("https://"));
    assert.ok(INTENT_TOOLS[id]?.success && INTENT_TOOLS[id]?.failure);
    assert.ok(getInternalVisual(id)?.src.endsWith(".webp"));
    const related = getRelatedPages(page, pages);
    assert.ok(related.length >= 3);
    assert.ok(related.every((item) => item.id !== id));
    assert.ok(related.every((item) => !item.id.startsWith("tv-wifi") || id.startsWith("tv-wifi") || id === "tv-usb-wifi-adapter" || id === "tv-internet-speed"));
  }
});
