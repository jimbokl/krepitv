const STATUS = Object.freeze({
  UNKNOWN: "unknown",
  OBSERVED_VALUE: "observed_value",
  OBSERVED_ZERO: "observed_zero",
});

export const DEFAULT_REVENUE_SCENARIOS = Object.freeze([
  Object.freeze({
    id: "conservative",
    label: "Консервативный",
    eligible_region_proxy_organic_user_to_market_click_rate: 0.02,
    market_click_to_created_order_rate: 0.01,
    created_order_to_approved_rate: 0.6,
    api_promise_quantile: 0,
  }),
  Object.freeze({
    id: "base",
    label: "Базовый",
    eligible_region_proxy_organic_user_to_market_click_rate: 0.06,
    market_click_to_created_order_rate: 0.03,
    created_order_to_approved_rate: 0.75,
    api_promise_quantile: 0.5,
  }),
  Object.freeze({
    id: "upside",
    label: "Сильный",
    eligible_region_proxy_organic_user_to_market_click_rate: 0.12,
    market_click_to_created_order_rate: 0.05,
    created_order_to_approved_rate: 0.85,
    api_promise_quantile: 0.75,
  }),
]);

function requireObject(value, name) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${name} must be an object`);
  }
  return value;
}

function requireNonNegativeInteger(value, name) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative safe integer`);
  }
  return value;
}

function requireRate(value, name) {
  if (!Number.isFinite(value) || value <= 0 || value > 1) {
    throw new Error(`${name} must be in (0, 1]`);
  }
  return value;
}

function requireIsoInstant(value, name) {
  if (typeof value !== "string" || !Number.isFinite(Date.parse(value))) {
    throw new Error(`${name} must be an ISO timestamp`);
  }
  return value;
}

function requireIsoDate(value, name) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new Error(`${name} must be an ISO date`);
  }
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  if (
    parsed.getUTCFullYear() !== year
    || parsed.getUTCMonth() !== month - 1
    || parsed.getUTCDate() !== day
  ) {
    throw new Error(`${name} must be a real date`);
  }
  return value;
}

function quantile(sorted, probability) {
  if (!Array.isArray(sorted) || sorted.length === 0) {
    throw new Error("quantile requires at least one value");
  }
  if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
    throw new Error("quantile probability must be in [0, 1]");
  }
  const position = (sorted.length - 1) * probability;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function round(value, digits = 6) {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}

export function summarizeApiPromiseSnapshot(snapshot) {
  requireObject(snapshot, "offer snapshot");
  requireIsoInstant(snapshot.generated_at, "offer snapshot.generated_at");
  if (!Array.isArray(snapshot.offers)) {
    throw new Error("offer snapshot.offers must be an array");
  }

  const publishable = snapshot.offers.filter((offer) => {
    requireObject(offer, "offer");
    return offer.publishable === true && offer.eligibility === "publishable";
  });
  const promises = publishable.map((offer) => {
    if (!Number.isSafeInteger(offer.promise) || offer.promise <= 0) {
      throw new Error("publishable offer.promise must be a positive integer");
    }
    return offer.promise;
  }).sort((left, right) => left - right);
  if (promises.length === 0) {
    throw new Error("offer snapshot has no publishable API promise values");
  }

  return {
    generated_at: snapshot.generated_at,
    offers_total: snapshot.offers.length,
    publishable_offers: publishable.length,
    unit: "rubles_per_order_preorder_quote",
    meaning: "Закреплённое за ссылкой вознаграждение API до заказа; не подтверждённый payment",
    source: "https://yandex.ru/dev/market/affiliate/ru/reference/get-partner-link-create",
    min: quantile(promises, 0),
    p25: quantile(promises, 0.25),
    median: quantile(promises, 0.5),
    p75: quantile(promises, 0.75),
    max: quantile(promises, 1),
    mean: round(promises.reduce((sum, value) => sum + value, 0) / promises.length, 2),
  };
}

