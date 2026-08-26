import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = await readFile(
  new URL("../src/components/MetrikaConsent.jsx", import.meta.url),
  "utf8",
);

test("уведомление содержит точную сноску, политику, подтверждение и отказ", () => {
  assert.match(source, /Продолжая пользоваться сайтом, вы принимаете необходимое использование аналитики\./u);
  assert.match(source, /href="\/politika-konfidencialnosti\/"/u);
  assert.match(source, />\s*Понятно\s*</u);
  assert.match(source, />\s*Отключить аналитику\s*</u);
  assert.doesNotMatch(source, /\bfixed\b/u);
});

test("analytics notice has no loading state", () => {
  assert.doesNotMatch(source, /loading|загрузка|загружа/u);
});

test("analytics notice has no empty state", () => {
  assert.match(source, /Продолжая пользоваться сайтом/u);
});

test("analytics notice has no error state", () => {
  assert.doesNotMatch(source, /role="alert"|ошиб/u);
});

test("analytics notice has no success state", () => {
  assert.doesNotMatch(source, /успеш/u);
});
