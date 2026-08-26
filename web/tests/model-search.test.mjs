import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  filterModelSearchResults,
  findExactModelSearchResult,
} from "../src/lib/modelSearch.mjs";

const search = [
  { id: "tcl-55p6k", title: "TCL 55P6K", search: "TCL 55P6K 55 P6K" },
  { id: "tcl-55p7k", title: "TCL 55P7K", search: "TCL 55P7K 55 P7K" },
  { id: "hisense-65u7q", title: "Hisense 65U7Q", search: "Hisense 65U7Q 65 U7Q" },
];

test("пустой поиск не подставляет первую модель каталога", () => {
  assert.deepEqual(filterModelSearchResults(search, ""), []);
  assert.equal(findExactModelSearchResult(search, ""), null);
});

test("частичный запрос показывает варианты, но не считается выбором", () => {
  assert.deepEqual(
    filterModelSearchResults(search, "tcl 55").map((item) => item.id),
    ["tcl-55p6k", "tcl-55p7k"],
  );
  assert.equal(findExactModelSearchResult(search, "tcl 55"), null);
});

test("точная модель находится независимо от регистра и разделителей", () => {
  assert.equal(
    findExactModelSearchResult(search, "tcl-55p6k")?.id,
    "tcl-55p6k",
  );
});

test("неизвестная модель не оставляет пользователя в тупике", async () => {
  const source = await readFile(
    new URL("../src/components/ModelSearch.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-model-search-empty="true"/);
  assert.match(source, /href="\/vesa\/"/);
  assert.match(source, /href="\/modeli\/"/);
  assert.match(source, /Проверьте полный код модели на шильдике телевизора/);
  assert.match(
    source,
    /https:\/\/github\.com\/jimbokl\/krepitv\/issues\/new\?template=model-request\.yml/,
  );
  assert.match(source, /Не отправляйте серийный номер или персональные данные/);
  assert.doesNotMatch(source, /Sony XR-55/);
});

test("поиск моделей поддерживает полный клавиатурный combobox-контракт", async () => {
  const source = await readFile(
    new URL("../src/components/ModelSearch.jsx", import.meta.url),
    "utf8",
  );

  for (const contract of [
    "aria-activedescendant",
    "aria-selected",
    'event.key === "ArrowDown"',
    'event.key === "ArrowUp"',
    'event.key === "Enter"',
    'event.key === "Escape"',
    "onSubmit?.(item)",
  ]) {
    assert.equal(source.includes(contract), true, `Нет контракта: ${contract}`);
  }
});
