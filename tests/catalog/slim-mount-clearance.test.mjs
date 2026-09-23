import assert from "node:assert/strict";
import test from "node:test";
import { compareSlimMountClearance } from "../../web/src/lib/slimMountClearance.mjs";

const mounts = [
  { id: "thirty", wall_distance_min_mm: 30 },
  { id: "twenty-two", wall_distance_min_mm: 22 },
];

test("консервативно отсеивает номинально слишком тесный кронштейн", () => {
  const result = compareSlimMountClearance(mounts, 20, 5);
  assert.equal(result.requiredMm, 25);
  assert.deepEqual(result.rows.map((row) => [row.mount.id, row.status]), [
    ["twenty-two", "too-tight"],
    ["thirty", "check-on-site"],
  ]);
});

test("не принимает отрицательные и неизвестные измерения", () => {
  assert.ok(compareSlimMountClearance(mounts, "", 10).error);
  assert.ok(compareSlimMountClearance(mounts, -1, 10).error);
  assert.ok(compareSlimMountClearance(mounts, 20, 101).error);
});
