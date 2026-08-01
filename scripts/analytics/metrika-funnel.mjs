const DATA_ENDPOINT = "https://api-metrika.yandex.net/stat/v1/data";
const EVENT_ORDER = Object.freeze([
  "result_completed",
  "mount_detail_click",
  "market_click",
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
    coverage: "Нижняя граница: только посетители, разрешившие Яндекс Метрику",
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
    || value.length !== 5
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
    mount_detail_click: totals[3],
    market_click: totals[4],
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
      mount_detail_click: 0,
      market_click: 0,
    };
    current.visits += metrics[0];
    current.result_completed += metrics[2];
    current.mount_detail_click += metrics[3];
    current.market_click += metrics[4];
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

  const [allSources, organic, eligibleRegionsOrganic, dailyQualifiedTraffic] = await Promise.all([
    load(),
    load({ organicOnly: true }),
    load({ affiliateEligibleRegionsOnly: true }),
    load({ dailyQualifiedTrafficOnly: true }),
  ]);
  const observedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const dailyTraffic = dailyTrafficBreakdown(dailyQualifiedTraffic.data, date1, date2);
  return {
    schema_version: 3,
    observed_at: observedAt,
    window: { date1, date2 },
    coverage: "Только посетители, разрешившие Яндекс Метрику",
    all_consenting: totalsObject(allSources.totals),
    source_breakdown: sourceBreakdown(allSources.data),
    daily_consenting_excluding_internal_tests: dailyTraffic,
    daily_traffic_goal: evaluateDailyTrafficGoal(dailyTraffic),
    organic_excluding_tests: totalsObject(organic.totals),
    eligible_regions_organic_excluding_tests: totalsObject(
      eligibleRegionsOrganic.totals,
    ),
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
    },
  };
}
