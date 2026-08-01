import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("мастер сигнала использует локальный Rust/WASM-контракт", async () => {
  const catalog = await read("web/src/lib/catalog.js");

  assert.match(catalog, /export async function calculateTvNoSignal\(values\)/);
  assert.match(catalog, /engine\.calculate_tv_no_signal_json\(/);
  for (const field of [
    "source",
    "tvMenuVisible",
    "sourcePowered",
    "inputMatches",
    "cableConnected",
    "receiverMenuVisible",
  ]) {
    assert.match(catalog, new RegExp(`values\\.${field}`), field);
  }
});

test("JS-обёртка передаёт ответы в WASM в фиксированном порядке", async () => {
  const previousEngine = globalThis.__krepitvEngine;
  const calls = [];
  try {
    globalThis.__krepitvEngine = {
      calculate_tv_no_signal_json(...values) {
        calls.push(values);
        return JSON.stringify({
          status: "action-plan",
          source: "hdmi",
          primary_step_id: "check-input",
          headline: "Проверьте выбранный вход",
          explanation: "Меняйте по одному условию.",
          steps: [],
          stop_conditions: [],
          privacy: "local-only",
        });
      },
    };
    const { calculateTvNoSignal } = await import(`../src/lib/catalog.js?tv-no-signal=${Date.now()}`);
    const result = await calculateTvNoSignal({
      source: "hdmi",
      tvMenuVisible: "yes",
      sourcePowered: "yes",
      inputMatches: "no",
      cableConnected: "unknown",
      receiverMenuVisible: "unknown",
    });

    assert.equal(result.status, "action-plan");
    assert.deepEqual(calls, [["hdmi", "yes", "yes", "no", "unknown", "unknown"]]);
  } finally {
    if (previousEngine === undefined) delete globalThis.__krepitvEngine;
    else globalThis.__krepitvEngine = previousEngine;
  }
});

test("UI поддерживает четыре безопасных результата и доступный повтор", async () => {
  const source = await read("web/src/components/TvNoSignalWizard.jsx");

  assert.match(source, /export function TvNoSignalWizard/);
  assert.match(source, /export function TvNoSignalReference/);
  assert.match(source, /data-tv-no-signal-wizard="true"/);
  assert.match(source, /data-tv-no-signal-result=/);
  assert.match(source, /viewState: "success"/);
  assert.match(source, /"unknown-source"/);
  assert.match(source, /"needs-service"/);
  assert.match(source, /"provider-path"/);
  assert.match(source, /<fieldset>/);
  assert.match(source, /<legend/);
  assert.match(source, /type="radio"/);
  assert.match(source, /min-h-12/);
  assert.match(source, /resultHeadingRef/);
  assert.match(source, /tabIndex="-1"/);
  assert.match(source, /role="alert"/);
  assert.match(source, /Выбранные ответы сохранены/);
  assert.match(source, />\s*Повторить\s*</);
});

test("ветки показывают только привязанные официальные источники", async () => {
  const source = await read("web/src/components/TvNoSignalWizard.jsx");

  assert.match(source, /data-tv-no-signal-source=/);
  assert.match(source, /sourceIds=\{\["samsung-hdmi", "sony-hdmi"\]\}/);
  assert.match(source, /sourceIds=\{\["rtrs-dtv", "samsung-channel-setup"\]\}/);
  assert.match(source, /summary="Спутниковую антенну не регулируют на крыше самостоятельно"/);
  assert.match(source, /Приставка кабельного оператора/);
  assert.match(source, /Внешняя приставка подключена к телевизору по HDMI/);
  assert.match(source, /samsung\.com\/ru\/support/);
  assert.match(source, /sony\.ru\/electronics\/support/);
  assert.match(source, /plus\.rtrs\.ru\/info/);
  assert.doesNotMatch(source, /tricolor-no-signal|tricolor\.ru\/help/);
  assert.match(source, /Не разбирайте телевизор и не поднимайтесь к антенне на крышу/);
  assert.doesNotMatch(source, /lg\.com|экран телевизора работает/i);
});

test("аналитика результата контролируема и не содержит ответов пользователя", async () => {
  const source = await read("web/src/components/TvNoSignalWizard.jsx");
  const events = source.match(/emitResultCompleted\(window, \{[\s\S]*?\n\s*\}\);/g) ?? [];

  assert.equal(events.length, 1);
  assert.match(events[0], /toolId: "tv_no_signal"/);
  assert.match(events[0], /resultType: resultTypes\[plan\.status\]/);
  assert.doesNotMatch(
    events[0],
    /source,|tvMenuVisible|sourcePowered|inputMatches|cableConnected|receiverMenuVisible/i,
  );
  assert.doesNotMatch(
    source,
    /URLSearchParams|location\.search|market\.yandex\.ru|AffiliateOffer|clid|email|телефон пользователя|₽/i,
  );
});

test("длинный справочный материал закрыт в native details", async () => {
  const source = await read("web/src/components/TvNoSignalWizard.jsx");
  const reference = source.slice(source.indexOf("export function TvNoSignalReference"));

  assert.match(reference, /<details/);
  assert.match(reference, /<summary/);
  assert.match(reference, /data-tv-no-signal-reference="true"/);
  assert.doesNotMatch(reference, /<ol/);
});
