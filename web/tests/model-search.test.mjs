import assert from "node:assert/strict";
import test from "node:test";
import {
  filterModelSearchResults,
  findExactModelSearchResult,
} from "../src/lib/catalog.js";

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
