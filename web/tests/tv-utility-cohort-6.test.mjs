import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const audioTasks = [
  ["tv-speakers", "/kak-podklyuchit-kolonki-k-televizoru/"],
  ["tv-headphones", "/kak-podklyuchit-naushniki-k-televizoru/"],
];

const cohortPages = [
  ...audioTasks.map(([id, path]) => [id, path]),
  ["tv-energy-consumption", "/skolko-elektroenergii-potreblyaet-televizor/"],
];

const valuesByTask = {
  "tv-speakers": [
    "bluetooth", "optical", "analog-3.5", "hdmi-arc", "passive-wire",
    "unknown", "yes", "no", "safe", "unsafe",
  ],
  "tv-headphones": [
    "bluetooth", "headphones-3.5", "optical", "none", "analog-3.5",
    "optical-transmitter", "unknown", "yes", "no", "safe", "unsafe",
  ],
};

const relatedByPage = {
  "tv-speakers": ["soundbar-to-tv", "tv-headphones", "tv-no-sound", "smart-tv-box", "picture-setup", "tv-no-signal"],
  "tv-headphones": ["tv-speakers", "soundbar-to-tv", "tv-no-sound", "tv-no-internet", "smart-tv-box", "tv-remote-not-working"],
  "tv-energy-consumption": ["tv-turns-off", "picture-setup", "tv-dimensions", "viewing-distance", "smart-tv-box", "screen-cleaning"],
};

test("cohort 6 имеет три самостоятельных индексируемых canonical с полезным SSR", async () => {
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const sitegen = await read("crates/sitegen/src/main.rs");
  const pageComponent = await read("web/src/pages/SeoPage.jsx");

  for (const [id, path] of cohortPages) {
    const matches = seoPages.filter((entry) => entry.id === id || entry.path === path);
    assert.equal(matches.length, 1, id);
    assert.equal(matches[0].id, id);
    assert.equal(matches[0].path, path);
    assert.equal(matches[0].kind, "calculator");
    assert.equal(matches[0].indexable, true);
    assert.ok(matches[0].facts.length >= 6, `${id}: facts`);
    assert.ok(matches[0].faq.length >= 6, `${id}: faq`);
    assert.match(sitegen, new RegExp(`\\(\\s*"${id}",\\s*"${path.replaceAll("/", "\\/")}`));
  }

  for (const [task] of audioTasks) {
    assert.match(pageComponent, new RegExp(`\\["${task}", "${task}"\\]`));
  }
  assert.match(pageComponent, /page\.id === "tv-energy-consumption"/);
  assert.match(pageComponent, /<TvEnergyCalculator \/>/);
});

test("аудиомастера используют только закрытые варианты и fail-closed статусы", async () => {
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

  assert.match(engine, /"service-boundary"[\s\S]{0,180}"tv-speakers"/);
  assert.match(engine, /"external-path"[\s\S]{0,180}"tv-speakers"/);
  assert.match(engine, /"service-boundary"[\s\S]{0,180}"tv-headphones"/);
  assert.match(engine, /"external-path"[\s\S]{0,180}"tv-headphones"/);
  assert.equal(
    (wizard.match(/Совместимость подтверждена, а разъём доступен без перемещения настенного телевизора\?/g) ?? []).length,
    2,
  );
  assert.match(engine, /безопасный доступ без перемещения телевизора/);
  assert.doesNotMatch(wizard, /<input[^>]+type="text"|<textarea/);
  assert.doesNotMatch(wizard, /URLSearchParams|location\.search/);
});

