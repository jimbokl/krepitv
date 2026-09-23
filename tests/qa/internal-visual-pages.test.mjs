import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getInternalVisual } from "../../web/src/lib/internalVisualPages.mjs";

const pages = JSON.parse(readFileSync(new URL("../../data/seo_pages.json", import.meta.url), "utf8"));
const themes = JSON.parse(readFileSync(new URL("../../data/internal_visual_pages.json", import.meta.url), "utf8"));

test("visual cohort covers exactly 100 existing indexable pages", () => {
  const selected = Object.values(themes).flatMap((theme) => theme.ids);
  const pageById = new Map(pages.map((page) => [page.id, page]));
  assert.equal(selected.length, 100);
  assert.equal(new Set(selected).size, 100);
  assert.equal(selected.filter((id) => pageById.get(id)?.guide).length, 96);
  for (const id of selected) {
    assert.equal(pageById.get(id)?.indexable, true, `${id}: missing indexable page`);
    assert.ok(getInternalVisual(id)?.src.startsWith("/assets/images/"), `${id}: missing image`);
  }
  assert.deepEqual(
    pages.filter((page) => page.guide).map((page) => page.id).filter((id) => !selected.includes(id)),
    [],
  );
  assert.equal(getInternalVisual("not-in-cohort"), null);
});
