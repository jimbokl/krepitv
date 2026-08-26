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

const instrumentedBoundaries = new Map([
  ["components/BrandMountMatcher.jsx", "brand_mount_match"],
  ["components/HeightCalculator.jsx", "height_calculator"],
  ["components/MountingMapCalculator.jsx", "mounting_map_calculator"],
  ["components/PhoneTvConnectionWizard.jsx", "phone_tv_connection"],
  ["components/ScrewLengthCalculator.jsx", "vesa_screw_length_calculator"],
  ["components/TiltAngleCalculator.jsx", "tilt_angle_calculator"],
  ["components/TurnClearanceCalculator.jsx", "turn_clearance_calculator"],
  ["components/TvDimensionsCalculator.jsx", "tv_dimensions_calculator"],
  ["components/TvEnergyCalculator.jsx", "tv_energy_calculator"],
  ["components/TvMountScrewCatalog.jsx", "screw_lookup"],
  ["components/TvNoSignalWizard.jsx", "tv_no_signal"],
  ["components/TvVesaCatalog.jsx", "vesa_model_lookup"],
  ["components/TvZoneSocketCalculator.jsx", "tv_zone_socket_calculator"],
  ["components/VesaMatchCalculator.jsx", "vesa_match_calculator"],
  ["components/ViewingDistanceCalculator.jsx", "viewing_distance_calculator"],
  ["components/WallPlannerCalculator.jsx", "wall_planner"],
  ["pages/GuidedSelectionPage.jsx", "installation_kit"],
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

test("каждый инструмент объявляет стабильную границу первого взаимодействия", async () => {
  for (const [pathname, toolId] of instrumentedBoundaries) {
    const code = await source(pathname);
    assert.match(
      code,
      new RegExp(`data-analytics-tool="${toolId}"`),
      pathname,
    );
  }
  const trafficWizard = await source("components/TvTrafficTaskWizard.jsx");
  assert.match(trafficWizard, /data-analytics-tool=\{config\.toolId\}/u);
});

test("подбор винтов фиксирует результат без модели и пользовательского ввода", async () => {
  const code = await source("components/TvMountScrewCatalog.jsx");
  const eventBlock = code.match(/emitResultCompleted\(window, \{([\s\S]*?)\n    \}\);/);
  assert.ok(eventBlock, "screw lookup result event is present");
  assert.match(eventBlock[1], /toolId: "screw_lookup"/);
  assert.match(eventBlock[1], /resultType: "mount_screws_found"/);
  assert.match(eventBlock[1], /resultCount: model\.wall_mount_screws\.groups\.length/);
  assert.doesNotMatch(eventBlock[1], /modelId|model\.id|query|thread/i);
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

test("монтажный комплект передаёт только контролируемые ids, статус и число секций", async () => {
  const code = await source("pages/GuidedSelectionPage.jsx");
  const eventBlock = code.match(/emitResultCompleted\(window, \{([\s\S]*?)\n    \}\);/);
  assert.ok(eventBlock, "result event block is present");
  assert.match(eventBlock[1], /toolId: "installation_kit"/);
  assert.match(eventBlock[1], /resultType: kit\.plan\.overall_status/);
  assert.match(eventBlock[1], /resultCount: kit\.plan\.section_order/);
  assert.match(eventBlock[1], /modelId: selectedModel\.id/);
  assert.match(eventBlock[1], /mountId: selectedMount\.id/);
  assert.doesNotMatch(eventBlock[1], /mechanism|wall|query|height|distance|cable/i);
});

test("брендовый подбор фиксирует только тип и размер результата", async () => {
  const code = await source("components/BrandMountMatcher.jsx");
  const eventBlock = code.match(/emitResultCompleted\(window, \{([\s\S]*?)\n    \}\);/);
  assert.ok(eventBlock, "brand matcher result event block is present");
  assert.match(eventBlock[1], /toolId: "brand_mount_match"/);
  assert.match(eventBlock[1], /resultType: compatible\.length/);
  assert.match(eventBlock[1], /resultCount: compatible\.length/);
  assert.doesNotMatch(eventBlock[1], /selectedModel|model\.id|query|vesa|weight/i);
});

test("мастер телефон → ТВ отправляет только контролируемый тип результата", async () => {
  const code = await source("components/PhoneTvConnectionWizard.jsx");
  const eventBlock = code.match(/emitResultCompleted\(window, \{([\s\S]*?)\n\s*\}\);/);
  assert.ok(eventBlock, "phone-to-TV result event is present");
  assert.match(eventBlock[1], /toolId: "phone_tv_connection"/);
  assert.match(eventBlock[1], /blocked_plan/);
  assert.doesNotMatch(eventBlock[1], /phone,|tv,|goal,|connector|sameNetwork|androidVideoOutput/i);
});

test("сводка монтажного комплекта фиксирует только три явных действия без замеров", async () => {
  const code = await source("components/installation-kit/InstallationKitBuildSummary.jsx");
  assert.match(code, /import \{ emitInstallationKitInteraction \}/u);
  for (const action of ["checks_opened", "cable_check_opened", "print_started"]) {
    assert.match(code, new RegExp(`action: "${action}"`, "u"));
  }
  assert.doesNotMatch(
    code,
    /emitInstallationKitInteraction\([\s\S]{0,300}(?:modelId|mountId|requiredClearance|availableClearance|margin|query|href)/u,
  );
});
