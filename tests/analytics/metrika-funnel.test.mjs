import assert from "node:assert/strict";
import test from "node:test";
import {
  AFFILIATE_ELIGIBLE_REGION_AREAS_RU,
  buildMetrikaFunnelUrl,
  fetchMetrikaFunnel,
} from "../../scripts/analytics/metrika-funnel.mjs";

const token = "secret-token-" + "x".repeat(24);
const goalIds = {
  result_completed: 101,
  mount_detail_click: 102,
  market_click: 103,
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
    "ym:s:visits,ym:s:users,ym:s:goal101reaches,ym:s:goal102reaches,ym:s:goal103reaches",
  );
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

test("report keeps authoritative users total and strips source labels and token", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const organic = url.searchParams.has("filters");
    return response(organic ? {
      totals: [0, 0, 0, 0, 0],
      data: [],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    } : {
      totals: [3, 1, 0, 0, 0],
      data: [
        { dimensions: [{ id: "direct", name: "Прямые заходы" }], metrics: [2, 1, 0, 0, 0] },
        { dimensions: [{ id: "internal", name: "Внутренние переходы" }], metrics: [1, 1, 0, 0, 0] },
      ],
      sampled: false,
      sample_share: 1,
      data_lag: 0,
    });
  };
  const report = await fetchMetrikaFunnel({
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
  assert.equal(calls.length, 3);
  assert.equal(calls.every((call) => call.options.headers.Authorization === `OAuth ${token}`), true);
  assert.equal(JSON.stringify(report).includes(token), false);
  assert.equal(JSON.stringify(report).includes("Прямые заходы"), false);
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
