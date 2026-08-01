import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../../", import.meta.url);

async function read(relativePath) {
  return readFile(new URL(relativePath, root), "utf8");
}

test("phone-to-TV has one indexable canonical and no combinatorial pages", async () => {
  const pages = JSON.parse(await read("data/seo_pages.json"));
  const matches = pages.filter((page) => page.id === "phone-to-tv");

  assert.equal(matches.length, 1);
  assert.equal(matches[0].path, "/kak-podklyuchit-telefon-k-televizoru/");
  assert.equal(matches[0].indexable, true);
  assert.equal(matches[0].home_priority, 1);
  assert.equal(
    pages.filter((page) => /phone-to-tv|telefon-k-televizoru/.test(`${page.id} ${page.path}`)).length,
    1,
  );
});

test("React wizard is local, fail-closed and emits only a controlled result", async () => {
  const source = await read("web/src/components/PhoneTvConnectionWizard.jsx");

  assert.match(source, /calculatePhoneTvConnection/);
  assert.match(source, /data-phone-tv-wizard="true"/);
  assert.match(source, /data-phone-tv-reference="true"/);
  assert.match(source, /data-phone-tv-source=/);
  assert.match(source, /USB-C ещё не видеовыход/);
  assert.doesNotMatch(source, /URLSearchParams|location\.search|market\.yandex\.ru|AffiliateOffer|clid|vid:/i);

  const events = source.match(/emitResultCompleted\(window, \{[\s\S]*?\n\s*\}\);/g) ?? [];
  assert.equal(events.length, 1);
  assert.match(events[0], /toolId: "phone_tv_connection"/);
  assert.match(events[0], /ready_plan|needs_check|blocked_plan/);
  assert.doesNotMatch(events[0], /phone,|tv,|goal,|connector|sameNetwork|androidVideoOutput/i);
});

test("локальный WASM-загрузчик повторяет попытку без сброса выбранных значений", async () => {
  const saved = new Map([
    ["document", globalThis.document],
    ["addEventListener", globalThis.addEventListener],
    ["removeEventListener", globalThis.removeEventListener],
    ["dispatchEvent", globalThis.dispatchEvent],
    ["__krepitvEngine", globalThis.__krepitvEngine],
    ["__krepitvEngineError", globalThis.__krepitvEngineError],
  ]);
  const events = new EventTarget();
  let activeScript = null;
  const appended = [];

  class FakeScript extends EventTarget {
    constructor() {
      super();
      this.dataset = {};
      this.src = "";
      this.type = "";
    }

    remove() {
      if (activeScript === this) activeScript = null;
    }
  }

  try {
    delete globalThis.__krepitvEngine;
    delete globalThis.__krepitvEngineError;
    globalThis.addEventListener = events.addEventListener.bind(events);
    globalThis.removeEventListener = events.removeEventListener.bind(events);
    globalThis.dispatchEvent = events.dispatchEvent.bind(events);
    globalThis.document = {
      createElement: () => new FakeScript(),
      querySelector: () => activeScript,
      head: {
        append(script) {
          activeScript = script;
          appended.push(script.src);
          queueMicrotask(() => {
            if (appended.length === 1) {
              globalThis.__krepitvEngineError = true;
              events.dispatchEvent(new Event("krepitv-engine-error"));
            } else {
              globalThis.__krepitvEngine = { marker: "recovered" };
              events.dispatchEvent(new Event("krepitv-engine-ready"));
            }
          });
        },
      },
    };

    const { loadEngine } = await import(`../src/lib/catalog.js?engine-retry=${Date.now()}`);
    await assert.rejects(loadEngine(), /ещё раз/);
    assert.equal(activeScript, null);

    const recovered = await loadEngine();
    assert.equal(recovered.marker, "recovered");
    assert.deepEqual(appended, [
      "/krepitv-engine-loader.js",
      "/krepitv-engine-loader.js?retry=2",
    ]);
  } finally {
    for (const [key, value] of saved) {
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
    }
  }
});

test("phone-to-TV bypasses generic catalog and affiliate placements", async () => {
  const source = await read("web/src/pages/SeoPage.jsx");
  assert.match(source, /const prioritizesPhoneTvConnection = page\.id === "phone-to-tv"/);
  assert.match(source, /const prioritizesTrafficUtility = prioritizesPhoneTvConnection \|\| prioritizesTvNoSignal/);
  assert.match(source, /\|\| prioritizesTrafficUtility/);
  assert.match(source, /<PhoneTvConnectionWizard \/>/);
  assert.match(source, /<PhoneTvConnectionReference \/>/);
});

test("SSR answer survives without JavaScript and contains official sources", async () => {
  const html = await read("web/kak-podklyuchit-telefon-k-televizoru/index.html");

  assert.equal(
    html.match(/<link rel="canonical" href="https:\/\/krepitv\.ru\/kak-podklyuchit-telefon-k-televizoru\/">/g)?.length,
    1,
  );
  assert.equal(html.match(/<h1\b/g)?.length, 1);
  assert.equal(html.match(/data-phone-tv-answer="true"/g)?.length, 1);
  assert.match(html, /data-phone-tv-method="airplay"/);
  assert.match(html, /data-phone-tv-method="google-cast"/);
  assert.match(html, /data-phone-tv-method="miracast"/);
  assert.match(html, /data-phone-tv-method="hdmi-adapter"/);
  assert.match(html, /data-phone-tv-method="usb"/);
  assert.match(html, /support\.apple\.com\/ru-ru\/102661/);
  assert.match(html, /support\.google\.com\/googlecast/);
  assert.match(html, /samsung\.com\/ru\/support/);
  assert.match(html, /displayport\.org\/faq/);
  assert.doesNotMatch(html, /market\.yandex\.ru|data-affiliate|clid=|Цена|₽/i);
});
