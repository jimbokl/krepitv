import { createHmac, randomUUID } from "node:crypto";
import { chmod, mkdir, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export const MARKET_AFFILIATE_ORDERS_ENDPOINT =
  "https://api.content.market.yandex.ru/v3/affiliate/orders";
export const ORDERS_SCHEMA_VERSION = 2;
export const ORDERS_AGGREGATE_SCHEMA_VERSION = 1;
export const ORDER_STATUSES = Object.freeze([
  "NEW",
  "ON_HOLD",
  "APPROVED",
  "CANCELLED",
]);

const ORDER_STATUS_SET = new Set(ORDER_STATUSES);
const VID_RE = /^[A-Za-z0-9]{1,150}$/;
const CLID_RE = /^\d{1,32}$/;
const ORDER_ID_RE = /^\d{1,128}$/;
const MONTH_RE = /^\d{4}-(?:0[1-9]|1[0-2])$/;
const LOCAL_API_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?$/;
const ZONED_DATE_RE =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/i;
const MOSCOW_OFFSET_MS = 3 * 60 * 60 * 1_000;
export const CURSOR_OVERLAP_MS = 48 * 60 * 60 * 1_000;
const MAX_SAFE_BIGINT = BigInt(Number.MAX_SAFE_INTEGER);
const RETRYABLE_HTTP_STATUSES = new Set([429, 500, 502, 503, 504]);
const MAX_RETRY_AFTER_MS = 60_000;

// Values documented for cancelled affiliate orders. Anything else is reduced
// to UNKNOWN so arbitrary API text never reaches the private ledger.
export const CANCELLATION_REASON_ENUM = Object.freeze([
  "ABUSE",
  "ALL_ITEMS_RETURNED",
  "BANNED_REGIONS",
  "BANNED_SOURCE",
  "BUYER_CANCEL",
  "FULL_CART_COUPON",
  "MARKET_CANCEL",
  "ORDER_CREATION_EXPIRED",
  "ORDER_NOT_REPURCHASED",
  "PARTNER_PROMO_CODE",
  "REFERRAL_PROMOCODE",
  "SELLER_CANCEL",
  "VIOLATION_TERMS_OF_USE",
]);
const CANCELLATION_REASON_SET = new Set(CANCELLATION_REASON_ENUM);

function isObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasExactKeys(value, expected) {
  if (!isObject(value)) return false;
  const actual = Object.keys(value).sort();
  return (
    actual.length === expected.length &&
    expected
      .slice()
      .sort()
      .every((key, index) => key === actual[index])
  );
}

function requireClid(value) {
  const clid = String(value ?? "");
  if (!CLID_RE.test(clid)) throw new Error("clid must contain only digits");
  return clid;
}

function requireSecret(value) {
  if (typeof value !== "string" || Buffer.byteLength(value, "utf8") < 32) {
    throw new Error("KREPITV_ORDER_HMAC_SECRET must be at least 32 bytes");
  }
  return value;
}

export function hmacKeyFingerprint(secret) {
  const safeSecret = requireSecret(secret);
  return createHmac("sha256", safeSecret)
    .update("krepitv:affiliate-orders:hmac-key:v1", "utf8")
    .digest("hex");
}

function asDate(value, fieldName = "date") {
  if (value instanceof Date) {
    if (!Number.isFinite(value.getTime())) throw new Error(`${fieldName} is invalid`);
    return new Date(value.getTime());
  }
  if (typeof value !== "string") throw new Error(`${fieldName} must be an ISO date`);

  let instant;
  if (LOCAL_API_DATE_RE.test(value)) {
    instant = new Date(`${value}+03:00`);
  } else if (ZONED_DATE_RE.test(value)) {
    instant = new Date(value);
  } else {
    throw new Error(`${fieldName} must be an ISO 8601 date`);
  }
  if (!Number.isFinite(instant.getTime())) throw new Error(`${fieldName} is invalid`);
  return instant;
}

export function normalizeUtcDate(value, fieldName = "date") {
  return asDate(value, fieldName).toISOString();
}

export function formatMoscowApiDate(value) {
  const instant = asDate(value);
  return new Date(instant.getTime() + MOSCOW_OFFSET_MS)
    .toISOString()
    .slice(0, 19);
}

function pow10(exponent) {
  if (!Number.isSafeInteger(exponent) || exponent < 0 || exponent > 128) {
    throw new Error("decimal exponent is out of range");
  }
  return 10n ** BigInt(exponent);
}

export function rublesToKopecks(value) {
  if (typeof value !== "string" && typeof value !== "number") {
    throw new Error("payment must be a decimal number");
  }
  if (typeof value === "number" && !Number.isFinite(value)) {
    throw new Error("payment must be finite");
  }

  const source = String(value).trim();
  const match = source.match(
    /^([+-]?)(\d+)(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/,
  );
  if (!match) throw new Error("payment must be a decimal number");
  if (match[1] === "-") throw new Error("payment must not be negative");

  const fraction = match[3] ?? "";
  const exponent = Number(match[4] ?? "0");
  if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 128) {
    throw new Error("payment exponent is out of range");
  }

  let kopecks = BigInt(`${match[2]}${fraction}`);
  const shift = exponent - fraction.length + 2;
  if (shift >= 0) {
    kopecks *= pow10(shift);
  } else {
    const divisor = pow10(-shift);
    if (kopecks % divisor !== 0n) {
      throw new Error("payment has fractions smaller than one kopeck");
    }
    kopecks /= divisor;
  }
  if (kopecks > MAX_SAFE_BIGINT) throw new Error("payment is too large");
  return Number(kopecks);
}

export function hmacOrderKey({ secret, clid, orderId }) {
  const safeSecret = requireSecret(secret);
  const safeClid = requireClid(clid);
  const id = String(orderId ?? "");
  if (!ORDER_ID_RE.test(id)) throw new Error("orderId must contain only digits");
  return createHmac("sha256", safeSecret)
    .update(`${safeClid}:${id}`, "utf8")
    .digest("hex");
}

function cancellationCandidates(value) {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(cancellationCandidates);
  if (!isObject(value)) return [];

  return ["type", "code", "reason", "value", "name"].flatMap((key) =>
    Object.hasOwn(value, key) ? cancellationCandidates(value[key]) : [],
  );
}

export function sanitizeCancellationReasons(value, status) {
  if (status !== "CANCELLED") return [];
  const candidates = cancellationCandidates(value);
  if (candidates.length === 0) return [];
  const reasons = candidates.map((candidate) => {
    const normalized = candidate.trim().toUpperCase();
    return CANCELLATION_REASON_SET.has(normalized) ? normalized : "UNKNOWN";
  });
  return [...new Set(reasons)].sort();
}

export function sanitizeOrder(rawOrder, { clid, secret, knownVids }) {
  if (!isObject(rawOrder)) throw new Error("order payload must be an object");
  const safeClid = requireClid(clid);
  if (String(rawOrder.clid ?? "") !== safeClid) {
    throw new Error("order clid does not match the requested clid");
  }

  const vid = String(rawOrder.vid ?? "");
  if (!VID_RE.test(vid)) throw new Error("order vid is invalid");
  const status = String(rawOrder.status ?? "");
  if (!ORDER_STATUS_SET.has(status)) throw new Error("order status is invalid");

  const createdAt = normalizeUtcDate(rawOrder.dateCreated, "dateCreated");
  const updatedAt = normalizeUtcDate(rawOrder.dateUpdated, "dateUpdated");
  if (Date.parse(updatedAt) < Date.parse(createdAt)) {
    throw new Error("dateUpdated precedes dateCreated");
  }

  const record = {
    order_key: hmacOrderKey({
      secret,
      clid: safeClid,
      orderId: rawOrder.orderId,
    }),
    vid,
    created_at: createdAt,
    updated_at: updatedAt,
    status,
    cancellation_reasons: sanitizeCancellationReasons(
      rawOrder.additionalInfo,
      status,
    ),
    payment_kopecks: rublesToKopecks(rawOrder.payment),
  };

  return {
    record,
    known_vid: knownVids instanceof Set && knownVids.has(vid),
  };
}

function headerValue(headers, name) {
  if (!headers) return null;
  if (typeof headers.get === "function") return headers.get(name);
  const expected = name.toLowerCase();
  for (const [key, value] of Object.entries(headers)) {
    if (key.toLowerCase() === expected) return String(value);
  }
  return null;
}

function retryAfterMs(response) {
  const value = headerValue(response?.headers, "retry-after");
  if (!value) return 0;
  if (/^\d+$/.test(value.trim())) {
    return Math.min(Number(value.trim()) * 1_000, MAX_RETRY_AFTER_MS);
  }
  const until = Date.parse(value);
  if (!Number.isFinite(until)) return 0;
  return Math.min(Math.max(0, until - Date.now()), MAX_RETRY_AFTER_MS);
}

function isRateLimited403(response) {
  if (response?.status !== 403) return false;
  if (headerValue(response.headers, "retry-after")) return true;
  return [
    "x-ratelimit-global-remaining",
    "x-ratelimit-daily-remaining",
    "x-ratelimit-method-remaining",
  ].some((name) => headerValue(response.headers, name) === "0");
}

async function fetchPageWithRetries({
  fetchImpl,
  token,
  url,
  sleep,
  retryDelaysMs,
  requestTimeoutMs,
}) {
  let lastFailure = null;
  for (let attempt = 0; attempt <= retryDelaysMs.length; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `OAuth ${token}`,
        },
        signal: AbortSignal.timeout(requestTimeoutMs),
      });
    } catch {
      lastFailure = new Error("Orders API request failed before receiving a response");
      if (attempt >= retryDelaysMs.length) throw lastFailure;
      await sleep(retryDelaysMs[attempt]);
      continue;
    }

    if (!response?.ok) {
      const status = Number(response?.status);
      lastFailure = new Error(
        Number.isInteger(status)
          ? `Orders API request failed with HTTP ${status}`
          : "Orders API returned an invalid response",
      );
      const retryable =
        RETRYABLE_HTTP_STATUSES.has(status) || isRateLimited403(response);
      if (!retryable || attempt >= retryDelaysMs.length) throw lastFailure;
      await sleep(
        Math.max(retryDelaysMs[attempt], retryAfterMs(response)),
      );
      continue;
    }

    let payload;
    try {
      payload = await response.json();
    } catch {
      throw new Error("Orders API returned invalid JSON");
    }
    if (!isObject(payload) || payload.status !== "OK" || !Array.isArray(payload.orders)) {
      throw new Error("Orders API returned an unexpected payload");
    }
    return payload.orders;
  }
  throw lastFailure ?? new Error("Orders API request failed");
}

