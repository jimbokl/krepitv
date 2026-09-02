import assert from "node:assert/strict";
import test from "node:test";
import { AFFILIATE_CLICK_EVENT } from "../src/lib/affiliateClick.mjs";
import { MOUNT_DETAIL_CLICK_EVENT } from "../src/lib/mountDetailClick.mjs";
import { RESULT_COMPLETED_EVENT } from "../src/lib/resultCompleted.mjs";
import { SELECTION_START_EVENT } from "../src/lib/selectionStart.mjs";
import { installConsentGatedMetrika } from "../src/lib/metrikaGate.mjs";
import {
  METRIKA_CONSENT_DENIED,
  METRIKA_CONSENT_EVENT,
  METRIKA_CONSENT_GRANTED,
} from "../src/lib/metrikaConsent.mjs";

function browserDouble() {
  const listeners = new Map();
  const scripts = [];
  const windowObject = {
    addEventListener(name, listener) {
      const group = listeners.get(name) ?? new Set();
      group.add(listener);
      listeners.set(name, group);
    },
    dispatchEvent(event) {
      for (const listener of listeners.get(event.type) ?? []) listener(event);
    },
    removeEventListener(name, listener) {
      listeners.get(name)?.delete(listener);
    },
  };
  const documentObject = {
    body: { appendChild(node) { scripts.push(node); } },
    createElement(tagName) { return { tagName }; },
    getElementById(id) {
      return scripts.find((script) => script.id === id) ?? null;
    },
    head: { appendChild(node) { scripts.push(node); } },
  };
  return { documentObject, listeners, scripts, windowObject };
}

test("сохранённый отказ не грузит Метрику, последующее включение не воспроизводит прошлые события", () => {
    const browser = browserDouble();
    const gate = installConsentGatedMetrika({
      counterId: 123456,
      documentObject: browser.documentObject,
      resolveConsent: () => METRIKA_CONSENT_DENIED,
      windowObject: browser.windowObject,
    });

    assert.equal(gate.enabled, false);
    assert.equal(browser.scripts.length, 0);
    assert.equal(browser.windowObject.ym, undefined);
    assert.deepEqual([...browser.listeners.keys()], [METRIKA_CONSENT_EVENT]);

    browser.windowObject.dispatchEvent({
      type: MOUNT_DETAIL_CLICK_EVENT,
      detail: { placement: "featured_result" },
    });
    browser.windowObject.dispatchEvent({
      type: METRIKA_CONSENT_EVENT,
      detail: { value: METRIKA_CONSENT_GRANTED },
    });

    assert.equal(gate.enabled, true);
    assert.equal(browser.scripts.length, 1);
    assert.equal(browser.windowObject.ym.a.length, 1);

    browser.windowObject.dispatchEvent({
      type: MOUNT_DETAIL_CLICK_EVENT,
      detail: { placement: "featured_result" },
    });
    assert.equal(browser.windowObject.ym.a.length, 2);
    assert.deepEqual(browser.windowObject.ym.a[1], [
      123456,
      "reachGoal",
      "mount_detail_click",
      { placement: "featured_result" },
    ]);

    gate.dispose();
    assert.equal([...browser.listeners.values()].every((group) => group.size === 0), true);
  });

test("без сохранённого решения Метрика включается автоматически", () => {
  const browser = browserDouble();
  const gate = installConsentGatedMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    resolveConsent: () => METRIKA_CONSENT_GRANTED,
    windowObject: browser.windowObject,
  });
  assert.equal(gate.enabled, true);
  assert.equal(browser.scripts.length, 1);
  gate.dispose();
});

test("сохранённое согласие включает Метрику сразу и только один раз", () => {
  const browser = browserDouble();
  const gate = installConsentGatedMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    resolveConsent: () => METRIKA_CONSENT_GRANTED,
    windowObject: browser.windowObject,
  });

  assert.equal(gate.enabled, true);
  assert.equal(browser.scripts.length, 1);
  browser.windowObject.dispatchEvent({
    type: METRIKA_CONSENT_EVENT,
    detail: { value: METRIKA_CONSENT_GRANTED },
  });
  assert.equal(browser.windowObject.ym.a.length, 1);
  gate.dispose();
});

