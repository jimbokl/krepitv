import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import { createServer } from "vite";

test("каждый production page-kind заранее загружает только свой интерактивный модуль", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { preloadAppRoute } = await vite.ssrLoadModule("/src/App.jsx");
    const pageKinds = [
      "home",
      "matcher",
      "models-catalog",
      "mounts-catalog",
      "model",
      "market-model",
      "mount",
      "seo",
      "trust",
      "not-found",
    ];
    for (const pageKind of pageKinds) {
      await assert.doesNotReject(preloadAppRoute({ dataset: { pageKind } }), pageKind);
    }
    await assert.rejects(
      preloadAppRoute({ dataset: { pageKind: "unknown" } }),
      /Не удалось определить интерактивный модуль/u,
    );
  } finally {
    await vite.close();
  }
});
