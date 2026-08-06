import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

const tasks = [
  ["tv-firmware-update", "/kak-obnovit-televizor/"],
  ["tv-app-install", "/kak-ustanovit-prilozhenie-na-televizor/"],
  ["tv-factory-reset", "/kak-sbrosit-televizor-do-zavodskih-nastroek/"],
];

const valuesByTask = {
  "tv-firmware-update": [
    "samsung", "lg-webos", "google-android", "yaos", "other", "unknown",
    "network", "official-usb", "yes", "no", "ready", "update-running", "unsafe",
  ],
  "tv-app-install": [
    "samsung", "lg-webos", "google-android", "yaos", "other", "unknown",
    "official-store", "not-found", "apk-only", "ready", "no-network", "no-account",
    "enough-space", "low-space",
  ],
  "tv-factory-reset": [
    "samsung", "lg-webos", "google-android", "yaos", "other", "unknown",
    "restart-only", "troubleshooting", "sale-transfer", "ready-to-erase", "not-ready",
    "normal-menu", "no-menu", "update-running", "unsafe",
  ],
};

const sourceIdsByTask = {
  "tv-firmware-update": [
    "samsung-tv-update-online",
    "samsung-tv-update-usb",
    "samsung-tv-firmware-model",
    "lg-tv-update",
    "sony-tv-update",
    "yaos-tv-update",
  ],
  "tv-app-install": [
    "samsung-tv-app-install",
    "lg-tv-app-install",
    "google-tv-app-install",
    "yaos-tv-apps",
  ],
  "tv-factory-reset": [
    "samsung-tv-reset",
    "lg-tv-reset",
    "sony-tv-reset",
    "yaos-tv-reset",
  ],
};

const sourceUrls = new Map([
  ["samsung-tv-update-online", "https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-through-the-internet/"],
  ["samsung-tv-update-usb", "https://www.samsung.com/ru/support/tv-audio-video/how-can-i-update-the-samsung-tv-firmware-using-a-usb-memory-stick/"],
  ["samsung-tv-firmware-model", "https://www.samsung.com/ru/support/tv-audio-video/where-can-i-download-a-firmware-for-my-samsung-tv/"],
  ["lg-tv-update", "https://www.lg.com/ru/support/product-help/CT20206007-20153413220386OLT"],
  ["sony-tv-update", "https://www.sony.ru/electronics/support/articles/00119543"],
  ["yaos-tv-update", "https://alice.yandex.ru/support/ru/tv/settings/update-firmware"],
  ["samsung-tv-app-install", "https://www.samsung.com/ru/support/tv-audio-video/how-to-install-an-app-on-samsung-tv/"],
  ["lg-tv-app-install", "https://www.lg.com/ru/support/product-help/CT20206007-20155331408377"],
  ["google-tv-app-install", "https://support.google.com/googletv/answer/10050570?hl=ru"],
  ["yaos-tv-apps", "https://alice.yandex.ru/support/ru/tv/apps/tv-yndx"],
  ["samsung-tv-reset", "https://www.samsung.com/ru/support/tv-audio-video/how-do-i-reset-settings-on-my-samsung-tv/"],
  ["lg-tv-reset", "https://www.lg.com/ru/support/product-help/CT20206007-20154159901753"],
  ["sony-tv-reset", "https://www.sony.ru/electronics/support/articles/00262856"],
  ["yaos-tv-reset", "https://alice.yandex.ru/support/ru/tv/settings/reset-settings"],
]);

function configSource(wizard, task) {
  const start = wizard.indexOf(`  "${task}": {`);
  assert.notEqual(start, -1, task);
  const taskIndex = tasks.findIndex(([candidate]) => candidate === task);
  const nextTask = tasks[taskIndex + 1]?.[0];
  const endMarker = nextTask ? `  "${nextTask}": {` : "\n};\n\nconst statusCopy";
  const end = wizard.indexOf(endMarker, start + 1);
  assert.notEqual(end, -1, `${task}: config boundary`);
  return wizard.slice(start, end);
}