export async function fetchOrdersWindow({
  fetchImpl = globalThis.fetch,
  token,
  clid,
  secret,
  knownVids,
  updateStart,
  updateEnd,
  sleep = (milliseconds) =>
    new Promise((resolveDelay) => setTimeout(resolveDelay, milliseconds)),
  retryDelaysMs = [500, 1_500, 4_000],
  requestTimeoutMs = 20_000,
  pageSize = 1_000,
  maxPages = 10_000,
  endpoint = MARKET_AFFILIATE_ORDERS_ENDPOINT,
}) {
  if (typeof fetchImpl !== "function") throw new Error("fetchImpl must be a function");
  if (typeof sleep !== "function") throw new Error("sleep must be a function");
  if (typeof token !== "string" || !token.trim()) {
    throw new Error("YANDEX_MARKET_AFFILIATE_OAUTH is required");
  }
  const safeClid = requireClid(clid);
  requireSecret(secret);
  if (!(knownVids instanceof Set)) throw new Error("knownVids must be a Set");
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1_000) {
    throw new Error("pageSize must be between 1 and 1000");
  }
  if (!Number.isInteger(maxPages) || maxPages < 1) {
    throw new Error("maxPages must be a positive integer");
  }

  const start = normalizeUtcDate(updateStart, "updateStart");
  const end = normalizeUtcDate(updateEnd, "updateEnd");
  if (Date.parse(start) > Date.parse(end)) throw new Error("updateStart exceeds updateEnd");

  const observations = [];
  let pages = 0;
  for (let page = 1; page <= maxPages; page += 1) {
    const url = new URL(endpoint);
    url.searchParams.set("clid", safeClid);
    url.searchParams.set("updateStart", formatMoscowApiDate(start));
    url.searchParams.set("updateEnd", formatMoscowApiDate(end));
    url.searchParams.set("total", "true");
    url.searchParams.set("count", String(pageSize));
    url.searchParams.set("page", String(page));
    url.searchParams.set("format", "json");

    const rawOrders = await fetchPageWithRetries({
      fetchImpl,
      token,
      url,
      sleep,
      retryDelaysMs,
      requestTimeoutMs,
    });
    pages += 1;
    for (const rawOrder of rawOrders) {
      observations.push(
        sanitizeOrder(rawOrder, {
          clid: safeClid,
          secret,
          knownVids,
        }),
      );
    }
    if (rawOrders.length < pageSize) {
      return { observations, pages, records: observations.length };
    }
  }
  throw new Error("Orders API pagination exceeded the configured safety limit");
}

