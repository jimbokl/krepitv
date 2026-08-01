import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const tasks = [
  ["soundbar-to-tv", "soundbar-to-tv", "/kak-podklyuchit-saundbar-k-televizoru/"],
  ["screen-cleaning", "screen-cleaning", "/chem-protirat-ekran-televizora/"],
  ["smart-tv-box", "smart-tv-box", "/kak-podklyuchit-smart-tv-pristavku-k-televizoru/"],
];

const valuesByTask = {
  "soundbar-to-tv": [
    "earc", "arc", "optical", "analog", "bluetooth", "none", "unknown",
    "yes", "no", "safe", "unsafe",
  ],
  "screen-cleaning": [
    "clear", "damage", "liquid", "unknown", "off-cool", "on", "warm",
    "clean-dry-microfiber", "other", "safe", "unsafe", "inaccessible",
  ],
  "smart-tv-box": [
    "hdmi", "av", "none", "unknown", "yes", "no", "power-and-network",
    "power-only", "no-power", "unsafe",
  ],
};

test("три traffic-first utility имеют по одному индексируемому canonical и общий локальный мастер", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));

  for (const [pageId, engineTask, path] of tasks) {
    const matches = seoPages.filter((entry) => entry.id === pageId || entry.path === path);
    assert.equal(matches.length, 1, pageId);
    assert.equal(matches[0].id, pageId, pageId);
    assert.equal(matches[0].path, path, pageId);
    assert.equal(matches[0].kind, "calculator", pageId);
    assert.equal(matches[0].indexable, true, pageId);
    assert.ok(matches[0].facts.length >= 6, pageId);
    assert.ok(matches[0].faq.length >= 6, pageId);
    assert.match(wizard, new RegExp(`"${engineTask}"\\s*:\\s*\\{`), engineTask);
    assert.match(page, new RegExp(`\\["${pageId}", "${engineTask}"\\]`), pageId);
  }

  assert.equal((wizard.match(/export function TvTrafficTaskWizard/g) ?? []).length, 1);
  assert.match(page, /<TvTrafficTaskWizard task=\{tvTrafficTask\} \/>/);
  assert.match(page, /<TvTrafficTaskReference task=\{tvTrafficTask\} \/>/);
});

test("закрытые варианты интерфейса совпадают с Rust-контрактом и не принимают произвольный текст", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const engine = await read("crates/engine/src/lib.rs");

  for (const [task, values] of Object.entries(valuesByTask)) {
    const configStart = wizard.indexOf(`  "${task}": {`);
    assert.notEqual(configStart, -1, task);
    const configEnd = wizard.indexOf("\n  },", configStart);
    const config = wizard.slice(configStart, configEnd);
    for (const value of values) {
      assert.match(config, new RegExp(`\\["${value}"`), `${task}: ${value}`);
      assert.match(engine, new RegExp(`"${value}"`), `Rust: ${task}: ${value}`);
    }
  }

  assert.doesNotMatch(wizard, /<input[^>]+type="text"|<textarea/);
  assert.doesNotMatch(wizard, /URLSearchParams|location\.search/);
  assert.match(wizard, /detail: detailVisible \? detail : "unknown"/);
});

test("восемь официальных источников точно совпадают с manifest и разрешаются локально", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const manifest = JSON.parse(
    await read("data/research/tv-utility-cohort-5-sources-2026-08-01.json"),
  );
  const expected = new Map(manifest.sources.map((source) => [source.id, source.url]));
  const referenced = new Set(
    manifest.canonicals.flatMap((canonical) => canonical.source_ids),
  );

  assert.equal(expected.size, 8);
  assert.deepEqual([...referenced].sort(), [...expected.keys()].sort());
  for (const [id, url] of expected) {
    assert.match(wizard, new RegExp(`"${id}"\\s*:\\s*\\{`), id);
    assert.ok(wizard.includes(`url: "${url}"`), url);
  }
  assert.match(wizard, /if \(!sourceRegistry\[normalizedId\]\) throw localPlanError\(\)/);
});

test("utility остаются самостоятельными и не содержат Market CTA, цены или скрытый редирект", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const cohort = seoPages.filter((entry) => tasks.some(([id]) => entry.id === id));
  const serialized = JSON.stringify(cohort);

  assert.match(page, /const prioritizesTvTrafficTask = Boolean\(tvTrafficTask\)/);
  assert.doesNotMatch(wizard, /market\.yandex\.ru|AffiliateOffer|clid=|data-affiliate|rel="sponsored"|₽/i);
  assert.doesNotMatch(serialized, /market\.yandex\.ru|clid=|affiliate|₽/i);
  assert.doesNotMatch(serialized, /\/go\//i);
});

