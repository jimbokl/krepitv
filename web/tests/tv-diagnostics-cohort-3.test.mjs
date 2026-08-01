import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const tasks = [
  ["tv-sound-no-picture", "sound-but-no-picture", "/televizor-zvuk-est-izobrazheniya-net/"],
  ["tv-no-sound", "no-sound", "/net-zvuka-na-televizore/"],
  ["tv-remote-not-working", "remote-not-working", "/ne-rabotaet-pult-ot-televizora/"],
];

test("три диагностических интента используют один общий мастер", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");

  for (const [pageId, engineTask] of tasks) {
    assert.match(wizard, new RegExp(`"${engineTask}"\\s*:\\s*\\{`), engineTask);
    assert.match(page, new RegExp(`\\["${pageId}", "${engineTask}"\\]`), pageId);
  }
  assert.equal((wizard.match(/export function TvTrafficTaskWizard/g) ?? []).length, 1);
  assert.match(page, /const tvTrafficTask = tvTrafficTaskByPageId\.get\(page\.id\)/);
  assert.match(page, /<TvTrafficTaskWizard task=\{tvTrafficTask\} \/>/);
  assert.match(page, /<TvTrafficTaskReference task=\{tvTrafficTask\} \/>/);
  assert.doesNotMatch(wizard, /function (SoundButNoPicture|NoSound|RemoteNotWorking)Wizard/);
});

test("закрытые варианты cohort 3 совпадают с Rust-контрактом", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  for (const value of [
    "tv-speakers",
    "external-audio",
    "tv-app",
    "channels",
    "hdmi",
    "soundbar-receiver",
    "headphones-bluetooth",
    "original",
    "universal",
    "app",
    "unknown",
  ]) {
    assert.match(wizard, new RegExp(`\\["${value}"`), value);
  }
  assert.match(wizard, /Видно ли меню телевизора или шкалу громкости/);
  assert.match(wizard, /Откуда сейчас слышен звук/);
  assert.match(wizard, /Откуда должен звучать телевизор/);
  assert.match(wizard, /Телевизор управляется кнопкой на корпусе или официальным приложением/);
  assert.match(wizard, /Новые батарейки установлены с правильной полярностью/);
  assert.doesNotMatch(wizard, /<input[^>]+type="text"|<textarea/);
});

test("официальные source ids разрешаются в едином registry", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const manifest = JSON.parse(
    await read("data/research/tv-diagnostics-cohort-3-sources-2026-08-01.json"),
  );
  const expectedIds = manifest.canonicals.flatMap((canonical) => canonical.source_ids);

  for (const id of new Set(expectedIds)) {
    assert.match(wizard, new RegExp(`"${id}"\\s*:\\s*\\{`), id);
  }
  assert.match(wizard, /if \(!sourceRegistry\[normalizedId\]\) throw localPlanError\(\)/);
  assert.match(wizard, /if \(sourceIds\.length === 0 && !sourceOptionalStepIds\.has\(id\)\)/);
  assert.doesNotMatch(JSON.stringify(manifest), /market\.yandex\.ru|clid=|utm_/i);
});

test("normalizer fail-closed ограничивает статус, шаги и предупреждения", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  for (const status of [
    "action-plan",
    "needs-check",
    "service-boundary",
    "external-path",
  ]) {
    assert.match(wizard, new RegExp(`"${status}"`), status);
  }
  assert.match(wizard, /Object\.hasOwn\(resultTypes, status\)/);
  assert.match(wizard, /rawPlan\.steps\.length === 0/);
  assert.match(wizard, /const maxSteps = expectedTask === "picture-setup" \? 5 : 4/);
  assert.match(wizard, /rawPlan\.steps\.length > maxSteps/);
  assert.match(wizard, /rawPlan\.warnings\.length > 3/);
  assert.match(wizard, /if \(!stepIds\.has\(primaryStepId\)\) throw localPlanError\(\)/);
  assert.match(wizard, /Локальный модуль вернул неполный или неподдерживаемый план/);
});

test("существующий picture-setup сохраняет пятишаговый HDR-план как документированное исключение", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const legacyComment = wizard.slice(
    wizard.indexOf("The published picture setup"),
    wizard.indexOf("The published picture setup") + 320,
  );

  assert.match(legacyComment, /four-step reversible baseline/);
  assert.match(wizard, /expectedTask === "picture-setup" \? 5 : 4/);
  assert.match(wizard, /"picture-setup"\s*:\s*\{/);
});

test("loading блокирует fieldset и устаревший Promise не меняет экран", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(wizard, /const requestGenerationRef = useRef\(0\)/);
  assert.ok((wizard.match(/requestGenerationRef\.current \+= 1/g) ?? []).length >= 1);
  assert.match(wizard, /const generation = requestGenerationRef\.current \+ 1/);
  assert.ok((wizard.match(/generation !== requestGenerationRef\.current/g) ?? []).length >= 2);
  assert.match(wizard, /<form aria-busy=\{requestState === "loading"\}/);
  assert.match(wizard, /<fieldset disabled=\{disabled\}>/);
  assert.match(wizard, /disabled=\{requestState === "loading"\}/);
  assert.match(wizard, /requestState === "loading" \? config\.loadingLabel/);
  assert.match(wizard, /role="status"/);
});