export function createOrdersState(clid, secret) {
  return {
    schema_version: ORDERS_SCHEMA_VERSION,
    clid: requireClid(clid),
    hmac_key_fingerprint: hmacKeyFingerprint(secret),
    cursor: { last_successful_update_end: null },
    orders: {},
    quarantine: {},
    sync: null,
  };
}

function validateStoredReasons(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (reason) => reason === "UNKNOWN" || CANCELLATION_REASON_SET.has(reason),
    )
  );
}

function validateStoredTransition(value) {
  if (
    !hasExactKeys(value, [
      "observed_at",
      "updated_at",
      "status",
      "cancellation_reasons",
      "payment_kopecks",
    ])
  ) {
    return false;
  }
  return (
    ORDER_STATUS_SET.has(value.status) &&
    validateStoredReasons(value.cancellation_reasons) &&
    Number.isSafeInteger(value.payment_kopecks) &&
    value.payment_kopecks >= 0 &&
    Boolean(normalizeUtcDate(value.observed_at, "observed_at")) &&
    Boolean(normalizeUtcDate(value.updated_at, "updated_at"))
  );
}

function validateStoredRecord(value, orderKey, quarantined) {
  const commonKeys = [
    "order_key",
    "vid",
    "created_at",
    "updated_at",
    "status",
    "cancellation_reasons",
    "payment_kopecks",
    "transitions",
  ];
  const keys = quarantined
    ? [...commonKeys, "reason", "first_seen_at", "last_seen_at"]
    : commonKeys;
  if (!hasExactKeys(value, keys)) return false;
  if (
    value.order_key !== orderKey ||
    !/^[a-f0-9]{64}$/.test(value.order_key) ||
    !VID_RE.test(value.vid) ||
    !ORDER_STATUS_SET.has(value.status) ||
    !validateStoredReasons(value.cancellation_reasons) ||
    !Number.isSafeInteger(value.payment_kopecks) ||
    value.payment_kopecks < 0 ||
    !Array.isArray(value.transitions) ||
    !value.transitions.every(validateStoredTransition)
  ) {
    return false;
  }
  normalizeUtcDate(value.created_at, "created_at");
  normalizeUtcDate(value.updated_at, "updated_at");
  if (quarantined) {
    if (value.reason !== "unknown_vid") return false;
    normalizeUtcDate(value.first_seen_at, "first_seen_at");
    normalizeUtcDate(value.last_seen_at, "last_seen_at");
  }
  return true;
}

