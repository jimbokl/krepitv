import assert from "node:assert/strict";
import test from "node:test";
import {
  dismissMetrikaNotice,
  emitMetrikaConsent,
  ensureMetrikaConsent,
  METRIKA_CONSENT_DENIED,
  METRIKA_CONSENT_EVENT,
  METRIKA_CONSENT_GRANTED,
  METRIKA_CONSENT_STORAGE_KEY,
  METRIKA_NOTICE_STORAGE_KEY,
  readMetrikaNoticeDismissed,
  readMetrikaConsent,
  writeMetrikaConsent,
} from "../src/lib/metrikaConsent.mjs";

function memoryStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) {
      return values.get(key) ?? null;
    },
    setItem(key, value) {
      values.set(key, value);
    },
  };
}

test("решение об аналитике сохраняется только из разрешённого набора", () => {
  const storage = memoryStorage();
  assert.equal(readMetrikaConsent(storage), null);
  assert.equal(writeMetrikaConsent(METRIKA_CONSENT_GRANTED, storage), true);
  assert.equal(readMetrikaConsent(storage), METRIKA_CONSENT_GRANTED);
  assert.equal(writeMetrikaConsent("unknown", storage), false);
  assert.equal(readMetrikaConsent(storage), METRIKA_CONSENT_GRANTED);

  const denied = memoryStorage({
    [METRIKA_CONSENT_STORAGE_KEY]: METRIKA_CONSENT_DENIED,
  });
  assert.equal(readMetrikaConsent(denied), METRIKA_CONSENT_DENIED);
});

test("первый визит автоматически включает аналитику, но сохранённый отказ имеет приоритет", () => {
  const fresh = memoryStorage();
  assert.equal(ensureMetrikaConsent(fresh), METRIKA_CONSENT_GRANTED);
  assert.equal(readMetrikaConsent(fresh), METRIKA_CONSENT_GRANTED);

  const denied = memoryStorage({
    [METRIKA_CONSENT_STORAGE_KEY]: METRIKA_CONSENT_DENIED,
  });
  assert.equal(ensureMetrikaConsent(denied), METRIKA_CONSENT_DENIED);
  assert.equal(readMetrikaConsent(denied), METRIKA_CONSENT_DENIED);
});

test("закрытие сноски хранится отдельно от решения об аналитике", () => {
  const storage = memoryStorage();
  assert.equal(readMetrikaNoticeDismissed(storage), false);
  assert.equal(dismissMetrikaNotice(storage), true);
  assert.equal(readMetrikaNoticeDismissed(storage), true);
  assert.equal(storage.getItem(METRIKA_NOTICE_STORAGE_KEY), "dismissed");
  assert.equal(readMetrikaConsent(storage), null);
});

test("согласие передаётся одним локальным событием без пользовательских данных", () => {
  const events = [];
  class FakeCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const windowObject = {
    CustomEvent: FakeCustomEvent,
    dispatchEvent(event) {
      events.push(event);
      return true;
    },
  };

  assert.equal(
    emitMetrikaConsent(windowObject, METRIKA_CONSENT_GRANTED),
    true,
  );
  assert.equal(events.length, 1);
  assert.equal(events[0].type, METRIKA_CONSENT_EVENT);
  assert.deepEqual(events[0].detail, { value: METRIKA_CONSENT_GRANTED });
  assert.equal(emitMetrikaConsent(windowObject, "unknown"), false);
});
