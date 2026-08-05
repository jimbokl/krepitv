import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("React и Rust SSR используют одинаковые смысловые категории технических страниц", async () => {
  const [reactSource, rustSource] = await Promise.all([
    readFile(new URL("../src/pages/SeoPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../../crates/sitegen/src/main.rs", import.meta.url), "utf8"),
  ]);

  for (const label of [
    "Подключение устройств",
    "Диагностика телевизора",
    "Настройка телевизора",
    "Уход за телевизором",
    "Расчёт электроэнергии",
  ]) {
    assert.equal(reactSource.includes(label), true, `React не содержит категорию: ${label}`);
    assert.equal(rustSource.includes(label), true, `SSR не содержит категорию: ${label}`);
  }

  assert.match(reactSource, /const pageKindLabel = seoPageKindLabel\(page\)/);
  assert.match(rustSource, /let page_kind_label = seo_page_kind_label\(page\);/);
});