function validateStoredSync(value) {
  if (value === null) return true;
  if (
    !hasExactKeys(value, [
      "last_started_at",
      "last_completed_at",
      "window_start",
      "window_end",
      "pages",
      "records",
      "known_records",
      "quarantined_records",
    ])
  ) {
    return false;
  }
  for (const key of [
    "last_started_at",
    "last_completed_at",
    "window_start",
    "window_end",
  ]) {
    normalizeUtcDate(value[key], key);
  }
  return ["pages", "records", "known_records", "quarantined_records"].every(
    (key) => Number.isSafeInteger(value[key]) && value[key] >= 0,
  );
}

function normalizeState(state, clid, secret) {
  if (state === null || state === undefined) return createOrdersState(clid, secret);
  if (
    !hasExactKeys(state, [
      "schema_version",
      "clid",
      "hmac_key_fingerprint",
      "cursor",
      "orders",
      "quarantine",
      "sync",
    ]) ||
    state.schema_version !== ORDERS_SCHEMA_VERSION
  ) {
    throw new Error("orders state has an unsupported schema");
  }
  if (String(state.clid) !== requireClid(clid)) {
    throw new Error("orders state belongs to another clid");
  }
  if (state.hmac_key_fingerprint !== hmacKeyFingerprint(secret)) {
    throw new Error("orders state belongs to another HMAC key");
  }
  if (
    !hasExactKeys(state.cursor, ["last_successful_update_end"]) ||
    !isObject(state.orders) ||
    !isObject(state.quarantine)
  ) {
    throw new Error("orders state is malformed");
  }
  if (state.cursor.last_successful_update_end !== null) {
    normalizeUtcDate(
      state.cursor.last_successful_update_end,
      "last_successful_update_end",
    );
  }
  if (
    !Object.entries(state.orders).every(([key, value]) =>
      validateStoredRecord(value, key, false),
    ) ||
    !Object.entries(state.quarantine).every(([key, value]) =>
      validateStoredRecord(value, key, true),
    ) ||
    !validateStoredSync(state.sync)
  ) {
    throw new Error("orders state is malformed");
  }
  return structuredClone(state);
}

export function computeSyncWindow({
  state,
  clid,
  runEnd,
  backfillStart,
  overlapMs = CURSOR_OVERLAP_MS,
}) {
  if (!Number.isSafeInteger(overlapMs) || overlapMs < 0) {
    throw new Error("overlapMs must be a non-negative integer");
  }
  const end = asDate(runEnd, "runEnd");
  const cursor = state?.cursor?.last_successful_update_end;
  let start;
  if (cursor) {
    start = new Date(asDate(cursor, "cursor").getTime() - overlapMs);
  } else {
    requireClid(clid);
    if (!backfillStart) {
      throw new Error("--backfill-start is required for the first orders sync");
    }
    start = asDate(backfillStart, "backfillStart");
  }
  if (start.getTime() > end.getTime()) {
    throw new Error("orders sync start is after the fixed run end");
  }
  return {
    update_start: start.toISOString(),
    update_end: end.toISOString(),
  };
}

function transitionFrom(record, observedAt) {
  return {
    observed_at: observedAt,
    updated_at: record.updated_at,
    status: record.status,
    cancellation_reasons: [...record.cancellation_reasons],
    payment_kopecks: record.payment_kopecks,
  };
}

function transitionSignature(transition) {
  return JSON.stringify([
    transition.updated_at,
    transition.status,
    transition.cancellation_reasons,
    transition.payment_kopecks,
  ]);
}

