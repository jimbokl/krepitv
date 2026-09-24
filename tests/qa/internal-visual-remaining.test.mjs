import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getInternalVisual, internalVisualCount } from "../../web/src/lib/internalVisualPages.mjs";

const read = (name) => JSON.parse(readFileSync(new URL(`../../data/${name}.json`, import.meta.url), "utf8"));
const pages = read("seo_pages");
const oldIds = Object.values(read("internal_visual_pages")).flatMap((theme) => theme.ids);
const newIds = Object.values(read("internal_visual_remaining")).flatMap((theme) => theme.ids);

test("каждая существующая SEO-страница имеет одну визуальную тему без дублей", () => {
  assert.equal(oldIds.length, 100);
  assert.equal(newIds.length, 55);
  assert.equal(internalVisualCount(), pages.length);
  assert.deepEqual(new Set([...oldIds, ...newIds]), new Set(pages.map((page) => page.id)));
  for (const page of pages) {
    const visual = getInternalVisual(page.id);
    assert.ok(visual?.src.startsWith("/assets/images/"), `${page.id}: нет изображения`);
    assert.ok(visual?.caption.length > 40, `${page.id}: не обозначена граница фото`);
  }
});