test("отказ после автоматического включения прекращает отправку целей", () => {
  const browser = browserDouble();
  const gate = installConsentGatedMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    resolveConsent: () => METRIKA_CONSENT_GRANTED,
    windowObject: browser.windowObject,
  });
  browser.windowObject.dispatchEvent({
    type: METRIKA_CONSENT_EVENT,
    detail: { value: METRIKA_CONSENT_DENIED },
  });
  assert.equal(gate.enabled, false);
  assert.equal(browser.windowObject.disableYaCounter123456, true);
  const before = browser.windowObject.ym.a.length;
  browser.windowObject.dispatchEvent({
    type: RESULT_COMPLETED_EVENT,
    detail: { toolId: "height_calculator", resultType: "height_plan" },
  });
  assert.equal(browser.windowObject.ym.a.length, before);
  gate.dispose();
});

test("после согласия четыре ступени воронки передаются в точном порядке, прошлые события не воспроизводятся", () => {
  const browser = browserDouble();
  const gate = installConsentGatedMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    resolveConsent: () => METRIKA_CONSENT_DENIED,
    windowObject: browser.windowObject,
  });

  browser.windowObject.dispatchEvent({
    type: RESULT_COMPLETED_EVENT,
    detail: { toolId: "guided-selection", resultType: "compatible-mounts", resultCount: 3 },
  });
  browser.windowObject.dispatchEvent({
    type: SELECTION_START_EVENT,
    detail: { placement: "seo_next_step", sourcePath: "/kak-otklyuchit-golos-na-televizore/" },
  });
  browser.windowObject.dispatchEvent({
    type: MOUNT_DETAIL_CLICK_EVENT,
    detail: { placement: "featured_result" },
  });
  browser.windowObject.dispatchEvent({
    type: AFFILIATE_CLICK_EVENT,
    detail: { entityId: "onkron-nn24", offerId: "offer01", pagePath: "/kronshteyny/onkron-nn24/", vid: "safeVID01" },
  });
  assert.equal(browser.windowObject.ym, undefined);

  browser.windowObject.dispatchEvent({
    type: METRIKA_CONSENT_EVENT,
    detail: { value: METRIKA_CONSENT_GRANTED },
  });
  assert.equal(browser.windowObject.ym.a.length, 1);

  browser.windowObject.dispatchEvent({
    type: RESULT_COMPLETED_EVENT,
    detail: { toolId: "guided-selection", resultType: "compatible-mounts", resultCount: 3 },
  });
  browser.windowObject.dispatchEvent({
    type: SELECTION_START_EVENT,
    detail: { placement: "seo_next_step", sourcePath: "/kak-otklyuchit-golos-na-televizore/" },
  });
  browser.windowObject.dispatchEvent({
    type: MOUNT_DETAIL_CLICK_EVENT,
    detail: { placement: "featured_result" },
  });
  browser.windowObject.dispatchEvent({
    type: AFFILIATE_CLICK_EVENT,
    detail: { entityId: "onkron-nn24", offerId: "offer01", pagePath: "/kronshteyny/onkron-nn24/", vid: "safeVID01" },
  });

  assert.deepEqual(browser.windowObject.ym.a.slice(1).map((call) => call.slice(0, 3)), [
    [123456, "reachGoal", "result_completed"],
    [123456, "reachGoal", "selection_start"],
    [123456, "reachGoal", "mount_detail_click"],
    [123456, "reachGoal", "market_click"],
  ]);
  assert.equal(browser.windowObject.ym.a[1][3].result_count, 3);
  assert.deepEqual(browser.windowObject.ym.a[2][3], {
    placement: "seo_next_step",
    source_path: "/kak-otklyuchit-golos-na-televizore/",
  });
  assert.deepEqual(browser.windowObject.ym.a[3][3], { placement: "featured_result" });
  assert.equal(browser.windowObject.ym.a[4][3].entity_id, "onkron-nn24");

  gate.dispose();
});