test("восемь официальных источников совпадают с manifest и локальными allowlist", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const energy = await read("web/src/components/TvEnergyCalculator.jsx");
  const sitegen = await read("crates/sitegen/src/main.rs");
  const manifest = JSON.parse(
    await read("data/research/tv-utility-cohort-6-sources-2026-08-01.json"),
  );

  const expected = new Map(manifest.sources.map((source) => [source.id, source.url]));
  const referenced = new Set(manifest.canonicals.flatMap((canonical) => canonical.source_ids));
  assert.equal(expected.size, 8);
  assert.deepEqual([...referenced].sort(), [...expected.keys()].sort());
  for (const source of manifest.sources) {
    assert.equal(typeof source.source_region, "string", `${source.id}: source_region`);
    assert.ok(source.source_region.length > 0, `${source.id}: source_region`);
    assert.ok(Object.hasOwn(source, "last_substantive_update"), `${source.id}: update field`);
    assert.equal(typeof source.last_substantive_update_status, "string", `${source.id}: update status`);
    assert.ok(Array.isArray(source.extracted_facts) && source.extracted_facts.length > 0, `${source.id}: facts`);
    assert.ok(Array.isArray(source.units), `${source.id}: units`);
    assert.ok(Array.isArray(source.limitations) && source.limitations.length > 0, `${source.id}: limitations`);
    assert.ok(Array.isArray(source.conflicts), `${source.id}: conflicts`);
  }
  assert.ok(Array.isArray(manifest.claim_source_map) && manifest.claim_source_map.length >= 5);
  assert.equal(
    new Set(manifest.claim_source_map.map((claim) => claim.claim_id)).size,
    manifest.claim_source_map.length,
  );
  for (const claim of manifest.claim_source_map) {
    assert.ok(Array.isArray(claim.source_ids), claim.claim_id);
    for (const sourceId of claim.source_ids) assert.ok(expected.has(sourceId), `${claim.claim_id}: ${sourceId}`);
    assert.equal(typeof claim.evidence_mode, "string", claim.claim_id);
  }
  for (const [id, url] of expected) {
    const component = id.includes("energy") ? energy : wizard;
    assert.match(component, new RegExp(`"${id}"\\s*:\\s*\\{`), id);
    assert.ok(component.includes(`url: "${url}"`), url);
    assert.ok(sitegen.includes(`data-tv-utility-source="${id}"`), `SSR: ${id}`);
  }
});

