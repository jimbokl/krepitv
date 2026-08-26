import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("capture helper opens step 5 before waiting for compatibility states", async () => {
  const source = await readFile(new URL("../../scripts/qa/capture-page.mjs", import.meta.url), "utf8");

  assert.match(source, /input\[value="concrete"\]/);
  assert.doesNotMatch(source, /button\.textContent\.includes\("Выбрать механизм"\)/);
  assert.match(
    source,
    /fixed\.click\(\);[\s\S]{0,900}button\.textContent\.includes\("Продолжить"\)[\s\S]{0,900}compatibilityStep\.click\(\);[\s\S]{0,500}data-guided-selection-step"\) === "5"/,
  );
});

test("guided selection radio controls expose stable form values", async () => {
  const [page, wallStep] = await Promise.all([
    readFile(new URL("../src/pages/GuidedSelectionPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/installation-kit/WallProfileStep.jsx", import.meta.url), "utf8"),
  ]);

  assert.match(page, /value=\{id\}[^>]*type="radio"|type="radio"[^>]*value=\{id\}/);
  assert.match(wallStep, /value=\{id\}[^>]*type="radio"|type="radio"[^>]*value=\{id\}/);
});

test("mount choice exposes stable loading, error, and success states", async () => {
  const source = await readFile(
    new URL("../src/components/installation-kit/MountChoiceStep.jsx", import.meta.url),
    "utf8",
  );

  for (const state of ["loading", "error", "success"]) {
    assert.match(source, new RegExp(`data-guided-compatibility-state="${state}"`));
  }
});

test("capture helper supports deterministic cable verdicts and print media", async () => {
  const source = await readFile(new URL("../../scripts/qa/capture-page.mjs", import.meta.url), "utf8");

  for (const state of ["cable-verified", "cable-needs-check", "cable-blocked"]) {
    assert.match(source, new RegExp(`"${state}"`, "u"));
  }
  assert.match(source, /argument\("--media", "screen"\)/u);
  assert.match(source, /Emulation\.setEmulatedMedia/u);
  assert.match(source, /data-kit-clearance-details/u);
  assert.match(source, /data-cable-clearance-verdict/u);
  assert.match(source, /connector-clearance-help/u);
  assert.doesNotMatch(source, /globalThis\.fetch\s*=|window\.fetch\s*=/u);
});

test("capture helper accepts a model deep-link that starts directly on step 2", async () => {
  const source = await readFile(new URL("../../scripts/qa/capture-page.mjs", import.meta.url), "utf8");

  assert.match(source, /const deepLinked = !brandSelect && initialStep === "2"/u);
  assert.match(source, /if \(state !== "default" && !deepLinked\)/u);
  assert.match(source, /if \(!guidedSelectionReport\.deepLinked && guidedSelectionReport\.brandOptionCount < 1\)/u);
});