function validateMetrikaReport(report) {
  requireObject(report, "Metrika report");
  requireIsoInstant(report.observed_at, "Metrika report.observed_at");
  const window = requireObject(report.window, "Metrika report.window");
  requireIsoDate(window.date1, "Metrika report.window.date1");
  requireIsoDate(window.date2, "Metrika report.window.date2");
  if (window.date1 > window.date2) throw new Error("Metrika report window is reversed");
  const organic = requireObject(
    report.organic_excluding_tests,
    "Metrika report.organic_excluding_tests",
  );
  for (const field of [
    "visits",
    "users",
    "result_completed",
    "selection_start",
    "mount_detail_click",
    "market_click",
  ]) {
    requireNonNegativeInteger(organic[field], `organic_excluding_tests.${field}`);
  }
  const eligibleOrganic = requireObject(
    report.eligible_regions_organic_excluding_tests,
    "Metrika report.eligible_regions_organic_excluding_tests",
  );
  for (const field of [
    "visits",
    "users",
    "result_completed",
    "selection_start",
    "mount_detail_click",
    "market_click",
  ]) {
    requireNonNegativeInteger(
      eligibleOrganic[field],
      `eligible_regions_organic_excluding_tests.${field}`,
    );
  }
  return report;
}

function validateOrdersAggregate(aggregate) {
  requireObject(aggregate, "orders aggregate");
  if (aggregate.kind !== "krepitv_affiliate_orders_monthly_aggregate") {
    throw new Error("orders aggregate kind is unsupported");
  }
  if (!/^\d{4}-\d{2}$/.test(aggregate.month ?? "")) {
    throw new Error("orders aggregate.month must use YYYY-MM");
  }
  requireIsoInstant(aggregate.generated_at, "orders aggregate.generated_at");
  requireIsoInstant(aggregate.data_as_of, "orders aggregate.data_as_of");
  const approved = requireObject(aggregate.approved, "orders aggregate.approved");
  requireNonNegativeInteger(approved.orders, "orders aggregate.approved.orders");
  requireNonNegativeInteger(
    approved.payment_kopecks,
    "orders aggregate.approved.payment_kopecks",
  );
  const pending = requireObject(
    aggregate.pending_current,
    "orders aggregate.pending_current",
  );
  requireNonNegativeInteger(pending.new_orders, "pending_current.new_orders");
  requireNonNegativeInteger(pending.on_hold_orders, "pending_current.on_hold_orders");
  const cancelled = requireObject(
    aggregate.cancelled_in_month,
    "orders aggregate.cancelled_in_month",
  );
  requireNonNegativeInteger(cancelled.orders, "cancelled_in_month.orders");
  return aggregate;
}

function unknown(reason) {
  return { status: STATUS.UNKNOWN, value: null, reason };
}

function observedMetric(value, unit, evidence) {
  return {
    status: value === 0 ? STATUS.OBSERVED_ZERO : STATUS.OBSERVED_VALUE,
    value,
    unit,
    evidence,
  };
}

function buildObservedEvidence(metrikaReport, ordersAggregate) {
  const allOrganic = metrikaReport.organic_excluding_tests;
  const organic = metrikaReport.eligible_regions_organic_excluding_tests;
  const approved = ordersAggregate.approved;
  const pendingOrders = ordersAggregate.pending_current.new_orders
    + ordersAggregate.pending_current.on_hold_orders;

  return {
    all_region_organic_users: observedMetric(
      allOrganic.users,
      "consenting_unique_users",
      `Metrika ${metrikaReport.window.date1}..${metrikaReport.window.date2}`,
    ),
    eligible_region_proxy_organic_users: observedMetric(
      organic.users,
      "consenting_unique_users",
      `Metrika ${metrikaReport.window.date1}..${metrikaReport.window.date2}; геолокационный proxy регионов выплат`,
    ),
    market_clicks: observedMetric(
      organic.market_click,
      "goal_reaches",
      "Органика без тестовых URL; геолокационный proxy регионов выплат",
    ),
    market_clicks_per_organic_user: organic.users > 0
      ? observedMetric(
        round(organic.market_click / organic.users),
        "goal_reaches_per_user",
        "Наблюдаемая диагностическая доля",
      )
      : unknown("Нет органических пользователей в измеренном окне"),
    approved_orders: observedMetric(
      approved.orders,
      "orders",
      `Affiliate Orders API по ${ordersAggregate.data_as_of}`,
    ),
    confirmed_reward_kopecks: observedMetric(
      approved.payment_kopecks,
      "kopecks",
      "Только текущий статус APPROVED и поле payment",
    ),
    approved_reward_per_order_kopecks: approved.orders > 0
      ? observedMetric(
        round(approved.payment_kopecks / approved.orders, 2),
        "kopecks_per_approved_order",
        "Фактический APPROVED payment",
      )
      : unknown("Нет APPROVED-заказов; нулевой доход не означает нулевую выплату на заказ"),
    created_order_rate: unknown(
      "Без созревших кликов и заказов нельзя оценить переход Market click → order",
    ),
    approval_rate: unknown(
      "Нет когорты созревших заказов; текущие pending не заменяют знаменатель",
    ),
    pending_orders: observedMetric(
      pendingOrders,
      "orders_not_revenue",
      "NEW + ON_HOLD; не подтверждённая выручка",
    ),
    cancelled_orders_in_month: observedMetric(
      ordersAggregate.cancelled_in_month.orders,
      "orders",
      `Месяц ${ordersAggregate.month}`,
    ),
  };
}

