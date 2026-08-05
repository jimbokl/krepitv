import { createSign } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const READONLY_SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const WRITE_SCOPE = "https://www.googleapis.com/auth/webmasters";
const SEARCH_API = "https://searchconsole.googleapis.com/webmasters/v3";
const INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const TRANSIENT_STATUS = new Set([429, 500, 502, 503, 504]);

function base64url(value) {
  return Buffer.from(value).toString("base64url");
}

function isIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(value ?? "")) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

function safeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : fallback;
}

function requiredAnalyticsNumber(value) {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function optionalSitemapCount(value) {
  if (value === undefined || value === null || value === "") return null;
  const number = typeof value === "number"
    ? value
    : (typeof value === "string" && /^\d+$/u.test(value) ? Number(value) : Number.NaN);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
}

function safeLabel(value, fallback = "UNKNOWN") {
  const normalized = String(value ?? "").replace(/[\u0000-\u001f\u007f]/gu, " ").trim();
  return normalized && normalized.length <= 180 ? normalized : fallback;
}

function parseJson(text) {
  if (!text.trim()) return { payload: {}, valid: false };
  try {
    const payload = JSON.parse(text);
    return {
      payload,
      valid: payload !== null && typeof payload === "object" && !Array.isArray(payload),
    };
  } catch {
    return { payload: {}, valid: false };
  }
}

function safeApiReason(payload) {
  return safeLabel(payload?.error?.status ?? payload?.error ?? "unknown_api_error");
}

function validateHttpsSiteUrl(value) {
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
    || url.search
    || url.hash
    || url.pathname !== "/"
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

function decodeXml(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'");
}

export function parseSitemapUrls(xml, siteUrl) {
  const normalizedSite = validateHttpsSiteUrl(siteUrl);
  if (typeof xml !== "string" || !xml.includes("<urlset")) {
    throw new Error("sitemap is not a URL set");
  }
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/giu)]
    .map((match) => decodeXml(match[1]));
  if (!urls.length) throw new Error("sitemap has no URLs");
  const seen = new Set();
  for (const value of urls) {
    const path = sameOriginPath(value, normalizedSite);
    if (!path) throw new Error("sitemap contains an off-origin or non-canonical URL");
    const canonical = new URL(path, normalizedSite).href;
    if (canonical !== value) throw new Error("sitemap URL is not normalized canonical HTTPS");
    if (seen.has(value)) throw new Error("sitemap contains duplicate URLs");
    seen.add(value);
  }
  return urls;
}

export function validateServiceAccountCredentials(value) {
  if (
    value?.type !== "service_account"
    || typeof value.client_email !== "string"
    || !value.client_email.includes("@")
    || typeof value.private_key !== "string"
    || !value.private_key.includes("BEGIN PRIVATE KEY")
  ) {
    throw new Error("invalid Google service-account credentials");
  }
  if (value.token_uri && value.token_uri !== TOKEN_ENDPOINT) {
    throw new Error("unexpected Google token endpoint");
  }
  return value;
}

