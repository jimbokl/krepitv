const API_ROOT = "https://api.webmaster.yandex.net/v4";
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);
const NOT_MATURED_CODES = new Set(["HOST_NOT_INDEXED", "HOST_NOT_LOADED"]);
const SAFE_HOST_STATUSES = new Set(["NOT_INDEXED", "NOT_LOADED", "OK"]);
const SAFE_EVENTS = new Set(["APPEARED_IN_SEARCH", "REMOVED_FROM_SEARCH"]);
const SAFE_EXCLUSION_STATUSES = new Set([
  "BAD_QUALITY",
  "DUPLICATE",
  "ERROR",
  "HOST_ERROR",
  "HTTP_ERROR",
  "NOTHING_FOUND",
  "NOT_CANONICAL",
  "NOT_MAIN_MIRROR",
  "NO_INDEX",
  "REDIRECT_NOTSEARCHABLE",
  "ROBOTS_HOST_ERROR",
  "ROBOTS_URL_ERROR",
  "UNKNOWN",
]);

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value ?? "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function safeLabel(value, fallback = "UNKNOWN") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/gu, " ").trim();
  return text && text.length <= 100 && /^[A-Z0-9_:-]+$/u.test(text) ? text : fallback;
}

function requiredNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function optionalInteger(value) {
  if (value === undefined || value === null) return null;
  return Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function validateSiteUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("siteUrl must be an HTTPS URL-prefix origin with a trailing slash");
  }
  if (
    url.protocol !== "https:"
    || url.username
    || url.password
    || url.pathname !== "/"
    || url.search
    || url.hash
  ) {
    throw new Error("siteUrl must be an HTTPS URL-prefix origin with a trailing slash");
  }
  return url.href;
}

function sameOriginPath(value, siteUrl) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const site = new URL(siteUrl);
  if (
    url.origin !== site.origin
    || url.username
    || url.password
    || url.search
    || url.hash
  ) return null;
  return url.pathname || "/";
}

function isAbsoluteHttpUrl(value) {
  try {
    const url = new URL(value);
    return (url.protocol === "https:" || url.protocol === "http:")
      && !url.username
      && !url.password;
  } catch {
    return false;
  }
}

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function parseYandexSitemapUrls(xml, siteUrl) {
  const normalizedSite = validateSiteUrl(siteUrl);
  if (typeof xml !== "string" || !xml.includes("<urlset")) {
    throw new Error("sitemap is not a URL set");
  }
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/giu)]
    .map((match) => decodeXml(match[1]));
  if (!urls.length) throw new Error("sitemap has no URLs");
  const seen = new Set();
  for (const value of urls) {
    const path = sameOriginPath(value, normalizedSite);
    if (!path || new URL(path, normalizedSite).href !== value) {
      throw new Error("sitemap contains an off-origin or non-canonical URL");
    }
    if (seen.has(value)) throw new Error("sitemap contains duplicate URLs");
    seen.add(value);
  }
  return urls;
}

function sameUrlSet(left, right) {
  if (left.length !== right.length) return false;
  const expected = new Set(left);
  return right.every((url) => expected.has(url));
}

export function validateYandexWebmasterCredentials(value) {
  if (!isPlainObject(value) || typeof value.access_token !== "string" || value.access_token.length < 16) {
    throw new Error("invalid Yandex Webmaster credentials");
  }
  return { access_token: value.access_token };
}

function retryDelay(response, attempt) {
  const raw = response?.headers?.get?.("retry-after");
  const seconds = Number(raw);
  if (raw !== null && raw !== "" && Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds, 30) * 1000;
  }
  return 500 * (attempt + 1);
}