function rewardForScenario(promiseEvidence, probability) {
  const points = [
    [0, promiseEvidence.min],
    [0.25, promiseEvidence.p25],
    [0.5, promiseEvidence.median],
    [0.75, promiseEvidence.p75],
    [1, promiseEvidence.max],
  ];
  const exact = points.find(([point]) => point === probability);
  if (!exact) throw new Error("scenario quantile must be one of 0, 0.25, 0.5, 0.75 or 1");
  return exact[1];
}

export function calculateRevenueScenario({
  apiPromiseRubles,
  scenario,
  targetRewardKopecks,
}) {
  requireObject(scenario, "scenario");
  if (typeof scenario.id !== "string" || !/^[a-z][a-z0-9_-]*$/.test(scenario.id)) {
    throw new Error("scenario.id is invalid");
  }
  if (typeof scenario.label !== "string" || !scenario.label.trim()) {
    throw new Error("scenario.label is required");
  }
  const clickRate = requireRate(
    scenario.eligible_region_proxy_organic_user_to_market_click_rate,
    "eligible_region_proxy_organic_user_to_market_click_rate",
  );
  const orderRate = requireRate(
    scenario.market_click_to_created_order_rate,
    "market_click_to_created_order_rate",
  );
  const approvalRate = requireRate(
    scenario.created_order_to_approved_rate,
    "created_order_to_approved_rate",
  );
  if (!Number.isFinite(apiPromiseRubles) || apiPromiseRubles <= 0) {
    throw new Error("apiPromiseRubles must be positive");
  }
  requireNonNegativeInteger(targetRewardKopecks, "targetRewardKopecks");
  if (targetRewardKopecks === 0) throw new Error("targetRewardKopecks must be positive");

  const planningRewardKopecks = Math.round(apiPromiseRubles * 100);
  const approvedOrdersPerOrganicUser = clickRate * orderRate * approvalRate;
  const rewardKopecksPerOrganicUser = approvedOrdersPerOrganicUser
    * planningRewardKopecks;
  const organicUsersRequired = Math.ceil(targetRewardKopecks / rewardKopecksPerOrganicUser);
  const marketClicksRequired = Math.ceil(organicUsersRequired * clickRate);
  const createdOrdersRequired = Math.ceil(marketClicksRequired * orderRate);
  const approvedOrdersRequired = Math.ceil(targetRewardKopecks / planningRewardKopecks);

  return {
    id: scenario.id,
    label: scenario.label,
    assumptions_not_observations: {
      eligible_region_proxy_organic_user_to_market_click_rate: clickRate,
      market_click_to_created_order_rate: orderRate,
      created_order_to_approved_rate: approvalRate,
      planning_reward_kopecks_per_approved_order: planningRewardKopecks,
      planning_reward_basis: `api_promise_q${scenario.api_promise_quantile}`,
    },
    implied: {
      approved_orders_per_organic_user: round(approvedOrdersPerOrganicUser, 8),
      reward_kopecks_per_organic_user: round(rewardKopecksPerOrganicUser, 4),
      reward_rubles_per_organic_user: round(rewardKopecksPerOrganicUser / 100, 6),
    },
    required_for_target: {
      organic_users: organicUsersRequired,
      market_clicks: marketClicksRequired,
      created_orders: createdOrdersRequired,
      approved_orders: approvedOrdersRequired,
    },
  };
}