export function buildServiceAccountJwt(credentialsValue, now = new Date(), scope = READONLY_SCOPE) {
  const credentials = validateServiceAccountCredentials(credentialsValue);
  if (![READONLY_SCOPE, WRITE_SCOPE].includes(scope)) {
    throw new Error("unsupported Google Search Console OAuth scope");
  }
  const issuedAt = Math.floor(new Date(now).getTime() / 1000);
  if (!Number.isFinite(issuedAt)) throw new Error("invalid JWT time");
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64url(JSON.stringify({
    aud: TOKEN_ENDPOINT,
    exp: issuedAt + 3600,
    iat: issuedAt,
    iss: credentials.client_email,
    scope,
  }));
  const signingInput = `${header}.${payload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();
  return `${signingInput}.${signer.sign(credentials.private_key).toString("base64url")}`;
}

export async function exchangeGoogleAccessToken({
  credentials,
  fetchImpl = globalThis.fetch,
  now = new Date(),
  requestTimeoutMs = 30_000,
  scope = READONLY_SCOPE,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const assertion = buildServiceAccountJwt(credentials, now, scope);
  const body = new URLSearchParams({
    assertion,
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
  });
  const { response, text } = await fetchWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url: TOKEN_ENDPOINT,
    options: {
    body,
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
    },
  });
  const parsed = parseJson(text);
  const payload = parsed.payload;
  if (!response.ok) {
    throw new Error(`Google OAuth failed: HTTP ${response.status}, ${safeApiReason(payload)}`);
  }
  if (!parsed.valid) throw new Error("Google OAuth returned invalid JSON");
  if (typeof payload.access_token !== "string" || payload.access_token.length < 16) {
    throw new Error("Google OAuth response has no access token");
  }
  return payload.access_token;
}

function retryDelay(response, attempt) {
  const raw = response?.headers?.get?.("retry-after");
  const seconds = Number(raw);
  if (raw !== null && raw !== "" && Number.isFinite(seconds) && seconds >= 0 && seconds <= 30) {
    return seconds * 1000;
  }
  return 500 * (attempt + 1);
}

async function fetchWithRetry({ fetchImpl, options, sleepImpl, timeoutMs = 30_000, url }) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetchImpl(url, { ...options, signal: controller.signal });
      const text = await response.text();
      if (TRANSIENT_STATUS.has(response.status) && attempt < 2) {
        await sleepImpl(retryDelay(response, attempt));
        continue;
      }
      return { response, text };
    } catch {
      if (attempt === 2) throw new Error("Google request failed after bounded retries");
      await sleepImpl(500 * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error("Google request failed after bounded retries");
}

async function apiJson({ fetchImpl, method = "GET", requestTimeoutMs, sleepImpl, token, url, body }) {
  const { response, text } = await fetchWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url,
    options: {
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
      ...(body === undefined ? {} : { "Content-Type": "application/json" }),
    },
    method,
    },
  });
  const parsed = parseJson(text);
  const payload = parsed.payload;
  if (!response.ok) {
    const error = new Error(`Google API failed: HTTP ${response.status}, ${safeApiReason(payload)}`);
    error.statusCode = response.status;
    throw error;
  }
  if (!parsed.valid) {
    const error = new Error("Google API returned invalid JSON");
    error.safeCode = "INVALID_RESPONSE";
    throw error;
  }
  return payload;
}

function searchEndpoint(siteUrl) {
  return `${SEARCH_API}/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
}

function sitemapEndpoint(siteUrl) {
  return `${SEARCH_API}/sites/${encodeURIComponent(siteUrl)}/sitemaps`;
}

function sitemapSubmitEndpoint(siteUrl, sitemapUrl) {
  return `${sitemapEndpoint(siteUrl)}/${encodeURIComponent(sitemapUrl)}`;
}

