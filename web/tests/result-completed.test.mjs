import assert from "node:assert/strict";
import test from "node:test";
import {
  RESULT_COMPLETED_EVENT,
  emitResultCompleted,
  resultCompletedDetail,
} from "../src/lib/resultCompleted.mjs";

test("detail содержит только controlled tokens, pathname и bounded count", () => {
  assert.deepEqual(resultCompletedDetail({
    toolId: "height-calculator",
    resultType: "mounting-height",
    resultCount: 1,
    rawInput: "user@example.test",
  }, "/vysota-televizora/"), {
    toolId: "height-calculator",
    resultType: "mounting-height",
    resultCount: 1,
    sourcePath: "/vysota-televizora/",
  });
});

test("необязательные небезопасные значения удаляются", () => {
  assert.deepEqual(resultCompletedDetail({
    toolId: "height-calculator",
    resultType: "mounting-height",
    resultCount: 1001,
  }, "https://example.test/?email=user@example.test"), {
    toolId: "height-calculator",
    resultType: "mounting-height",
  });
});

test("невалидные обязательные tokens запрещают detail и событие", () => {
  assert.equal(resultCompletedDetail({
    toolId: "user@example.test",
    resultType: "mounting height",
  }, "/"), false);

  const events = [];
  const windowObject = {
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) { events.push(event); },
  };
  assert.equal(emitResultCompleted(windowObject, {
    toolId: "user@example.test",
    resultType: "mounting-height",
  }), false);
  assert.deepEqual(events, []);
});

test("похожее на пользовательский телефон значение не считается controlled token", () => {
  assert.equal(resultCompletedDetail({
    toolId: "79990000000",
    resultType: "mounting-height",
  }, "/"), false);
});

test("emit отправляет очищенный CustomEvent", () => {
  const events = [];
  const windowObject = {
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) { events.push(event); },
  };

  assert.equal(emitResultCompleted(windowObject, {
    toolId: "turn-clearance",
    resultType: "clearance-plan",
    resultCount: 0,
    sourcePath: "/proverka-povorota/",
    rawInput: "+79990000000",
  }), true);
  assert.equal(events[0].type, RESULT_COMPLETED_EVENT);
  assert.deepEqual(events[0].detail, {
    toolId: "turn-clearance",
    resultType: "clearance-plan",
    resultCount: 0,
    sourcePath: "/proverka-povorota/",
  });
});

test("emit безопасно завершается без browser API", () => {
  assert.equal(emitResultCompleted(undefined, {}), false);
  assert.equal(emitResultCompleted({ dispatchEvent() {} }, {}), false);
  assert.equal(emitResultCompleted({ CustomEvent() {} }, {}), false);
});

test("emit берёт только безопасный pathname из browser location", () => {
  const events = [];
  const windowObject = {
    CustomEvent: class CustomEvent {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    dispatchEvent(event) { events.push(event); },
    location: { pathname: "/kalkulyatory/vysota/" },
  };

  assert.equal(emitResultCompleted(windowObject, {
    toolId: "height_calculator",
    resultType: "height_plan",
  }), true);
  assert.equal(events[0].detail.sourcePath, "/kalkulyatory/vysota/");
});
