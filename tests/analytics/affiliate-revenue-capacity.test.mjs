import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAffiliateRevenueCapacity,
  calculateRevenueScenario,
  summarizeApiPromiseSnapshot,
  zeroEventUpperBound95,
} from "../../scripts/analytics/affiliate-revenue-capacity.mjs";

const offerSnapshot = {
  generated_at: "2026-07-31T10:00:00Z",
  offers: [198, 220, 241, 303, 304, 625, 900, 1071].map((promise, index) => ({
    id: `private-${index}`,
    promise,
    eligibility: "publishable",
    publishable: true,
  })).concat([{ id: "missing", promise: null, eligibility: "unavailable", publishable: false }]),
};

const metrikaReport = {
  observed_at: "2026-07-31T10:10:00Z",
  window: { date1: "2026-07-29", date2: "2026-07-31" },
  organic_excluding_tests: {
    visits: 0,
    users: 0,
    result_completed: 0,
    selection_start: 0,
    mount_detail_click: 0,
    market_click: 0,
  },
  eligible_regions_organic_excluding_tests: {
    visits: 0,
    users: 0,
    result_completed: 0,
    selection_start: 0,
    mount_detail_click: 0,
    market_click: 0,
  },
};

const ordersAggregate = {
  kind: "krepitv_affiliate_orders_monthly_aggregate",
  month: "2026-07",
  generated_at: "2026-07-31T10:20:00Z",
  data_as_of: "2026-07-31T10:17:24Z",
  approved: { orders: 0, payment_kopecks: 0 },
  pending_current: { new_orders: 0, on_hold_orders: 0 },
  cancelled_in_month: { orders: 0 },
};

test("summarizes only publishable API promise estimates without private fields", () => {
  const summary = summarizeApiPromiseSnapshot(offerSnapshot);
  assert.equal(summary.offers_total, 9);
  assert.equal(summary.publishable_offers, 8);
  assert.equal(summary.min, 198);
  assert.equal(summary.median, 303.5);
  assert.equal(summary.max, 1071);
  assert.equal(JSON.stringify(summary).includes("private-"), false);
});

test("calculates traffic from the direct measurable revenue path", () => {
  const scenario = calculateRevenueScenario({
    apiPromiseRubles: 250,
    scenario: {
      id: "base",
      label: "Базовый",
      eligible_region_proxy_organic_user_to_market_click_rate: 0.05,
      market_click_to_created_order_rate: 0.04,
      created_order_to_approved_rate: 0.75,
      api_promise_quantile: 0.5,
    },
    targetRewardKopecks: 10_000_000,
  });
  assert.equal(scenario.implied.reward_rubles_per_organic_user, 0.375);
  assert.equal(scenario.required_for_target.organic_users, 266_667);
  assert.equal(scenario.required_for_target.approved_orders, 400);
});

test("zero-event upper bound is exact and does not claim a zero conversion rate", () => {
  assert.equal(zeroEventUpperBound95(0), null);
  assert.ok(Math.abs(zeroEventUpperBound95(500) - 0.00597355) < 1e-8);
  assert.ok(Math.abs(zeroEventUpperBound95(30) - 0.09503385) < 1e-8);
});

test("builds privacy-safe evidence and keeps unobserved ratios unknown", () => {
  const report = buildAffiliateRevenueCapacity({
    generatedAt: new Date("2026-07-31T11:00:00Z"),
    metrikaReport,
    offerSnapshot,
    ordersAggregate,
  });
  assert.equal(report.observed.confirmed_reward_kopecks.status, "observed_zero");
  assert.equal(report.observed.approved_reward_per_order_kopecks.status, "unknown");
  assert.equal(report.observed.created_order_rate.status, "unknown");
  assert.deepEqual(report.measurement_contract.revenue_path, [
    "eligible_region_proxy_organic_user",
    "market_click",
    "created_order",
    "approved_order",
    "payment",
  ]);
  assert.equal(report.planning_scenarios.length, 3);
  assert.equal(report.planning_scenarios[1].required_for_target.approved_orders, 330);
  assert.equal(report.self_employed_context.net_kopecks_after_npd_if_target_is_reached, 9_400_000);

  const serialized = JSON.stringify(report).toLowerCase();
  for (const forbidden of [
    "\"affiliate_href\"",
    "\"market_source_url\"",
    "\"order_key\"",
    "\"orderid\"",
    "\"vid\"",
    "\"clid\"",
    "\"oauth\"",
    "\"hmac\"",
    "private-0",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("uses observed approved payment only when an approved order exists", () => {
  const report = buildAffiliateRevenueCapacity({
    generatedAt: new Date("2026-07-31T11:00:00Z"),
    metrikaReport: {
      ...metrikaReport,
      eligible_regions_organic_excluding_tests: {
        ...metrikaReport.eligible_regions_organic_excluding_tests,
        visits: 80,
        users: 50,
        market_click: 5,
      },
      organic_excluding_tests: {
        ...metrikaReport.organic_excluding_tests,
        visits: 80,
        users: 50,
        market_click: 5,
      },
    },
    offerSnapshot,
    ordersAggregate: {
      ...ordersAggregate,
      approved: { orders: 2, payment_kopecks: 50_000 },
    },
  });
  assert.equal(report.observed.market_clicks_per_organic_user.value, 0.1);
  assert.equal(report.observed.approved_reward_per_order_kopecks.status, "observed_value");
  assert.equal(report.observed.approved_reward_per_order_kopecks.value, 25_000);
});

test("rejects a publishable offer without a positive promise estimate", () => {
  assert.throws(
    () => summarizeApiPromiseSnapshot({
      generated_at: "2026-07-31T10:00:00Z",
      offers: [{ publishable: true, eligibility: "publishable", promise: 0 }],
    }),
    /positive integer/,
  );
});