async function fetchTextWithRetry({
  fetchImpl,
  options,
  sleepImpl,
  timeoutMs,
  url,
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    let timeout;
    try {
      const requestAndBody = (async () => {
        const response = await fetchImpl(url, { ...options, signal: controller.signal });
        const text = await response.text();
        return { response, text };
      })();
      const timedOut = new Promise((_, reject) => {
        timeout = setTimeout(() => {
          controller.abort();
          reject(new Error("Yandex Webmaster request timed out"));
        }, timeoutMs);
      });
      const { response, text } = await Promise.race([requestAndBody, timedOut]);
      clearTimeout(timeout);
      if (TRANSIENT_STATUS.has(response.status) && attempt < 2) {
        await sleepImpl(retryDelay(response, attempt));
        continue;
      }
      return { response, text };
    } catch {
      if (attempt === 2) throw new Error("Yandex Webmaster request failed after bounded retries");
      await sleepImpl(500 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Yandex Webmaster request failed after bounded retries");
}

function parseJson(text) {
  if (!text.trim()) return null;
  try {
    const payload = JSON.parse(text);
    return isPlainObject(payload) ? payload : null;
  } catch {
    return null;
  }
}

function safeApiCode(payload) {
  return safeLabel(payload?.error_code ?? "HTTP_ERROR");
}

async function apiRequest({
  body,
  fetchImpl,
  method = "GET",
  sleepImpl,
  timeoutMs,
  token,
  url,
}) {
  const { response, text } = await fetchTextWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs,
    url,
    options: {
      body: body === undefined ? undefined : JSON.stringify(body),
      headers: {
        Accept: "application/json",
        Authorization: `OAuth ${token}`,
        ...(body === undefined ? {} : { "Content-Type": "application/json; charset=UTF-8" }),
      },
      method,
    },
  });
  const payload = parseJson(text);
  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      code: safeApiCode(payload),
    };
  }
  if (!payload) {
    return { ok: false, status: response.status, code: "INVALID_RESPONSE" };
  }
  return { ok: true, payload };
}

function requireApi(result, label) {
  if (!result.ok) throw new Error(`${label} failed: HTTP ${result.status}, ${result.code}`);
  return result.payload;
}

function stateForFailure(result) {
  return NOT_MATURED_CODES.has(result.code) ? "not_matured" : "unknown";
}

function safeFailure(result) {
  return result.ok ? null : { status: result.status, code: result.code };
}

function queryLooksPrivate(query) {
  return query.length > 180
    || /[\u0000-\u001f\u007f]/u.test(query)
    || /https?:\/\/|www\./iu.test(query)
    || /\b[^\s@]+@[^\s@]+\.[^\s@]+\b/u.test(query)
    || /(?:\+?\d[\s().-]*){7,}/u.test(query)
    || /\b(?:\d{1,3}\.){3}\d{1,3}\b/u.test(query)
    || /\b\d{6}\b/u.test(query)
    || /(?:^|\s)@[a-z\d_]{3,}\b/iu.test(query)
    || /(?:^|[^\p{L}\p{N}_])(?:улица|ул(?:\.|ица)?|проспект|пр-т|переулок|пер\.?|шоссе|дом|д\.|корпус|корп\.?|квартира|кв\.?|адрес)(?=$|[^\p{L}\p{N}_])/iu.test(query);
}

function hostMaturityState(hostDataStatus) {
  return hostDataStatus === "OK" ? "available" : "not_matured";
}

function sanitizeSummary(result) {
  if (!result.ok) return { state: stateForFailure(result), error: safeFailure(result) };
  const searchable = optionalInteger(result.payload.searchable_pages_count);
  const excluded = optionalInteger(result.payload.excluded_pages_count);
  const sqi = optionalInteger(result.payload.sqi);
  if (searchable === null || excluded === null) {
    return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
  }
  return {
    state: "available",
    searchable_pages_count: searchable,
    excluded_pages_count: excluded,
    sqi,
  };
}

