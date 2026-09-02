import { KNOWN_TOOL_IDS } from "../../web/src/lib/toolUsage.mjs";

const DATA_ENDPOINT = "https://api-metrika.yandex.net/stat/v1/data";
const EVENT_ORDER = Object.freeze([
  "result_completed",
  "selection_start",
  "mount_detail_click",
  "market_click",
]);
const INSTALLATION_KIT_INTERACTION_EVENT = "installation_kit_interaction";
const INSTALLATION_KIT_ACTIONS = Object.freeze([
  "checks_opened",
  "cable_check_opened",
  "print_started",
]);
const SOURCE_IDS = new Set([
  "ad",
  "direct",
  "email",
  "internal",
  "messenger",
  "organic",
  "recommend",
  "referral",
  "saved",
  "social",
]);
export const AFFILIATE_ELIGIBLE_REGION_AREAS_RU = Object.freeze([
  "Москва и Московская область",
  "Санкт-Петербург и Ленинградская область",
  "Воронежская область",
  "Краснодарский край",
  "Красноярский край",
  "Нижегородская область",
  "Новосибирская область",
  "Пермский край",
  "Республика Башкортостан",
  "Республика Татарстан",
  "Ростовская область",
  "Самарская область",
  "Свердловская область",
  "Челябинская область",
]);

const ORGANIC_FILTER =
  "ym:s:lastTrafficSource=='organic' AND ym:s:startURL!*'metrika-test' AND ym:s:startURL!*'_ym_status-check'";
const QUALIFIED_TRAFFIC_FILTER =
  "NOT(ym:s:lastTrafficSource=='internal') AND ym:s:startURL!*'metrika-test' AND ym:s:startURL!*'_ym_status-check'";
const TRAFFIC_GOAL_THRESHOLD_USERS = 1000;
const TRAFFIC_GOAL_REQUIRED_DAYS = 7;

