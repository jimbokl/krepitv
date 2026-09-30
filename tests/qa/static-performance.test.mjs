import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { addResponsiveImages, optimizeStaticPages } from "../../scripts/performance/optimize-static-pages.mjs";

test("responsive images preserve originals, alt, priority and do not create nested pictures", () => {
  const html = '<picture><source srcset="/assets/images/mount-wall-system.avif" type="image/avif"><img src="/assets/images/mount-wall-system.png" alt="Стена" loading="lazy"></picture><img src="/assets/images/home-hero-model.webp" alt="Модель" fetchpriority="high">';
  const result = addResponsiveImages(html);
  assert.match(result, /mount-wall-system-320.avif 320w/u);
  assert.match(result, /home-hero-model-480.webp 480w/u);
  assert.match(result, /fetchpriority="high"/u);
  assert.match(result, /alt="Стена" loading="lazy"/u);
  assert.equal((result.match(/<picture>/gu) ?? []).length, 1);
  assert.equal(addResponsiveImages(result), result);
});

test("critical CSS retains SSR, lazy full styles and a no-JS fallback", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "krepitv-css-"));
  try {
    await mkdir(path.join(root, "assets"));
    await writeFile(path.join(root, "assets/main.css"), "h1{color:red}.unused{color:blue}");
    const file = path.join(root, "index.html");
    const verification = "<html><head></head><body>Verification: example</body></html>\n";
    await writeFile(path.join(root, "verification.html"), verification);
    await writeFile(file, '<!doctype html><html lang="ru"><head><link rel="stylesheet" href="/assets/main.css"></head><body><h1>Проверяемый ответ</h1><a href="/podbor/">Подбор</a></body></html>');
    await optimizeStaticPages(root);
    const html = await readFile(file, "utf8");
    assert.equal(await readFile(path.join(root, "verification.html"), "utf8"), verification);
    assert.match(html, /<style data-critical-css="true">h1\{color:red\}/u);
    assert.match(html, /<noscript><link[^>]+rel="stylesheet"/u);
    assert.match(html, /onload=/u);
    assert.match(html, /<h1>Проверяемый ответ<\/h1>/u);
    assert.match(html, /href="\/podbor\/"/u);
    assert.equal(await readFile(path.join(root, "assets/main.css"), "utf8"), "h1{color:red}.unused{color:blue}");
    await optimizeStaticPages(root);
    assert.equal(await readFile(file, "utf8"), html);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
