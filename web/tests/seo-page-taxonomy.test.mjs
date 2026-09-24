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
    "Беспроводное подключение",
    "Перевозка телевизора",
    "Напольная стойка",
  ]) {
    assert.equal(reactSource.includes(label), true, `React не содержит категорию: ${label}`);
    assert.equal(rustSource.includes(label), true, `SSR не содержит категорию: ${label}`);
  }

  assert.match(reactSource, /page\.section \?\? \(editorialPhoto \?/);
  assert.match(rustSource, /\.section\s*\.as_deref\(\)\s*\.or_else\(\|\| internal_visual_label\(&page\.id\)\)/);
});