function mergeRecord(existing, record, observedAt) {
  const transitions = Array.isArray(existing?.transitions)
    ? structuredClone(existing.transitions)
    : [];
  const transition = transitionFrom(record, observedAt);
  const signatures = new Set(transitions.map(transitionSignature));
  if (!signatures.has(transitionSignature(transition))) transitions.push(transition);
  transitions.sort((left, right) =>
    left.updated_at.localeCompare(right.updated_at) ||
    left.observed_at.localeCompare(right.observed_at),
  );

  const incomingIsCurrent =
    !existing || Date.parse(record.updated_at) >= Date.parse(existing.updated_at);
  const current = incomingIsCurrent ? record : existing;
  const createdAt = existing
    ? [existing.created_at, record.created_at].sort()[0]
    : record.created_at;
  return {
    order_key: record.order_key,
    vid: current.vid,
    created_at: createdAt,
    updated_at: current.updated_at,
    status: current.status,
    cancellation_reasons: [...current.cancellation_reasons],
    payment_kopecks: current.payment_kopecks,
    transitions,
  };
}

export function upsertObservation(state, observation, observedAt) {
  if (!isObject(observation) || !isObject(observation.record)) {
    throw new Error("sanitized order observation is malformed");
  }
  const at = normalizeUtcDate(observedAt, "observedAt");
  const { record, known_vid: knownVid } = observation;
  if (knownVid) {
    const quarantined = state.quarantine[record.order_key];
    const existing = state.orders[record.order_key] ?? quarantined;
    state.orders[record.order_key] = mergeRecord(existing, record, at);
    delete state.quarantine[record.order_key];
    return "known";
  }

  const existing = state.quarantine[record.order_key];
  const merged = mergeRecord(existing, record, at);
  state.quarantine[record.order_key] = {
    ...merged,
    reason: "unknown_vid",
    first_seen_at: existing?.first_seen_at ?? at,
    last_seen_at: at,
  };
  return "quarantined";
}

export async function runOrdersSync({
  state,
  clid,
  token,
  secret,
  knownVids,
  backfillStart,
  clock = () => new Date(),
  fetchImpl = globalThis.fetch,
  sleep,
  retryDelaysMs,
  requestTimeoutMs,
  pageSize,
  maxPages,
  endpoint,
}) {
  if (typeof clock !== "function") throw new Error("clock must be a function");
  const runEnd = asDate(clock(), "clock result");
  const nextState = normalizeState(state, clid, secret);
  const window = computeSyncWindow({
    state: nextState,
    clid,
    runEnd,
    backfillStart,
  });

  const fetched = await fetchOrdersWindow({
    fetchImpl,
    token,
    clid,
    secret,
    knownVids,
    updateStart: window.update_start,
    updateEnd: window.update_end,
    ...(sleep ? { sleep } : {}),
    ...(retryDelaysMs ? { retryDelaysMs } : {}),
    ...(requestTimeoutMs ? { requestTimeoutMs } : {}),
    ...(pageSize ? { pageSize } : {}),
    ...(maxPages ? { maxPages } : {}),
    ...(endpoint ? { endpoint } : {}),
  });

  let known = 0;
  let quarantined = 0;
  for (const observation of fetched.observations) {
    const disposition = upsertObservation(
      nextState,
      observation,
      window.update_end,
    );
    if (disposition === "known") known += 1;
    else quarantined += 1;
  }

  nextState.cursor.last_successful_update_end = window.update_end;
  nextState.sync = {
    last_started_at: window.update_end,
    last_completed_at: window.update_end,
    window_start: window.update_start,
    window_end: window.update_end,
    pages: fetched.pages,
    records: fetched.records,
    known_records: known,
    quarantined_records: quarantined,
  };

  const snapshot = {
    schema_version: ORDERS_SCHEMA_VERSION,
    clid: requireClid(clid),
    completed_at: window.update_end,
    window,
    pages: fetched.pages,
    records: fetched.records,
    known_records: known,
    quarantined_records: quarantined,
    observations: fetched.observations.map(({ record, known_vid: knownVid }) => ({
      ...record,
      disposition: knownVid ? "known" : "quarantined",
    })),
  };
  return { state: nextState, snapshot };
}

function collectVid(value, output) {
  if (typeof value !== "string" || !VID_RE.test(value)) {
    throw new Error("VID manifest contains an invalid value");
  }
  if (output.has(value)) {
    throw new Error("VID manifests contain a duplicate value");
  }
  output.add(value);
}

