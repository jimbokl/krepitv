import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

const root = path.resolve(import.meta.dirname, "../..");

test("главная сохраняет один доказанный модельный spotlight до и после гидратации", async () => {
  const [source, models] = await Promise.all([
    readFile(path.join(root, "web/src/pages/HomePage.jsx"), "utf8"),
    readFile(path.join(root, "data/tv_models.json"), "utf8").then(JSON.parse),
  ]);

  assert.equal(models.filter((model) => model.id === "tcl-65c7k").length, 1);
  assert.match(source, /const HOME_MODEL_SPOTLIGHT_ID = "tcl-65c7k"/);
  assert.match(source, /data-home-model-spotlight=\{spotlightModel\.id\}/);
  assert.match(source, /href=\{modelHref\(spotlightModel\)\}/);
  assert.match(source, /<ModelFacts deferColumns model=\{spotlightModel\} \/>/);
  assert.match(source, /!selectedModel && spotlightModel/);
});