export function zeroEventUpperBound95(sampleSize) {
  requireNonNegativeInteger(sampleSize, "sampleSize");
  if (sampleSize === 0) return null;
  return 1 - (0.05 ** (1 / sampleSize));
}

export function buildAffiliateRevenueCapacity({
  generatedAt = new Date(),
  metrikaReport,
  ordersAggregate,
  offerSnapshot,
  scenarios = DEFAULT_REVENUE_SCENARIOS,
  targetRewardKopecks = 10_000_000,
}) {
  const generatedAtIso = generatedAt instanceof Date
    ? generatedAt.toISOString()
    : new Date(generatedAt).toISOString();
  requireIsoInstant(generatedAtIso, "generatedAt");
  requireNonNegativeInteger(targetRewardKopecks, "targetRewardKopecks");
  if (targetRewardKopecks <= 0) throw new Error("targetRewardKopecks must be positive");
  validateMetrikaReport(metrikaReport);
  validateOrdersAggregate(ordersAggregate);
  const apiPromiseEvidence = summarizeApiPromiseSnapshot(offerSnapshot);
  if (!Array.isArray(scenarios) || scenarios.length === 0) {
    throw new Error("at least one scenario is required");
  }

  const planningScenarios = scenarios.map((scenario) => calculateRevenueScenario({
    apiPromiseRubles: rewardForScenario(apiPromiseEvidence, scenario.api_promise_quantile),
    scenario,
    targetRewardKopecks,
  }));

  const report = {
    schema_version: 1,
    kind: "krepitv_affiliate_revenue_capacity",
    generated_at: generatedAtIso,
    target: {
      confirmed_reward_kopecks_per_month: targetRewardKopecks,
      recognition: "Только APPROVED payment после отмен и возвратов",
      recognition_source: "https://yandex.ru/dev/market/affiliate/ru/reference/get-orders",
      target_is_before_tax: true,
    },
    self_employed_context: {
      npd_rate: 0.06,
      net_kopecks_after_npd_if_target_is_reached: Math.round(targetRewardKopecks * 0.94),
      source: "https://yandex.ru/support/market-distr/ru/self-employed",
      note: "Возможный отдельный рекламный сбор не вычитается без подтверждения применимости к площадке",
    },
    measurement_contract: {
      revenue_path: [
        "eligible_region_proxy_organic_user",
        "market_click",
        "created_order",
        "approved_order",
        "payment",
      ],
      diagnostic_events_not_required_in_every_path: [
        "result_completed",
        "mount_detail_click",
      ],
      reason: "Страницы моделей и кронштейнов имеют прямую проверенную CTA Маркета",
      eligible_regions_source: "https://yandex.ru/dev/market/affiliate/ru/reference/get-orders",
      geography_limit: "Метрика видит геолокацию визита, а BANNED_REGIONS зависит от региона доставки; точность проверяется только по заказам",
    },
    observed: buildObservedEvidence(metrikaReport, ordersAggregate),
    api_promise_evidence: apiPromiseEvidence,
    planning_scenarios: planningScenarios,
    validation_gates: {
      first_market_click_cohort: 500,
      zero_orders_after_500_clicks_upper_rate_95: round(zeroEventUpperBound95(500), 6),
      first_mature_created_order_cohort: 30,
      zero_approved_after_30_orders_upper_rate_95: round(zeroEventUpperBound95(30), 6),
      approved_orders_before_reward_average_is_used_for_planning: 20,
      action: "До этих пор сценарии являются допущениями, а не прогнозом",
    },
  };

  const forbiddenKeys = new Set([
    "affiliate_href",
    "market_source_url",
    "order_key",
    "orderid",
    "vid",
    "clid",
    "oauth",
    "hmac",
  ]);
  function assertNoPrivateKeys(value) {
    if (Array.isArray(value)) {
      for (const item of value) assertNoPrivateKeys(item);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, item] of Object.entries(value)) {
      if (forbiddenKeys.has(key.toLowerCase())) {
        throw new Error(`capacity report contains forbidden private field: ${key}`);
      }
      assertNoPrivateKeys(item);
    }
  }
  assertNoPrivateKeys(report);
  return report;
}