function eligibleRegionsFilter() {
  return `(${AFFILIATE_ELIGIBLE_REGION_AREAS_RU
    .map((name) => `ym:s:regionAreaName=='${name}'`)
    .join(" OR ")})`;
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function metricNames(goalIds) {
  return [
    "ym:s:visits",
    "ym:s:users",
    ...EVENT_ORDER.map((eventId) => `ym:s:goal${goalIds[eventId]}reaches`),
  ];
}

export function buildMetrikaFunnelUrl({
  counterId,
  date1,
  date2,
  goalIds,
  organicOnly = false,
  affiliateEligibleRegionsOnly = false,
  dailyQualifiedTrafficOnly = false,
}) {
  if (!/^\d+$/.test(String(counterId ?? ""))) throw new Error("counterId must be numeric");
  if (!isIsoDate(date1) || !isIsoDate(date2) || date1 > date2) {
    throw new Error("date range must contain real ascending ISO dates");
  }
  for (const eventId of EVENT_ORDER) {
    if (!/^\d+$/.test(String(goalIds?.[eventId] ?? ""))) {
      throw new Error(`missing numeric goal id for ${eventId}`);
    }
  }

  const url = new URL(DATA_ENDPOINT);
  url.searchParams.set("ids", String(counterId));
  url.searchParams.set("date1", date1);
  url.searchParams.set("date2", date2);
  url.searchParams.set("accuracy", "full");
  url.searchParams.set("limit", "10000");
  url.searchParams.set(
    "dimensions",
    organicOnly || affiliateEligibleRegionsOnly || dailyQualifiedTrafficOnly
      ? "ym:s:date"
      : "ym:s:lastTrafficSource",
  );
  url.searchParams.set("metrics", metricNames(goalIds).join(","));
  url.searchParams.set(
    "sort",
    organicOnly || affiliateEligibleRegionsOnly || dailyQualifiedTrafficOnly
      ? "ym:s:date"
      : "-ym:s:visits",
  );
  if (dailyQualifiedTrafficOnly) {
    url.searchParams.set("filters", QUALIFIED_TRAFFIC_FILTER);
  } else if (affiliateEligibleRegionsOnly) {
    url.searchParams.set("lang", "ru");
    url.searchParams.set("filters", `${ORGANIC_FILTER} AND ${eligibleRegionsFilter()}`);
  } else if (organicOnly) {
    url.searchParams.set("filters", ORGANIC_FILTER);
  }
  return url;
}

export function buildMetrikaInteractionUrl({ counterId, date1, date2, goalIds }) {
  if (!/^\d+$/.test(String(counterId ?? ""))) throw new Error("counterId must be numeric");
  if (!isIsoDate(date1) || !isIsoDate(date2) || date1 > date2) {
    throw new Error("date range must contain real ascending ISO dates");
  }
  const goalId = goalIds?.[INSTALLATION_KIT_INTERACTION_EVENT];
  if (!/^\d+$/.test(String(goalId ?? ""))) {
    throw new Error(`missing numeric goal id for ${INSTALLATION_KIT_INTERACTION_EVENT}`);
  }
  const metric = `ym:s:goal${goalId}reaches`;
  const url = new URL(DATA_ENDPOINT);
  url.searchParams.set("ids", String(counterId));
  url.searchParams.set("date1", date1);
  url.searchParams.set("date2", date2);
  url.searchParams.set("accuracy", "full");
  url.searchParams.set("limit", "1000");
  url.searchParams.set("dimensions", [1, 2, 3, 4, 5]
    .map((level) => `ym:s:goal${goalId}paramsLevel${level}`)
    .join(","));
  url.searchParams.set("metrics", metric);
  url.searchParams.set("sort", `-${metric}`);
  return url;
}

export function buildMetrikaToolUsageUrl({ counterId, date1, date2, goalId }) {
  if (!/^\d+$/.test(String(counterId ?? ""))) throw new Error("counterId must be numeric");
  if (!isIsoDate(date1) || !isIsoDate(date2) || date1 > date2) {
    throw new Error("date range must contain real ascending ISO dates");
  }
  if (!/^\d+$/.test(String(goalId ?? ""))) {
    throw new Error("goalId must be numeric");
  }
  const metric = `ym:s:goal${goalId}reaches`;
  const url = new URL(DATA_ENDPOINT);
  url.searchParams.set("ids", String(counterId));
  url.searchParams.set("date1", date1);
  url.searchParams.set("date2", date2);
  url.searchParams.set("accuracy", "full");
  url.searchParams.set("limit", "1000");
  url.searchParams.set(
    "dimensions",
    [1, 2, 3, 4, 5]
      .map((level) => `ym:s:goal${goalId}paramsLevel${level}`)
      .join(","),
  );
  url.searchParams.set("metrics", metric);
  url.searchParams.set("sort", `-${metric}`);
  return url;
}

function isoDates(date1, date2) {
  const dates = [];
  const cursor = new Date(`${date1}T00:00:00Z`);
  const end = new Date(`${date2}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function dailyTrafficBreakdown(rows, date1, date2) {
  const byDate = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const dimension = Array.isArray(row?.dimensions) ? row.dimensions[0] : null;
    const date = String(dimension?.id ?? dimension?.name ?? "");
    if (!isIsoDate(date) || date < date1 || date > date2 || byDate.has(date)) {
      throw new Error("Metrika response has invalid daily traffic rows");
    }
    const metrics = validateTotals(row.metrics);
    byDate.set(date, {
      date,
      visits: metrics[0],
      users: metrics[1],
    });
  }
  return isoDates(date1, date2).map((date) => byDate.get(date) ?? {
    date,
    visits: 0,
    users: 0,
  });
}

export function evaluateDailyTrafficGoal(rows) {
  let current = 0;
  let longest = 0;
  for (const row of rows) {
    current = row.users > TRAFFIC_GOAL_THRESHOLD_USERS ? current + 1 : 0;
    longest = Math.max(longest, current);
  }
  let trailing = 0;
  for (let index = rows.length - 1; index >= 0; index -= 1) {
    if (rows[index].users <= TRAFFIC_GOAL_THRESHOLD_USERS) break;
    trailing += 1;
  }
  return {
    metric: "ym:s:users",
    coverage: "Нижняя граница: посетители с включённой аналитикой, без сохранённого отказа",
    comparison: "greater_than",
    threshold_users: TRAFFIC_GOAL_THRESHOLD_USERS,
    required_consecutive_days: TRAFFIC_GOAL_REQUIRED_DAYS,
    trailing_consecutive_days: trailing,
    longest_consecutive_days: longest,
    status: trailing >= TRAFFIC_GOAL_REQUIRED_DAYS
      ? "lower_bound_reached"
      : "lower_bound_not_reached",
  };
}

function safeApiError(payload) {
  const first = Array.isArray(payload?.errors) ? payload.errors[0] : null;
  return first?.error_type ?? payload?.code ?? "unknown_api_error";
}

async function readPayload(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
}

function validateTotals(value) {
  if (
    !Array.isArray(value)
    || value.length !== 2 + EVENT_ORDER.length
    || value.some((item) => !Number.isFinite(item) || item < 0)
  ) {
    throw new Error("Metrika response has invalid totals");
  }
  return value;
}

function totalsObject(value) {
  const totals = validateTotals(value);
  return {
    visits: totals[0],
    users: totals[1],
    result_completed: totals[2],
    selection_start: totals[3],
    mount_detail_click: totals[4],
    market_click: totals[5],
  };
}

function interactionTotals(payload) {
  if (
    !Array.isArray(payload?.totals)
    || payload.totals.length !== 1
    || !Number.isFinite(payload.totals[0])
    || payload.totals[0] < 0
  ) {
    throw new Error("Metrika interaction response has invalid totals");
  }
  if (payload.breakdown_state === "unavailable") {
    return {
      breakdown_state: "unavailable",
      coverage: "Агрегат цели без разбивки по параметрам",
      total_reaches: payload.totals[0],
      actions: null,
      revenue_interpretation: "not_revenue",
    };
  }
  const actions = Object.fromEntries(INSTALLATION_KIT_ACTIONS.map((action) => [action, 0]));
  for (const row of Array.isArray(payload.data) ? payload.data : []) {
    if (
      !Array.isArray(row?.metrics)
      || row.metrics.length !== 1
      || !Number.isFinite(row.metrics[0])
      || row.metrics[0] < 0
    ) {
      throw new Error("Metrika interaction response has invalid rows");
    }
    const dimensionTokens = (Array.isArray(row.dimensions) ? row.dimensions : [])
      .flatMap((dimension) => [dimension?.id, dimension?.name])
      .filter((value) => typeof value === "string");
    const action = INSTALLATION_KIT_ACTIONS.find((candidate) => dimensionTokens.includes(candidate));
    if (action) actions[action] += row.metrics[0];
  }
  return {
    breakdown_state: "available",
    coverage: "Только контролируемые действия со сводкой монтажного комплекта",
    total_reaches: payload.totals[0],
    actions,
    revenue_interpretation: "not_revenue",
  };
}

function goalParameterTotals(payload) {
  if (
    !Array.isArray(payload?.totals) ||
    payload.totals.length !== 1 ||
    !Number.isFinite(payload.totals[0]) ||
    payload.totals[0] < 0
  ) {
    throw new Error("Metrika tool usage response has invalid totals");
  }
  if (payload.breakdown_state === "unavailable") {
    return { byTool: null, total: payload.totals[0], breakdownState: "unavailable" };
  }
  const byTool = new Map();
  const known = new Set(KNOWN_TOOL_IDS);
  for (const row of Array.isArray(payload.data) ? payload.data : []) {
    if (
      !Array.isArray(row?.metrics) ||
      row.metrics.length !== 1 ||
      !Number.isFinite(row.metrics[0]) ||
      row.metrics[0] < 0
    ) {
      throw new Error("Metrika tool usage response has invalid rows");
    }
    const tokens = (Array.isArray(row.dimensions) ? row.dimensions : [])
      .flatMap((dimension) => [dimension?.id, dimension?.name])
      .filter((value) => typeof value === "string");
    const toolId = KNOWN_TOOL_IDS.find((candidate) => tokens.includes(candidate));
    if (toolId && known.has(toolId)) {
      byTool.set(toolId, (byTool.get(toolId) ?? 0) + row.metrics[0]);
    }
  }
  return { byTool, total: payload.totals[0], breakdownState: "available" };
}

function toolUsageTotals(startedPayload, completedPayload) {
  const started = goalParameterTotals(startedPayload);
  const completed = goalParameterTotals(completedPayload);
  if (started.breakdownState === "unavailable" || completed.breakdownState === "unavailable") {
    return {
      breakdown_state: "unavailable",
      coverage: "Агрегаты целей без разбивки по инструментам",
      total_started_reaches: started.total,
      total_completed_reaches: completed.total,
      tools: null,
    };
  }
  const toolIds = new Set([...started.byTool.keys(), ...completed.byTool.keys()]);
  const tools = [...toolIds].map((toolId) => {
    const startedCount = started.byTool.get(toolId) ?? 0;
    const completedCount = completed.byTool.get(toolId) ?? 0;
    return {
      tool_id: toolId,
      started: startedCount,
      completed: completedCount,
      completion_rate: startedCount > 0
        ? Math.round((completedCount / startedCount) * 10_000) / 10_000
        : null,
    };
  }).sort((left, right) =>
    right.started - left.started ||
    right.completed - left.completed ||
    left.tool_id.localeCompare(right.tool_id));
  return {
    breakdown_state: "available",
    coverage: "Только известные инструменты и обезличенные started/completed",
    total_started_reaches: started.total,
    total_completed_reaches: completed.total,
    tools,
  };
}

function safeSourceId(row) {
  const dimension = Array.isArray(row?.dimensions) ? row.dimensions[0] : null;
  const candidate = String(dimension?.id ?? dimension?.name ?? "").toLowerCase();
  return SOURCE_IDS.has(candidate) ? candidate : "other";
}

function sourceBreakdown(rows) {
  const totals = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const metrics = validateTotals(row.metrics);
    const id = safeSourceId(row);
    const current = totals.get(id) ?? {
      source: id,
      visits: 0,
      result_completed: 0,
      selection_start: 0,
      mount_detail_click: 0,
      market_click: 0,
    };
    current.visits += metrics[0];
    current.result_completed += metrics[2];
    current.selection_start += metrics[3];
    current.mount_detail_click += metrics[4];
    current.market_click += metrics[5];
    totals.set(id, current);
  }
  return [...totals.values()].sort(
    (left, right) => right.visits - left.visits || left.source.localeCompare(right.source),
  );
}

export async function fetchMetrikaFunnel({
  counterId,
  date1,
  date2,
  fetchImpl = globalThis.fetch,
  goalIds,
  now = new Date(),
  token,
}) {
  if (typeof token !== "string" || token.length < 16) throw new Error("OAuth token is missing");
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is missing");

  async function load({
    affiliateEligibleRegionsOnly = false,
    dailyQualifiedTrafficOnly = false,
    organicOnly = false,
  } = {}) {
    const url = buildMetrikaFunnelUrl({
      affiliateEligibleRegionsOnly,
      counterId,
      dailyQualifiedTrafficOnly,
      date1,
      date2,
      goalIds,
      organicOnly,
    });
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `OAuth ${token}`,
      },
      method: "GET",
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      throw new Error(`Metrika data GET failed: HTTP ${response.status}, ${safeApiError(payload)}`);
    }
    return payload;
  }

  async function loadInteractions() {
    const url = buildMetrikaInteractionUrl({ counterId, date1, date2, goalIds });
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `OAuth ${token}`,
      },
      method: "GET",
    });
    const payload = await readPayload(response);
    if (!response.ok && safeApiError(payload) === "invalid_parameter") {
      return loadGoalTotal(goalIds?.[INSTALLATION_KIT_INTERACTION_EVENT]);
    }
    if (!response.ok) {
      throw new Error(`Metrika interaction GET failed: HTTP ${response.status}, ${safeApiError(payload)}`);
    }
    return { ...payload, breakdown_state: "available" };
  }

  async function loadGoalTotal(goalId) {
    if (!/^\d+$/.test(String(goalId ?? ""))) throw new Error("goalId must be numeric");
    const url = new URL(DATA_ENDPOINT);
    url.searchParams.set("ids", String(counterId));
    url.searchParams.set("date1", date1);
    url.searchParams.set("date2", date2);
    url.searchParams.set("accuracy", "full");
    url.searchParams.set("limit", "1");
    url.searchParams.set("metrics", `ym:s:goal${goalId}reaches`);
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `OAuth ${token}`,
      },
      method: "GET",
    });
    const payload = await readPayload(response);
    if (!response.ok) {
      throw new Error(`Metrika goal total GET failed: HTTP ${response.status}, ${safeApiError(payload)}`);
    }
    return { ...payload, breakdown_state: "unavailable" };
  }

  async function loadToolGoal(goalId) {
    const url = buildMetrikaToolUsageUrl({ counterId, date1, date2, goalId });
    const response = await fetchImpl(url, {
      headers: {
        Accept: "application/json",
        Authorization: `OAuth ${token}`,
      },
      method: "GET",
    });
    const payload = await readPayload(response);
    if (!response.ok && safeApiError(payload) === "invalid_parameter") {
      return loadGoalTotal(goalId);
    }
    if (!response.ok) {
      throw new Error(`Metrika tool usage GET failed: HTTP ${response.status}, ${safeApiError(payload)}`);
    }
    return { ...payload, breakdown_state: "available" };
  }

  const [
    allSources,
    organic,
    eligibleRegionsOrganic,
    dailyQualifiedTraffic,
    interactions,
    toolStarted,
    toolCompleted,
  ] = await Promise.all([
    load(),
    load({ organicOnly: true }),
    load({ affiliateEligibleRegionsOnly: true }),
    load({ dailyQualifiedTrafficOnly: true }),
    loadInteractions(),
    loadToolGoal(goalIds?.tool_usage),
    loadToolGoal(goalIds?.result_completed),
  ]);
  const observedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const dailyTraffic = dailyTrafficBreakdown(dailyQualifiedTraffic.data, date1, date2);
  return {
    schema_version: 5,
    observed_at: observedAt,
    window: { date1, date2 },
    coverage: "Посетители с включённой аналитикой; сохранённый отказ исключён",
    all_consenting: totalsObject(allSources.totals),
    source_breakdown: sourceBreakdown(allSources.data),
    daily_consenting_excluding_internal_tests: dailyTraffic,
    daily_traffic_goal: evaluateDailyTrafficGoal(dailyTraffic),
    organic_excluding_tests: totalsObject(organic.totals),
    eligible_regions_organic_excluding_tests: totalsObject(
      eligibleRegionsOrganic.totals,
    ),
    installation_kit_interactions: interactionTotals(interactions),
    tool_usage: toolUsageTotals(toolStarted, toolCompleted),
    affiliate_eligible_region_areas_ru: [...AFFILIATE_ELIGIBLE_REGION_AREAS_RU],
    quality: {
      all_consenting: {
        sampled: Boolean(allSources.sampled),
        sample_share: Number(allSources.sample_share ?? 1),
        data_lag: Number(allSources.data_lag ?? 0),
      },
      daily_consenting_excluding_internal_tests: {
        sampled: Boolean(dailyQualifiedTraffic.sampled),
        sample_share: Number(dailyQualifiedTraffic.sample_share ?? 1),
        data_lag: Number(dailyQualifiedTraffic.data_lag ?? 0),
      },
      organic_excluding_tests: {
        sampled: Boolean(organic.sampled),
        sample_share: Number(organic.sample_share ?? 1),
        data_lag: Number(organic.data_lag ?? 0),
      },
      eligible_regions_organic_excluding_tests: {
        sampled: Boolean(eligibleRegionsOrganic.sampled),
        sample_share: Number(eligibleRegionsOrganic.sample_share ?? 1),
        data_lag: Number(eligibleRegionsOrganic.data_lag ?? 0),
      },
      installation_kit_interactions: {
        sampled: Boolean(interactions.sampled),
        sample_share: Number(interactions.sample_share ?? 1),
        data_lag: Number(interactions.data_lag ?? 0),
      },
      tool_usage: {
        started_sampled: Boolean(toolStarted.sampled),
        started_sample_share: Number(toolStarted.sample_share ?? 1),
        started_data_lag: Number(toolStarted.data_lag ?? 0),
        completed_sampled: Boolean(toolCompleted.sampled),
        completed_sample_share: Number(toolCompleted.sample_share ?? 1),
        completed_data_lag: Number(toolCompleted.data_lag ?? 0),
      },
    },
  };
}
