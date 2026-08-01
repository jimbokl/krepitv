import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const expectedPages = [
  ["laptop-to-tv", "/kak-podklyuchit-noutbuk-k-televizoru/", 4],
  ["digital-channels", "/kak-nastroit-tsifrovye-kanaly-na-televizore/", 5],
  ["picture-setup", "/nastroyka-izobrazheniya-televizora/", 6],
];

test("три интента имеют по одному индексируемому каноникалу", async () => {
  const pages = JSON.parse(await read("data/seo_pages.json"));

  for (const [id, path, priority] of expectedPages) {
    const matches = pages.filter((page) => page.id === id || page.path === path);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].id, id);
    assert.equal(matches[0].path, path);
    assert.equal(matches[0].indexable, true);
    assert.equal(matches[0].home_priority, priority);
    assert.ok(matches[0].facts.length >= 5);
    assert.ok(matches[0].faq.length >= 5);
  }
});

test("JS-обёртка вызывает один локальный Rust/WASM-контракт в фиксированном порядке", async () => {
  const previousEngine = globalThis.__krepitvEngine;
  const calls = [];
  try {
    globalThis.__krepitvEngine = {
      tv_traffic_task_plan_json(...values) {
        calls.push(values);
        return JSON.stringify({
          status: "ready",
          task: "laptop-to-tv",
          headline: "Маршрут готов",
          explanation: "Проверяемый путь",
          steps: [],
          warnings: [],
          privacy: "local-only",
        });
      },
    };
    const { calculateTvTrafficTask } = await import(
      `../src/lib/catalog.js?tv-traffic-cohort-2=${Date.now()}`
    );
    const result = await calculateTvTrafficTask({
      task: "laptop-to-tv",
      primary: "windows",
      secondary: "hdmi",
      tertiary: "mirror",
      detail: "unknown",
    });

    assert.equal(result.status, "ready");
    assert.deepEqual(calls, [["laptop-to-tv", "windows", "hdmi", "mirror", "unknown"]]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("общий мастер покрывает обязательные состояния и доступный повтор", async () => {
  const source = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(source, /export function TvTrafficTaskWizard/);
  assert.match(source, /export function TvTrafficTaskReference/);
  for (const id of ["laptop-to-tv", "digital-channels", "picture-setup"]) {
    assert.match(source, new RegExp(`"${id}"`), id);
  }
  assert.match(source, /data-tv-traffic-task=/);
  assert.match(source, /data-tv-traffic-result=/);
  assert.match(source, /requestState === "loading"/);
  assert.match(source, /setRequestState\("error"\)/);
  assert.match(source, /\{error \?/);
  assert.match(source, /const requiresConfirmation = config\.requireConfirmation === true && !secondarySkipped/);
  assert.match(source, /&& \(!requiresConfirmation \|\| \(tertiary && \(!detailVisible \|\| detail\)\)\)/);
  assert.match(source, /disabled=\{!canSubmit \|\| requestState === "loading"\}/);
  assert.match(source, /resultHeadingRef/);
  assert.match(source, /tabIndex=\{-1\}/);
  assert.match(source, /role="alert"/);
  assert.match(source, />\s*Повторить\s*</);
  assert.match(source, /<fieldset disabled=\{disabled\}>/);
  assert.match(source, /<legend/);
  assert.match(source, /type="radio"/);
  assert.match(source, /min-h-12|min-h-14/);
});

test("мастера остаются самостоятельными и не подмешивают коммерцию", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");

  assert.match(page, /const tvTrafficTask = tvTrafficTaskByPageId\.get\(page\.id\)/);
  assert.match(page, /const prioritizesTvTrafficTask = Boolean\(tvTrafficTask\)/);
  assert.match(page, /<TvTrafficTaskWizard task=\{tvTrafficTask\} \/>/);
  assert.match(page, /<TvTrafficTaskReference task=\{tvTrafficTask\} \/>/);
  assert.match(page, /\|\| prioritizesTvTrafficTask/);
  assert.doesNotMatch(
    wizard,
    /market\.yandex\.ru|AffiliateOffer|clid=|URLSearchParams|location\.search|₽|цена/i,
  );
});

test("аналитика результата передаёт только закрытый тип результата", async () => {
  const source = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const eventBlock = source.match(/emitResultCompleted\(window, \{([\s\S]*?)\n\s*\}\);/);

  assert.ok(eventBlock);
  assert.match(eventBlock[1], /toolId: config\.toolId/);
  assert.match(eventBlock[1], /resultType: resultTypes\[plan\.status\]/);
  assert.doesNotMatch(eventBlock[1], /primary|secondary|tertiary|detail|task,/i);
});

test("SSR-ответы и официальные источники присутствуют до JavaScript", async () => {
  const sitegen = await read("crates/sitegen/src/main.rs");

  for (const [id] of expectedPages) {
    assert.match(sitegen, new RegExp(`data-tv-traffic-answer=\\"${id}\\"`), id);
  }
  assert.match(sitegen, /support\.microsoft\.com\/ru-RU/);
  assert.match(sitegen, /support\.apple\.com\/ru-ru\/guide\/mac-help/);
  assert.match(sitegen, /plus\.rtrs\.ru\/info/);
  assert.match(sitegen, /samsung\.com\/ru\/support/);
  assert.match(sitegen, /Это обратимая базовая настройка без измерительного прибора/);
});

test("источники когорты аудируемы и не содержат непроверенных доменов", async () => {
  const manifest = JSON.parse(
    await read("data/research/tv-traffic-cohort-2-sources-2026-08-01.json"),
  );
  const ids = new Set(manifest.sources.map((source) => source.id));

  assert.equal(manifest.canonicals.length, 3);
  for (const canonical of manifest.canonicals) {
    assert.ok(canonical.source_ids.every((id) => ids.has(id)), canonical.id);
    assert.ok(canonical.fail_closed.length > 0, canonical.id);
  }
  assert.ok(manifest.sources.every((source) => source.url.startsWith("https://")));
  assert.doesNotMatch(JSON.stringify(manifest), /market\.yandex\.ru|utm_|clid=/i);
});
