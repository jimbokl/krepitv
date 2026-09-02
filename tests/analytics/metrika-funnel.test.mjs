import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_ELIGIBLE_REGION_AREAS_RU,
  buildMetrikaInteractionUrl,
  buildMetrikaFunnelUrl,
  buildMetrikaToolUsageUrl,
  evaluateDailyTrafficGoal,
  fetchMetrikaFunnel,
} from "../../scripts/analytics/metrika-funnel.mjs";

const token = "secret-token-" + "x".repeat(24);
const goalIds = {
  result_completed: 101,
  mount_detail_click: 102,
  market_click: 103,
  installation_kit_interaction: 104,
  tool_usage: 105,
  selection_start: 106,
};

function response(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async text() { return JSON.stringify(payload); },
  };
}

test("organic URL has fixed full-accuracy filters and ordered goal metrics", () => {
  const url = buildMetrikaFunnelUrl({
    counterId: 111176777,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalIds,
    organicOnly: true,
  });
  assert.equal(url.origin + url.pathname, "https://api-metrika.yandex.net/stat/v1/data");
  assert.equal(url.searchParams.get("accuracy"), "full");
  assert.equal(url.searchParams.get("dimensions"), "ym:s:date");
  assert.equal(
    url.searchParams.get("metrics"),
    "ym:s:visits,ym:s:users,ym:s:goal101reaches,ym:s:goal106reaches,ym:s:goal102reaches,ym:s:goal103reaches",
  );
  assert.match(url.searchParams.get("filters"), /lastTrafficSource=='organic'/);
  assert.match(url.searchParams.get("filters"), /metrika-test/);
  assert.match(url.searchParams.get("filters"), /_ym_status-check/);
});

test("organic landing outcome URL groups only by query-free canonical path", () => {
  const url = buildMetrikaFunnelUrl({
    counterId: 111176777,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalIds,
    landingOutcomesOnly: true,
  });
  assert.equal(url.searchParams.get("dimensions"), "ym:s:startURLPath");
  assert.equal(url.searchParams.get("sort"), "-ym:s:goal101reaches");
  assert.equal(url.searchParams.get("limit"), "1000");
  assert.match(url.searchParams.get("filters"), /lastTrafficSource=='organic'/);
  assert.match(url.searchParams.get("filters"), /metrika-test/);
  assert.match(url.searchParams.get("filters"), /_ym_status-check/);
});

test("eligible-region organic URL is explicit and accepted as one segment", () => {
  const url = buildMetrikaFunnelUrl({
    affiliateEligibleRegionsOnly: true,
    counterId: 111176777,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalIds,
  });
  assert.equal(url.searchParams.get("lang"), "ru");
  assert.equal(url.searchParams.get("dimensions"), "ym:s:date");
  assert.match(url.searchParams.get("filters"), /lastTrafficSource=='organic'/);
  for (const area of AFFILIATE_ELIGIBLE_REGION_AREAS_RU) {
    assert.match(url.searchParams.get("filters"), new RegExp(area));
  }
  assert.equal(AFFILIATE_ELIGIBLE_REGION_AREAS_RU.length, 14);
});

test("daily traffic URL excludes internal and tagged test visits", () => {
  const url = buildMetrikaFunnelUrl({
    counterId: 111176777,
    dailyQualifiedTrafficOnly: true,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalIds,
  });
  assert.equal(url.searchParams.get("dimensions"), "ym:s:date");
  assert.equal(url.searchParams.get("sort"), "ym:s:date");
  assert.match(url.searchParams.get("filters"), /NOT\(ym:s:lastTrafficSource=='internal'\)/);
  assert.match(url.searchParams.get("filters"), /metrika-test/);
  assert.match(url.searchParams.get("filters"), /_ym_status-check/);
});

test("daily traffic gate requires more than 1000 users for seven trailing days", () => {
  const rows = Array.from({ length: 8 }, (_, index) => ({
    date: `2026-07-${String(index + 1).padStart(2, "0")}`,
    users: index === 0 ? 1000 : 1001,
  }));
  assert.deepEqual(evaluateDailyTrafficGoal(rows), {
    metric: "ym:s:users",
    coverage: "Нижняя граница: посетители с включённой аналитикой, без сохранённого отказа",
    comparison: "greater_than",
    threshold_users: 1000,
    required_consecutive_days: 7,
    trailing_consecutive_days: 7,
    longest_consecutive_days: 7,
    status: "lower_bound_reached",
  });
});

test("interaction URL requests only controlled goal-parameter levels", () => {
  const url = buildMetrikaInteractionUrl({
    counterId: 111176777,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalIds,
  });
  assert.equal(
    url.searchParams.get("metrics"),
    "ym:s:goal104reaches",
  );
  assert.match(url.searchParams.get("dimensions"), /goal104paramsLevel1/u);
  assert.equal(url.searchParams.has("filters"), false);
});

