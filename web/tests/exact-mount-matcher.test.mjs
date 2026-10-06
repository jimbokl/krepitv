import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createLatestMatchRequest, modelsForMountScope, mountsForScope } from "../src/lib/exactMountMatcher.mjs";

const model = { id: "tv-a", brand: "TCL", weight_kg: 12, diagonal_inches: 55, vesa_width_mm: 300, vesa_height_mm: 200 };
test("подбор сохраняет основание массы и не выдаёт любое значение за массу без подставки", () => {
  const conservative = { ...model, weight_basis: "with_stand" };
  assert.equal(modelsForMountScope([conservative], null)[0].weight_basis, "with_stand");
  const source = readFileSync(new URL("../src/components/ExactMountMatcher.jsx", import.meta.url), "utf8");
  assert.ok(source.includes("modelWeightSuffix(resultModel)"));
  assert.ok(!source.includes("кг без подставки"));
});
test("точные оси VESA, проверенные параметры и механизм не смешиваются", () => {
  const values = [model, { ...model, id: "tv-b", vesa_width_mm: 200, vesa_height_mm: 300 }, { ...model, id: "tv-c", weight_kg: null }];
  assert.deepEqual(modelsForMountScope(values, [300, 200]).map((item) => item.id), ["tv-a"]);
  assert.equal(modelsForMountScope(values, [200, 200]).length, 0);
  assert.equal(modelsForMountScope(values, null).length, 2);
  assert.deepEqual(mountsForScope([{ id: "a", mechanism: "fixed" }, { id: "b", mechanism: "full-motion" }], "full-motion").map((item) => item.id), ["b"]);
});
test("изменение черновика и новый расчёт не дают опубликовать поздний старый результат", async () => {
  const request = createLatestMatchRequest();
  const results = [];
  let complete;
  const first = request.run(() => new Promise((resolve) => { complete = resolve; }), (result) => results.push(result));
  request.invalidate();
  await request.run(() => Promise.resolve(["new"]), (result) => results.push(result));
  complete(["old"]);
  await first;
  assert.deepEqual(results, [{ status: "ready", matches: ["new"], error: null }]);
});
test("ошибка fail-closed без исключений, пользовательского ввода и ложных совпадений", async () => {
  const request = createLatestMatchRequest();
  const values = [];
  await request.run(() => Promise.reject(new Error("private internal detail")), (result) => values.push(result));
  assert.equal(values[0].status, "error");
  assert.deepEqual(values[0].matches, []);
  assert.ok(!values[0].error.includes("private"));
});
