import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

test("телевизионные страницы содержат слот Маркета, монитор не получает чужое предложение", async () => {
  const sitemap = await readFile(new URL("../../docs/sitemap.xml", import.meta.url), "utf8");
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => new URL(match[1]));

  assert.ok(urls.length > 0, "Sitemap не должен быть пустым");
  for (const url of urls) {
    const relative = url.pathname === "/"
      ? "index.html"
      : `${url.pathname.replace(/^\//, "")}index.html`;
    const html = await readFile(
      path.join(new URL("../../docs/", import.meta.url).pathname, relative),
      "utf8",
    );
    if (url.pathname === "/kronshteyn-dlya-monitora/") {
      assert.match(html, /data-monitor-static="true"/);
      assert.doesNotMatch(html, /data-affiliate-global-slot|data-affiliate-global-link/);
      continue;
    }
    assert.match(
      html,
      /data-affiliate-global-slot="true"/,
      `Нет общего партнёрского слота: ${url.pathname}`,
    );
  }
});