function searchTotals(payload) {
  if (payload?.rows !== undefined && !Array.isArray(payload.rows)) {
    throw new Error("Search Analytics totals response has invalid rows");
  }
  const rows = payload.rows ?? [];
  if (rows.length === 0) return { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  const row = rows[0];
  if (!row || typeof row !== "object" || Array.isArray(row)) {
    throw new Error("Search Analytics totals response has invalid row schema");
  }
  const metrics = [row.clicks, row.impressions, row.ctr, row.position]
    .map(requiredAnalyticsNumber);
  if (metrics.some((value) => value === null)) {
    throw new Error("Search Analytics totals response has invalid metrics");
  }
  const [clicks, impressions, ctr, position] = metrics;
  return {
    clicks,
    impressions,
    ctr: impressions ? ctr : 0,
    position: impressions ? position : 0,
  };
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

function validateQueryPageRows(payload) {
  if (payload.rows === undefined) return [];
  if (!Array.isArray(payload.rows)) {
    throw new Error("Search Analytics query-page response has invalid rows");
  }
  return payload.rows.map((row) => {
    if (
      !row
      || typeof row !== "object"
      || Array.isArray(row)
      || !Array.isArray(row.keys)
      || row.keys.length !== 2
      || row.keys.some((key) => typeof key !== "string")
    ) {
      throw new Error("Search Analytics query-page response has invalid keys");
    }
    const metrics = [row.clicks, row.impressions, row.ctr, row.position]
      .map(requiredAnalyticsNumber);
    if (metrics.some((value) => value === null)) {
      throw new Error("Search Analytics query-page response has invalid metrics");
    }
    const [clicks, impressions, ctr, position] = metrics;
    return { keys: row.keys, clicks, impressions, ctr, position };
  });
}

function validatePageRows(payload) {
  if (payload.rows === undefined) return [];
  if (!Array.isArray(payload.rows)) {
    throw new Error("Search Analytics page response has invalid rows");
  }
  return payload.rows.map((row) => {
    if (
      !row
      || typeof row !== "object"
      || Array.isArray(row)
      || !Array.isArray(row.keys)
      || row.keys.length !== 1
      || typeof row.keys[0] !== "string"
    ) {
      throw new Error("Search Analytics page response has invalid keys");
    }
    const metrics = [row.clicks, row.impressions, row.ctr, row.position]
      .map(requiredAnalyticsNumber);
    if (metrics.some((value) => value === null)) {
      throw new Error("Search Analytics page response has invalid metrics");
    }
    const [clicks, impressions, ctr, position] = metrics;
    return { keys: row.keys, clicks, impressions, ctr, position };
  });
}

function normalizeQueryPageRows(rows, { minImpressions, siteUrl }) {
  const kept = [];
  let belowThreshold = 0;
  let unsafeQuery = 0;
  let invalidPage = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const query = String(row?.keys?.[0] ?? "").trim();
    const path = sameOriginPath(row?.keys?.[1], siteUrl);
    const impressions = safeNumber(row?.impressions);
    if (impressions < minImpressions) {
      belowThreshold += 1;
      continue;
    }
    if (!query || queryLooksPrivate(query)) {
      unsafeQuery += 1;
      continue;
    }
    if (!path) {
      invalidPage += 1;
      continue;
    }
    kept.push({
      query,
      path,
      clicks: safeNumber(row.clicks),
      impressions,
      ctr: safeNumber(row.ctr),
      position: safeNumber(row.position),
    });
  }
  kept.sort((left, right) => right.impressions - left.impressions
    || right.clicks - left.clicks
    || left.query.localeCompare(right.query, "ru"));
  return {
    rows: kept,
    suppressed: { below_threshold: belowThreshold, unsafe_query: unsafeQuery, invalid_page: invalidPage },
  };
}

function normalizePageRows(rows, { minImpressions, siteUrl }) {
  const kept = [];
  let belowThreshold = 0;
  let invalidPage = 0;
  for (const row of Array.isArray(rows) ? rows : []) {
    const path = sameOriginPath(row?.keys?.[0], siteUrl);
    const impressions = safeNumber(row?.impressions);
    if (impressions < minImpressions) {
      belowThreshold += 1;
      continue;
    }
    if (!path) {
      invalidPage += 1;
      continue;
    }
    kept.push({
      path,
      clicks: safeNumber(row.clicks),
      impressions,
      ctr: safeNumber(row.ctr),
      position: safeNumber(row.position),
    });
  }
  kept.sort((left, right) => right.impressions - left.impressions
    || right.clicks - left.clicks
    || left.path.localeCompare(right.path, "ru"));
  return {
    rows: kept,
    suppressed: { below_threshold: belowThreshold, invalid_page: invalidPage },
  };
}

async function fetchQueryPageRows({
  date1,
  date2,
  fetchImpl,
  siteUrl,
  requestTimeoutMs,
  sleepImpl,
  token,
  maxPages = 4,
}) {
  const rows = [];
  const rowLimit = 25_000;
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await apiJson({
      body: {
        startDate: date1,
        endDate: date2,
        type: "web",
        dataState: "final",
        dimensions: ["query", "page"],
        rowLimit,
        startRow: page * rowLimit,
      },
      fetchImpl,
      method: "POST",
      requestTimeoutMs,
      sleepImpl,
      token,
      url: searchEndpoint(siteUrl),
    });
    const pageRows = validateQueryPageRows(payload);
    rows.push(...pageRows);
    if (pageRows.length < rowLimit) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

async function fetchPageRows({
  date1,
  date2,
  fetchImpl,
  siteUrl,
  requestTimeoutMs,
  sleepImpl,
  token,
  maxPages = 4,
}) {
  const rows = [];
  const rowLimit = 25_000;
  for (let page = 0; page < maxPages; page += 1) {
    const payload = await apiJson({
      body: {
        startDate: date1,
        endDate: date2,
        type: "web",
        dataState: "final",
        dimensions: ["page"],
        rowLimit,
        startRow: page * rowLimit,
      },
      fetchImpl,
      method: "POST",
      requestTimeoutMs,
      sleepImpl,
      token,
      url: searchEndpoint(siteUrl),
    });
    const pageRows = validatePageRows(payload);
    rows.push(...pageRows);
    if (pageRows.length < rowLimit) return { rows, truncated: false };
  }
  return { rows, truncated: true };
}

function familyForPath(path) {
  if (path === "/") return "home";
  if (path.startsWith("/modeli/")) return "models";
  if (path.startsWith("/kronshteyny/")) return "mounts";
  if (path.startsWith("/vesa/")) return "vesa";
  return "seo";
}

function canonicalRelation(value, expectedUrl, siteUrl) {
  if (!value) return { relation: "unknown" };
  let url;
  try {
    url = new URL(value);
  } catch {
    return { relation: "invalid" };
  }
  if (url.href === expectedUrl) return { relation: "self" };
  const path = sameOriginPath(url.href, siteUrl);
  return path ? { relation: "same_site_other", path } : { relation: "external" };
}

function countBy(rows, key) {
  const counts = {};
  for (const row of rows) {
    const value = safeLabel(row[key]);
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([left], [right]) => left.localeCompare(right, "ru")));
}

async function inspectOne({ fetchImpl, siteUrl, requestTimeoutMs, sleepImpl, token, url }) {
  try {
    const payload = await apiJson({
      body: { inspectionUrl: url, siteUrl, languageCode: "ru-RU" },
      fetchImpl,
      method: "POST",
      requestTimeoutMs,
      sleepImpl,
      token,
      url: INSPECTION_ENDPOINT,
    });
    const index = payload?.inspectionResult?.indexStatusResult;
    if (!index || typeof index !== "object" || typeof index.verdict !== "string") {
      return { ok: false, status: "INVALID_RESPONSE" };
    }
    const path = sameOriginPath(url, siteUrl);
    return {
      ok: true,
      row: {
        path,
        family: familyForPath(path),
        verdict: safeLabel(index.verdict),
        coverage_state: safeLabel(index.coverageState),
        robots_txt_state: safeLabel(index.robotsTxtState),
        indexing_state: safeLabel(index.indexingState),
        page_fetch_state: safeLabel(index.pageFetchState),
        last_crawl_time: /^\d{4}-\d{2}-\d{2}T/u.test(index.lastCrawlTime ?? "")
          ? index.lastCrawlTime
          : null,
        google_canonical: canonicalRelation(index.googleCanonical, url, siteUrl),
        user_canonical: canonicalRelation(index.userCanonical, url, siteUrl),
      },
    };
  } catch (error) {
    const status = Number(error?.statusCode ?? 0);
    return { ok: false, status: error?.safeCode ?? (status ? `HTTP_${status}` : "REQUEST_FAILED") };
  }
}

async function mapLimit(values, limit, mapper) {
  const result = new Array(values.length);
  let next = 0;
  async function worker() {
    while (true) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      result[index] = await mapper(values[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, values.length) }, worker));
  return result;
}

