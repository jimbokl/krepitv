import assert from "node:assert/strict";
import test from "node:test";
import {
  modelWeightBasis,
  modelWeightLabel,
  modelWeightReserveText,
  modelWeightSuffix,
} from "../src/lib/modelWeight.js";

test("масса без подставки остаётся обычным паспортным фактом", () => {
  const model = { weight_kg: 9 };
  assert.equal(modelWeightBasis(model), "without_stand");
  assert.equal(modelWeightLabel(model), "Паспортная масса");
  assert.equal(modelWeightSuffix(model), "без подставки");
  assert.match(modelWeightReserveText(model), /без подставки/u);
});

test("более высокая масса с подставкой честно маркируется как консервативная", () => {
  const model = { weight_kg: 30.6, weight_basis: "with_stand" };
  assert.equal(modelWeightLabel(model), "Консервативная масса");
  assert.equal(modelWeightSuffix(model), "с подставкой, консервативно");
  assert.match(modelWeightReserveText(model), /выше массы корпуса/u);
});

test("неизвестное основание массы не превращается в массу без подставки", () => {
  const model = { weight_kg: 9.2, weight_basis: "unexpected" };
  assert.equal(modelWeightBasis(model), "published_unspecified");
  assert.equal(modelWeightSuffix(model), "тип не указан, консервативно");
});
