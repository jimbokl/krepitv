import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const tasks = [
  ["tv-turns-off", "turns-off", "/televizor-sam-vyklyuchaetsya/"],
  ["tv-no-internet", "no-internet", "/televizor-ne-podklyuchaetsya-k-internetu/"],
  ["tv-usb-not-seen", "usb-not-seen", "/televizor-ne-vidit-fleshku/"],
];

const sourceIds = [
  "samsung-tv-turns-off",
  "lg-tv-off-timer",
  "lg-tv-box-turns-off",
  "sony-tv-auto-power",
  "samsung-tv-wifi",
  "lg-tv-internet",
  "sony-tv-internet",
  "samsung-usb-video",
  "google-android-tv-storage",
];

test("три новых канонических интента используют общий локальный мастер", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const pageById = new Map(seoPages.map((entry) => [entry.id, entry]));

  for (const [pageId, engineTask, path] of tasks) {
    assert.match(wizard, new RegExp(`"${engineTask}"\\s*:\\s*\\{`), engineTask);
    assert.match(page, new RegExp(`\\["${pageId}", "${engineTask}"\\]`), pageId);
    assert.equal(pageById.get(pageId)?.path, path, pageId);
    assert.equal(pageById.get(pageId)?.indexable, true, pageId);
    assert.match(pageById.get(pageId)?.h1 ?? "", /пошаговая проверка/i, pageId);
  }
  assert.equal((wizard.match(/export function TvTrafficTaskWizard/g) ?? []).length, 1);
  assert.match(page, /const tvTrafficTask = tvTrafficTaskByPageId\.get\(page\.id\)/);
  assert.match(page, /<TvTrafficTaskWizard task=\{tvTrafficTask\} \/>/);
  assert.match(page, /<TvTrafficTaskReference task=\{tvTrafficTask\} \/>/);
  assert.doesNotMatch(wizard, /function (TurnsOff|NoInternet|UsbNotSeen)Wizard/);
});

test("закрытые варианты совпадают с Rust-контрактом и не принимают пользовательский текст", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  for (const value of [
    "same-time",
    "after-hdmi",
    "random",
    "once",
    "repeats",
    "wired",
    "one-app",
    "all-apps",
    "drive-not-shown",
    "file-not-shown",
    "file-not-playing",
  ]) {
    assert.match(wizard, new RegExp(`\\["${value}"`), value);
  }
  assert.doesNotMatch(wizard, /<input[^>]+type="text"|<textarea/);
  assert.doesNotMatch(wizard, /URLSearchParams|location\.search/);
});

test("официальные источники разрешаются в едином registry", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const manifest = JSON.parse(
    await read("data/research/tv-diagnostics-cohort-4-sources-2026-08-01.json"),
  );
  const manifestSourceIds = [...new Set(
    manifest.canonicals.flatMap((canonical) => canonical.source_ids),
  )];

  assert.deepEqual(manifestSourceIds.slice().sort(), sourceIds.slice().sort());
  for (const id of manifestSourceIds) {
    assert.match(wizard, new RegExp(`"${id}"\\s*:\\s*\\{`), id);
    assert.match(wizard, new RegExp(`"${id}"`), `${id} reference`);
  }
  assert.match(wizard, /if \(!sourceRegistry\[normalizedId\]\) throw localPlanError\(\)/);
  assert.match(wizard, /Точные названия меню, поддержка функций и модельные процедуры всегда проверяются/);
});

test("выключение fail-closed, интернет приватен, USB не форматируется", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(wizard, /запах гари, дым, искры, жидкость, сильный нагрев, красный мигающий индикатор/i);
  assert.match(wizard, /повреждённые, горячие или мокрые кабель, вилка или розетка/i);
  assert.match(wizard, /Ничего больше не включайте и не разбирайте/);
  assert.match(wizard, /без перемещения настенного телевизора/);
  assert.match(wizard, /Не вводите на сайте название сети, пароль, IP- или MAC-адрес: мастер их не запрашивает\./);
  assert.match(wizard, /Не форматируйте и не регистрируйте накопитель: это может удалить данные\. Сначала нужна резервная копия и инструкция точной модели\./);
  assert.match(wizard, /не телефон и не диск для записи/i);
  assert.doesNotMatch(wizard, /введите (SSID|пароль|IP|MAC)|сбросьте роутер|заводск(?:ой|ие) сброс/i);
});

test("опасные и неподтверждённые признаки не требуют второго вопроса", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const capture = await read("scripts/qa/capture-page.mjs");

  assert.match(wizard, /skipSecondary: \(\{ primary \}\) => Boolean\(primary && primary !== "no"\)/);
  assert.match(wizard, /const secondarySkipped = config\.skipSecondary\?\.\(\{ primary \}\) === true/);
  assert.match(wizard, /const requiresConfirmation = config\.requireConfirmation === true && !secondarySkipped/);
  assert.match(wizard, /&& \(!requiresConfirmation \|\| \(tertiary && \(!detailVisible \|\| detail\)\)\)/);
  assert.match(wizard, /secondary: secondarySkipped \? "unknown" : secondary/);
  assert.match(wizard, /tertiary: secondarySkipped \? "unknown" : tertiary/);
  assert.match(wizard, /data-wizard-secondary-skipped=\{primary === "yes" \? "danger" : "unconfirmed"\}/);
  assert.match(wizard, /Безопасность не подтверждена\. Второй вопрос не нужен/);
  assert.match(wizard, /disabled=\{!canSubmit \|\| requestState === "loading"\}/);

  assert.match(capture, /"service-boundary": \["yes", null, null, null\]/);
  assert.match(capture, /"needs-check": \["unknown", null, null, null\]/);
  assert.match(capture, /const secondaryRequired = scenario\[1\] !== null/);
  assert.match(capture, /Danger path rendered an irrelevant secondary question/);
  assert.match(capture, /immediateStopPath:/);
});