function summarizeInspection(results, requestedCount) {
  const rows = results.filter((item) => item.ok).map((item) => item.row);
  const failures = results.filter((item) => !item.ok);
  const familyVerdicts = {};
  for (const row of rows) {
    const key = `${row.family}:${row.verdict}`;
    familyVerdicts[key] = (familyVerdicts[key] ?? 0) + 1;
  }
  const indexedPaths = rows.filter((row) => row.verdict === "PASS").map((row) => row.path).sort();
  const state = rows.length === requestedCount ? "available" : rows.length ? "partial" : "unknown";
  return {
    state,
    mode: "indexed_version_only",
    requested_count: requestedCount,
    inspected_count: rows.length,
    indexed_pass_count: state === "available" ? indexedPaths.length : null,
    observed_indexed_pass_count: state === "partial" ? indexedPaths.length : null,
    with_last_crawl: rows.filter((row) => row.last_crawl_time).length,
    verdict_counts: countBy(rows, "verdict"),
    coverage_counts: countBy(rows, "coverage_state"),
    family_verdict_counts: Object.fromEntries(Object.entries(familyVerdicts).sort()),
    failure_counts: countBy(failures, "status"),
    indexed_paths: indexedPaths,
    rows,
  };
}

function skippedInspection(sitemapUrlCount) {
  return {
    state: "skipped",
    mode: "skipped_on_request",
    sitemap_url_count: sitemapUrlCount,
    requested_count: 0,
    inspected_count: 0,
    indexed_pass_count: null,
    observed_indexed_pass_count: null,
    with_last_crawl: 0,
    verdict_counts: {},
    coverage_counts: {},
    family_verdict_counts: {},
    failure_counts: {},
    indexed_paths: [],
    rows: [],
  };
}