test("калькулятор расхода передаёт числа в WASM по фиксированному ABI", async () => {
  const previousEngine = globalThis.__krepitvEngine;
  const calls = [];
  try {
    globalThis.__krepitvEngine = {
      tv_energy_plan_json(...values) {
        calls.push(values);
        return JSON.stringify({
          active_power_w: values[0],
          hours_per_day: values[1],
          standby_power_w: values[2],
          tariff_rub_per_kwh: values[3] ?? null,
          active_daily_kwh: 0.4,
          standby_daily_kwh: 0.02,
          total_daily_kwh: 0.42,
          monthly_kwh: 12.6,
          annual_kwh: 153.3,
          monthly_cost_rub: values[3] == null ? null : 75.6,
          annual_cost_rub: values[3] == null ? null : 919.8,
          assumptions: ["Месяц — 30 дней"],
          warnings: [],
          source_ids: ["samsung-tv-energy-fiche", "lg-tv-energy-spec"],
          privacy: "Расчёт локальный",
        });
      },
    };
    const { calculateTvEnergyPlan } = await import(
      `../src/lib/catalog.js?tv-utility-cohort-6=${Date.now()}`
    );
    await calculateTvEnergyPlan({
      activePowerW: 100,
      hoursPerDay: 4,
      standbyPowerW: 1,
      tariffRubPerKwh: 6,
    });
    await calculateTvEnergyPlan({
      activePowerW: 80,
      hoursPerDay: 0,
      standbyPowerW: 0,
      tariffRubPerKwh: undefined,
    });
    assert.deepEqual(calls, [
      [100, 4, 1, 6],
      [80, 0, 0, undefined],
    ]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("энергокалькулятор не угадывает тариф, не отправляет ввод и проверяет ответ WASM", async () => {
  const component = await read("web/src/components/TvEnergyCalculator.jsx");

  assert.match(component, /const initialValues = \{[\s\S]{0,220}tariffRubPerKwh: ""/);
  assert.match(component, /values\.tariffRubPerKwh === ""[\s\S]{0,100}\? undefined/);
  assert.match(component, /type="number"/);
  assert.match(component, /disabled=\{!canSubmit \|\| requestState === "loading"\}/);
  assert.match(component, /role="status"/);
  assert.match(component, /role="alert"/);
  assert.match(component, /emitResultCompleted\(window/);
  assert.doesNotMatch(component, /fetch\(|XMLHttpRequest|WebSocket|URLSearchParams|location\.search/);
  assert.doesNotMatch(component, /market\.yandex\.ru|clid=|data-affiliate|rel="sponsored"/i);

  assert.match(component, /export function normalizeTvEnergyPlan\(rawPlan\)/);
  assert.match(component, /if \(!rawPlan \|\| typeof rawPlan !== "object"/);
  assert.match(component, /sourceIds\.length !== 2/);
  assert.match(component, /hasTariff !== \(normalized\.monthly_cost_rub !== null/);
});

test("related-навигация одинакова в клиенте и sitegen", async () => {
  const related = await read("web/src/lib/seoPages.mjs");
  const sitegen = await read("crates/sitegen/src/main.rs");

  for (const [id, expected] of Object.entries(relatedByPage)) {
    assert.ok(
      related.includes(`"${id}": [${expected.map((value) => `"${value}"`).join(", ")}]`),
      `React related: ${id}`,
    );
    const start = sitegen.indexOf(`"${id}" => &[`);
    assert.notEqual(start, -1, `sitegen related: ${id}`);
    const section = sitegen.slice(start, start + 500);
    for (const value of expected) assert.ok(section.includes(`"${value}"`), `${id}: ${value}`);
  }
});

test("существующие тематические страницы дают каждой новой canonical входящие ссылки", async () => {
  const soundbar = await read("docs/kak-podklyuchit-saundbar-k-televizoru/index.html");
  const noSound = await read("docs/net-zvuka-na-televizore/index.html");
  const turnsOff = await read("docs/televizor-sam-vyklyuchaetsya/index.html");
  const picture = await read("docs/nastroyka-izobrazheniya-televizora/index.html");

  assert.match(soundbar, /href="\/kak-podklyuchit-kolonki-k-televizoru\/"/);
  assert.match(noSound, /href="\/kak-podklyuchit-kolonki-k-televizoru\/"/);
  assert.match(noSound, /href="\/kak-podklyuchit-naushniki-k-televizoru\/"/);
  assert.match(turnsOff, /href="\/skolko-elektroenergii-potreblyaet-televizor\/"/);
  assert.match(picture, /href="\/skolko-elektroenergii-potreblyaet-televizor\/"/);
});

test("cohort 6 остаётся без Market CTA, товарных цен и скрытого редиректа", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const energy = await read("web/src/components/TvEnergyCalculator.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const cohort = seoPages.filter((entry) => cohortPages.some(([id]) => entry.id === id));
  const serialized = JSON.stringify(cohort);

  assert.equal(cohort.length, 3);
  assert.doesNotMatch(wizard, /market\.yandex\.ru|clid=|data-affiliate|rel="sponsored"/i);
  assert.doesNotMatch(energy, /market\.yandex\.ru|clid=|data-affiliate|rel="sponsored"/i);
  assert.doesNotMatch(serialized, /market\.yandex\.ru|clid=|affiliate|\/go\//i);
});

test("capture helper знает четыре границы обоих аудиомастеров", async () => {
  const capture = await read("scripts/qa/capture-page.mjs");
  for (const task of ["tv-speakers", "tv-headphones"]) {
    assert.match(capture, new RegExp(`"${task}": \\{`));
  }
  assert.match(capture, /success: \["optical", "optical", "yes", "safe"\]/);
  assert.match(capture, /success: \["bluetooth", "bluetooth", "yes", "safe"\]/);
  assert.match(capture, /"needs-check"/);
  assert.match(capture, /"service-boundary"/);
  assert.match(capture, /"external-path"/);
  assert.match(capture, /--tv-energy-state/);
  assert.match(capture, /data-tv-energy-result/);
  assert.match(capture, /activePowerW/);
});
