import assert from "node:assert/strict";
import test from "node:test";
import {
  SELECTION_START_EVENT,
  emitSelectionStart,
  selectionStartDetail,
  selectionStartHandlers,
} from "../src/lib/selectionStart.mjs";

function browserDouble({ throws = false } = {}) {
  const events = [];
  return {
    events,
    windowObject: {
      CustomEvent: class CustomEvent {
        constructor(type, options) {
          this.type = type;
          this.detail = options.detail;
        }
      },
      dispatchEvent(event) {
        if (throws) throw new Error("dispatch failed");
        events.push(event);
      },
      location: { pathname: "/kak-otklyuchit-subtitry-na-televizore/" },
    },
  };
}

test("начало подбора принимает только контролируемое место и pathname", () => {
  assert.deepEqual(selectionStartDetail({
    placement: "seo_next_step",
    sourcePath: "/kak-otklyuchit-subtitry-na-televizore/",
    modelId: "private-model",
    query: "user@example.test",
  }), {
    placement: "seo_next_step",
    sourcePath: "/kak-otklyuchit-subtitry-na-televizore/",
  });
  assert.equal(selectionStartDetail({ placement: "footer" }), false);
  assert.deepEqual(selectionStartDetail({
    placement: "seo_next_step",
    sourcePath: "https://example.test/user@example.test",
  }), { placement: "seo_next_step" });
});

test("emit отправляет один очищенный CustomEvent без пользовательских полей", () => {
  const browser = browserDouble();
  assert.equal(emitSelectionStart(browser.windowObject, {
    placement: "seo_next_step",
    rawInput: "+79990000000",
  }), true);
  assert.equal(browser.events.length, 1);
  assert.equal(browser.events[0].type, SELECTION_START_EVENT);
  assert.deepEqual(browser.events[0].detail, {
    placement: "seo_next_step",
    sourcePath: "/kak-otklyuchit-subtitry-na-televizore/",
  });
  assert.equal(emitSelectionStart(browser.windowObject, { placement: "bad" }), false);
  assert.equal(emitSelectionStart(undefined, {}), false);
  assert.equal(emitSelectionStart(browserDouble({ throws: true }).windowObject, {
    placement: "seo_next_step",
  }), false);
});

test("ссылка подбора считает обычный и средний клик без отмены навигации", () => {
  const browser = browserDouble();
  const handlers = selectionStartHandlers(browser.windowObject, "seo_next_step");
  let prevented = 0;
  handlers.onClick({ preventDefault() { prevented += 1; } });
  handlers.onAuxClick({ button: 1, preventDefault() { prevented += 1; } });
  handlers.onAuxClick({ button: 0 });
  handlers.onAuxClick({ button: 2 });
  assert.equal(prevented, 0);
  assert.equal(browser.events.length, 2);
});