test("capture helper фиксирует danger-selected до submit и отдельный result", async () => {
  const capture = await read("scripts/qa/capture-page.mjs");

  assert.match(capture, /"immediate-stop"/);
  assert.match(capture, /"immediate-stop": \["yes", null, null, null\]/);
  assert.match(capture, /state === "immediate-stop"/);
  assert.match(capture, /Immediate-stop block did not render/);
  assert.match(capture, /Immediate-stop path rendered an irrelevant secondary question/);
  assert.match(capture, /Immediate-stop submit stayed disabled/);
  assert.match(capture, /stopBlockVisible:/);
  assert.match(capture, /tvTrafficState === "immediate-stop"/);

  const preSubmitBlock = capture.slice(
    capture.indexOf('} else if (state === "immediate-stop")'),
    capture.indexOf('} else if (["loading"', capture.indexOf('} else if (state === "immediate-stop")')),
  );
  assert.doesNotMatch(preSubmitBlock, /submit\.click\(\)/);
  assert.doesNotMatch(preSubmitBlock, /data-tv-traffic-result/);
});

test("новые диагностические страницы не получают Market CTA", async () => {
  const page = await read("web/src/pages/SeoPage.jsx");
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const cohortPages = seoPages.filter((entry) => tasks.some(([pageId]) => entry.id === pageId));

  assert.match(page, /const prioritizesTvTrafficTask = Boolean\(tvTrafficTask\)/);
  assert.match(page, /const prioritizesTrafficUtility = prioritizesPhoneTvConnection \|\| prioritizesTvNoSignal\s*\|\| prioritizesTvTrafficTask/);
  assert.match(page, /!prioritizesBrandComparison && !prioritizesBuyComparison && !prioritizesPrimaryLookup/);
  assert.doesNotMatch(
    wizard,
    /market\.yandex\.ru|AffiliateOffer|clid=|data-affiliate|rel="sponsored"|₽/i,
  );
  assert.doesNotMatch(JSON.stringify(cohortPages), /market\.yandex\.ru|clid=|affiliate|₽/i);
  for (const [pageId] of tasks) {
    assert.match(page, new RegExp(`"${pageId}"`), pageId);
  }
});

test("главная и related-map дают каждой странице входящую внутреннюю ссылку", async () => {
  const home = await read("web/src/pages/HomePage.jsx");
  const seoPages = await read("web/src/lib/seoPages.mjs");

  assert.match(home, /data-home-tv-diagnostics="true"/);
  assert.match(home, /data-home-tv-diagnostics-count=\{diagnosticPages\.length\}/);
  assert.match(home, /data-home-tv-diagnostic=\{page\.id\}/);
  assert.match(home, /grid-cols-1[^"\n]*sm:grid-cols-2[^"\n]*md:grid-cols-3/);
  for (const [pageId] of tasks) {
    assert.match(seoPages, new RegExp(`"${pageId}"`), pageId);
  }
  assert.match(seoPages, /"tv-turns-off": \["tv-energy-consumption", "tv-no-internet"/);
  assert.match(seoPages, /"tv-no-internet": \["tv-usb-not-seen"/);
  assert.match(seoPages, /"tv-usb-not-seen": \["tv-no-internet"/);
  assert.match(seoPages, /"phone-to-tv": \["laptop-to-tv", "tv-no-signal", "tv-no-internet", "tv-usb-not-seen"/);
  assert.match(seoPages, /"laptop-to-tv": \["tv-no-signal", "phone-to-tv", "tv-no-internet", "tv-usb-not-seen"/);
});

test("общая JS-обёртка передаёт cohort 4 в WASM в фиксированном порядке", async () => {
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
      `../src/lib/catalog.js?tv-diagnostics-cohort-4=${Date.now()}`
    );
    await calculateTvTrafficTask({
      task: "turns-off",
      primary: "no",
      secondary: "same-time",
      tertiary: "repeats",
      detail: "yes",
    });
    await calculateTvTrafficTask({
      task: "no-internet",
      primary: "yes",
      secondary: "no",
      tertiary: "all-apps",
      detail: "unknown",
    });
    await calculateTvTrafficTask({
      task: "usb-not-seen",
      primary: "no",
      secondary: "yes",
      tertiary: "drive-not-shown",
      detail: "no",
    });

    assert.deepEqual(calls, [
      ["turns-off", "no", "same-time", "repeats", "yes"],
      ["no-internet", "yes", "no", "all-apps", "unknown"],
      ["usb-not-seen", "no", "yes", "drive-not-shown", "no"],
    ]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});
