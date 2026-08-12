import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const canonicalPath = "/razmery-televizora-po-diagonali/";
const canonicalUrl = `https://krepitv.ru${canonicalPath}`;
const expectedTitle = "Размеры телевизоров по диагонали: таблица и калькулятор — KREPI TV";
const expectedH1 = "Размеры телевизоров по диагонали в сантиметрах";
const referenceDiagonals = [32, 43, 50, 55, 65, 75, 85];

async function readProjectFile(relativeUrl) {
  return readFile(new URL(relativeUrl, import.meta.url), "utf8");
}

async function withCalculatorModule(run) {
  const vite = await createServer({
    root: new URL("..", import.meta.url).pathname,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const module = await vite.ssrLoadModule(
      "/src/components/TvDimensionsCalculator.jsx",
    );
    await run(module);
  } finally {
    await vite.close();
  }
}

test("canonical размеров телевизора представлен одной indexable SEO-записью", async () => {
  const pages = JSON.parse(await readProjectFile("../../data/seo_pages.json"));
  const matches = pages.filter((page) => (
    page.id === "tv-dimensions" || page.path === canonicalPath
  ));

  assert.equal(matches.length, 1);
  assert.deepEqual(
    {
      id: matches[0].id,
      path: matches[0].path,
      kind: matches[0].kind,
      indexable: matches[0].indexable,
      title: matches[0].title,
      h1: matches[0].h1,
    },
    {
      id: "tv-dimensions",
      path: canonicalPath,
      kind: "calculator",
      indexable: true,
      title: expectedTitle,
      h1: expectedH1,
    },
  );
  assert.match(matches[0].description, /ширину и высоту экрана 16:9/u);
  assert.ok(matches[0].facts.some((fact) => (
    fact.includes("Ширина и высота корпуса могут отличаться")
  )));
});

test("сгенерированный HTML содержит самостоятельный SSR-ответ и только семь справочных строк", async () => {
  const html = await readProjectFile(
    "../../docs/razmery-televizora-po-diagonali/index.html",
  );
  const reference = JSON.parse(
    await readProjectFile("../../data/tv_dimensions_reference.json"),
  );

  assert.equal((html.match(/<title>/g) ?? []).length, 1);
  assert.ok(html.includes(`<title>${expectedTitle}</title>`));
  assert.equal((html.match(/rel="canonical"/g) ?? []).length, 1);
  assert.ok(html.includes(`rel="canonical" href="${canonicalUrl}"`));
  assert.equal((html.match(/<h1\b/g) ?? []).length, 1);
  assert.match(html, new RegExp(`<h1[^>]*>${expectedH1}</h1>`, "u"));

  assert.equal((html.match(/data-tv-dimensions-answer="true"/g) ?? []).length, 1);
  assert.equal(
    (html.match(/data-tv-dimensions-reference-table="true"/g) ?? []).length,
    1,
  );
  assert.equal((html.match(/data-tv-dimensions-row=/g) ?? []).length, 7);
  for (const diagonal of referenceDiagonals) {
    assert.equal(
      (html.match(new RegExp(`data-tv-dimensions-row="${diagonal}"`, "g")) ?? []).length,
      1,
      `нет единственной SSR-строки для ${diagonal} дюймов`,
    );
  }
  assert.deepEqual(
    reference.rows.map((row) => row.diagonal_inches),
    referenceDiagonals,
  );
  for (const row of reference.rows) {
    const rowHtml = html.match(
      new RegExp(`<tr data-tv-dimensions-row="${row.diagonal_inches}">([\\s\\S]*?)</tr>`, "u"),
    )?.[1] ?? "";
    for (const value of [
      `${row.diagonal_inches}″`,
      `${formatRu(row.diagonal_cm)} см`,
      `${formatRu(row.screen_width_cm)} см`,
      `${formatRu(row.screen_height_cm)} см`,
    ]) {
      assert.ok(rowHtml.includes(`>${value}<`), `SSR и общий справочник расходятся: ${value}`);
    }
  }

  assert.match(html, /Таблица показывает экран, а не корпус/u);
  assert.match(html, /активной области/u);
  assert.match(html, /Рамка, нижний блок, подставка и толщина/u);
});

function formatRu(value) {
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 1 }).format(value);
}

