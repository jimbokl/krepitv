import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  assertSafeOrdersAggregate,
  assertPrivatePath,
  buildMonthlyOrdersReport,
  buildPlacementAttributionIndex,
  buildSafeMonthlyOrdersAggregate,
  CANCELLATION_REASON_ENUM,
  collectKnownVids,
  computeSyncWindow,
  createOrdersState,
  fetchOrdersWindow,
  formatSafeOrdersAggregateSummary,
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

  const modelPlacements = {
    clid,
    models: [
      {
        model_id: "tcl-55c7k",
        model_path: "/modeli/tcl-55c7k/",
        placements: [
          {
            placement_id: "model-tcl-55c7k-r01-onkron-tm6",
            rank: 1,
            entity_id: "onkron-tm6",
            vid: "krepitvModelTcl55c7kOne",
          },
        ],
      },
    ],
  };
  const withAllPlacementManifests = collectKnownVids(
    { cards: [{ clid, vid: "krepitvOne" }] },
    [
      {
        clid,
        hubs: [{ placements: [{ vid: "krepitvSeoHubOne" }] }],
      },
      modelPlacements,
    ],
    clid,
  );
  assert.deepEqual([...withAllPlacementManifests].sort(), [
    "krepitvModelTcl55c7kOne",
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
  assert.throws(
    () => collectKnownVids(
      { cards: [{ clid, vid: "krepitvOne" }] },
      [{ ...modelPlacements, clid: "99999999" }],
      clid,
    ),
    /another clid/,
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

test("aggregates private placement attribution without exposing order keys", () => {
  const baseManifest = {
    cards: [
      {
        id: "market-onkron-tm6",
        page_path: "/kronshteyny/onkron-tm6/",
        entity_kind: "mount",
        entity_id: "onkron-tm6",
        clid,
        vid: "krepitvOnkronTM6",
      },
    ],
  };
  const hubManifest = {
    clid,
    hubs: [
      {
        hub_path: "/kronshteyny-onkron/",
        placements: [
          {
            placement_id: "seo-hub-onkron-r01",
            rank: 1,
            entity_id: "onkron-tm6",
            vid: "krepitvSeoHubOne",
          },
        ],
      },
    ],
  };
  const modelManifest = {
    clid,
    models: [
      {
        model_path: "/modeli/tcl-55c7k/",
        placements: [
          {
            placement_id: "model-tcl-55c7k-r01-onkron-tm6",
            rank: 1,
            entity_id: "onkron-tm6",
            vid: "krepitvModelTcl55c7kOne",
          },
        ],
      },
    ],
  };
  const placementIndex = buildPlacementAttributionIndex(
    baseManifest,
    [hubManifest, modelManifest],
    clid,
  );
  assert.deepEqual(placementIndex.get("krepitvModelTcl55c7kOne"), {
    vid: "krepitvModelTcl55c7kOne",
    surface: "model_page",
    landing_path: "/modeli/tcl-55c7k/",
    placement_id: "model-tcl-55c7k-r01-onkron-tm6",
    rank: 1,
    entity_id: "onkron-tm6",
  });

  const state = {
    cursor: { last_successful_update_end: "2026-08-01T00:00:00.000Z" },
    orders: {
      private_approved_order_key: {
        vid: "krepitvModelTcl55c7kOne",
        status: "APPROVED",
        updated_at: "2026-07-31T12:00:00.000Z",
        payment_kopecks: 12_345,
      },
      private_pending_order_key: {
        vid: "krepitvModelTcl55c7kOne",
        status: "ON_HOLD",
        updated_at: "2026-08-01T00:00:00.000Z",
        payment_kopecks: 2_500,
      },
      private_cancelled_order_key: {
        vid: "krepitvSeoHubOne",
        status: "CANCELLED",
        updated_at: "2026-07-20T00:00:00.000Z",
        payment_kopecks: 0,
      },
      private_unattributed_order_key: {
        vid: "krepitvLegacyKnownVid",
        status: "NEW",
        updated_at: "2026-08-01T00:00:00.000Z",
        payment_kopecks: 500,
      },
    },
    quarantine: {},
  };
  const report = buildMonthlyOrdersReport(
    state,
    "2026-07",
    "2026-08-01T01:00:00Z",
    placementIndex,
  );
  const modelRow = report.attribution.placements.find(
    (row) => row.vid === "krepitvModelTcl55c7kOne",
  );
  assert.deepEqual(modelRow.approved_in_month, {
    orders: 1,
    payment_kopecks: 12_345,
  });
  assert.deepEqual(modelRow.pending_current, {
    new_orders: 0,
    on_hold_orders: 1,
    payment_kopecks: 2_500,
  });
  assert.equal(
    report.attribution.placements.find(
      (row) => row.vid === "krepitvSeoHubOne",
    ).cancelled_in_month.orders,
    1,
  );
  assert.deepEqual(report.attribution.unattributed.pending_current, {
    new_orders: 1,
    on_hold_orders: 0,
    payment_kopecks: 500,
  });
  const serialized = JSON.stringify(report);
  for (const forbidden of Object.keys(state.orders)) {
    assert.equal(serialized.includes(forbidden), false, forbidden);
  }
});

test("durable aggregate and its log cannot expose raw or hashed order identifiers", () => {
  const rawOrderId = "9000000000001";
  const orderHash = createHmac("sha256", secret)
    .update(`${clid}:${rawOrderId}`)
    .digest("hex");
  const state = createOrdersState(clid, secret);
  state.cursor.last_successful_update_end = "2026-07-31T12:00:00.000Z";
  state.sync = {
    last_started_at: "2026-07-31T12:00:00.000Z",
    last_completed_at: "2026-07-31T12:00:00.000Z",
    window_start: "2026-07-29T00:00:00.000Z",
    window_end: "2026-07-31T12:00:00.000Z",
    pages: 1,
    records: 1,
    known_records: 1,
    quarantined_records: 0,
  };
  state.orders[rawOrderId] = {
    order_key: orderHash,
    vid: "krepitvFixture",
    status: "APPROVED",
    updated_at: "2026-07-31T11:59:00.000Z",
    payment_kopecks: 12_345,
    oauth_fixture: token,
    hmac_fixture: secret,
  };
  const placementId = "market-fixture-mount";
  const placementIndex = buildPlacementAttributionIndex(
    {
      cards: [
        {
          id: placementId,
          page_path: "/kronshteyny/fixture-mount/",
          entity_kind: "mount",
          entity_id: "fixture-mount",
          clid,
          vid: "krepitvFixture",
        },
      ],
    },
    null,
    clid,
  );

  const aggregate = buildSafeMonthlyOrdersAggregate(
    state,
    "2026-07",
    "2026-07-31T12:01:00.000Z",
    placementIndex,
  );
  assert.deepEqual(aggregate.approved, {
    orders: 1,
    payment_kopecks: 12_345,
  });
  assert.deepEqual(aggregate.attribution_winners.rows, [
    {
      surface: "mount_page",
      landing_path: "/kronshteyny/fixture-mount/",
      entity_id: "fixture-mount",
      rank: null,
      orders: { APPROVED: 1, NEW: 0, ON_HOLD: 0, CANCELLED: 0 },
      approved_payment_kopecks: 12_345,
    },
  ]);
  assert.equal(Object.hasOwn(aggregate, "clid"), false);

  const outputs = [
    JSON.stringify(aggregate),
    formatSafeOrdersAggregateSummary(aggregate),
  ];
  for (const output of outputs) {
    for (const forbidden of [
      rawOrderId,
      orderHash,
      token,
      secret,
      "krepitvFixture",
      placementId,
      "order_key",
      "orderId",
      "oauth_fixture",
      "hmac_fixture",
    ]) {
      assert.equal(output.includes(forbidden), false, forbidden);
    }
  }

  assert.throws(
    () => assertSafeOrdersAggregate({ ...aggregate, order_key: orderHash }),
    /unsupported schema/,
  );
  assert.throws(
    () =>
      assertSafeOrdersAggregate({
        ...aggregate,
        kind: orderHash,
      }),
    /unsupported schema|order-key hashes/,
  );
});

test("safe attribution winners group public dimensions and retain payment only for APPROVED", () => {
  const privatePlacementIds = [
    "model-fixture-r01-primary",
    "model-fixture-r01-revision",
  ];
  const privateVids = ["krepitvFixturePrimary", "krepitvFixtureRevision"];
  const placementIndex = buildPlacementAttributionIndex(
    {
      cards: [
        {
          id: "market-unused-safe-mount",
          page_path: "/kronshteyny/unused-safe-mount/",
          entity_kind: "mount",
          entity_id: "unused-safe-mount",
          clid,
          vid: "krepitvUnusedSafeMount",
        },
      ],
    },
    [
      {
        clid,
        models: [
          {
            model_path: "/modeli/fixture-tv/",
            placements: privateVids.map((vid, index) => ({
              placement_id: privatePlacementIds[index],
              rank: 1,
              entity_id: "fixture-mount",
              vid,
            })),
          },
        ],
      },
    ],
    clid,
  );
  const state = createOrdersState(clid, secret);
  state.cursor.last_successful_update_end = "2026-07-31T12:00:00.000Z";
  state.sync = {
    last_started_at: "2026-07-31T12:00:00.000Z",
    last_completed_at: "2026-07-31T12:00:00.000Z",
    window_start: "2026-07-29T00:00:00.000Z",
    window_end: "2026-07-31T12:00:00.000Z",
    pages: 1,
    records: 5,
    known_records: 5,
    quarantined_records: 0,
  };
  state.orders = {
    approved: {
      vid: privateVids[0],
      status: "APPROVED",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 12_345,
    },
    pending_new: {
      vid: privateVids[0],
      status: "NEW",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 888_888,
    },
    pending_hold: {
      vid: privateVids[1],
      status: "ON_HOLD",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 777_777,
    },
    cancelled: {
      vid: privateVids[1],
      status: "CANCELLED",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 666_666,
    },
    unattributed_new: {
      vid: "krepitvLegacyPrivateVid",
      status: "NEW",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 999_999,
    },
  };

  const aggregate = buildSafeMonthlyOrdersAggregate(
    state,
    "2026-07",
    "2026-07-31T12:01:00.000Z",
    placementIndex,
  );
  assert.equal(aggregate.schema_version, 2);
  assert.deepEqual(aggregate.attribution_winners.dimensions, [
    "surface",
    "landing_path",
    "entity_id",
    "rank",
  ]);
  assert.deepEqual(aggregate.attribution_winners.rows, [
    {
      surface: "model_page",
      landing_path: "/modeli/fixture-tv/",
      entity_id: "fixture-mount",
      rank: 1,
      orders: { APPROVED: 1, NEW: 1, ON_HOLD: 1, CANCELLED: 1 },
      approved_payment_kopecks: 12_345,
    },
  ]);
  assert.deepEqual(aggregate.attribution_winners.unattributed, {
    orders: { APPROVED: 0, NEW: 1, ON_HOLD: 0, CANCELLED: 0 },
    approved_payment_kopecks: 0,
  });
  assert.equal(aggregate.pending_current.payment_kopecks, 2_666_664);

  const winnersJson = JSON.stringify(aggregate.attribution_winners);
  for (const forbidden of [
    ...privateVids,
    ...privatePlacementIds,
    "krepitvLegacyPrivateVid",
    clid,
    "888888",
    "777777",
    "666666",
    "999999",
    "vid",
    "placement_id",
    "order_key",
    "oauth",
  ]) {
    assert.equal(winnersJson.toLowerCase().includes(forbidden.toLowerCase()), false, forbidden);
  }

  const leakedRow = structuredClone(aggregate);
  leakedRow.attribution_winners.rows[0].vid = privateVids[0];
  assert.throws(() => assertSafeOrdersAggregate(leakedRow), /dimensions are malformed/);

  const leakedPlacement = structuredClone(aggregate);
  leakedPlacement.attribution_winners.rows[0].placement_id = privatePlacementIds[0];
  assert.throws(
    () => assertSafeOrdersAggregate(leakedPlacement),
    /dimensions are malformed/,
  );

  const leakedClid = structuredClone(aggregate);
  leakedClid.clid = clid;
  assert.throws(() => assertSafeOrdersAggregate(leakedClid), /unsupported schema/);

  const pendingPayment = structuredClone(aggregate);
  pendingPayment.attribution_winners.rows[0].pending_payment_kopecks = 1;
  assert.throws(
    () => assertSafeOrdersAggregate(pendingPayment),
    /dimensions are malformed/,
  );

  const brokenTotals = structuredClone(aggregate);
  brokenTotals.attribution_winners.rows[0].orders.APPROVED = 2;
  assert.throws(
    () => assertSafeOrdersAggregate(brokenTotals),
    /do not reconcile/,
  );

  const brokenRank = structuredClone(aggregate);
  brokenRank.attribution_winners.rows[0].rank = null;
  assert.throws(() => assertSafeOrdersAggregate(brokenRank), /rank is malformed/);

  const duplicateGroup = structuredClone(aggregate);
  duplicateGroup.attribution_winners.rows.push(
    structuredClone(duplicateGroup.attribution_winners.rows[0]),
  );
  assert.throws(
    () => assertSafeOrdersAggregate(duplicateGroup),
    /duplicate group/,
  );

  const emptyWinner = structuredClone(aggregate);
  emptyWinner.attribution_winners.rows[0].orders = {
    APPROVED: 0,
    NEW: 0,
    ON_HOLD: 0,
    CANCELLED: 0,
  };
  emptyWinner.attribution_winners.rows[0].approved_payment_kopecks = 0;
  assert.throws(
    () => assertSafeOrdersAggregate(emptyWinner),
    /has no attribution signal/,
  );
});

test("safe aggregate validates every placement dimension even when it has no orders", () => {
  const state = createOrdersState(clid, secret);
  state.cursor.last_successful_update_end = "2026-07-31T12:00:00.000Z";
  state.sync = {
    last_started_at: "2026-07-31T12:00:00.000Z",
    last_completed_at: "2026-07-31T12:00:00.000Z",
    window_start: "2026-07-29T00:00:00.000Z",
    window_end: "2026-07-31T12:00:00.000Z",
    pages: 1,
    records: 0,
    known_records: 0,
    quarantined_records: 0,
  };
  const unsafeIndex = new Map([
    [
      "krepitvUnsafeUnused",
      {
        vid: "krepitvUnsafeUnused",
        surface: "model_page",
        landing_path: "https://example.invalid/private",
        placement_id: "private-placement-id",
        rank: 1,
        entity_id: "safe-entity",
      },
    ],
  ]);
  assert.throws(
    () =>
      buildSafeMonthlyOrdersAggregate(
        state,
        "2026-07",
        "2026-07-31T12:01:00.000Z",
        unsafeIndex,
      ),
    /unsafe attribution dimensions/,
  );

  state.orders = {
    clid_as_entity: {
      vid: "krepitvClidAsEntity",
      status: "APPROVED",
      updated_at: "2026-07-30T12:00:00.000Z",
      payment_kopecks: 100,
    },
  };
  state.sync.records = 1;
  state.sync.known_records = 1;
  const clidLeakingIndex = new Map([
    [
      "krepitvClidAsEntity",
      {
        vid: "krepitvClidAsEntity",
        surface: "mount_page",
        landing_path: "/kronshteyny/safe-entity/",
        placement_id: "private-clid-placement",
        rank: null,
        entity_id: clid,
      },
    ],
  ]);
  assert.throws(
    () =>
      buildSafeMonthlyOrdersAggregate(
        state,
        "2026-07",
        "2026-07-31T12:01:00.000Z",
        clidLeakingIndex,
      ),
    /private attribution identifier/,
  );
});

test("monthly aggregate JSON Schema closes every durable object boundary", async () => {
  const schema = JSON.parse(
    await readFile(
      new URL(
        "../../schemas/affiliate-orders-monthly-aggregate.schema.json",
        import.meta.url,
      ),
      "utf8",
    ),
  );
  assert.equal(schema.properties.schema_version.const, 2);
  assert.equal(schema.additionalProperties, false);
  assert.equal(
    schema.properties.attribution_winners.additionalProperties,
    false,
  );
  assert.equal(schema.$defs.attributionRow.additionalProperties, false);
  assert.equal(schema.$defs.attributionCounters.additionalProperties, false);
  assert.equal(schema.$defs.statusCounts.additionalProperties, false);
  assert.deepEqual(schema.$defs.statusCounts.required.sort(), [
    "APPROVED",
    "CANCELLED",
    "NEW",
    "ON_HOLD",
  ]);
  const rowProperties = Object.keys(schema.$defs.attributionRow.properties);
  for (const forbidden of ["vid", "placement_id", "clid", "order_key", "oauth"])
    assert.equal(rowProperties.includes(forbidden), false, forbidden);
});
