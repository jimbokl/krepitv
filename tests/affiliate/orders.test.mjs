import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import path from "node:path";
import test from "node:test";

import {
  assertPrivatePath,
  buildMonthlyOrdersReport,
  CANCELLATION_REASON_ENUM,
  collectKnownVids,
  computeSyncWindow,
  createOrdersState,
  fetchOrdersWindow,
  formatMoscowApiDate,
  hmacKeyFingerprint,
  hmacOrderKey,
  normalizeUtcDate,
  rublesToKopecks,
  runOrdersSync,
  sanitizeOrder,
  upsertObservation,
} from "../../scripts/affiliate/orders.mjs";

const clid = "15238076";
const secret = "fixture-secret-that-is-at-least-32-bytes-long";
const token = "oauth-fixture-that-must-never-be-persisted";

function rawOrder(overrides = {}) {
  return {
    clid,
    vid: "krepitvFixture",
    orderId: "9000000000001",
    dateCreated: "2026-07-30T12:00:00",
    dateUpdated: "2026-07-30T12:05:00",
    status: "NEW",
    additionalInfo: [],
    cart: 12_345.67,
    payment: 123.45,
    promocode: "PERSONAL-PROMO",
    tariff: { rate: 0.1 },
    items: [{ name: "private cart item", payment: 123.45 }],
    ...overrides,
  };
}

function okResponse(orders, overrides = {}) {
  return {
    ok: true,
    status: 200,
    headers: new Headers(),
    async json() {
      return { status: "OK", orders };
    },
    ...overrides,
  };
}

test("normalizes Moscow API dates and converts rubles to exact integer kopecks", () => {
  assert.equal(
    normalizeUtcDate("2026-07-31T03:00:00"),
    "2026-07-31T00:00:00.000Z",
  );
  assert.equal(
    normalizeUtcDate("2026-07-31T03:00:00+03:00"),
    "2026-07-31T00:00:00.000Z",
  );
  assert.equal(
    formatMoscowApiDate("2026-07-31T00:00:00.000Z"),
    "2026-07-31T03:00:00",
  );
  assert.equal(rublesToKopecks("123.45"), 12_345);
  assert.equal(rublesToKopecks(0.1), 10);
  assert.equal(rublesToKopecks("1e2"), 10_000);
  assert.equal(rublesToKopecks("1.2300"), 123);
  assert.throws(() => rublesToKopecks("1.001"), /one kopeck/);
  assert.throws(() => rublesToKopecks(-1), /must not be negative/);
});

