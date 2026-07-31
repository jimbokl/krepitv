import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const calculatorTools = new Map([
  ["HeightCalculator.jsx", "height_calculator"],
  ["ViewingDistanceCalculator.jsx", "viewing_distance_calculator"],
  ["MountingMapCalculator.jsx", "mounting_map_calculator"],
  ["TiltAngleCalculator.jsx", "tilt_angle_calculator"],
  ["TurnClearanceCalculator.jsx", "turn_clearance_calculator"],
  ["TvZoneSocketCalculator.jsx", "tv_zone_socket_calculator"],
  ["VesaMatchCalculator.jsx", "vesa_match_calculator"],
]);

async function source(pathname) {
  return readFile(new URL(`../src/${pathname}`, import.meta.url), "utf8");
}

test("каждый калькулятор фиксирует ровно один успешный результат", async () => {
  for (const [filename, toolId] of calculatorTools) {
    const code = await source(`components/${filename}`);
    assert.match(code, /import \{ emitResultCompleted \} from "\.\.\/lib\/resultCompleted\.mjs";/);
    assert.equal(code.match(/emitResultCompleted\(/g)?.length, 1, filename);
    assert.match(code, new RegExp(`toolId: "${toolId}"`), filename);
  }
});

test("согласие доступно на обычных и двух нестандартных входных страницах", async () => {
  for (const pathname of [
    "components/SiteHeader.jsx",
    "pages/HomePage.jsx",
    "pages/GuidedSelectionPage.jsx",
  ]) {
    const code = await source(pathname);
    assert.match(code, /import \{ MetrikaConsent \}/, pathname);
    assert.equal(code.match(/<MetrikaConsent \/>/g)?.length, 1, pathname);
  }
});

test("мастер подбора не передаёт выбранную модель и параметры выбора", async () => {
  const code = await source("pages/GuidedSelectionPage.jsx");
  const eventBlock = code.match(/emitResultCompleted\(window, \{([\s\S]*?)\n    \}\);/);
  assert.ok(eventBlock, "result event block is present");
  assert.match(eventBlock[1], /toolId: "mount_match"/);
  assert.match(eventBlock[1], /resultType: "compatible_matches"/);
  assert.match(eventBlock[1], /resultCount: compatible\.length/);
  assert.doesNotMatch(eventBlock[1], /model|mechanism|wall|query/i);
});