function loadNormalizer(wizard) {
  const registryStart = wizard.indexOf("const sourceRegistry =");
  const registryEnd = wizard.indexOf("\nconst configs =", registryStart);
  const normalizerStart = wizard.indexOf("const resultTypes =");
  const normalizerEnd = wizard.indexOf("\nexport function TvTrafficTaskWizard", normalizerStart);
  assert.ok(registryStart >= 0 && registryEnd > registryStart);
  assert.ok(normalizerStart >= 0 && normalizerEnd > normalizerStart);
  const registryCode = wizard.slice(registryStart, registryEnd);
  const normalizerCode = wizard
    .slice(normalizerStart, normalizerEnd)
    .replace("export function normalizeTvTrafficTaskPlan", "function normalizeTvTrafficTaskPlan");
  return new Function(
    `${registryCode}\n${normalizerCode}\nreturn normalizeTvTrafficTaskPlan;`,
  )();
}

test("три canonical подключены к общему закрытому мастеру", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const page = await read("web/src/pages/SeoPage.jsx");
  const seoPages = JSON.parse(await read("data/seo_pages.json"));

  for (const [task, path] of tasks) {
    const matches = seoPages.filter((entry) => entry.id === task || entry.path === path);
    assert.equal(matches.length, 1, task);
    assert.equal(matches[0].id, task, task);
    assert.equal(matches[0].path, path, task);
    assert.equal(matches[0].kind, "calculator", task);
    assert.equal(matches[0].indexable, true, task);
    assert.match(wizard, new RegExp(`"${task}"\\s*:\\s*\\{`), task);
    assert.match(page, new RegExp(`\\["${task}", "${task}"\\]`), task);
  }

  assert.match(page, /<TvTrafficTaskWizard task=\{tvTrafficTask\} \/>/);
  assert.match(page, /<TvTrafficTaskReference task=\{tvTrafficTask\} \/>/);
});

test("четыре закрытых поля каждого мастера совпадают с Rust enum-контрактом", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const engine = await read("crates/engine/src/lib.rs");

  for (const [task, values] of Object.entries(valuesByTask)) {
    const config = configSource(wizard, task);
    assert.match(config, /requireConfirmation: true/);
    assert.equal((config.match(/defaultValue: ""/g) ?? []).length, 2, `${task}: required fields`);
    for (const value of values) {
      assert.match(config, new RegExp(`\\["${value}"`), `${task}: ${value}`);
      assert.match(engine, new RegExp(`"${value}"`), `Rust: ${task}: ${value}`);
    }
  }

  assert.doesNotMatch(wizard, /<input[^>]+type="text"|<textarea/);
  assert.doesNotMatch(wizard, /URLSearchParams|location\.search/);
});

test("14 официальных источников имеют точный URL и привязаны к своим задачам", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const allReferenced = new Set(Object.values(sourceIdsByTask).flat());

  assert.equal(sourceUrls.size, 14);
  assert.deepEqual([...allReferenced].sort(), [...sourceUrls.keys()].sort());
  for (const [id, url] of sourceUrls) {
    assert.match(wizard, new RegExp(`"${id}"\\s*:\\s*\\{`), id);
    assert.ok(wizard.includes(`url: "${url}"`), url);
  }
  for (const [task, sourceIds] of Object.entries(sourceIdsByTask)) {
    const config = configSource(wizard, task);
    for (const sourceId of sourceIds) assert.match(config, new RegExp(`"${sourceId}"`), `${task}: ${sourceId}`);
  }
});

test("нормализатор принимает локальный план и fail-closed отклоняет чужой источник", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const normalize = loadNormalizer(wizard);
  const validPlan = {
    status: "action-plan",
    task: "tv-app-install",
    primary_step_id: "open-official-store",
    headline: "Откройте официальный магазин",
    explanation: "Путь подтверждён закрытыми ответами.",
    steps: [{
      id: "open-official-store",
      title: "Откройте магазин",
      instruction: "Используйте обычное пользовательское меню.",
      source_ids: ["google-tv-app-install", "google-tv-app-install"],
      stop_condition: "Остановитесь, если магазин не совпадает.",
    }],
    warnings: ["Наличие зависит от модели и региона."],
    privacy: "Ответы остаются в браузере.",
  };

  const normalized = normalize(validPlan, "tv-app-install");
  assert.deepEqual(normalized.steps[0].source_ids, ["google-tv-app-install"]);
  assert.equal(normalized.primary_step_id, "open-official-store");

  const unknownSource = structuredClone(validPlan);
  unknownSource.steps[0].source_ids = ["untrusted-source"];
  assert.throws(() => normalize(unknownSource, "tv-app-install"), /неполный или неподдерживаемый план/);

  const tooManySteps = structuredClone(validPlan);
  tooManySteps.steps = Array.from({ length: 5 }, (_, index) => ({
    ...validPlan.steps[0],
    id: `step-${index}`,
  }));
  tooManySteps.primary_step_id = "step-0";
  assert.throws(() => normalize(tooManySteps, "tv-app-install"), /неполный или неподдерживаемый план/);
});