function optionalPlacementText(value) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function visitSupplementalVids(value, output, expectedClid, visitor) {
  if (Array.isArray(value)) {
    const stringsOnly = value.every((item) => typeof item === "string");
    const objectsOnly = value.every((item) => isObject(item));
    if (!stringsOnly && !objectsOnly) {
      throw new Error(
        "supplemental VID array must contain only VIDs or placement manifests",
      );
    }
    for (const item of value) {
      if (typeof item === "string") {
        collectVid(item, output);
        visitor(item, {
          surface: "supplemental",
          landing_path: null,
          placement_id: null,
          rank: null,
          entity_id: null,
        });
      } else {
        visitSupplementalVids(item, output, expectedClid, visitor);
      }
    }
    return;
  }

  if (isObject(value) && Array.isArray(value.vids)) {
    visitSupplementalVids(value.vids, output, expectedClid, visitor);
    return;
  }

  const isHubManifest = isObject(value) && Array.isArray(value.hubs);
  const isModelManifest = isObject(value) && Array.isArray(value.models);
  if (!isHubManifest && !isModelManifest) {
    throw new Error(
      "supplemental VID file must be an array, { vids: [] }, a hub placement manifest, or a model placement manifest",
    );
  }
  if (isHubManifest && isModelManifest) {
    throw new Error("supplemental placement manifest has an ambiguous schema");
  }
  if (
    expectedClid !== null &&
    String(value.clid ?? "") !== requireClid(expectedClid)
  ) {
    throw new Error(
      `${isModelManifest ? "model" : "hub"} placement manifest belongs to another clid`,
    );
  }

  const groups = isModelManifest ? value.models : value.hubs;
  const kind = isModelManifest ? "model" : "hub";
  for (const group of groups) {
    if (!isObject(group) || !Array.isArray(group.placements)) {
      throw new Error(`${kind} placement manifest is malformed`);
    }
    const landingPath = optionalPlacementText(
      isModelManifest ? group.model_path : group.hub_path,
    );
    for (const placement of group.placements) {
      if (!isObject(placement)) {
        throw new Error(`${kind} placement manifest is malformed`);
      }
      collectVid(placement.vid, output);
      visitor(placement.vid, {
        surface: isModelManifest ? "model_page" : "seo_hub",
        landing_path: landingPath,
        placement_id: optionalPlacementText(placement.placement_id),
        rank:
          Number.isSafeInteger(placement.rank) && placement.rank > 0
            ? placement.rank
            : null,
        entity_id: optionalPlacementText(placement.entity_id),
      });
    }
  }
}

function visitAffiliateVids(
  manifest,
  supplementalVids,
  expectedClid,
  visitor = () => {},
) {
  const output = new Set();
  if (!isObject(manifest) || !Array.isArray(manifest.cards)) {
    throw new Error("affiliate manifest must contain cards[]");
  }
  for (const card of manifest.cards) {
    if (!isObject(card)) throw new Error("affiliate manifest card is invalid");
    if (expectedClid !== null && String(card.clid ?? "") !== requireClid(expectedClid)) {
      throw new Error("affiliate manifest contains a card for another clid");
    }
    collectVid(card.vid, output);
    visitor(card.vid, {
      surface: card.entity_kind === "mount" ? "mount_page" : "product_page",
      landing_path: optionalPlacementText(card.page_path),
      placement_id: optionalPlacementText(card.id),
      rank: null,
      entity_id: optionalPlacementText(card.entity_id),
    });
  }

  if (supplementalVids !== null && supplementalVids !== undefined) {
    visitSupplementalVids(
      supplementalVids,
      output,
      expectedClid,
      visitor,
    );
  }
  if (output.size === 0) throw new Error("known VID set must not be empty");
  return output;
}

export function collectKnownVids(
  manifest,
  supplementalVids = null,
  expectedClid = null,
) {
  return visitAffiliateVids(manifest, supplementalVids, expectedClid);
}

export function buildPlacementAttributionIndex(
  manifest,
  supplementalVids = null,
  expectedClid = null,
) {
  const placements = new Map();
  visitAffiliateVids(
    manifest,
    supplementalVids,
    expectedClid,
    (vid, placement) => placements.set(vid, Object.freeze({ vid, ...placement })),
  );
  return placements;
}

export function assertPrivatePath(root, file) {
  const privateRoot = path.resolve(root, ".private");
  const candidate = path.resolve(file);
  if (candidate !== privateRoot && !candidate.startsWith(`${privateRoot}${path.sep}`)) {
    throw new Error("Orders state, snapshots and reports must stay under .private/");
  }
  return candidate;
}

