import assert from "node:assert/strict";
import test from "node:test";
import {
  MOUNT_DETAIL_CLICK_EVENT,
  emitMountDetailClick,
  mountDetailClickDetail,
  mountDetailClickHandlers,
} from "../src/lib/mountDetailClick.mjs";

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
    },
  };
}

test("detail принимает только два контролируемых места ссылки", () => {
  assert.deepEqual(mountDetailClickDetail({
    placement: "featured_result",
    modelId: "tcl-55c7k",
    mountId: "onkron-tm6",
    href: "/kronshteyny/onkron-tm6/",
    sourcePath: "/modeli/tcl-55c7k/",
    rawInput: "+79990000000",
  }), { placement: "featured_result" });
  assert.deepEqual(
    mountDetailClickDetail({ placement: "compatibility_result" }),
    { placement: "compatibility_result" },
  );
  assert.equal(mountDetailClickDetail({ placement: "result_1" }), false);
  assert.equal(mountDetailClickDetail({}), false);
});

test("emit отправляет только очищенный CustomEvent и безопасно обрабатывает ошибки", () => {
  const browser = browserDouble();
  assert.equal(emitMountDetailClick(browser.windowObject, {
    placement: "featured_result",
    modelId: "private-model-id",
  }), true);
  assert.equal(browser.events.length, 1);
  assert.equal(browser.events[0].type, MOUNT_DETAIL_CLICK_EVENT);
  assert.deepEqual(browser.events[0].detail, { placement: "featured_result" });

  assert.equal(emitMountDetailClick(browser.windowObject, { placement: "bad" }), false);
  assert.equal(browser.events.length, 1);
  assert.equal(emitMountDetailClick(undefined, {}), false);
  assert.equal(emitMountDetailClick({ dispatchEvent() {} }, {}), false);
  assert.equal(emitMountDetailClick(browserDouble({ throws: true }).windowObject, {
    placement: "featured_result",
  }), false);
});

test("внутренняя ссылка считает ровно одно обычное и одно среднее нажатие", () => {
  const browser = browserDouble();
  const handlers = mountDetailClickHandlers(
    browser.windowObject,
    "compatibility_result",
  );
  let prevented = 0;

  handlers.onClick({ preventDefault() { prevented += 1; } });
  handlers.onAuxClick({ button: 1, preventDefault() { prevented += 1; } });
  handlers.onAuxClick({ button: 0 });
  handlers.onAuxClick({ button: 2 });

  assert.equal(prevented, 0);
  assert.equal(browser.events.length, 2);
  assert.deepEqual(browser.events.map((item) => item.detail), [
    { placement: "compatibility_result" },
    { placement: "compatibility_result" },
  ]);
});
