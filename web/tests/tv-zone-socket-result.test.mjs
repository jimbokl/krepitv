import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

const values = {
  plateWidth: "45",
  plateHeight: "20",
  plateHorizontalOffset: "0",
  plateVerticalOffset: "0",
  socketWidth: "14",
  socketHeight: "8",
  socketHorizontalOffset: "18",
  socketVerticalOffset: "0",
  serviceMargin: "2",
};

const conflictResult = {
  ready_for_site_check: false,
  screen_width_cm: 121.8,
  screen_height_cm: 68.5,
  screen_bottom_height_cm: 79.9,
  screen_top_height_cm: 148.4,
  plate_center_height_cm: 114.2,
  socket_center_height_cm: 114.2,
  socket_hidden_by_screen: true,
  socket_overlaps_service_zone: true,
  service_zone_hidden_by_screen: true,
  plug_fits_depth: true,
  required_depth_cm: 3.5,
  wall_clearance_cm: 5,
  depth_margin_cm: 1.5,
  total_modules: 7,
  minimum_shift_cm: 13.5,
  shift_direction: "вправо",
  power_modules: 5,
  ethernet_modules: 1,
  antenna_modules: 1,
  warnings: [],
};

function mount(id, title = id) {
  return {
    id,
    title,
    mechanism: "full-motion",
    max_load_kg: 40,
    wall_distance_min_mm: 55,
    wall_distance_max_mm: 420,
  };
}

function edge(mountId, score, fitStatus = "verified-fit", tvId = "tcl-55c6k") {
  return {
    tv_id: tvId,
    mount_id: mountId,
    compatible: true,
    fit_status: fitStatus,
    score,
  };
}

async function withModule(run) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const module = await vite.ssrLoadModule("/src/components/TvZoneSocketCalculator.jsx");
    await run(module, root);
  } finally {
    await vite.close();
  }
}

test("масштабная схема держит все прямоугольники во viewBox и показывает направление сдвига", async () => {
  await withModule(async ({ buildTvZoneDiagram }) => {
    const diagram = buildTvZoneDiagram(conflictResult, values);

    assert.equal(diagram.viewBox, "0 0 1000 620");
    for (const rect of [
      diagram.screen,
      diagram.plate,
      diagram.serviceZone,
      diagram.socket,
      diagram.shiftedSocket,
    ]) {
      assert.ok(rect.x >= 0);
      assert.ok(rect.y >= 0);
      assert.ok(rect.width > 0);
      assert.ok(rect.height > 0);
      assert.ok(rect.x + rect.width <= 1000.01);
      assert.ok(rect.y + rect.height <= 620.01);
    }
    assert.ok(diagram.arrow.x2 > diagram.arrow.x1);
    assert.equal(diagram.arrow.y2, diagram.arrow.y1);

    const noShift = buildTvZoneDiagram({
      ...conflictResult,
      minimum_shift_cm: null,
      shift_direction: null,
      socket_overlaps_service_zone: false,
    }, {
      ...values,
      socketHorizontalOffset: "35",
    });
    assert.equal(noShift.arrow, null);
    assert.equal(noShift.shiftedSocket, null);
  });
});

test("top-3 сортируется по edge.score, а свежий оффер решает только равенство", async () => {
  await withModule(async ({ rankSocketMountMatches }) => {
    const model = { id: "tcl-55c6k", title: "TCL 55C6K" };
    const mounts = [
      mount("score-first"),
      mount("tie-with-offer"),
      mount("tie-without-offer"),
      mount("lower-with-offer"),
      mount("conditional-high"),
      mount("other-model"),
    ];
    const ranked = rankSocketMountMatches({
      compatibilityEdges: [
        edge("conditional-high", 999, "conditional-fit"),
        edge("score-first", 120),
        edge("tie-without-offer", 100),
        edge("tie-with-offer", 100),
        edge("lower-with-offer", 90),
        edge("other-model", 500, "verified-fit", "hisense-55u7s"),
      ],
      model,
      modelAffiliateOffers: [
        { model_id: model.id, entity_id: "tie-with-offer" },
        { model_id: model.id, entity_id: "lower-with-offer" },
      ],
      mounts,
    });

    assert.deepEqual(ranked.map((item) => item.mount.id), [
      "score-first",
      "tie-with-offer",
      "tie-without-offer",
    ]);
    assert.equal(ranked[0].hasFreshOffer, false);
    assert.equal(ranked[1].hasFreshOffer, true);
    assert.ok(ranked.every((item) => item.edge.fit_status === "verified-fit"));
  });
});

test("DOM результата содержит печатную SVG-схему и только внутренние ссылки кронштейнов", async () => {
  await withModule(async ({
    rankSocketMountMatches,
    SocketMountShortlist,
    TvZoneSocketResult,
  }) => {
    const model = { id: "tcl-55c6k", title: "TCL 55C6K" };
    const mounts = [mount("first", "KROMAX FIRST"), mount("second", "ONKRON SECOND"), mount("third", "iTECH THIRD")];
    const shortlistedMounts = rankSocketMountMatches({
      compatibilityEdges: mounts.map((item, index) => edge(item.id, 120 - index)),
      model,
      modelAffiliateOffers: [{ model_id: model.id, entity_id: "second" }],
      mounts,
    });
    const resultHtml = renderToStaticMarkup(React.createElement(TvZoneSocketResult, {
      result: conflictResult,
      search: [{ id: model.id, title: model.title, search: model.title.toLowerCase() }],
      values,
    }));
    const shortlistHtml = renderToStaticMarkup(React.createElement(SocketMountShortlist, {
      matches: shortlistedMounts,
      model,
    }));

    assert.equal(resultHtml.includes("data-tv-zone-diagram=\"true\""), true);
    assert.equal(resultHtml.includes("preserveAspectRatio=\"xMidYMid meet\""), true);
    assert.equal(resultHtml.includes("class=\"mt-4 block h-auto w-full max-w-full\""), true);
    assert.equal(resultHtml.includes("marker-end=\"url(#socket-shift-arrow)\""), true);
    assert.equal(resultHtml.includes("Минимальный сдвиг: 13,5 см вправо"), true);
    assert.equal(resultHtml.includes("data-socket-mount-continuation=\"true\""), true);
    assert.equal(resultHtml.includes("Введите модель полностью"), true);
    assert.equal((shortlistHtml.match(/href="\/kronshteyny\//g) ?? []).length, 3);
    assert.equal((shortlistHtml.match(/data-mount-detail-placement="compatibility_result"/g) ?? []).length, 3);
    assert.equal(shortlistHtml.includes("https://market.yandex.ru"), false);
    assert.equal(shortlistHtml.includes("data-affiliate-placement-id"), false);
    assert.equal(shortlistHtml.includes("Совместимость подтверждена"), true);
    assert.equal(shortlistHtml.includes("Verified-fit"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(shortlistHtml), false);
  });
});

test("усиление не создаёт второе result_completed или новый аналитический event", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = await readFile(path.join(root, "src/components/TvZoneSocketCalculator.jsx"), "utf8");

  assert.equal((source.match(/emitResultCompleted\(/g) ?? []).length, 1);
  assert.equal(source.includes("reachGoal"), false);
  assert.equal(source.includes("AffiliateLink"), false);
});
