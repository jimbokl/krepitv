import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
test("страница кронштейна не конкурирует с партнёрным CTA обычной ссылкой Маркета", async () => {
  const source = await readFile(
    new URL("../src/pages/MountPage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-market-mount-section="true"/u);
  assert.match(source, /data-market-offer-fallback="true"/u);
  assert.doesNotMatch(source, /data-market-mount-search="true"/u);
  assert.doesNotMatch(source, /data-market-link="search"/u);
  assert.doesNotMatch(source, /marketMountSearchHref/u);
  assert.match(source, /href="\/podbor\/"/u);
  assert.match(source, /Подобрать проверенную альтернативу/u);
});
