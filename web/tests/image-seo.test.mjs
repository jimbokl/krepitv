import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");
const docs = path.join(root, "docs");

function productJson(html) {
  return [...html.matchAll(/<script type="application\/ld\+json">([^<]+)<\/script>/gu)]
    .map((match) => JSON.parse(match[1]))
    .find((item) => item["@type"] === "Product");
}

test("паспортные модели и кронштейны публикуют отдельную crawlable техническую схему", async () => {
  const [models, mounts] = await Promise.all([
    readFile(path.join(root, "data/tv_models.json"), "utf8").then(JSON.parse),
    readFile(path.join(root, "data/mounts.json"), "utf8").then(JSON.parse),
  ]);
  assert.equal(models.length, 161);
  assert.equal(mounts.length, 25);

  for (const [kind, items] of [["modeli", models], ["kronshteyny", mounts]]) {
    for (const item of items) {
      const html = await readFile(path.join(docs, kind, item.id, "index.html"), "utf8");
      const match = html.match(/<img[^>]+data-technical-image="true"[^>]+src="([^"]+)"[^>]*>/u);
      assert.ok(match, `${kind}/${item.id}`);
      assert.match(match[0], /alt="[^"]+схем[^"]*"/iu, `${kind}/${item.id} alt`);
      assert.match(match[0], /width="1200"/u);
      assert.match(match[0], /height="630"/u);
      assert.equal(existsSync(path.join(docs, match[1].replace(/^\//u, ""))), true, match[1]);
      assert.equal(productJson(html).image, `https://krepitv.ru${match[1]}`, item.id);
    }
  }
});

test("image sitemap обнаруживает каждую техническую схему, а главная описывает реальную сущность сайта", async () => {
  const imageSitemapFile = path.join(docs, "image-sitemap.xml");
  assert.equal(existsSync(imageSitemapFile), true, "нет image-sitemap.xml");
  const [sitemap, home, robots] = await Promise.all([
    readFile(imageSitemapFile, "utf8"),
    readFile(path.join(docs, "index.html"), "utf8"),
    readFile(path.join(docs, "robots.txt"), "utf8"),
  ]);
  assert.match(sitemap, /xmlns:image="http:\/\/www\.google\.com\/schemas\/sitemap-image\/1\.1"/u);
  assert.equal((sitemap.match(/<image:image>/gu) ?? []).length, 186);
  assert.match(robots, /Sitemap: https:\/\/krepitv\.ru\/image-sitemap\.xml/u);
  assert.match(home, /<meta property="og:site_name" content="KREPI TV">/u);
  assert.match(home, /"@type":"Organization"/u);
  assert.match(home, /"alternateName":"Крепи ТВ"/u);
  assert.match(home, /"logo":"https:\/\/krepitv\.ru\/logo-512\.svg"/u);
  assert.equal(existsSync(path.join(docs, "logo-512.svg")), true);
});

test("схемы отражают фактическую пропорцию VESA и тип механизма", async () => {
  const models = JSON.parse(await readFile(path.join(root, "data/tv_models.json"), "utf8"));
  for (const model of models) {
    const svg = await readFile(path.join(docs, `images/modeli/${model.id}-vesa.svg`), "utf8");
    const points = [...svg.matchAll(/<circle cx="([0-9.]+)" cy="([0-9.]+)" r="16"/gu)]
      .map((match) => ({ x: Number(match[1]), y: Number(match[2]) }));
    assert.equal(points.length, 4, model.id);
    const width = Math.max(...points.map((point) => point.x)) - Math.min(...points.map((point) => point.x));
    const height = Math.max(...points.map((point) => point.y)) - Math.min(...points.map((point) => point.y));
    assert.ok(Math.abs((width / height) - (model.vesa_width_mm / model.vesa_height_mm)) < 0.01, model.id);
  }

  const mounts = JSON.parse(await readFile(path.join(root, "data/mounts.json"), "utf8"));
  for (const mount of mounts) {
    const svg = await readFile(path.join(docs, `images/kronshteyny/${mount.id}-skhema.svg`), "utf8");
    const joints = (svg.match(/<circle /gu) ?? []).length;
    const expected = mount.mechanism === "full-motion" ? 2 : mount.mechanism === "tilt" ? 1 : 0;
    assert.equal(joints, expected, `${mount.id}: ${mount.mechanism}`);
  }
});