function sanitizeSitemapStatus(payload, sitemapUrl) {
  if (payload.sitemap !== undefined && !Array.isArray(payload.sitemap)) {
    throw new Error("Google Search Console sitemap response has invalid entries");
  }
  const allEntries = payload.sitemap ?? [];
  for (const item of allEntries) {
    if (
      !item
      || typeof item !== "object"
      || Array.isArray(item)
      || typeof item.path !== "string"
      || (item.isPending !== undefined && typeof item.isPending !== "boolean")
      || (item.contents !== undefined && !Array.isArray(item.contents))
      || (item.errors !== undefined && optionalSitemapCount(item.errors) === null)
      || (item.warnings !== undefined && optionalSitemapCount(item.warnings) === null)
    ) {
      throw new Error("Google Search Console sitemap response has invalid entry schema");
    }
    for (const content of item.contents ?? []) {
      if (
        !content
        || typeof content !== "object"
        || Array.isArray(content)
        || typeof content.type !== "string"
        || (content.submitted !== undefined && optionalSitemapCount(content.submitted) === null)
      ) {
        throw new Error("Google Search Console sitemap response has invalid content schema");
      }
    }
  }
  const entries = allEntries.filter((item) => item.path === sitemapUrl);
  if (entries.length !== 1) return { state: "not_found" };
  const item = entries[0];
  const web = (Array.isArray(item.contents) ? item.contents : []).find((content) => content?.type === "web");
  return {
    state: item.isPending ? "processing" : "processed",
    is_pending: Boolean(item.isPending),
    errors: optionalSitemapCount(item.errors),
    warnings: optionalSitemapCount(item.warnings),
    submitted_web_urls: web ? optionalSitemapCount(web.submitted) : null,
    last_submitted: /^\d{4}-\d{2}-\d{2}T/u.test(item.lastSubmitted ?? "") ? item.lastSubmitted : null,
    last_downloaded: /^\d{4}-\d{2}-\d{2}T/u.test(item.lastDownloaded ?? "") ? item.lastDownloaded : null,
  };
}

function assertSanitizedReport(report, credentials, token) {
  const serialized = JSON.stringify(report);
  const forbiddenValues = [credentials.client_email, credentials.project_id, token]
    .filter((value) => typeof value === "string" && value);
  const forbiddenKeys = ["private_key", "access_token", "client_email", "project_id", "Authorization", "referringUrls"];
  if (forbiddenValues.some((value) => serialized.includes(value))
    || forbiddenKeys.some((value) => serialized.includes(value))) {
    throw new Error("sanitized Search Console report contains private credentials or identifiers");
  }
}

