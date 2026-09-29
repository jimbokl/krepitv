import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import test from "node:test";

const script = fileURLToPath(new URL("../../scripts/qa/capture-page.mjs", import.meta.url));

function runGuard(url, consent) {
  return spawnSync(process.execPath, [
    script,
    "--url", url,
    "--guided-selection-state", "default",
    "--consent", consent,
    "--metrika-queue-qa",
  ], { encoding: "utf8" });
}

test("проверка очереди Метрики не запускается на production", () => {
  const result = runGuard("https://krepitv.ru/podbor/", "granted");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires a local tool scenario with granted consent/u);
});

test("проверка очереди Метрики требует отдельного тестового согласия", () => {
  const result = runGuard("http://127.0.0.1:4188/podbor/", "denied");
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /requires a local tool scenario with granted consent/u);
});
