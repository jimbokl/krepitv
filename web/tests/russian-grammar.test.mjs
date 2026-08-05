import assert from "node:assert/strict";
import test from "node:test";
import { pluralizeRu } from "../src/lib/russianGrammar.js";

test("русские формы числительных работают для единиц, десятков и исключений", () => {
  const form = (count) => pluralizeRu(count, "кронштейн", "кронштейна", "кронштейнов");

  assert.equal(form(0), "кронштейнов");
  assert.equal(form(1), "кронштейн");
  assert.equal(form(2), "кронштейна");
  assert.equal(form(5), "кронштейнов");
  assert.equal(form(11), "кронштейнов");
  assert.equal(form(14), "кронштейнов");
  assert.equal(form(17), "кронштейнов");
  assert.equal(form(21), "кронштейн");
  assert.equal(form(22), "кронштейна");
});