export async function submitGoogleSitemap({
  credentials: credentialsValue,
  fetchImpl = globalThis.fetch,
  localSitemapXml,
  now = new Date(),
  requestTimeoutMs = 30_000,
  siteUrl: siteValue = "https://krepitv.ru/",
  sitemapUrl: sitemapValue = "https://krepitv.ru/sitemap.xml",
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const credentials = validateServiceAccountCredentials(credentialsValue);
  const siteUrl = validateHttpsSiteUrl(siteValue);
  const sitemapUrl = new URL(sitemapValue).href;
  if (siteUrl !== "https://krepitv.ru/" || sitemapUrl !== "https://krepitv.ru/sitemap.xml") {
    throw new Error("sitemap submission is locked to the production KREPI TV property");
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 120_000) {
    throw new Error("requestTimeoutMs must be between 1 and 120000");
  }

  const localUrls = parseSitemapUrls(localSitemapXml, siteUrl);
  const { response: productionResponse, text: productionXml } = await fetchWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url: sitemapUrl,
    options: {
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
      method: "GET",
    },
  });
  if (!productionResponse.ok) {
    throw new Error(`production sitemap GET failed: HTTP ${productionResponse.status}`);
  }
  const productionUrls = parseSitemapUrls(productionXml, siteUrl);
  if (JSON.stringify(productionUrls) !== JSON.stringify(localUrls)) {
    throw new Error("production and local sitemap URL sets differ");
  }

  const token = await exchangeGoogleAccessToken({
    credentials,
    fetchImpl,
    now,
    requestTimeoutMs,
    scope: WRITE_SCOPE,
    sleepImpl,
  });
  const sitesPayload = await apiJson({
    fetchImpl,
    requestTimeoutMs,
    sleepImpl,
    token,
    url: `${SEARCH_API}/sites`,
  });
  if (sitesPayload.siteEntry !== undefined && !Array.isArray(sitesPayload.siteEntry)) {
    throw new Error("Google Search Console sites response is invalid");
  }
  const access = (Array.isArray(sitesPayload.siteEntry) ? sitesPayload.siteEntry : [])
    .find((item) => item?.siteUrl === siteUrl);
  if (access?.permissionLevel !== "siteOwner") {
    throw new Error("Google sitemap submission requires verified siteOwner access");
  }

  const { response: submitResponse, text: submitText } = await fetchWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url: sitemapSubmitEndpoint(siteUrl, sitemapUrl),
    options: {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
      method: "PUT",
    },
  });
  if (!submitResponse.ok) {
    const parsed = parseJson(submitText);
    throw new Error(`Google sitemap submit failed: HTTP ${submitResponse.status}, ${safeApiReason(parsed.payload)}`);
  }
  if (submitText.trim() && submitText.trim() !== "{}") {
    throw new Error("Google sitemap submit returned an unexpected response body");
  }

  const sitemapsPayload = await apiJson({
    fetchImpl,
    requestTimeoutMs,
    sleepImpl,
    token,
    url: sitemapEndpoint(siteUrl),
  });
  const report = {
    schema_version: 1,
    submitted_at: new Date(now).toISOString(),
    domain: new URL(siteUrl).hostname,
    production_url_count: productionUrls.length,
    local_url_count: localUrls.length,
    exact_match: true,
    accepted_http_status: submitResponse.status,
    console: sanitizeSitemapStatus(sitemapsPayload, sitemapUrl),
  };
  assertSanitizedReport(report, credentials, token);
  return report;
}