test("tool usage URL запрашивает только уровни параметров одной цели", () => {
  const url = buildMetrikaToolUsageUrl({
    counterId: 111176777,
    date1: "2026-07-01",
    date2: "2026-07-31",
    goalId: goalIds.tool_usage,
  });
  assert.equal(url.searchParams.get("metrics"), "ym:s:goal105reaches");
  assert.match(url.searchParams.get("dimensions"), /goal105paramsLevel1/u);
  assert.doesNotMatch(url.searchParams.get("dimensions"), /goal101/u);
});

test("report keeps authoritative users total and strips source labels and token", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    if (url.searchParams.get("dimensions") === "ym:s:startURLPath") {
      return response({
        totals: [7, 6, 5, 0, 1, 0],
        data: [
          {
            dimensions: [{ name: "/skolko-elektroenergii-potreblyaet-televizor/" }],
            metrics: [3, 2, 4, 0, 0, 0],
          },
          {
            dimensions: [{ id: "/modeli/tcl-55c6k/" }],
            metrics: [1, 1, 0, 0, 1, 0],
          },
          {
            dimensions: [{ name: "/support/user-at-example/" }],
            metrics: [1, 1, 1, 0, 0, 0],
          },
          {
            dimensions: [{ name: "/kak-otklyuchit-subtitry-na-televizore/" }],
            metrics: [2, 2, 0, 0, 0, 0],
          },
        ],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    if (url.searchParams.get("dimensions")?.includes("goal104paramsLevel1")) {
      return response({
        totals: [3],
        data: [
          { dimensions: [{ name: "action" }, { name: "checks_opened" }], metrics: [2] },
          { dimensions: [{ name: "action" }, { name: "print_started" }], metrics: [1] },
        ],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    if (url.searchParams.get("dimensions")?.includes("goal105paramsLevel1")) {
      return response({
        totals: [4],
        data: [
          { dimensions: [{ name: "tool_id" }, { name: "height_calculator" }], metrics: [3] },
          { dimensions: [{ name: "tool_id" }, { name: "unknown_user_value" }], metrics: [1] },
        ],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    if (url.searchParams.get("dimensions")?.includes("goal101paramsLevel1")) {
      return response({
        totals: [3],
        data: [
          { dimensions: [{ name: "tool_id" }, { name: "height_calculator" }], metrics: [2] },
          { dimensions: [{ name: "tool_id" }, { name: "tv_energy_calculator" }], metrics: [1] },
        ],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    if (url.searchParams.get("filters")?.startsWith("NOT(")) {
      return response({
        totals: [2, 1, 0, 0, 0, 0],
        data: [
          { dimensions: [{ id: "2026-07-30" }], metrics: [2, 1, 0, 0, 0, 0] },
        ],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    const organic = url.searchParams.has("filters");
    return response(organic ? {
      totals: [0, 0, 0, 0, 0, 0],
      data: [],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    } : {
      totals: [3, 1, 0, 0, 0, 0],
      data: [
        { dimensions: [{ id: "direct", name: "Прямые заходы" }], metrics: [2, 1, 0, 0, 0, 0] },
        { dimensions: [{ id: "internal", name: "Внутренние переходы" }], metrics: [1, 1, 0, 0, 0, 0] },
      ],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    });
  };
  const report = await fetchMetrikaFunnel({
    allowedLandingPaths: new Set([
      "/kak-otklyuchit-subtitry-na-televizore/",
      "/modeli/tcl-55c6k/",
      "/skolko-elektroenergii-potreblyaet-televizor/",
    ]),
    counterId: 111176777,
    date1: "2026-07-29",
    date2: "2026-07-31",
    fetchImpl,
    goalIds,
    now: new Date("2026-07-31T10:24:00.000Z"),
    token,
  });
  assert.equal(report.all_consenting.users, 1);
  assert.deepEqual(report.source_breakdown.map((item) => [item.source, item.visits]), [
    ["direct", 2],
    ["internal", 1],
  ]);
  assert.equal(report.organic_excluding_tests.users, 0);
  assert.equal(report.eligible_regions_organic_excluding_tests.users, 0);
  assert.deepEqual(report.organic_outcomes_by_landing, {
    state: "available",
    coverage: "Только страницы из текущего sitemap и строки с полезным результатом или переходом",
    rows: [
      {
        path: "/skolko-elektroenergii-potreblyaet-televizor/",
        visits: 3,
        users: 2,
        result_completed: 4,
        selection_start: 0,
        mount_detail_click: 0,
        market_click: 0,
      },
      {
        path: "/modeli/tcl-55c6k/",
        visits: 1,
        users: 1,
        result_completed: 0,
        selection_start: 0,
        mount_detail_click: 1,
        market_click: 0,
      },
    ],
    suppressed: {
      not_in_sitemap: 1,
      zero_outcome: 1,
    },
  });
  assert.deepEqual(report.installation_kit_interactions, {
    breakdown_state: "available",
    coverage: "Только контролируемые действия со сводкой монтажного комплекта",
    total_reaches: 3,
    actions: {
      checks_opened: 2,
      cable_check_opened: 0,
      print_started: 1,
    },
    revenue_interpretation: "not_revenue",
  });
  assert.deepEqual(report.tool_usage, {
    breakdown_state: "available",
    coverage: "Только известные инструменты и обезличенные started/completed",
    total_started_reaches: 4,
    total_completed_reaches: 3,
    tools: [
      {
        tool_id: "height_calculator",
        started: 3,
        completed: 2,
        completion_rate: 0.6667,
      },
      {
        tool_id: "tv_energy_calculator",
        started: 0,
        completed: 1,
        completion_rate: null,
      },
    ],
  });
  assert.deepEqual(report.daily_consenting_excluding_internal_tests, [
    { date: "2026-07-29", visits: 0, users: 0 },
    { date: "2026-07-30", visits: 2, users: 1 },
    { date: "2026-07-31", visits: 0, users: 0 },
  ]);
  assert.equal(report.daily_traffic_goal.status, "lower_bound_not_reached");
  assert.equal(calls.length, 8);
  assert.equal(calls.every((call) => call.options.headers.Authorization === `OAuth ${token}`), true);
  assert.equal(JSON.stringify(report).includes(token), false);
  assert.equal(JSON.stringify(report).includes("Прямые заходы"), false);
  assert.equal(JSON.stringify(report).includes("user-at-example"), false);
});

test("report keeps aggregate funnel totals when goal parameter dimensions are unsupported", async () => {
  const fetchImpl = async (url) => {
    if (url.searchParams.get("dimensions")?.includes("paramsLevel")) {
      return response({ errors: [{ error_type: "invalid_parameter" }] }, 400);
    }
    const metrics = url.searchParams.get("metrics") ?? "";
    if (metrics === "ym:s:goal104reaches") {
      return response({ totals: [2], data: [], sampled: false, sample_share: 1, data_lag: 0 });
    }
    if (metrics === "ym:s:goal105reaches") {
      return response({ totals: [3], data: [], sampled: false, sample_share: 1, data_lag: 0 });
    }
    if (metrics === "ym:s:goal101reaches") {
      return response({ totals: [1], data: [], sampled: false, sample_share: 1, data_lag: 0 });
    }
    const totals = [4, 3, 1, 1, 0, 0];
    return response({
      totals,
      data: url.searchParams.get("dimensions") === "ym:s:date"
        ? [{ dimensions: [{ id: "2026-08-30" }], metrics: totals }]
        : [{ dimensions: [{ id: "organic" }], metrics: totals }],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    });
  };

  const report = await fetchMetrikaFunnel({
    counterId: 111176777,
    date1: "2026-08-30",
    date2: "2026-08-30",
    fetchImpl,
    goalIds,
    token,
  });

  assert.equal(report.organic_excluding_tests.result_completed, 1);
  assert.equal(report.organic_excluding_tests.selection_start, 1);
  assert.deepEqual(report.installation_kit_interactions, {
    breakdown_state: "unavailable",
    coverage: "Агрегат цели без разбивки по параметрам",
    total_reaches: 2,
    actions: null,
    revenue_interpretation: "not_revenue",
  });
  assert.deepEqual(report.tool_usage, {
    breakdown_state: "unavailable",
    coverage: "Агрегаты целей без разбивки по инструментам",
    total_started_reaches: 3,
    total_completed_reaches: 1,
    tools: null,
  });
});

test("report serializes API requests so one run cannot exhaust the account parallel quota", async () => {
  let inFlight = 0;
  let maximumInFlight = 0;
  const fetchImpl = async (url) => {
    inFlight += 1;
    maximumInFlight = Math.max(maximumInFlight, inFlight);
    await new Promise((resolve) => setImmediate(resolve));
    const overloaded = inFlight > 1;
    inFlight -= 1;

    if (overloaded) {
      return response({ errors: [{ error_type: "quota_parallel_requests_by_uid" }] }, 429);
    }
    const dimensions = url.searchParams.get("dimensions") ?? "";
    if (dimensions.includes("paramsLevel")) {
      return response({
        totals: [0],
        data: [],
        sampled: false,
        sample_share: 1,
        data_lag: 0,
      });
    }
    return response({
      totals: [0, 0, 0, 0, 0, 0],
      data: [],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    });
  };

  const report = await fetchMetrikaFunnel({
    counterId: 111176777,
    date1: "2026-08-26",
    date2: "2026-09-01",
    fetchImpl,
    goalIds,
    token,
  });

  assert.equal(maximumInFlight, 1);
  assert.equal(report.organic_excluding_tests.users, 0);
});

test("invalid dates, missing goal ids and malformed totals fail closed", async () => {
  assert.throws(() => buildMetrikaFunnelUrl({
    counterId: 1,
    date1: "2026-02-30",
    date2: "2026-03-01",
    goalIds,
  }), /real ascending ISO dates/);
  assert.throws(() => buildMetrikaFunnelUrl({
    counterId: 1,
    date1: "2026-03-01",
    date2: "2026-03-02",
    goalIds: { ...goalIds, market_click: null },
  }), /market_click/);
  await assert.rejects(fetchMetrikaFunnel({
    counterId: 1,
    date1: "2026-03-01",
    date2: "2026-03-02",
    fetchImpl: async () => response({ totals: [1, 2] }),
    goalIds,
    token,
  }), /invalid totals/);
});
