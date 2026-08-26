import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import test from "node:test";
import {
  evaluateLayoutRun,
  stopChildAndRemoveProfile,
  summarizeRouteRuns,
} from "../../scripts/qa/measure-layout-stability.mjs";

const stableRun = {
  cls: 0.04,
  fcpMs: 1400,
  lcpMs: 2300,
  tbtMs: 0,
  rootEmptyEvents: 0,
  fullRootReplacements: 0,
};

test("performance gate принимает стабильное progressive enhancement", () => {
  assert.deepEqual(evaluateLayoutRun(stableRun), {
    passed: true,
    failures: [],
  });
});

test("performance gate отклоняет даже короткое исчезновение SSR-корня", () => {
  const result = evaluateLayoutRun({
    ...stableRun,
    rootEmptyEvents: 1,
    fullRootReplacements: 1,
  });

  assert.equal(result.passed, false);
  assert.deepEqual(result.failures, [
    "корневой SSR временно исчез",
    "корневой SSR был полностью заменён после первой отрисовки",
  ]);
});

test("итог маршрута использует медиану трёх запусков, но не скрывает замену root", () => {
  const summary = summarizeRouteRuns("/", [
    stableRun,
    { ...stableRun, cls: 0.08, lcpMs: 2500 },
    { ...stableRun, cls: 0.02, lcpMs: 2100, fullRootReplacements: 1 },
  ]);

  assert.equal(summary.route, "/");
  assert.equal(summary.median.cls, 0.04);
  assert.equal(summary.median.lcpMs, 2300);
  assert.equal(summary.passed, false);
  assert.equal(summary.failedRuns, 1);
});

test("временный профиль удаляется только после фактического выхода Chrome", async () => {
  const child = new EventEmitter();
  child.exitCode = null;
  child.signalCode = null;
  child.kill = () => {
    setTimeout(() => {
      child.signalCode = "SIGTERM";
      child.emit("exit", null, "SIGTERM");
    }, 5);
    return true;
  };
  let removedAfterExit = false;

  await stopChildAndRemoveProfile({
    child,
    profile: "/tmp/fake-chrome-profile",
    remove: async () => {
      removedAfterExit = child.signalCode === "SIGTERM";
    },
  });

  assert.equal(removedAfterExit, true);
});
