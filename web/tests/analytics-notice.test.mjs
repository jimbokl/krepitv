import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/MetrikaConsent.jsx", import.meta.url),
  "utf8",
);

test("компактное уведомление объясняет аналитику и сохраняет отказ", () => {
  assert.match(source, /Для улучшения сайта используем Метрику без записи ввода\./u);
  assert.match(source, /href="\/politika-konfidencialnosti\/"/u);
  assert.match(source, /aria-label="Скрыть уведомление об аналитике"/u);
  assert.match(source, />\s*Отключить аналитику\s*</u);
  assert.doesNotMatch(source, /\bfixed\b/u);
  assert.doesNotMatch(source, /primary-button|secondary-button/u);
});

test("analytics notice has no loading state", () => {
  assert.doesNotMatch(source, /loading|загрузка|загружа/u);
});

test("analytics notice has no empty state", () => {
  assert.match(source, /Метрику без записи ввода/u);
});

test("analytics notice has no error state", () => {
  assert.doesNotMatch(source, /role="alert"|ошиб/u);
});

test("analytics notice has no success state", () => {
  assert.doesNotMatch(source, /успеш/u);
});
