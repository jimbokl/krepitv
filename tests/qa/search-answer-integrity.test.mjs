import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../../", import.meta.url);
const pages = JSON.parse(await readFile(new URL("data/seo_pages.json", root), "utf8"));

test("answer summaries are readable in static HTML before any WASM or JavaScript", async () => {
  for (const id of ["tv-freezes", "tv-energy-consumption", "diagonal-65"]) {
    const page = pages.find((entry) => entry.id === id);
    const html = await readFile(new URL(`docs${page.path}index.html`, root), "utf8");
    assert.ok(html.includes(page.lead), `${id}: answer missing from SSR`);
    assert.match(html, /data-answer-summary="true"/u);
    assert.ok(html.includes(`<title>${page.title}</title>`), `${id}: metadata differs`);
    assert.ok(html.includes(`<link rel="canonical" href="https://krepitv.ru${page.path}"`));
  }
});

test("every structured instruction step points to its visible row, not an unrelated tool", async () => {
  for (const page of pages.filter((entry) => entry.guide)) {
    const html = await readFile(new URL(`docs${page.path}index.html`, root), "utf8");
    const schemas = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>(.*?)<\/script>/gsu)].map((match) => JSON.parse(match[1]));
    const guide = schemas.find((schema) => Array.isArray(schema.step));
    assert.ok(guide, `${page.id}: no instruction schema`);
    assert.equal(guide.datePublished, undefined, `${page.id}: review date is not a verified publication date`);
    for (const [index, step] of guide.step.entries()) {
      assert.equal(step.url, `https://krepitv.ru${page.path}#shag-${index + 1}`);
      assert.ok(html.includes(`id="shag-${index + 1}"`), `${page.id}: missing visible target`);
      assert.equal(step.name, page.guide.steps[index].title);
      assert.equal(step.text, page.guide.steps[index].body);
    }
    assert.equal(guide.publisher["@id"], "https://krepitv.ru/#organization");
  }
});
