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
    organicOnly ? "ym:s:date" : "ym:s:lastTrafficSource",
  );
  url.searchParams.set("metrics", metricNames(goalIds).join(","));
  url.searchParams.set("sort", organicOnly ? "ym:s:date" : "-ym:s:visits");
  if (organicOnly) {
    url.searchParams.set(
      "filters",
      "ym:s:lastTrafficSource=='organic' AND ym:s:startURL!*'metrika-test' AND ym:s:startURL!*'_ym_status-check'",
    );
  }
  return url;
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

  async function load(organicOnly) {
    const url = buildMetrikaFunnelUrl({ counterId, date1, date2, goalIds, organicOnly });
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

  const [allSources, organic] = await Promise.all([load(false), load(true)]);
  const observedAt = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  return {
    schema_version: 1,
    observed_at: observedAt,
    window: { date1, date2 },
    coverage: "Только посетители, разрешившие Яндекс Метрику",
    all_consenting: totalsObject(allSources.totals),
    source_breakdown: sourceBreakdown(allSources.data),
    organic_excluding_tests: totalsObject(organic.totals),
    quality: {
      all_consenting: {
        sampled: Boolean(allSources.sampled),
        sample_share: Number(allSources.sample_share ?? 1),
        data_lag: Number(allSources.data_lag ?? 0),
      },
      organic_excluding_tests: {
        sampled: Boolean(organic.sampled),
        sample_share: Number(organic.sample_share ?? 1),
        data_lag: Number(organic.data_lag ?? 0),
      },
    },
  };
}