test("каждая новая страница получает контекстные входящие ссылки, а главная сохраняет шесть карточек", async () => {
  const home = await read("web/src/pages/HomePage.jsx");
  const related = await read("web/src/lib/seoPages.mjs");
  const sitegen = await read("crates/sitegen/src/main.rs");

  assert.match(home, /data-home-tv-diagnostics-count=\{diagnosticPages\.length\}/);
  assert.match(related, /const HOME_DIAGNOSTIC_PAGE_IDS = \[[\s\S]{0,240}"tv-usb-not-seen",\n\];/);
  for (const source of [related, sitegen]) {
    assert.match(source, /"tv-no-sound"[^\n]*"soundbar-to-tv"|"tv-no-sound"\s*=>\s*&\[[\s\S]{0,180}"soundbar-to-tv"/);
    assert.match(source, /"picture-setup"[^\n]*"screen-cleaning"|"picture-setup"\s*=>\s*&\[[\s\S]{0,180}"screen-cleaning"/);
    assert.match(source, /"tv-no-internet"[^\n]*"smart-tv-box"|"tv-no-internet"\s*=>\s*&\[[\s\S]{0,260}"smart-tv-box"/);
    assert.match(source, /"phone-to-tv"[^\n]*"smart-tv-box"|"phone-to-tv"\s*=>\s*&\[[\s\S]{0,260}"smart-tv-box"/);
  }
  assert.match(related, /"soundbar-to-tv": \["tv-no-sound", "tv-no-signal", "picture-setup", "tv-sound-no-picture", "tv-remote-not-working", "smart-tv-box"\]/);
  assert.match(related, /"screen-cleaning": \["picture-setup", "tv-sound-no-picture", "tv-turns-off", "tv-no-sound", "wall-planner", "soundbar-to-tv"\]/);
  assert.match(related, /"smart-tv-box": \["tv-no-signal", "tv-no-internet", "phone-to-tv", "digital-channels", "soundbar-to-tv", "tv-usb-not-seen"\]/);
  assert.match(sitegen, /"soundbar-to-tv"\s*=>\s*&\[[\s\S]{0,220}"tv-remote-not-working",\s*"smart-tv-box"/);
  assert.match(sitegen, /"screen-cleaning"\s*=>\s*&\[[\s\S]{0,220}"wall-planner",\s*"soundbar-to-tv"/);
  assert.match(sitegen, /"smart-tv-box"\s*=>\s*&\[[\s\S]{0,220}"soundbar-to-tv",\s*"tv-usb-not-seen"/);
});

test("опасное питание приставки закрывает путь, а нечётная двухколоночная сетка не оставляет пустую полуячейку", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const engine = await read("crates/engine/src/lib.rs");
  const capture = await read("scripts/qa/capture-page.mjs");

  assert.match(wizard, /\["unsafe", "Есть повреждение, нагрев или влага"\]/);
  assert.match(engine, /if input\.detail == "unsafe"[\s\S]{0,220}return Ok\(tv_traffic_task_plan\([\s\S]{0,120}"service-boundary"/);
  assert.match(engine, /"stop-unsafe-box-power"/);
  assert.match(capture, /"service-boundary": \["hdmi", "hdmi", "yes", "unsafe"\]/);
  assert.match(wizard, /columns\.includes\("sm:grid-cols-2"\) && options\.length % 2 === 1/);
  assert.match(wizard, /"sm:col-span-2"/);
});

test("общая JS-обёртка передаёт cohort 5 в WASM в фиксированном порядке", async () => {
  const previousEngine = globalThis.__krepitvEngine;
  const calls = [];
  try {
    globalThis.__krepitvEngine = {
      tv_traffic_task_plan_json(...values) {
        calls.push(values);
        return JSON.stringify({ task: values[0], status: "action-plan" });
      },
    };
    const { calculateTvTrafficTask } = await import(
      `../src/lib/catalog.js?tv-utility-cohort-5=${Date.now()}`
    );

    await calculateTvTrafficTask({
      task: "soundbar-to-tv", primary: "earc", secondary: "arc", tertiary: "yes", detail: "safe",
    });
    await calculateTvTrafficTask({
      task: "screen-cleaning", primary: "clear", secondary: "off-cool", tertiary: "clean-dry-microfiber", detail: "safe",
    });
    await calculateTvTrafficTask({
      task: "smart-tv-box", primary: "hdmi", secondary: "hdmi", tertiary: "yes", detail: "power-and-network",
    });

    assert.deepEqual(calls, [
      ["soundbar-to-tv", "earc", "arc", "yes", "safe"],
      ["screen-cleaning", "clear", "off-cool", "clean-dry-microfiber", "safe"],
      ["smart-tv-box", "hdmi", "hdmi", "yes", "power-and-network"],
    ]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("capture helper знает success, needs-check и границы остановки для cohort 5", async () => {
  const capture = await read("scripts/qa/capture-page.mjs");

  assert.match(capture, /"soundbar-to-tv": \{/);
  assert.match(capture, /success: \["earc", "arc", "yes", "safe"\]/);
  assert.match(capture, /"screen-cleaning": \{/);
  assert.match(capture, /success: \["clear", "off-cool", "clean-dry-microfiber", "safe"\]/);
  assert.match(capture, /"smart-tv-box": \{/);
  assert.match(capture, /success: \["hdmi", "hdmi", "yes", "power-and-network"\]/);
  assert.match(capture, /"service-boundary"/);
  assert.match(capture, /"external-path"/);
});
