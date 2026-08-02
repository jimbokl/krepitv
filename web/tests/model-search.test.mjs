import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";
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

test("неизвестная модель не оставляет пользователя в тупике", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { ModelSearchEmptyState } = await vite.ssrLoadModule(
      "/src/components/ModelSearch.jsx",
    );
    const html = renderToStaticMarkup(
      React.createElement(ModelSearchEmptyState, {
        message: "Такой модели пока нет в проверенной базе.",
      }),
    );

    assert.match(html, /data-model-search-empty="true"/);
    assert.match(html, /href="\/vesa\/"/);
    assert.match(
      html,
      /href="https:\/\/github\.com\/jimbokl\/krepitv\/issues\/new\?template=model-request\.yml"/,
    );
    assert.match(html, /Не отправляйте серийный номер или персональные данные/);
    assert.doesNotMatch(html, /Sony XR-55/);
  } finally {
    await vite.close();
  }
});