test("default, disabled, error, retry, success и focus имеют явный UI-контракт", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(wizard, /Далее — уточним второе наблюдение/);
  assert.match(wizard, /const requiresConfirmation = config\.requireConfirmation === true && !secondarySkipped/);
  assert.match(wizard, /&& \(!requiresConfirmation \|\| \(tertiary && \(!detailVisible \|\| detail\)\)\)/);
  assert.match(wizard, /disabled=\{!canSubmit \|\| requestState === "loading"\}/);
  assert.match(wizard, /setRequestState\("error"\)/);
  assert.match(wizard, /role="alert"/);
  assert.match(wizard, />\s*Повторить\s*</);
  assert.match(wizard, /resultHeadingRef\.current\?\.focus\(\)/);
  assert.match(wizard, /tabIndex=\{-1\}/);
  assert.match(wizard, /focus-within:ring-2 focus-within:ring-action/);
  assert.match(wizard, /columns="grid-cols-1 sm:grid-cols-3"/);
});

test("результат показывает один primary step и закрывает остаток под details", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(wizard, /result\.steps\.find\(\(step\) => step\.id === result\.primary_step_id\)/);
  assert.match(wizard, /data-tv-traffic-primary-step=/);
  assert.match(wizard, /data-tv-traffic-remaining="true"/);
  assert.match(wizard, /Если не помогло — ещё/);
  assert.match(wizard, /<strong className="text-ink">Остановитесь, если:<\/strong>/);
  assert.doesNotMatch(wizard, /\{result\.steps\.map\(\(step, index\) =>/);
});

test("result_completed ограничен allowlist и не содержит ответов", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const eventBlock = wizard.match(/emitResultCompleted\(window, \{([\s\S]*?)\n\s*\}\);/);

  assert.ok(eventBlock);
  assert.match(eventBlock[1], /toolId: config\.toolId/);
  assert.match(eventBlock[1], /resultType: resultTypes\[plan\.status\]/);
  assert.doesNotMatch(eventBlock[1], /primary|secondary|tertiary|detail|task,/i);
  assert.equal((wizard.match(/emitResultCompleted\(window/g) ?? []).length, 1);
});

test("диагностические страницы подавляют каталог и коммерческий CTA", async () => {
  const page = await read("web/src/pages/SeoPage.jsx");
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));
  const pathsById = new Map(seoPages.map((entry) => [entry.id, entry.path]));

  assert.match(page, /const prioritizesTvTrafficTask = Boolean\(tvTrafficTask\)/);
  assert.match(page, /\|\| prioritizesTvTrafficTask/);
  for (const [pageId, , path] of tasks) {
    assert.match(page, new RegExp(`"${pageId}"`), pageId);
    assert.equal(pathsById.get(pageId), path, pageId);
  }
  assert.doesNotMatch(
    wizard,
    /market\.yandex\.ru|AffiliateOffer|clid=|URLSearchParams|location\.search|₽|цена/i,
  );
});

test("общая JS-обёртка передаёт cohort 3 в WASM в фиксированном порядке", async () => {
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
      `../src/lib/catalog.js?tv-diagnostics-cohort-3=${Date.now()}`
    );
    await calculateTvTrafficTask({
      task: "sound-but-no-picture",
      primary: "yes",
      secondary: "tv-speakers",
      tertiary: "hdmi",
      detail: "no",
    });
    await calculateTvTrafficTask({
      task: "no-sound",
      primary: "soundbar-receiver",
      secondary: "hdmi",
      tertiary: "no",
      detail: "yes",
    });
    await calculateTvTrafficTask({
      task: "remote-not-working",
      primary: "yes",
      secondary: "original",
      tertiary: "yes",
      detail: "no",
    });

    assert.deepEqual(calls, [
      ["sound-but-no-picture", "yes", "tv-speakers", "hdmi", "no"],
      ["no-sound", "soundbar-receiver", "hdmi", "no", "yes"],
      ["remote-not-working", "yes", "original", "yes", "no"],
    ]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("capture helper знает три задачи и bounded diagnostic states", async () => {
  const capture = await read("scripts/qa/capture-page.mjs");

  for (const [, engineTask] of tasks) {
    assert.match(capture, new RegExp(`"${engineTask}"`), engineTask);
  }
  for (const state of ["needs-check", "service-boundary", "external-path"]) {
    assert.match(capture, new RegExp(`"${state}"`), state);
  }
  assert.match(capture, /disabledFieldsets/);
  assert.match(capture, /primaryStepId/);
  assert.match(capture, /hasCollapsedRemainder/);
  assert.match(capture, /marketLinks !== 0/);
});
