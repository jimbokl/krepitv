import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

test("редакция доступна из footer, а trust page показывает ответственного издателя", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const trustPages = JSON.parse(await readFile(
    new URL("../../data/trust_pages.json", import.meta.url),
    "utf8",
  ));
  const editorial = trustPages.find((page) => page.id === "editorial");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const [{ SiteFooter }, { TrustPage }] = await Promise.all([
      vite.ssrLoadModule("/src/components/SiteFooter.jsx"),
      vite.ssrLoadModule("/src/pages/TrustPage.jsx"),
    ]);
    const footerHtml = renderToStaticMarkup(React.createElement(SiteFooter));
    const trustHtml = renderToStaticMarkup(React.createElement(TrustPage, { page: editorial }));

    assert.match(footerHtml, /href="\/redaktsiya\/"[^>]*>Редакция/u);
    assert.match(trustHtml, /data-trust-publisher="true"/u);
    assert.match(trustHtml, /href="\/redaktsiya\/"[^>]*>Редакция KREPI TV/u);
    assert.match(trustHtml, /Организационный автор проекта/u);
  } finally {
    await vite.close();
  }
});