function sitemapList(result, sitemapUrl, kind) {
  if (!result.ok) return { state: stateForFailure(result), error: safeFailure(result) };
  const rows = result.payload.sitemaps;
  if (
    !Array.isArray(rows)
    || rows.some((row) => !isPlainObject(row) || !isAbsoluteHttpUrl(row.sitemap_url))
  ) {
    return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
  }
  const totalCount = kind === "user_added" ? optionalInteger(result.payload.count) : rows.length;
  if (kind === "user_added" && (totalCount === null || totalCount < rows.length)) {
    return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
  }
  const truncated = kind === "user_added" ? totalCount > rows.length : rows.length >= 100;
  const target = rows.find((row) => row.sitemap_url === sitemapUrl);
  if (!target && truncated) {
    return {
      state: "unknown",
      count: totalCount,
      received_count: rows.length,
      truncated: true,
      target: { state: "unknown" },
      error: { status: 200, code: "TRUNCATED_LIST" },
    };
  }
  if (!target) return {
    state: "available", count: totalCount, received_count: rows.length, truncated: false, target: { state: "not_found" },
  };
  if (kind === "user_added") {
    if (!/^\d{4}-\d{2}-\d{2}T/u.test(target.added_date ?? "")) {
      return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
    }
    return {
      state: "available",
      count: totalCount,
      received_count: rows.length,
      truncated,
      target: {
        state: "present",
        added_date: target.added_date,
      },
    };
  }
  const errors = optionalInteger(target.errors_count);
  const urls = optionalInteger(target.urls_count);
  const children = optionalInteger(target.children_count);
  if (
    errors === null
    || urls === null
    || children === null
    || !Array.isArray(target.sources)
    || safeLabel(target.sitemap_type) === "UNKNOWN"
  ) {
    return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
  }
  const sources = target.sources.map((value) => safeLabel(value)).filter((value) => value !== "UNKNOWN");
  if (sources.length !== target.sources.length) {
    return { state: "unknown", error: { status: 200, code: "INVALID_RESPONSE" } };
  }
  return {
    state: "available",
    count: totalCount,
    received_count: rows.length,
    truncated,
    target: {
      state: "discovered",
      errors_count: errors,
      urls_count: urls,
      children_count: children,
      sources: [...new Set(sources)].sort(),
      sitemap_type: safeLabel(target.sitemap_type),
      last_access_date: /^\d{4}-\d{2}-\d{2}T/u.test(target.last_access_date ?? "")
        ? target.last_access_date
        : null,
    },
  };
}

function datesInWindow(date1, date2) {
  const dates = [];
  const cursor = new Date(`${date1}T00:00:00Z`);
  const end = new Date(`${date2}T00:00:00Z`);
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function sanitizeHistory(result, indicator, date1, date2) {
  const expectedDates = datesInWindow(date1, date2);
  if (!result.ok) return {
    state: stateForFailure(result), value: null, observed_days: null, expected_days: expectedDates.length, error: safeFailure(result),
  };
  const indicators = result.payload.indicators;
  const rows = isPlainObject(indicators) ? indicators[indicator] : null;
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      state: "unknown", value: null, observed_days: rows?.length ?? null, expected_days: expectedDates.length, error: { status: 200, code: "INCOMPLETE_HISTORY" },
    };
  }
  let value = 0;
  const observedDates = new Set();
  for (const row of rows) {
    const observedDate = typeof row?.date === "string" ? row.date.slice(0, 10) : null;
    if (
      !isPlainObject(row)
      || !isIsoDate(observedDate)
      || observedDate < date1
      || observedDate > date2
      || observedDates.has(observedDate)
      || requiredNumber(row.value) === null
    ) {
      return {
        state: "unknown", value: null, observed_days: null, expected_days: expectedDates.length, error: { status: 200, code: "INVALID_RESPONSE" },
      };
    }
    observedDates.add(observedDate);
    value += row.value;
  }
  const complete = expectedDates.every((date) => observedDates.has(date));
  if (!complete || observedDates.size !== expectedDates.length) {
    return {
      state: "unknown",
      value: null,
      observed_days: observedDates.size,
      expected_days: expectedDates.length,
      error: { status: 200, code: "INCOMPLETE_HISTORY" },
    };
  }
  return {
    state: "available",
    value,
    observed_days: observedDates.size,
    expected_days: expectedDates.length,
    error: null,
  };
}