export async function fetchGoogleSearchConsoleReport({
  credentials: credentialsValue,
  date1,
  date2,
  fetchImpl = globalThis.fetch,
  inspectionConcurrency = 6,
  localSitemapXml,
  maxQueryPages = 4,
  maxPagePages = 4,
  minPageImpressions = 10,
  minQueryImpressions = 10,
  now = new Date(),
  requestTimeoutMs = 30_000,
  siteUrl: siteValue = "https://krepitv.ru/",
  sitemapUrl: sitemapValue = "https://krepitv.ru/sitemap.xml",
  skipUrlInspection = false,
  sleepImpl = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds)),
}) {
  const credentials = validateServiceAccountCredentials(credentialsValue);
  const siteUrl = validateHttpsSiteUrl(siteValue);
  const sitemapUrl = new URL(sitemapValue).href;
  if (sameOriginPath(sitemapUrl, siteUrl) !== "/sitemap.xml") {
    throw new Error("sitemapUrl must be the canonical same-origin /sitemap.xml");
  }
  if (!isIsoDate(date1) || !isIsoDate(date2) || date1 > date2) {
    throw new Error("date range must contain real ascending ISO dates");
  }
  if (!Number.isInteger(minQueryImpressions) || minQueryImpressions < 10) {
    throw new Error("minQueryImpressions must be at least 10");
  }
  if (!Number.isInteger(minPageImpressions) || minPageImpressions < 10) {
    throw new Error("minPageImpressions must be at least 10");
  }
  if (!Number.isInteger(inspectionConcurrency) || inspectionConcurrency < 1 || inspectionConcurrency > 8) {
    throw new Error("inspectionConcurrency must be between 1 and 8");
  }
  if (!Number.isInteger(requestTimeoutMs) || requestTimeoutMs < 1 || requestTimeoutMs > 120_000) {
    throw new Error("requestTimeoutMs must be between 1 and 120000");
  }
  if (typeof skipUrlInspection !== "boolean") {
    throw new Error("skipUrlInspection must be boolean");
  }

  const localUrls = parseSitemapUrls(localSitemapXml, siteUrl);
  const token = await exchangeGoogleAccessToken({
    credentials,
    fetchImpl,
    now,
    requestTimeoutMs,
    sleepImpl,
  });
  const sitesPayload = await apiJson({
    fetchImpl,
    requestTimeoutMs,
    sleepImpl,
    token,
    url: `${SEARCH_API}/sites`,
  });
  if (sitesPayload.siteEntry !== undefined && !Array.isArray(sitesPayload.siteEntry)) {
    throw new Error("Google Search Console sites response is invalid");
  }
  const access = (Array.isArray(sitesPayload.siteEntry) ? sitesPayload.siteEntry : [])
    .find((item) => item?.siteUrl === siteUrl);
  const allowedPermissions = new Set(["siteOwner", "siteFullUser", "siteRestrictedUser"]);
  if (!access || !allowedPermissions.has(access.permissionLevel)) {
    throw new Error("Google Search Console property access is not verified");
  }

  const { response: productionResponse, text: productionXml } = await fetchWithRetry({
    fetchImpl,
    sleepImpl,
    timeoutMs: requestTimeoutMs,
    url: sitemapUrl,
    options: {
      headers: { Accept: "application/xml,text/xml;q=0.9,*/*;q=0.1" },
      method: "GET",
    },
  });
  if (!productionResponse.ok) {
    throw new Error(`production sitemap GET failed: HTTP ${productionResponse.status}`);
  }
  const productionUrls = parseSitemapUrls(productionXml, siteUrl);
  if (JSON.stringify(productionUrls) !== JSON.stringify(localUrls)) {
    throw new Error("production and local sitemap URL sets differ");
  }

  const [totalsPayload, queryPagePayload, pagePayload, sitemapsPayload] = await Promise.all([
    apiJson({
      body: { startDate: date1, endDate: date2, type: "web", dataState: "final", rowLimit: 1 },
      fetchImpl,
      method: "POST",
      requestTimeoutMs,
      sleepImpl,
      token,
      url: searchEndpoint(siteUrl),
    }),
    fetchQueryPageRows({
      date1,
      date2,
      fetchImpl,
      maxPages: maxQueryPages,
      requestTimeoutMs,
      siteUrl,
      sleepImpl,
      token,
    }),
    fetchPageRows({
      date1,
      date2,
      fetchImpl,
      maxPages: maxPagePages,
      requestTimeoutMs,
      siteUrl,
      sleepImpl,
      token,
    }),
    apiJson({ fetchImpl, requestTimeoutMs, sleepImpl, token, url: sitemapEndpoint(siteUrl) }),
  ]);
  const queryPages = normalizeQueryPageRows(queryPagePayload.rows, {
    minImpressions: minQueryImpressions,
    siteUrl,
  });
  const pages = normalizePageRows(pagePayload.rows, {
    minImpressions: minPageImpressions,
    siteUrl,
  });
  const inspections = skipUrlInspection
    ? []
    : await mapLimit(productionUrls, inspectionConcurrency, (url) => inspectOne({
      fetchImpl,
      requestTimeoutMs,
      siteUrl,
      sleepImpl,
      token,
      url,
    }));

  const report = {
    schema_version: 1,
    generated_at: new Date(now).toISOString(),
    domain: new URL(siteUrl).hostname,
    window: { date1, date2, timezone: "America/Los_Angeles", data_state: "final" },
    access: { state: "verified", permission: safeLabel(access.permissionLevel) },
    search_analytics: {
      state: "available",
      totals: searchTotals(totalsPayload),
      query_page_rows: {
        coverage: "top_rows_not_exhaustive",
        min_impressions: minQueryImpressions,
        received_rows: queryPagePayload.rows.length,
        truncated: queryPagePayload.truncated,
        ...queryPages,
      },
      page_rows: {
        coverage: "top_rows_not_exhaustive",
        min_impressions: minPageImpressions,
        received_rows: pagePayload.rows.length,
        truncated: pagePayload.truncated,
        ...pages,
      },
    },
    sitemap: {
      production_url_count: productionUrls.length,
      local_url_count: localUrls.length,
      exact_match: true,
      console: sanitizeSitemapStatus(sitemapsPayload, sitemapUrl),
    },
    url_inspection: skipUrlInspection
      ? skippedInspection(productionUrls.length)
      : summarizeInspection(inspections, productionUrls.length),
  };
  assertSanitizedReport(report, credentials, token);
  return report;
}

export const googleSearchConsoleConstants = Object.freeze({
  inspectionEndpoint: INSPECTION_ENDPOINT,
  readonlyScope: READONLY_SCOPE,
  writeScope: WRITE_SCOPE,
  searchApi: SEARCH_API,
  tokenEndpoint: TOKEN_ENDPOINT,
});
