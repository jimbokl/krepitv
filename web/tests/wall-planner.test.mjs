import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";
import {
  buildWallSceneDiagram,
  buildWallSceneSvg,
  describeWallSceneFurniture,
  plannerInputsForModel,
  scenePointFromClient,
} from "../src/lib/wallScenePlan.mjs";

const plan = {
  dimension_source: "exact-model",
  diagonal_inches: 55,
  screen_width_cm: 123.3,
  screen_height_cm: 70.9,
  wall_width_cm: 420,
  wall_height_cm: 270,
  requested_center_x_cm: 210,
  requested_center_y_cm: 145,
  effective_center_x_cm: 210,
  effective_center_y_cm: 145,
  left_clearance_cm: 148.4,
  right_clearance_cm: 148.4,
  top_clearance_cm: 89.6,
  bottom_clearance_cm: 109.6,
  furniture_width_cm: 180,
  furniture_height_cm: 55,
  furniture_gap_cm: 54.6,
  furniture_overlap_cm: 0,
  eye_line_height_cm: 110,
  eye_line_delta_cm: 35,
  center_was_clamped: false,
  warnings: ["Схема проверяет только расположение"],
};

async function withModule(run) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });
  try {
    const module = await vite.ssrLoadModule("/src/components/WallPlannerCalculator.jsx");
    await run(module, root);
  } finally {
    await vite.close();
  }
}

test("точная модель передаёт паспортный корпус, а ручной режим — нулевую пару для Rust", () => {
  const values = {
    diagonal: "55",
    wallWidth: "420",
    wallHeight: "270",
    centerX: "210",
    centerY: "145",
    furnitureWidth: "180",
    furnitureHeight: "55",
    eyeLine: "110",
  };
  const model = {
    diagonal_inches: 55,
    width_mm: 1232.9,
    height_mm: 708.7,
  };

  assert.deepEqual(plannerInputsForModel(values, model), {
    diagonal: 55,
    screenWidth: 123.29,
    screenHeight: 70.87,
    wallWidth: 420,
    wallHeight: 270,
    centerX: 210,
    centerY: 145,
    furnitureWidth: 180,
    furnitureHeight: 55,
    eyeLine: 110,
  });
  assert.equal(plannerInputsForModel(values, null).screenWidth, 0);
  assert.equal(plannerInputsForModel(values, null).screenHeight, 0);
});

test("масштабная схема остаётся внутри viewBox и переводит указатель в доли стены", () => {
  const diagram = buildWallSceneDiagram(plan);
  assert.equal(diagram.viewBox, "0 0 1000 650");
  for (const rect of [diagram.wall, diagram.screen, diagram.furniture]) {
    assert.ok(rect.x >= 0);
    assert.ok(rect.y >= 0);
    assert.ok(rect.width > 0);
    assert.ok(rect.height > 0);
    assert.ok(rect.x + rect.width <= 1000.01);
    assert.ok(rect.y + rect.height <= 650.01);
  }

  const center = scenePointFromClient({
    clientX: 500,
    clientY: 325,
    diagram,
    rect: { left: 0, top: 0, width: 1000, height: 650 },
  });
  assert.ok(center.xRatio > 0.45 && center.xRatio < 0.55);
  assert.ok(center.yRatio > 0.45 && center.yRatio < 0.55);
});