function aggregateQueryStatistics(statistics, date1, date2) {
  if (!Array.isArray(statistics)) return null;
  let impressions = 0;
  let clicks = 0;
  const positions = [];
  for (const item of statistics) {
    if (
      !isPlainObject(item)
      || !isIsoDate(item.date)
      || typeof item.field !== "string"
      || requiredNumber(item.value) === null
    ) return null;
    if (item.date < date1 || item.date > date2) continue;
    if (item.field === "IMPRESSIONS") impressions += item.value;
    else if (item.field === "CLICKS") clicks += item.value;
    else if (item.field === "POSITION") positions.push(item.value);
  }
  return {
    impressions,
    clicks,
    ctr: impressions ? clicks / impressions : 0,
    mean_of_daily_positions: positions.length
      ? positions.reduce((sum, value) => sum + value, 0) / positions.length
      : null,
  };
}

function sanitizeQueryAnalytics(result, { date1, date2, minImpressions, siteUrl }) {
  if (!result.ok) {
    return {
      state: stateForFailure(result),
      min_impressions: minImpressions,
      received_rows: null,
      rows: [],
      suppressed: null,
      error: safeFailure(result),
    };
  }
  const sourceRows = result.payload.text_indicator_to_statistics;
  const count = optionalInteger(result.payload.count);
  if (!Array.isArray(sourceRows) || count === null) {
    return {
      state: "unknown",
      min_impressions: minImpressions,
      received_rows: null,
      rows: [],
      suppressed: null,
      error: { status: 200, code: "INVALID_RESPONSE" },
    };
  }
  const rows = [];
  const suppressed = { below_threshold: 0, unsafe_query: 0, invalid_page: 0, invalid_schema: 0 };
  for (const source of sourceRows) {
    const primary = source?.text_indicator;
    const complement = source?.popular_complementary_indicator;
    if (
      !isPlainObject(source)
      || !isPlainObject(primary)
      || primary.type !== "QUERY"
      || typeof primary.value !== "string"
      || !isPlainObject(complement)
      || complement.type !== "URL"
      || typeof complement.value !== "string"
    ) {
      suppressed.invalid_schema += 1;
      continue;
    }
    const metrics = aggregateQueryStatistics(source.statistics, date1, date2);
    if (!metrics) {
      suppressed.invalid_schema += 1;
      continue;
    }
    if (metrics.impressions < minImpressions) {
      suppressed.below_threshold += 1;
      continue;
    }
    const query = primary.value.trim();
    if (!query || queryLooksPrivate(query)) {
      suppressed.unsafe_query += 1;
      continue;
    }
    const path = sameOriginPath(complement.value, siteUrl);
    if (!path) {
      suppressed.invalid_page += 1;
      continue;
    }
    rows.push({ query, path, ...metrics });
  }
  rows.sort((left, right) => right.impressions - left.impressions
    || right.clicks - left.clicks
    || left.query.localeCompare(right.query, "ru"));
  return {
    state: "available",
    coverage: "one_most_popular_page_per_query_top_500_not_full_matrix",
    min_impressions: minImpressions,
    received_rows: sourceRows.length,
    total_available_rows: count,
    truncated: count > sourceRows.length,
    rows,
    suppressed,
    error: null,
  };
}

function sanitizeInSearchSamples(result, siteUrl) {
  if (!result.ok) return {
    state: stateForFailure(result), count: null, received_rows: null, truncated: null, rows: [], error: safeFailure(result),
  };
  const count = optionalInteger(result.payload.count);
  const samples = result.payload.samples;
  if (count === null || !Array.isArray(samples) || count < samples.length) {
    return {
      state: "unknown", count: null, received_rows: null, truncated: null, rows: [], error: { status: 200, code: "INVALID_RESPONSE" },
    };
  }
  const rows = [];
  const paths = new Set();
  for (const sample of samples) {
    const path = isPlainObject(sample) ? sameOriginPath(sample.url, siteUrl) : null;
    if (!path || paths.has(path) || !/^\d{4}-\d{2}-\d{2}T/u.test(sample.last_access ?? "")) {
      return {
        state: "unknown", count: null, received_rows: null, truncated: null, rows: [], error: { status: 200, code: "INVALID_RESPONSE" },
      };
    }
    paths.add(path);
    rows.push({ path, last_access: sample.last_access });
  }
  return {
    state: "available",
    coverage: "sample_up_to_100_not_authoritative_total",
    count,
    received_rows: samples.length,
    truncated: count > samples.length,
    rows,
    error: null,
  };
}