export async function writeJsonAtomic(file, value) {
  const target = path.resolve(file);
  await mkdir(path.dirname(target), { recursive: true });
  const temporary = `${target}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, {
      encoding: "utf8",
      mode: 0o600,
    });
    await chmod(temporary, 0o600);
    await rename(temporary, target);
    await chmod(target, 0o600);
  } catch (error) {
    await rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

function inMonth(isoDate, month) {
  const instant = asDate(isoDate, "monthly report date");
  return new Date(instant.getTime() + MOSCOW_OFFSET_MS)
    .toISOString()
    .slice(0, 7) === month;
}

function emptyAttributionCounters() {
  return {
    approved_in_month: { orders: 0, payment_kopecks: 0 },
    pending_current: {
      new_orders: 0,
      on_hold_orders: 0,
      payment_kopecks: 0,
    },
    cancelled_in_month: { orders: 0 },
  };
}

function addOrderToAttribution(counters, order, month) {
  let active = false;
  if (order.status === "APPROVED" && inMonth(order.updated_at, month)) {
    counters.approved_in_month.orders += 1;
    counters.approved_in_month.payment_kopecks += order.payment_kopecks;
    active = true;
  }
  if (order.status === "CANCELLED" && inMonth(order.updated_at, month)) {
    counters.cancelled_in_month.orders += 1;
    active = true;
  }
  if (order.status === "NEW") {
    counters.pending_current.new_orders += 1;
    counters.pending_current.payment_kopecks += order.payment_kopecks;
    active = true;
  }
  if (order.status === "ON_HOLD") {
    counters.pending_current.on_hold_orders += 1;
    counters.pending_current.payment_kopecks += order.payment_kopecks;
    active = true;
  }
  return active;
}

function validateAttributionTotals(counters) {
  if (
    !Number.isSafeInteger(counters.approved_in_month.payment_kopecks) ||
    !Number.isSafeInteger(counters.pending_current.payment_kopecks)
  ) {
    throw new Error("orders attribution total exceeds the safe integer range");
  }
}

function buildPlacementAttribution(state, month, placementIndex) {
  if (!(placementIndex instanceof Map)) {
    throw new Error("placementIndex must be a Map");
  }
  const rows = new Map();
  const unattributed = emptyAttributionCounters();
  for (const order of Object.values(state.orders)) {
    const placement = placementIndex.get(order.vid);
    if (!placement) {
      addOrderToAttribution(unattributed, order, month);
      continue;
    }
    if (!isObject(placement) || placement.vid !== order.vid) {
      throw new Error("placementIndex contains a malformed entry");
    }
    const row = rows.get(order.vid) ?? {
      vid: placement.vid,
      surface: placement.surface,
      landing_path: placement.landing_path,
      placement_id: placement.placement_id,
      rank: placement.rank,
      entity_id: placement.entity_id,
      ...emptyAttributionCounters(),
    };
    if (addOrderToAttribution(row, order, month)) rows.set(order.vid, row);
  }

  for (const row of rows.values()) validateAttributionTotals(row);
  validateAttributionTotals(unattributed);
  return {
    placements: [...rows.values()].sort(
      (left, right) =>
        left.surface.localeCompare(right.surface) ||
        String(left.landing_path ?? "").localeCompare(
          String(right.landing_path ?? ""),
        ) ||
        (left.rank ?? Number.MAX_SAFE_INTEGER) -
          (right.rank ?? Number.MAX_SAFE_INTEGER) ||
        left.vid.localeCompare(right.vid),
    ),
    unattributed,
  };
}

export function buildMonthlyOrdersReport(
  state,
  month,
  generatedAt = new Date(),
  placementIndex = null,
) {
  if (!MONTH_RE.test(month)) throw new Error("month must use YYYY-MM format");
  if (!isObject(state) || !isObject(state.orders) || !isObject(state.quarantine)) {
    throw new Error("orders state is malformed");
  }

  let approvedOrders = 0;
  let approvedKopecks = 0;
  let cancelledOrders = 0;
  const pending = { NEW: 0, ON_HOLD: 0, payment_kopecks: 0 };
  for (const order of Object.values(state.orders)) {
    if (order.status === "APPROVED" && inMonth(order.updated_at, month)) {
      approvedOrders += 1;
      approvedKopecks += order.payment_kopecks;
    }
    if (order.status === "CANCELLED" && inMonth(order.updated_at, month)) {
      cancelledOrders += 1;
    }
    if (order.status === "NEW" || order.status === "ON_HOLD") {
      pending[order.status] += 1;
      pending.payment_kopecks += order.payment_kopecks;
    }
  }
  if (!Number.isSafeInteger(approvedKopecks) || !Number.isSafeInteger(pending.payment_kopecks)) {
    throw new Error("orders report total exceeds the safe integer range");
  }

  const report = {
    schema_version: ORDERS_SCHEMA_VERSION,
    month,
    generated_at: normalizeUtcDate(generatedAt, "generatedAt"),
    data_as_of: state.cursor?.last_successful_update_end ?? null,
    approved: {
      orders: approvedOrders,
      payment_kopecks: approvedKopecks,
    },
    pending_current: {
      new_orders: pending.NEW,
      on_hold_orders: pending.ON_HOLD,
      payment_kopecks: pending.payment_kopecks,
      note: "Не является подтверждённой выручкой",
    },
    cancelled_in_month: { orders: cancelledOrders },
    quarantined_current: { orders: Object.keys(state.quarantine).length },
  };
  if (placementIndex !== null && placementIndex !== undefined) {
    report.attribution = buildPlacementAttribution(
      state,
      month,
      placementIndex,
    );
  }
  return report;
}

function requireAggregateCount(value, fieldName) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative safe integer`);
  }
  return value;
}