test("общая JS-обёртка отправляет три задачи в WASM в фиксированном порядке", async () => {
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
      `../src/lib/catalog.js?tv-utility-cohort-7=${Date.now()}`
    );

    await calculateTvTrafficTask({
      task: "tv-firmware-update", primary: "samsung", secondary: "network", tertiary: "yes", detail: "ready",
    });
    await calculateTvTrafficTask({
      task: "tv-app-install", primary: "lg-webos", secondary: "official-store", tertiary: "ready", detail: "enough-space",
    });
    await calculateTvTrafficTask({
      task: "tv-factory-reset", primary: "yaos", secondary: "sale-transfer", tertiary: "ready-to-erase", detail: "normal-menu",
    });

    assert.deepEqual(calls, [
      ["tv-firmware-update", "samsung", "network", "yes", "ready"],
      ["tv-app-install", "lg-webos", "official-store", "ready", "enough-space"],
      ["tv-factory-reset", "yaos", "sale-transfer", "ready-to-erase", "normal-menu"],
    ]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("loading, error и retry сохраняют единый доступный паттерн", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(wizard, /<form aria-busy=\{requestState === "loading"\}/);
  assert.match(wizard, /disabled=\{requestState === "loading"\}/);
  assert.match(wizard, /disabled=\{!canSubmit \|\| requestState === "loading"\}/);
  assert.match(wizard, /requestGenerationRef\.current/);
  assert.match(wizard, /setRequestState\("error"\)/);
  assert.match(wizard, /Выбранные ответы сохранены/);
  assert.match(wizard, /role="alert"/);
  assert.match(wizard, /onClick=\{\(\) => void runCalculation\(\)\}/);
  assert.match(wizard, />\s*Повторить\s*</);
});

test("заводской сброс требует явного подтверждения потери данных", async () => {
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");
  const reset = configSource(wizard, "tv-factory-reset");

  assert.match(reset, /requireConfirmation: true/);
  assert.match(reset, /\["ready-to-erase", "Да, последствия проверены"\]/);
  assert.match(reset, /\["not-ready", "Нет, данные или доступы не готовы"\]/);
  assert.match(reset, /\["normal-menu", "Обычное меню доступно"/);
  assert.match(reset, /\["update-running", "Обновление уже идёт"/);
  assert.match(reset, /Полный сброс удаляет пользовательские настройки, настроенные каналы, учётные записи и данные, а также установленные приложения\./);
  assert.match(reset, /Прошивка при этом не откатывается\./);
  assert.match(wizard, /config\.confirmationDescription/);
  assert.match(wizard, /&& \(!requiresConfirmation \|\| \(tertiary && \(!detailVisible \|\| detail\)\)\)/);
});

test("related-граф образует связный системный кластер без коммерческих CTA", async () => {
  const related = await read("web/src/lib/seoPages.mjs");
  const wizard = await read("web/src/components/TvTrafficTaskWizard.jsx");

  assert.match(related, /"tv-firmware-update": \["tv-app-install", "tv-factory-reset", "tv-no-internet", "tv-turns-off", "tv-remote-not-working", "smart-tv-box"\]/);
  assert.match(related, /"tv-app-install": \["tv-storage-cleanup", "tv-no-internet", "tv-firmware-update", "smart-tv-box", "tv-factory-reset", "phone-to-tv"\]/);
  assert.match(related, /"tv-factory-reset": \["tv-firmware-update", "tv-app-install", "tv-turns-off", "tv-no-internet", "tv-remote-not-working", "picture-setup"\]/);
  for (const [task] of tasks) {
    const config = configSource(wizard, task);
    assert.doesNotMatch(config, /market\.yandex\.ru|AffiliateOffer|clid=|data-affiliate|rel="sponsored"|\/go\/|₽/i);
  }
});