test("uses an HMAC key and sanitizes the API order before it leaves memory", () => {
  const sanitized = sanitizeOrder(
    rawOrder({
      status: "CANCELLED",
      additionalInfo: ["MARKET_CANCEL", "free-form buyer message"],
    }),
    { clid, secret, knownVids: new Set(["krepitvFixture"]) },
  );
  const expectedKey = createHmac("sha256", secret)
    .update(`${clid}:9000000000001`)
    .digest("hex");

  assert.equal(sanitized.record.order_key, expectedKey);
  assert.equal(
    hmacOrderKey({ secret, clid, orderId: "9000000000001" }),
    expectedKey,
  );
  assert.match(hmacKeyFingerprint(secret), /^[a-f0-9]{64}$/);
  assert.equal(sanitized.record.created_at, "2026-07-30T09:00:00.000Z");
  assert.equal(sanitized.record.updated_at, "2026-07-30T09:05:00.000Z");
  assert.equal(sanitized.record.payment_kopecks, 12_345);
  assert.deepEqual(sanitized.record.cancellation_reasons, [
    "MARKET_CANCEL",
    "UNKNOWN",
  ]);
  assert.equal(sanitized.known_vid, true);

  const serialized = JSON.stringify(sanitized);
  for (const forbidden of [
    "9000000000001",
    "PERSONAL-PROMO",
    "private cart item",
    "promocode",
    "cart",
    "items",
    "tariff",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("uses the current official cancellation reason codes", () => {
  assert.deepEqual(CANCELLATION_REASON_ENUM, [
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
  const sanitized = sanitizeOrder(
    rawOrder({
      status: "CANCELLED",
      additionalInfo: ["BANNED_SOURCE", "BUYER_CANCEL", "future_reason"],
    }),
    { clid, secret, knownVids: new Set(["krepitvFixture"]) },
  );
  assert.deepEqual(sanitized.record.cancellation_reasons, [
    "BANNED_SOURCE",
    "BUYER_CANCEL",
    "UNKNOWN",
  ]);
});

test("fetches pages sequentially with one fixed update window and total=true", async () => {
  const calls = [];
  let active = 0;
  let maximumActive = 0;
  const pages = [
    [
      rawOrder({ orderId: "1" }),
      rawOrder({ orderId: "2", status: "ON_HOLD" }),
    ],
    [rawOrder({ orderId: "3", status: "APPROVED" })],
  ];
  const fetchImpl = async (url, options) => {
    active += 1;
    maximumActive = Math.max(maximumActive, active);
    const parsed = new URL(url);
    calls.push({ parsed, options });
    const page = Number(parsed.searchParams.get("page"));
    await Promise.resolve();
    active -= 1;
    return okResponse(pages[page - 1]);
  };

  const result = await fetchOrdersWindow({
    fetchImpl,
    token,
    clid,
    secret,
    knownVids: new Set(["krepitvFixture"]),
    updateStart: "2026-07-28T00:00:00.000Z",
    updateEnd: "2026-07-31T10:11:12.000Z",
    sleep: async () => {},
    retryDelaysMs: [],
    pageSize: 2,
  });

  assert.equal(result.pages, 2);
  assert.equal(result.records, 3);
  assert.equal(maximumActive, 1);
  assert.deepEqual(
    calls.map(({ parsed }) => parsed.searchParams.get("page")),
    ["1", "2"],
  );
  for (const { parsed, options } of calls) {
    assert.equal(parsed.pathname, "/v3/affiliate/orders");
    assert.equal(parsed.searchParams.get("clid"), clid);
    assert.equal(parsed.searchParams.get("updateStart"), "2026-07-28T03:00:00");
    assert.equal(parsed.searchParams.get("updateEnd"), "2026-07-31T13:11:12");
    assert.equal(parsed.searchParams.get("total"), "true");
    assert.equal(parsed.searchParams.get("count"), "2");
    assert.equal(parsed.searchParams.get("format"), "json");
    assert.equal(parsed.toString().includes(token), false);
    assert.equal(options.headers.Authorization, `OAuth ${token}`);
  }
  assert.equal(JSON.stringify(result).includes("9000000000001"), false);
});

test("uses the official maximum page size by default", async () => {
  let requestUrl = null;
  await fetchOrdersWindow({
    fetchImpl: async (url) => {
      requestUrl = new URL(url);
      return okResponse([]);
    },
    token,
    clid,
    secret,
    knownVids: new Set(["krepitvFixture"]),
    updateStart: "2026-07-30T00:00:00Z",
    updateEnd: "2026-07-31T00:00:00Z",
    sleep: async () => {},
    retryDelaysMs: [],
  });
  assert.equal(requestUrl.searchParams.get("count"), "1000");
});

test("retries bounded transient and rate-limit responses without exposing OAuth", async () => {
  const sleeps = [];
  let attempt = 0;
  const result = await fetchOrdersWindow({
    fetchImpl: async () => {
      attempt += 1;
      if (attempt === 1) {
        return { ok: false, status: 500, headers: new Headers() };
      }
      if (attempt === 2) {
        return {
          ok: false,
          status: 403,
          headers: new Headers({
            "X-RateLimit-Method-Remaining": "0",
            "Retry-After": "1",
          }),
        };
      }
      return okResponse([]);
    },
    token,
    clid,
    secret,
    knownVids: new Set(["krepitvFixture"]),
    updateStart: "2026-07-30T00:00:00Z",
    updateEnd: "2026-07-31T00:00:00Z",
    sleep: async (milliseconds) => sleeps.push(milliseconds),
    retryDelaysMs: [5, 10],
  });
  assert.equal(result.pages, 1);
  assert.deepEqual(sleeps, [5, 1_000]);

  await assert.rejects(
    fetchOrdersWindow({
      fetchImpl: async () => ({
        ok: false,
        status: 401,
        headers: new Headers(),
      }),
      token,
      clid,
      secret,
      knownVids: new Set(["krepitvFixture"]),
      updateStart: "2026-07-30T00:00:00Z",
      updateEnd: "2026-07-31T00:00:00Z",
      sleep: async () => {},
      retryDelaysMs: [],
    }),
    (error) => {
      assert.match(error.message, /HTTP 401/);
      assert.equal(error.message.includes(token), false);
      return true;
    },
  );
});

test("requires an explicit first backfill then overlaps a successful cursor by 48 hours", () => {
  const empty = createOrdersState(clid, secret);
  assert.throws(
    () =>
      computeSyncWindow({
        state: empty,
        clid,
        runEnd: "2026-07-31T12:00:00Z",
      }),
    /backfill-start/,
  );
  assert.deepEqual(
    computeSyncWindow({
      state: empty,
      clid,
      runEnd: "2026-07-31T12:00:00Z",
      backfillStart: "2026-07-01T00:00:00+03:00",
    }),
    {
      update_start: "2026-06-30T21:00:00.000Z",
      update_end: "2026-07-31T12:00:00.000Z",
    },
  );

  empty.cursor.last_successful_update_end = "2026-07-30T10:00:00.000Z";
  assert.deepEqual(
    computeSyncWindow({
      state: empty,
      clid,
      runEnd: "2026-07-31T12:00:00Z",
    }),
    {
      update_start: "2026-07-28T10:00:00.000Z",
      update_end: "2026-07-31T12:00:00.000Z",
    },
  );
});

test("keeps the cursor fail-closed when any API page fails", async () => {
  const state = createOrdersState(clid, secret);
  state.cursor.last_successful_update_end = "2026-07-30T10:00:00.000Z";
  const before = structuredClone(state);
  let clockCalls = 0;

  await assert.rejects(
    runOrdersSync({
      state,
      clid,
      token,
      secret,
      knownVids: new Set(["krepitvFixture"]),
      clock: () => {
        clockCalls += 1;
        return new Date("2026-07-31T12:00:00Z");
      },
      fetchImpl: async () => {
        throw new Error("socket with sensitive details");
      },
      sleep: async () => {},
      retryDelaysMs: [],
    }),
    /failed before receiving/,
  );
  assert.equal(clockCalls, 1);
  assert.deepEqual(state, before);
});

test("quarantines unknown VIDs, promotes them when provided, and keeps transition history", () => {
  const state = createOrdersState(clid, secret);
  const first = sanitizeOrder(rawOrder(), {
    clid,
    secret,
    knownVids: new Set(),
  });
  assert.equal(
    upsertObservation(state, first, "2026-07-30T10:00:00Z"),
    "quarantined",
  );
  assert.equal(Object.keys(state.quarantine).length, 1);
  assert.equal(Object.keys(state.orders).length, 0);

  const approved = sanitizeOrder(
    rawOrder({
      dateUpdated: "2026-07-31T12:05:00",
      status: "APPROVED",
      payment: "234.56",
    }),
    { clid, secret, knownVids: new Set(["krepitvFixture"]) },
  );
  assert.equal(
    upsertObservation(state, approved, "2026-07-31T10:00:00Z"),
    "known",
  );
  assert.equal(Object.keys(state.quarantine).length, 0);
  assert.equal(Object.keys(state.orders).length, 1);
  const order = Object.values(state.orders)[0];
  assert.equal(order.status, "APPROVED");
  assert.equal(order.payment_kopecks, 23_456);
  assert.equal(order.transitions.length, 2);

  upsertObservation(state, approved, "2026-07-31T11:00:00Z");
  assert.equal(Object.values(state.orders)[0].transitions.length, 2);
});

test("successful sync persists only the sanitized projection", async () => {
  const result = await runOrdersSync({
    state: null,
    clid,
    token,
    secret,
    knownVids: new Set(["krepitvFixture"]),
    backfillStart: "2026-07-30T00:00:00+03:00",
    clock: () => new Date("2026-07-31T12:00:00Z"),
    fetchImpl: async () => okResponse([rawOrder()]),
    sleep: async () => {},
    retryDelaysMs: [],
  });
  assert.equal(
    result.state.cursor.last_successful_update_end,
    "2026-07-31T12:00:00.000Z",
  );
  const serialized = JSON.stringify(result);
  for (const forbidden of [
    token,
    secret,
    "9000000000001",
    "PERSONAL-PROMO",
    "private cart item",
    "promocode",
    "cart",
    "items",
    "tariff",
  ]) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }

  const second = await runOrdersSync({
    state: result.state,
    clid,
    token,
    secret,
    knownVids: new Set(["krepitvFixture"]),
    clock: () => new Date("2026-08-01T12:00:00Z"),
    fetchImpl: async () => okResponse([]),
    sleep: async () => {},
    retryDelaysMs: [],
  });
  assert.equal(
    second.state.cursor.last_successful_update_end,
    "2026-08-01T12:00:00.000Z",
  );

  let requestedAfterRotation = false;
  await assert.rejects(
    runOrdersSync({
      state: result.state,
      clid,
      token,
      secret: "rotated-fixture-secret-that-is-at-least-32-bytes",
      knownVids: new Set(["krepitvFixture"]),
      clock: () => new Date("2026-08-01T12:00:00Z"),
      fetchImpl: async () => {
        requestedAfterRotation = true;
        return okResponse([]);
      },
    }),
    /another HMAC key/,
  );
  assert.equal(requestedAfterRotation, false);

  const poisoned = structuredClone(result.state);
  Object.values(poisoned.orders)[0].orderId = "must-not-survive";
  let requested = false;
  await assert.rejects(
    runOrdersSync({
      state: poisoned,
      clid,
      token,
      secret,
      knownVids: new Set(["krepitvFixture"]),
      clock: () => new Date("2026-08-01T12:00:00Z"),
      fetchImpl: async () => {
        requested = true;
        return okResponse([]);
      },
    }),
    /state is malformed/,
  );
  assert.equal(requested, false);
});

test("monthly report counts only currently APPROVED rewards by dateUpdated", () => {
  const state = createOrdersState(clid, secret);
  state.cursor.last_successful_update_end = "2026-08-01T00:00:00.000Z";
  state.orders = {
    approved_july: {
      status: "APPROVED",
      updated_at: "2026-07-10T00:00:00.000Z",
      payment_kopecks: 12_345,
    },
    approved_august: {
      status: "APPROVED",
      updated_at: "2026-08-01T00:00:00.000Z",
      payment_kopecks: 50_000,
    },
    approved_moscow_july: {
      status: "APPROVED",
      updated_at: "2026-06-30T21:30:00.000Z",
      payment_kopecks: 1_000,
    },
    approved_moscow_august: {
      status: "APPROVED",
      updated_at: "2026-07-31T21:30:00.000Z",
      payment_kopecks: 2_000,
    },
    later_cancelled: {
      status: "CANCELLED",
      updated_at: "2026-07-20T00:00:00.000Z",
      payment_kopecks: 99_999,
      transitions: [
        {
          status: "APPROVED",
          updated_at: "2026-07-15T00:00:00.000Z",
          payment_kopecks: 99_999,
        },
      ],
    },
    new_order: {
      status: "NEW",
      updated_at: "2026-07-31T00:00:00.000Z",
      payment_kopecks: 500,
    },
    held_order: {
      status: "ON_HOLD",
      updated_at: "2026-07-31T00:00:00.000Z",
      payment_kopecks: 700,
    },
  };
  state.quarantine = { unknown: {} };

  const report = buildMonthlyOrdersReport(
    state,
    "2026-07",
    "2026-08-01T01:00:00Z",
  );
  assert.deepEqual(report.approved, {
    orders: 2,
    payment_kopecks: 13_345,
  });
  assert.equal(report.cancelled_in_month.orders, 1);
  assert.deepEqual(report.pending_current, {
    new_orders: 1,
    on_hold_orders: 1,
    payment_kopecks: 1_200,
    note: "Не является подтверждённой выручкой",
  });
  assert.equal(report.quarantined_current.orders, 1);
  assert.equal(JSON.stringify(report).includes("approved_july"), false);
});

test("collects exact manifest/base VIDs and rejects non-private ledger paths", () => {
  const vids = collectKnownVids(
    {
      cards: [
        { clid, vid: "krepitvOne" },
        { clid, vid: "krepitvTwo" },
      ],
    },
    { vids: ["krepitvLandingOffer"] },
    clid,
  );
  assert.deepEqual([...vids].sort(), [
    "krepitvLandingOffer",
    "krepitvOne",
    "krepitvTwo",
  ]);

  const withHubPlacements = collectKnownVids(
    { cards: [{ clid, vid: "krepitvOne" }] },
    {
      clid,
      hubs: [{ placements: [{ vid: "krepitvSeoHubOne" }] }],
    },
    clid,
  );
  assert.deepEqual([...withHubPlacements].sort(), [
    "krepitvOne",
    "krepitvSeoHubOne",
  ]);
  assert.throws(
    () => collectKnownVids(
      { cards: [{ clid, vid: "krepitvOne" }] },
      { clid: "99999999", hubs: [] },
      clid,
    ),
    /another clid/,
  );
  assert.throws(
    () => collectKnownVids(
      { cards: [{ clid, vid: "krepitvOne" }] },
      { clid, hubs: [{ placements: [{ vid: "krepitvOne" }] }] },
      clid,
    ),
    /duplicate/,
  );

  const root = "/tmp/krepitv-fixture";
  assert.equal(
    assertPrivatePath(root, `${root}/.private/orders/state.json`),
    path.resolve(`${root}/.private/orders/state.json`),
  );
  assert.throws(
    () => assertPrivatePath(root, `${root}/data/orders.json`),
    /under \.private/,
  );
});