test("SSR-страница не превращается в affiliate-каталог и оставляет общий CTA после ответа", async () => {
  const html = await readProjectFile(
    "../../docs/razmery-televizora-po-diagonali/index.html",
  );

  for (const href of [
    "/televizor-na-stene/",
    "/rasstoyanie-do-televizora-i-diagonal/",
    "/modeli/",
  ]) {
    assert.ok(html.includes(`href="${href}"`), `нет внутренней ссылки ${href}`);
  }

  assert.equal(/https:\/\/market\.yandex\.ru|rel="[^"]*sponsored|clid=/iu.test(html), false);
  assert.equal((html.match(/data-affiliate-global-slot="true"/g) ?? []).length, 1);
  assert.ok(
    html.indexOf('data-tv-dimensions-answer="true"')
      < html.indexOf('data-affiliate-global-slot="true"'),
  );
  assert.equal((html.match(/data-tv-dimensions-row=/g) ?? []).length, 7);
  assert.equal(/data-(?:catalog-item|model-card|model-list)=/u.test(html), false);
  assert.equal(html.includes("aria-label=\"Модели телевизоров\""), false);
});

test("React-инструмент показывает три режима без длинного открытого списка", async () => {
  await withCalculatorModule(async ({ TvDimensionsCalculator }) => {
    assert.equal(typeof TvDimensionsCalculator, "function");
    const html = renderToStaticMarkup(React.createElement(TvDimensionsCalculator, {
      models: [],
      search: [],
    }));

    assert.ok(html.includes('data-tv-dimensions-calculator="true"'));
    assert.ok(html.includes('data-tv-dimensions-mode="diagonal"'));
    for (const label of ["По диагонали", "По замерам", "Для ниши"]) {
      assert.ok(html.includes(label), `нет режима «${label}»`);
    }
    assert.equal(html.includes('data-tv-dimensions-exact-model="true"'), false);
    assert.equal(html.includes("market.yandex.ru"), false);
    assert.ok((html.match(/<option\b/g) ?? []).length <= 10);
    assert.equal(/data-(?:catalog-item|model-card|model-list)=/u.test(html), false);
  });
});

test("публичные DOM-маркеры результата покрывают все три режима и exact-model state", async () => {
  const source = await readProjectFile(
    "../src/components/TvDimensionsCalculator.jsx",
  );

  for (const mode of ["diagonal", "measured", "niche"]) {
    assert.ok(source.includes(`"${mode}"`), `в исходнике нет режима ${mode}`);
  }
  assert.match(source, /data-tv-dimensions-mode=\{mode\}/u);
  assert.match(source, /data-tv-dimensions-result=\{[^}]*mode[^}]*\}/u);
  assert.match(source, /data-tv-dimensions-diagram="true"/u);
  assert.match(source, /data-tv-dimensions-exact-model="true"/u);
  assert.doesNotMatch(source, /market\.yandex\.ru|AffiliateLink/u);
});

test("JS-wrapper вызывает Rust tv_dimensions_plan_json и пробрасывает его ошибку", async () => {
  const source = await readProjectFile("../src/lib/catalog.js");
  const wrapperStart = source.indexOf("export async function calculateTvDimensionsPlan(values)");
  const nextExport = source.indexOf("\nexport ", wrapperStart + 1);
  const wrapper = source.slice(wrapperStart, nextExport === -1 ? undefined : nextExport);

  assert.ok(wrapperStart >= 0, "нет calculateTvDimensionsPlan");
  assert.match(wrapper, /engine\.tv_dimensions_plan_json\(/u);
  for (const argument of ["mode", "primary", "secondary"]) {
    assert.match(wrapper, new RegExp(`\\b${argument}\\b`, "u"));
  }
  assert.match(wrapper, /mode === "niche" \? values\.gap : 0/u);
  assert.match(wrapper, /values\.exactCaseWidth \?\? 0/u);
  assert.match(wrapper, /values\.exactCaseHeight \?\? 0/u);
  assert.match(wrapper, /if \(response\.error\) throw new Error\(response\.error\);/u);
});

test("result_completed испускается один раз и только из явного submit", async () => {
  const source = await readProjectFile(
    "../src/components/TvDimensionsCalculator.jsx",
  );
  const submitStart = source.search(/(?:async\s+)?function\s+submit\s*\([^)]*\)\s*\{/u);
  const emitAt = source.indexOf("emitResultCompleted(");

  assert.ok(submitStart >= 0, "нет явного submit handler");
  assert.ok(emitAt > submitStart, "аналитика должна вызываться после входа в submit");
  assert.equal((source.match(/emitResultCompleted\(/g) ?? []).length, 1);
  assert.match(source, /onSubmit=\{submit\}/u);
  assert.doesNotMatch(source, /reachGoal/u);
});
