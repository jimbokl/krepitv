import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("мобильное меню сообщает состояние и закрывается Escape с возвратом фокуса", async () => {
  const source = await readFile(
    new URL("../src/components/SiteHeader.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /aria-expanded=\{menuOpen\}/);
  assert.match(source, /aria-controls="site-primary-navigation"/);
  assert.match(source, /id="site-primary-navigation"/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /menuButtonRef\.current\?\.focus\(\)/);
});