test("SVG-экспорт содержит точные значения и не содержит URL или идентификаторов пользователя", () => {
  const svg = buildWallSceneSvg(plan, { screenLabel: "Samsung QE55Q70DAUXRU" });
  assert.ok(svg.startsWith("<?xml"));
  assert.ok(svg.includes("Samsung QE55Q70DAUXRU"));
  assert.ok(svg.includes("420"));
  assert.ok(svg.includes("270"));
  const payloadWithoutRequiredNamespace = svg.replace('xmlns="http://www.w3.org/2000/svg"', "");
  assert.equal(/https?:\/\//u.test(payloadWithoutRequiredNamespace), false);
  assert.equal(svg.includes("market.yandex"), false);
  assert.equal(svg.includes("clid="), false);
  for (const fragment of [
    "Зазоры: слева",
    "справа 148,4 см",
    "сверху 89,6 см",
    "снизу 109,6 см",
    "Линия глаз: 110 см",
    "Тумба: 180 × 55 см",
    "Зазор над тумбой: 54,6 см",
    "<tspan",
    "Предупреждение: Схема проверяет только расположение",
  ]) {
    assert.ok(svg.includes(fragment), `нет фрагмента экспорта: ${fragment}`);
  }
});

test("тумба описывается без ложного нулевого зазора", () => {
  assert.deepEqual(describeWallSceneFurniture({
    ...plan,
    furniture_width_cm: 0,
    furniture_height_cm: 0,
    furniture_gap_cm: 0,
  }), {
    kind: "none",
    label: "Тумба",
    value: "Не указана",
    measurementCm: null,
  });

  assert.deepEqual(describeWallSceneFurniture({
    ...plan,
    effective_center_x_cm: 70,
    furniture_width_cm: 100,
    furniture_height_cm: 55,
    furniture_gap_cm: 0,
  }), {
    kind: "separate",
    label: "Экран и тумба",
    value: "Не пересекаются",
    measurementCm: null,
  });
});

test("результат доступен с клавиатуры и ведёт только во внутренние проверки", async () => {
  await withModule(async ({ WallPlannerResult }) => {
    const html = renderToStaticMarkup(React.createElement(WallPlannerResult, {
      mode: "model",
      model: { id: "samsung-qe55q70dauxru", title: "Samsung QE55Q70DAUXRU" },
      onDownload() {},
      onMove() {},
      result: plan,
    }));

    assert.ok(html.includes("data-wall-planner-result=\"true\""));
    assert.ok(html.includes("data-wall-planner-diagram=\"результат\""));
    assert.ok(html.includes("tabindex=\"0\""));
    assert.ok(html.includes("Перетащите экран или используйте стрелки"));
    assert.ok(html.includes("href=\"/modeli/samsung-qe55q70dauxru/\""));
    assert.ok(html.includes("href=\"/na-kakoy-vysote-veshat-televizor/\""));
    assert.ok(html.includes("href=\"/kak-povesit-televizor-na-stenu/\""));
    assert.ok(html.includes("href=\"/rozetki-pod-televizor-na-stene/\""));
    assert.equal(html.includes("market.yandex"), false);
    assert.equal(html.includes("₽"), false);
    assert.equal((html.match(/data-print-map="true"/g) ?? []).length, 1);
  });
});

test("React сохраняет три индексируемых примера после гидратации", async () => {
  await withModule(async ({ WallPlannerCalculator }) => {
    const html = renderToStaticMarkup(React.createElement(WallPlannerCalculator, {
      models: [],
      search: [],
    }));

    assert.ok(html.includes("data-wall-planner-answer=\"true\""));
    assert.ok(html.includes("data-wall-planner-static-examples=\"true\""));
    assert.equal((html.match(/data-wall-planner-example=/g) ?? []).length, 3);
    for (const diagonal of [43, 55, 65]) {
      assert.ok(html.includes(`data-wall-planner-example=\"${diagonal}\"`));
    }
    assert.ok(html.includes("Схема проверяет геометрию, но не прочность стены и не назначает крепёж."));
  });
});

test("аналитика результата вызывается только из явного submit", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = await readFile(path.join(root, "src/components/WallPlannerCalculator.jsx"), "utf8");

  assert.equal((source.match(/emitResultCompleted\(/g) ?? []).length, 1);
  assert.equal(source.includes("reachGoal"), false);
  assert.equal(source.includes("AffiliateLink"), false);
  const submitStart = source.indexOf("async function submit(event)");
  const moveStart = source.indexOf("async function moveScreen");
  const emit = source.indexOf("emitResultCompleted(");
  assert.ok(submitStart < emit && emit < moveStart);
});
