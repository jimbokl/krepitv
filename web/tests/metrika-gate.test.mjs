import assert from "node:assert/strict";
import test from "node:test";
import { MOUNT_DETAIL_CLICK_EVENT } from "../src/lib/mountDetailClick.mjs";
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

for (const decision of [null, METRIKA_CONSENT_DENIED]) {
  test(`${decision ?? "без решения"}: Метрика не грузится и клик не воспроизводится после согласия`, () => {
    const browser = browserDouble();
    const gate = installConsentGatedMetrika({
      counterId: 123456,
      documentObject: browser.documentObject,
      readConsent: () => decision,
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
}

test("сохранённое согласие включает Метрику сразу и только один раз", () => {
  const browser = browserDouble();
  const gate = installConsentGatedMetrika({
    counterId: 123456,
    documentObject: browser.documentObject,
    readConsent: () => METRIKA_CONSENT_GRANTED,
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
