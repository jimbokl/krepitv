import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";

test("общий следующий шаг ведёт к подбору, а не прямо на Маркет", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  let html;
  try {
    const { MountFunnelNextStep } = await vite.ssrLoadModule(
      "/src/components/MountFunnelNextStep.jsx",
    );
    html = renderToStaticMarkup(React.createElement(MountFunnelNextStep));
  } finally {
    await vite.close();
  }

  assert.equal((html.match(/data-mount-funnel-next-step="true"/g) ?? []).length, 1);
  assert.match(html, /href="\/podbor\/"/);
  assert.match(html, /Проверьте точную модель и получите совместимые кронштейны/);
  assert.match(html, /Начать подбор по модели/);
  assert.match(html, /Маркет откроется только после выбора подтверждённого совместимого кронштейна/);
  assert.doesNotMatch(html, /href="https:\/\/market\.yandex\.ru/);

  const source = await readFile(
    new URL("../src/components/MountFunnelNextStep.jsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /selectionStartHandlers\([\s\S]*globalThis\.window,[\s\S]*"seo_next_step"/);
});

test("общий CTA расположен после результата и до связанных материалов", async () => {
  const source = await readFile(new URL("../src/pages/SeoPage.jsx", import.meta.url), "utf8");
  const resultPosition = source.indexOf('<div className="grid gap-8 border-t border-ink pt-7');
  const funnelPosition = source.indexOf("<MountFunnelNextStep />");
  const relatedPosition = source.indexOf('<section className="mt-12 border-t-2 border-ink pt-6"');

  assert.ok(resultPosition >= 0);
  assert.ok(funnelPosition > resultPosition);
  assert.ok(relatedPosition > funnelPosition);
});

test("условные совпадения не получают коммерческий переход, а мастер высоты сохраняет модель", async () => {
  const [brandMatcher, modelPage, heightCalculator] = await Promise.all([
    readFile(new URL("../src/components/BrandMountMatcher.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ModelPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/HeightCalculator.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(brandMatcher, /verifiedCompatibilityMatches\(compatibility\.matches\)/);
  assert.doesNotMatch(brandMatcher, /href=\{`\/kronshteyny\/\$\{match\.mount\.id\}\/`\}/);
  assert.match(modelPage, /fitStatus === "verified-fit" && !vesaConflict/);
  assert.match(modelPage, /Переход к покупке закрыт до сверки диапазона диагонали/);
  assert.match(heightCalculator, /`\/podbor\/\?model=\$\{encodeURIComponent\(model\.id\)\}`/);
});
