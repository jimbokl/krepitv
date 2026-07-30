import assert from "node:assert/strict";
import test from "node:test";
import { formatFieldLabel } from "../src/lib/fieldLabel.mjs";

test("единица измерения не остаётся отдельной строкой", () => {
  const value = formatFieldLabel("Смещение блока по горизонтали", "см");

  assert.equal(value, "Смещение блока по горизонтали,\u00a0см");
  assert.equal(value.includes(", см"), false);
});
