import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { marketMountSearchHref } from "../src/lib/marketSearch.mjs";

test("поиск Маркета сохраняет точное название модели и не добавляет партнёрские параметры", () => {
  const href = marketMountSearchHref("  KROMAX ATLANTIS-65  ");
  const url = new URL(href);

  assert.equal(url.origin, "https://market.yandex.ru");
  assert.equal(url.pathname, "/search");
  assert.equal(url.searchParams.get("text"), "KROMAX ATLANTIS-65");
  assert.deepEqual([...url.searchParams.keys()], ["text"]);
  assert.equal(marketMountSearchHref(""), "");
  assert.equal(marketMountSearchHref(null), "");
});

test("страница кронштейна оставляет прямой поиск при отсутствии свежего оффера", async () => {
  const source = await readFile(
    new URL("../src/pages/MountPage.jsx", import.meta.url),
    "utf8",
  );

  assert.match(source, /data-market-mount-section="true"/u);
  assert.match(source, /data-market-search-fallback="true"/u);
  assert.equal((source.match(/data-market-mount-search="true"/gu) ?? []).length, 2);
  assert.equal((source.match(/data-market-link="search"/gu) ?? []).length, 2);
  assert.match(source, /href=\{marketSearchHref\}/u);
  assert.match(source, /rel="nofollow noopener noreferrer"/u);
  assert.match(source, /target="_blank"/u);
  assert.match(source, /Открыть Яндекс Маркет/u);
});