function targetRelation(value, siteUrl) {
  if (!value) return { relation: "none" };
  const path = sameOriginPath(value, siteUrl);
  if (path) return { relation: "same_site", path };
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:"
      ? { relation: "external" }
      : { relation: "invalid" };
  } catch {
    return { relation: "invalid" };
  }
}

function sanitizeSearchEvents(result, siteUrl) {
  if (!result.ok) return {
    state: stateForFailure(result), count: null, received_rows: null, truncated: null, rows: [], error: safeFailure(result),
  };
  const count = optionalInteger(result.payload.count);
  const samples = result.payload.samples;
  if (count === null || !Array.isArray(samples) || count < samples.length) {
    return {
      state: "unknown", count: null, received_rows: null, truncated: null, rows: [], error: { status: 200, code: "INVALID_RESPONSE" },
    };
  }
  const rows = [];
  for (const sample of samples) {
    const path = isPlainObject(sample) ? sameOriginPath(sample.url, siteUrl) : null;
    if (
      !path
      || !SAFE_EVENTS.has(sample.event)
      || !/^\d{4}-\d{2}-\d{2}T/u.test(sample.event_date ?? "")
      || !/^\d{4}-\d{2}-\d{2}T/u.test(sample.last_access ?? "")
    ) {
      return {
        state: "unknown", count: null, received_rows: null, truncated: null, rows: [], error: { status: 200, code: "INVALID_RESPONSE" },
      };
    }
    const event = sample.event;
    const exclusion = SAFE_EXCLUSION_STATUSES.has(sample.excluded_url_status)
      ? sample.excluded_url_status
      : null;
    rows.push({
      path,
      event,
      excluded_url_status: exclusion,
      bad_http_status: optionalInteger(sample.bad_http_status),
      target: targetRelation(sample.target_url, siteUrl),
      event_date: sample.event_date,
      last_access: sample.last_access,
    });
  }
  return {
    state: "available",
    coverage: "sample_up_to_100_not_authoritative_history",
    count,
    received_rows: samples.length,
    truncated: count > samples.length,
    rows,
    error: null,
  };
}

function assertSanitizedReport(report, credentials, privateValues) {
  const serialized = JSON.stringify(report);
  const forbiddenValues = [credentials.access_token, ...privateValues]
    .filter((value) => (typeof value === "string" || typeof value === "number") && String(value).length >= 5)
    .map(String);
  const forbiddenKeys = [
    "access_token",
    "Authorization",
    "client_id",
    "error_message",
    "host_id",
    "query_id",
    "sitemap_id",
    "title",
    "user_id",
  ];
  if (
    forbiddenValues.some((value) => serialized.includes(value))
    || forbiddenKeys.some((value) => serialized.includes(`\"${value}\"`))
  ) {
    throw new Error("sanitized Yandex Webmaster report contains private identifiers or credentials");
  }
}