export function assertSafeOrdersAggregate(value) {
  if (
    !hasExactKeys(value, [
      "schema_version",
      "kind",
      "month",
      "generated_at",
      "data_as_of",
      "api_window",
      "approved",
      "pending_current",
      "cancelled_in_month",
      "quarantined_current",
    ]) ||
    value.schema_version !== ORDERS_AGGREGATE_SCHEMA_VERSION ||
    value.kind !== "krepitv_affiliate_orders_monthly_aggregate" ||
    !MONTH_RE.test(value.month)
  ) {
    throw new Error("orders aggregate has an unsupported schema");
  }

  normalizeUtcDate(value.generated_at, "generated_at");
  normalizeUtcDate(value.data_as_of, "data_as_of");
  if (
    !hasExactKeys(value.api_window, [
      "update_start",
      "update_end",
      "pages",
      "records",
      "known_records",
      "quarantined_records",
    ])
  ) {
    throw new Error("orders aggregate API window is malformed");
  }
  normalizeUtcDate(value.api_window.update_start, "api_window.update_start");
  normalizeUtcDate(value.api_window.update_end, "api_window.update_end");
  if (Date.parse(value.api_window.update_start) > Date.parse(value.api_window.update_end)) {
    throw new Error("orders aggregate API window is reversed");
  }
  for (const key of [
    "pages",
    "records",
    "known_records",
    "quarantined_records",
  ]) {
    requireAggregateCount(value.api_window[key], `api_window.${key}`);
  }
  if (value.api_window.known_records + value.api_window.quarantined_records !== value.api_window.records) {
    throw new Error("orders aggregate API record counts do not add up");
  }

  if (!hasExactKeys(value.approved, ["orders", "payment_kopecks"])) {
    throw new Error("orders aggregate approved totals are malformed");
  }
  requireAggregateCount(value.approved.orders, "approved.orders");
  requireAggregateCount(
    value.approved.payment_kopecks,
    "approved.payment_kopecks",
  );

  if (
    !hasExactKeys(value.pending_current, [
      "new_orders",
      "on_hold_orders",
      "payment_kopecks",
      "note",
    ]) ||
    value.pending_current.note !== "Не является подтверждённой выручкой"
  ) {
    throw new Error("orders aggregate pending totals are malformed");
  }
  for (const key of ["new_orders", "on_hold_orders", "payment_kopecks"]) {
    requireAggregateCount(value.pending_current[key], `pending_current.${key}`);
  }

  for (const [fieldName, counters] of [
    ["cancelled_in_month", value.cancelled_in_month],
    ["quarantined_current", value.quarantined_current],
  ]) {
    if (!hasExactKeys(counters, ["orders"])) {
      throw new Error(`orders aggregate ${fieldName} totals are malformed`);
    }
    requireAggregateCount(counters.orders, `${fieldName}.orders`);
  }

  const serialized = JSON.stringify(value);
  if (/[a-f0-9]{64}/i.test(serialized)) {
    throw new Error("orders aggregate must not contain order-key hashes");
  }
  return value;
}

export function buildSafeMonthlyOrdersAggregate(
  state,
  month,
  generatedAt = new Date(),
) {
  if (!isObject(state) || !validateStoredSync(state.sync) || state.sync === null) {
    throw new Error("orders aggregate requires a completed sync");
  }
  const report = buildMonthlyOrdersReport(state, month, generatedAt);
  const aggregate = {
    schema_version: ORDERS_AGGREGATE_SCHEMA_VERSION,
    kind: "krepitv_affiliate_orders_monthly_aggregate",
    month: report.month,
    generated_at: report.generated_at,
    data_as_of: report.data_as_of,
    api_window: {
      update_start: state.sync.window_start,
      update_end: state.sync.window_end,
      pages: state.sync.pages,
      records: state.sync.records,
      known_records: state.sync.known_records,
      quarantined_records: state.sync.quarantined_records,
    },
    approved: report.approved,
    pending_current: report.pending_current,
    cancelled_in_month: report.cancelled_in_month,
    quarantined_current: report.quarantined_current,
  };
  return assertSafeOrdersAggregate(aggregate);
}

export function formatSafeOrdersAggregateSummary(value) {
  const aggregate = assertSafeOrdersAggregate(value);
  return [
    `Агрегат ${aggregate.month}`,
    `APPROVED заказов: ${aggregate.approved.orders}`,
    `подтверждённое вознаграждение: ${aggregate.approved.payment_kopecks} коп.`,
    `ожидают решения: ${aggregate.pending_current.new_orders + aggregate.pending_current.on_hold_orders}`,
    `отменено в месяце: ${aggregate.cancelled_in_month.orders}`,
    `данные API по: ${aggregate.data_as_of}`,
  ].join("; ");
}
