import assert from "node:assert/strict";
import test from "node:test";
import {
  emitToolUsage,
  installToolUsageTracker,
  KNOWN_TOOL_IDS,
  TOOL_USAGE_EVENT,
  toolUsageDetail,
} from "../src/lib/toolUsage.mjs";

test("tool usage detail принимает только известный инструмент, действие и pathname", () => {
  assert.equal(KNOWN_TOOL_IDS.includes("height_calculator"), true);
  assert.deepEqual(toolUsageDetail({
    action: "started",
    toolId: "height_calculator",
    rawInput: "user@example.test",
  }, "/vysota-televizora/"), {
    action: "started",
    sourcePath: "/vysota-televizora/",
    toolId: "height_calculator",
  });
  assert.equal(toolUsageDetail({
    action: "started",
    toolId: "user@example.test",
  }, "/"), false);
  assert.equal(toolUsageDetail({
    action: "typed_email",
    toolId: "height_calculator",
  }, "/"), false);
});

test("emit передаёт один очищенный CustomEvent без пользовательских полей", () => {
  const events = [];
  const windowObject = {
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) { events.push(event); },
    location: { pathname: "/vysota-televizora/" },
  };
  assert.equal(emitToolUsage(windowObject, {
    action: "started",
    toolId: "height_calculator",
    value: "+79990000000",
  }), true);
  assert.equal(events[0].type, TOOL_USAGE_EVENT);
  assert.deepEqual(events[0].detail, {
    action: "started",
    sourcePath: "/vysota-televizora/",
    toolId: "height_calculator",
  });
});

test("делегированный tracker считает первое осознанное действие один раз на tool и path", () => {
  const listeners = new Map();
  const documentObject = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) {
      if (listeners.get(type) === listener) listeners.delete(type);
    },
  };
  const events = [];
  const windowObject = {
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) { events.push(event); },
    location: { pathname: "/vysota-televizora/" },
  };
  const boundary = { dataset: { analyticsTool: "height_calculator" } };
  const target = {
    closest(selector) {
      assert.equal(selector, "[data-analytics-tool]");
      return boundary;
    },
  };

  const tracker = installToolUsageTracker({ documentObject, windowObject });
  listeners.get("input")({ target });
  listeners.get("change")({ target });
  listeners.get("submit")({ target });
  assert.equal(events.length, 1);
  assert.equal(events[0].detail.toolId, "height_calculator");

  windowObject.location.pathname = "/drugaya-stranica/";
  listeners.get("change")({ target });
  assert.equal(events.length, 2);

  tracker.dispose();
  assert.equal(listeners.size, 0);
});

test("tracker игнорирует события вне размеченных или известных инструментов", () => {
  const listeners = new Map();
  const events = [];
  const documentObject = {
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type) { listeners.delete(type); },
  };
  const windowObject = {
    CustomEvent: class CustomEvent {},
    dispatchEvent(event) { events.push(event); },
    location: { pathname: "/" },
  };
  const tracker = installToolUsageTracker({ documentObject, windowObject });
  listeners.get("input")({ target: { closest: () => null } });
  listeners.get("input")({
    target: { closest: () => ({ dataset: { analyticsTool: "email_user_test" } }) },
  });
  assert.deepEqual(events, []);
  tracker.dispose();
});