export async function fetchYandexWebmasterReport({
  credentials: credentialsValue,
  date1,
  date2,
  fetchImpl = globalThis.fetch,
  localSitemapXml,
  minQueryImpressions = 10,
  now = new Date(),
  queryLimit = 500,
  requestTimeoutMs = 30_000,
  siteUrl: siteValue = "https://krepitv.ru/",
  sitemapUrl: sitemapValue = "https://krepitv.ru/sitemap.xml",
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const credentials = validateYandexWebmasterCredentials(credentialsValue);
  const token = credentials.access_token;
  const siteUrl = validateSiteUrl(siteValue);
  const sitemapUrl = new URL(sitemapValue).href;
  if (sameOriginPath(sitemapUrl, siteUrl) !== "/sitemap.xml") {
    throw new Error("sitemapUrl must be the canonical same-origin /sitemap.xml");
  }
  if (!isIsoDate(date1) || !isIsoDate(date2) || date1 > date2) {
    throw new Error("date range must contain real ascending ISO dates");
  }
  const inclusiveDays = Math.round(
    (Date.parse(`${date2}T00:00:00Z`) - Date.parse(`${date1}T00:00:00Z`)) / 86_400_000,
  ) + 1;
  if (inclusiveDays > 14) {
    throw new Error("Yandex query analytics window must not exceed 14 days");
  }
  if (!Number.isInteger(minQueryImpressions) || minQueryImpressions < 10) {
    throw new Error("minQueryImpressions must be at least 10");
  }
  if (!Number.isInteger(queryLimit) || queryLimit < 1 || queryLimit > 500) {
    throw new Error("queryLimit must be between 1 and 500");
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 120_000) {
    throw new Error("requestTimeoutMs must be between 1 and 120000");
  }

  const localUrls = parseYandexSitemapUrls(localSitemapXml, siteUrl);
  const production = await fetchTextWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url: sitemapUrl,
    options: { headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" }, method: "GET" },
  });
  if (!production.response.ok) {
    throw new Error(`production sitemap GET failed: HTTP ${production.response.status}`);
  }
  const productionUrls = parseYandexSitemapUrls(production.text, siteUrl);
  if (!sameUrlSet(localUrls, productionUrls)) {
    throw new Error("production and local sitemap URL sets differ");
  }

  const request = (url, options = {}) => apiRequest({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    token,
    url,
    ...options,
  });
  const userPayload = requireApi(await request(`${API_ROOT}/user`), "Yandex user lookup");
  const userId = userPayload.user_id;
  if (!(Number.isSafeInteger(userId) || (typeof userId === "string" && /^\d+$/u.test(userId)))) {
    throw new Error("Yandex user lookup returned invalid schema");
  }
  const hostsPayload = requireApi(
    await request(`${API_ROOT}/user/${encodeURIComponent(userId)}/hosts`),
    "Yandex hosts lookup",
  );
  if (!Array.isArray(hostsPayload.hosts)) throw new Error("Yandex hosts lookup returned invalid schema");
  const host = hostsPayload.hosts.find((item) => isPlainObject(item)
    && (item.ascii_host_url === siteUrl || item.unicode_host_url === siteUrl));
  if (!host || typeof host.host_id !== "string" || host.verified !== true) {
    throw new Error("Yandex Webmaster exact verified host was not found");
  }
  const hostId = host.host_id;
  const base = `${API_ROOT}/user/${encodeURIComponent(userId)}/hosts/${encodeURIComponent(hostId)}`;
  const infoPayload = requireApi(await request(base), "Yandex host info");
  const hostDataStatus = SAFE_HOST_STATUSES.has(infoPayload.host_data_status)
    ? infoPayload.host_data_status
    : null;
  if (!hostDataStatus) throw new Error("Yandex host info returned invalid data status");
  const mainMirror = !host.main_mirror
    ? "not_assigned"
    : (host.main_mirror.host_id === hostId || host.main_mirror.ascii_host_url === siteUrl ? "self" : "other");

  const [summaryResult, processedSitemapsResult, userAddedSitemapsResult] = await Promise.all([
    request(`${base}/summary`),
    request(`${base}/sitemaps?limit=100`),
    request(`${base}/user-added-sitemaps?limit=100`),
  ]);

  let showsResult = { ok: false, status: 404, code: hostDataStatus === "NOT_INDEXED" ? "HOST_NOT_INDEXED" : "HOST_NOT_LOADED" };
  let clicksResult = showsResult;
  let queryResult = showsResult;
  let inSearchResult = showsResult;
  let eventsResult = showsResult;
  if (hostDataStatus === "OK") {
    const historyUrl = (indicator) => {
      const url = new URL(`${base}/search-queries/all/history`);
      url.searchParams.set("query_indicator", indicator);
      url.searchParams.set("device_type_indicator", "ALL");
      url.searchParams.set("date_from", date1);
      url.searchParams.set("date_to", date2);
      return url.href;
    };
    const queryAnalyticsUrl = `${base}/query-analytics/list`;
    const queryAnalyticsBody = {
      offset: 0,
      limit: queryLimit,
      device_type_indicator: "ALL",
      search_location: "WEB_LOCATION",
      text_indicator: "QUERY",
    };
    const fetchQueryAnalytics = async () => {
      let result = await request(queryAnalyticsUrl, {
        method: "POST",
        body: {
          ...queryAnalyticsBody,
          sort_by_date: { date: date2, statistic_field: "IMPRESSIONS", by: "DESC" },
        },
      });
      if (result.ok || result.status !== 400 || result.code !== "RESTRICTIONS_VIOLATED") {
        return result;
      }
      result = await request(queryAnalyticsUrl, {
        method: "POST",
        body: queryAnalyticsBody,
      });
      return result;
    };
    [showsResult, clicksResult, queryResult, inSearchResult, eventsResult] = await Promise.all([
      request(historyUrl("TOTAL_SHOWS")),
      request(historyUrl("TOTAL_CLICKS")),
      fetchQueryAnalytics(),
      request(`${base}/search-urls/in-search/samples?offset=0&limit=100`),
      request(`${base}/search-urls/events/samples?offset=0&limit=100`),
    ]);
  }

  const shows = sanitizeHistory(showsResult, "TOTAL_SHOWS", date1, date2);
  const clicks = sanitizeHistory(clicksResult, "TOTAL_CLICKS", date1, date2);
  const totalsState = shows.state === "available" && clicks.state === "available"
    ? "available"
    : (shows.state === "not_matured" || clicks.state === "not_matured" ? "not_matured" : "unknown");
  const summary = sanitizeSummary(summaryResult);
  const inSearchSamples = sanitizeInSearchSamples(inSearchResult, siteUrl);
  const searchEvents = sanitizeSearchEvents(eventsResult, siteUrl);
  const queryUrlRows = sanitizeQueryAnalytics(queryResult, {
    date1,
    date2,
    minImpressions: minQueryImpressions,
    siteUrl,
  });
  const indexationState = hostDataStatus !== "OK"
    ? hostMaturityState(hostDataStatus)
    : ([summary, inSearchSamples, searchEvents].every((section) => section.state === "available")
      ? "available"
      : "unknown");
  const report = {
    schema_version: 1,
    generated_at: new Date(now).toISOString(),
    domain: new URL(siteUrl).hostname,
    access: { state: "verified", scope: "exact_site", host_data_status: hostDataStatus, main_mirror: mainMirror },
    sitemap: {
      production_url_count: productionUrls.length,
      local_url_count: localUrls.length,
      exact_match: true,
      robot_discovered: sitemapList(processedSitemapsResult, sitemapUrl, "robot_discovered"),
      user_added: sitemapList(userAddedSitemapsResult, sitemapUrl, "user_added"),
    },
    indexation: {
      state: indexationState,
      summary,
      in_search_samples: inSearchSamples,
      search_events: searchEvents,
    },
    search_analytics: {
      state: totalsState,
      window: { date1, date2 },
      totals: {
        impressions: totalsState === "available" ? shows.value : null,
        clicks: totalsState === "available" ? clicks.value : null,
        impressions_observed_days: shows.observed_days,
        clicks_observed_days: clicks.observed_days,
        expected_days: datesInWindow(date1, date2).length,
      },
      errors: { impressions: shows.error, clicks: clicks.error },
      query_url_rows: queryUrlRows,
    },
  };
  assertSanitizedReport(report, credentials, [userId, hostId]);
  return report;
}

export const yandexWebmasterConstants = Object.freeze({
  apiRoot: API_ROOT,
});
