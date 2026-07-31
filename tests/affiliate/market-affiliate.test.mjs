import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AffiliateValidationError,
  buildMarketAffiliateRequestUrl,
  buildPublicSnapshot,
  buildSnapshot,
  marketTitleMatchesExpected,
  readJson,
  validateBatch,
  validatePublicSnapshot,
  validateSnapshot,
  validateSource,
  validateSourceAgainstMounts,
  writeJson,
} from "../../scripts/affiliate/lib.mjs";
import { loadFreshAffiliateOffers } from "../../web/src/lib/catalog.js";
import {
  AFFILIATE_LINK_REL,
  MAX_AFFILIATE_AGE_MS,
  getAffiliatePresentation,
  getFreshAffiliateOffers,
  selectAffiliateOffer,
} from "../../web/src/lib/affiliateOffer.mjs";
import {
  AFFILIATE_CLICK_EVENT,
  affiliateClickDetail,
  emitAffiliateClick,
} from "../../web/src/lib/affiliateClick.mjs";

const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const fixtures = path.join(root, "tests/fixtures/affiliate");
const fixtureOptions = { allowExampleHosts: true };

function advertisingOffer(overrides = {}) {
  return {
    publishable: true,
    eligibility: "publishable",
    market_source_url: "https://market.yandex.ru/card/kronshteyn/123",
    affiliate_href:
      "https://market.yandex.ru/card/kronshteyn/123?clid=12345678&vid=krepitvfixture&distr_type=7&utm_source=partner_network&utm_campaign=12345678&erid=eridFixture123",
    page_path: "/kronshteyny/test/",
    entity_kind: "mount",
    entity_id: "test",
    compliance_mode: "advertising",
    clid: "12345678",
    vid: "krepitvfixture",
    page_name: "POKUPKI_PRODUCT",
    title: "Кронштейн Test",
    product_photo: "https://avatars.mds.yandex.net/get-mpic/test/300x300",
    price: 2500,
    stock: 8,
    checked_at: "2026-07-30T09:00:00Z",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
    ...overrides,
  };
}

function nonAdOffer(overrides = {}) {
  return {
    ...advertisingOffer(),
    compliance_mode: "non_ad_storefront",
    affiliate_href:
      "https://market.yandex.ru/card/kronshteyn/123?clid=12345678&vid=krepitvfixture&distr_type=7&utm_source=partner_network&utm_campaign=12345678",
    creative: null,
    ...overrides,
  };
}

test("validates example.invalid source, batch, private and public snapshot fixtures", async () => {
  const [source, batch, snapshot, publicSnapshot] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
    readJson(path.join(fixtures, "public.valid.json")),
  ]);

  assert.equal(validateSource(source, fixtureOptions), source);
  assert.equal(validateBatch(batch, fixtureOptions), batch);
  assert.equal(validateSnapshot(snapshot, fixtureOptions), snapshot);
  assert.equal(validatePublicSnapshot(publicSnapshot, fixtureOptions), publicSnapshot);
});

test("publishes only eligible offers without private decision numbers", async () => {
  const snapshot = await readJson(path.join(fixtures, "snapshot.valid.json"));
  snapshot.offers[1] = {
    ...snapshot.offers[1],
    affiliate_href: null,
    stock: 0,
    eligibility: "out_of_stock",
    publishable: false,
  };

  const publicSnapshot = buildPublicSnapshot(snapshot, fixtureOptions);
  assert.equal(publicSnapshot.offers.length, 1);
  assert.equal(publicSnapshot.offers[0].id, "mount-fixed-01");
  for (const field of ["promise", "price", "stock"]) {
    assert.equal(field in publicSnapshot.offers[0], false);
  }
});

test("public snapshot validator rejects private decision fields", async () => {
  const publicSnapshot = await readJson(path.join(fixtures, "public.valid.json"));

  for (const field of ["promise", "price", "stock"]) {
    const leaked = structuredClone(publicSnapshot);
    leaked.offers[0][field] = 1;
    assert.throws(
      () => validatePublicSnapshot(leaked, fixtureOptions),
      new RegExp(`unexpected key ${field}`),
    );
  }
});

test("builds advertising and explicit non-ad storefront offers", async () => {
  const [source, batch, expected] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  const actual = buildSnapshot(source, batch, fixtureOptions);
  assert.deepEqual(actual, expected);
  assert.equal(actual.offers[0].publishable, true);
  assert.equal(actual.offers[1].publishable, true);
  assert.equal(actual.offers[1].creative, null);
});

test("strips an unmarked advertising draft href", async () => {
  const [source, batch] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
  ]);
  source.cards[1].compliance_mode = "advertising";
  source.cards[1].creative = {
    form: "text-block",
    content_revision: "fixture-draft-v1",
    erid: null,
    registered_at: null,
    disclosure: {
      label: "Реклама",
      advertiser_name: "ООО «Яндекс Маркет»",
      advertiser_inn: "9704254424",
    },
  };
  batch.checks[1].compliance_mode = "advertising";

  const actual = buildSnapshot(source, batch, fixtureOptions);
  assert.equal(actual.offers[1].eligibility, "unmarked");
  assert.equal(actual.offers[1].publishable, false);
  assert.equal(actual.offers[1].affiliate_href, null);
});

test("retains a fresh matching offer only when a private snapshot is supplied", async () => {
  const [source, batch, previous] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);
  batch.generated_at = "2026-07-30T20:00:00Z";
  batch.checks[0] = {
    id: source.cards[0].id,
    market_source_url: source.cards[0].market_source_url,
    compliance_mode: source.cards[0].compliance_mode,
    clid: source.cards[0].clid,
    vid: source.cards[0].vid,
    status: "error",
    affiliate_href: null,
    page_name: null,
    title: null,
    product_photo: null,
    promise: null,
    price: null,
    stock: null,
    checked_at: "2026-07-30T19:59:00Z",
    error_code: "api_error",
  };
  batch.checks[1].promise = 95;
  batch.checks[1].checked_at = "2026-07-30T19:59:30Z";

  const actual = buildSnapshot(source, batch, {
    ...fixtureOptions,
    previousPrivateSnapshot: previous,
  });
  assert.deepEqual(actual.offers[0], previous.offers[0]);
  assert.equal(actual.offers[1].promise, 95);
  assert.equal(actual.generated_at, batch.generated_at);

  batch.generated_at = "2026-08-02T20:00:00Z";
  const stale = buildSnapshot(source, batch, {
    ...fixtureOptions,
    previousPrivateSnapshot: previous,
  });
  assert.equal(stale.offers[0].eligibility, "error");
  assert.equal(stale.offers[0].affiliate_href, null);
});

test("rejects sensitive keys before a snapshot can be written", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  source.cards[0].token = "redacted-test-value";

  assert.throws(
    () => validateSource(source, fixtureOptions),
    (error) =>
      error instanceof AffiliateValidationError &&
      error.issues.some((issue) => issue.includes("sensitive key is forbidden")),
  );
});

test("rejects a publishable href whose ERID does not match", async () => {
  const snapshot = await readJson(path.join(fixtures, "snapshot.valid.json"));
  snapshot.offers[0].affiliate_href =
    "https://affiliate.example.invalid/card/mount-fixed-01/100001?clid=12345678&vid=krepitvfixture01&distr_type=7&utm_source=partner_network&utm_campaign=12345678&erid=wrongFixture999";

  assert.throws(
    () => validateSnapshot(snapshot, fixtureOptions),
    /ERID query must match creative\.erid/,
  );
});

test("requires the explicit Yandex Market advertising disclosure", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  source.cards[0].creative.disclosure.advertiser_inn = "0000000000";

  assert.throws(
    () => validateSource(source, fixtureOptions),
    /must equal 9704254424/,
  );
});

test("requires an explicit non-ad storefront classification with CLID and no creative", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  assert.equal(validateSource(source, fixtureOptions), source);

  source.cards[1].creative = source.cards[0].creative;
  assert.throws(
    () => validateSource(source, fixtureOptions),
    /must have creative set to null/,
  );

  source.cards[1].creative = null;
  source.cards[1].clid = "0";
  assert.throws(
    () => validateSource(source, fixtureOptions),
    /must contain 5-20 digits/,
  );
});

test("builds a CLID request without place_id or ERID for non-ad storefronts", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  const nonAdUrl = buildMarketAffiliateRequestUrl(source.cards[1]);
  assert.equal(nonAdUrl.searchParams.get("clid"), "12345678");
  assert.equal(nonAdUrl.searchParams.get("vid"), "krepitvfixture02");
  assert.equal(nonAdUrl.searchParams.has("place_id"), false);
  assert.equal(nonAdUrl.searchParams.has("erid"), false);

  const advertisingUrl = buildMarketAffiliateRequestUrl(source.cards[0]);
  assert.equal(advertisingUrl.searchParams.get("erid"), "eridFixture123");
  assert.equal(advertisingUrl.searchParams.has("place_id"), false);
});

test("requires the configured product identity in the Market title", () => {
  assert.equal(
    marketTitleMatchesExpected("Кронштейн iTECHmount SLT-460 чёрный", ["SLT-460"]),
    true,
  );
  assert.equal(
    marketTitleMatchesExpected("Кронштейн iTECHmount SLT-460X чёрный", ["SLT-460"]),
    false,
  );
  assert.equal(
    marketTitleMatchesExpected("Кронштейн другой модели", ["SLT-460"]),
    false,
  );
});

test("rejects a Market card mapped to another catalog entity", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  source.cards[0].entity_id = "another-mount";

  assert.throws(
    () => validateSource(source, fixtureOptions),
    /must match the mount entity ID/,
  );
});

test("binds every source card to the exact catalog brand and model", async () => {
  const source = await readJson(path.join(fixtures, "source.valid.json"));
  const mounts = [
    { id: "mount-fixed-01", brand: "Fixture", model: "Fixed" },
    { id: "mount-tilt-02", brand: "Fixture", model: "Tilt" },
  ];

  assert.equal(validateSourceAgainstMounts(source, mounts, fixtureOptions), source);

  source.cards[0].expected_title_tokens = ["Fixture", "Tilt"];
  assert.throws(
    () => validateSourceAgainstMounts(source, mounts, fixtureOptions),
    /must include the exact catalog model token "Fixed"/,
  );

  source.cards[0].expected_title_tokens = ["Fixture", "Fixed"];
  source.cards[0].entity_id = "missing-mount";
  source.cards[0].page_path = "/kronshteyny/missing-mount/";
  assert.throws(
    () => validateSourceAgainstMounts(source, mounts, fixtureOptions),
    /mount does not exist in data\/mounts\.json/,
  );
});

test("publishes a direct sponsored link with the visible disclosure data", () => {
  const now = Date.parse("2026-07-30T09:30:00Z");
  const offer = advertisingOffer();

  const presentation = getAffiliatePresentation(offer, { now });
  assert.equal("price" in presentation, false);
  assert.equal("stock" in presentation, false);
  assert.equal(presentation.href, offer.affiliate_href);
  assert.equal(presentation.rel, AFFILIATE_LINK_REL);
  assert.equal(presentation.mode, "advertising");
  assert.equal(presentation.label, "Реклама");
  assert.match(presentation.notice, /Реклама/);
  assert.match(presentation.notice, /erid:/);
  assert.equal(presentation.advertiserInn, "9704254424");
  assert.equal(presentation.productTitle, "Кронштейн Test");
  assert.equal(
    selectAffiliateOffer(
      [offer],
      { pagePath: "/kronshteyny/test/", entityKind: "mount", entityId: "test" },
      { now },
    ),
    offer,
  );
});

test("publishes a transparent non-ad storefront link without ad markers", () => {
  const offer = nonAdOffer();
  const presentation = getAffiliatePresentation(offer, {
    now: Date.parse("2026-07-30T09:30:00Z"),
  });

  assert.equal(presentation.href, offer.affiliate_href);
  assert.equal(presentation.mode, "non_ad_storefront");
  assert.equal(presentation.erid, null);
  assert.equal(presentation.advertiserInn, null);
  assert.equal(presentation.notice, null);
  assert.equal(presentation.rel, AFFILIATE_LINK_REL);
});

test("rejects missing, wrong, duplicate or ERID-bearing CLID storefront links", () => {
  const valid = new URL(nonAdOffer().affiliate_href);
  const invalidLinks = [];

  const missing = new URL(valid);
  missing.searchParams.delete("clid");
  invalidLinks.push(missing.toString());

  const wrong = new URL(valid);
  wrong.searchParams.set("clid", "87654321");
  invalidLinks.push(wrong.toString());

  const duplicate = new URL(valid);
  duplicate.searchParams.append("clid", "12345678");
  invalidLinks.push(duplicate.toString());

  const marked = new URL(valid);
  marked.searchParams.set("erid", "eridFixture123");
  invalidLinks.push(marked.toString());

  for (const affiliate_href of invalidLinks) {
    assert.equal(
      getAffiliatePresentation(nonAdOffer({ affiliate_href }), {
        now: Date.parse("2026-07-30T09:30:00Z"),
      }),
      null,
    );
  }
});

test("emits one sanitized affiliate-click payload for every Market CTA", () => {
  const dispatched = [];
  class FakeCustomEvent {
    constructor(type, options) {
      this.type = type;
      this.detail = options.detail;
    }
  }
  const windowObject = {
    CustomEvent: FakeCustomEvent,
    location: { pathname: "/modeli/samsung-qe55s90fauxru/" },
    dispatchEvent(event) {
      dispatched.push(event);
      return true;
    },
  };
  const offer = {
    entity_id: "onkron-tm5-bw",
    id: "market-onkron-tm5-bw",
    page_path: "/kronshteyny/onkron-tm5-bw/",
    vid: "krepitv-mount",
    affiliate_href: "https://market.yandex.ru/card/example?erid=fixture",
  };

  assert.deepEqual(affiliateClickDetail(offer, windowObject.location.pathname), {
    entityId: "onkron-tm5-bw",
    offerId: "market-onkron-tm5-bw",
    pagePath: "/kronshteyny/onkron-tm5-bw/",
    sourcePath: "/modeli/samsung-qe55s90fauxru/",
    vid: "krepitv-mount",
  });
  assert.equal(emitAffiliateClick(windowObject, offer), true);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, AFFILIATE_CLICK_EVENT);
  assert.deepEqual(
    dispatched[0].detail,
    affiliateClickDetail(offer, windowObject.location.pathname),
  );
  assert.equal("affiliate_href" in dispatched[0].detail, false);
});

test("affiliate-click emitter fails closed without a browser event API", () => {
  assert.equal(emitAffiliateClick(null, {}), false);
  assert.equal(emitAffiliateClick({}, {}), false);
});

test("hides stale offers and falls back to a fresh offer for the same page", () => {
  const now = Date.parse("2026-07-30T12:00:00Z");
  const base = advertisingOffer();
  const stale = {
    ...base,
    id: "stale",
    checked_at: new Date(now - MAX_AFFILIATE_AGE_MS - 1).toISOString(),
  };
  const fresh = {
    ...base,
    id: "fresh",
    checked_at: new Date(now - 60_000).toISOString(),
  };

  assert.equal(getAffiliatePresentation(stale, { now }), null);
  assert.equal(
    selectAffiliateOffer(
      [stale, fresh],
      { pagePath: "/kronshteyny/test/", entityKind: "mount", entityId: "test" },
      { now },
    ),
    fresh,
  );
});

test("rejects the whole affiliate snapshot when its envelope is stale", () => {
  const now = Date.parse("2026-07-30T12:00:00Z");
  const offer = advertisingOffer({
    checked_at: new Date(now - 60_000).toISOString(),
  });
  const fresh = {
    schema_version: 2,
    generated_at: new Date(now - 60_000).toISOString(),
    offers: [offer],
  };
  const stale = {
    ...fresh,
    generated_at: new Date(now - MAX_AFFILIATE_AGE_MS - 1).toISOString(),
  };

  assert.deepEqual(getFreshAffiliateOffers(fresh, { now }), [offer]);
  assert.deepEqual(getFreshAffiliateOffers(stale, { now }), []);
});

test("loads affiliate offers only from a fresh same-origin snapshot", async () => {
  const now = Date.parse("2026-07-30T12:00:00Z");
  const offer = advertisingOffer({
    checked_at: new Date(now - 60_000).toISOString(),
  });
  const snapshot = {
    schema_version: 2,
    generated_at: new Date(now - 60_000).toISOString(),
    offers: [offer],
  };
  const response = (url) => ({
    ok: true,
    url,
    async json() {
      return snapshot;
    },
  });

  const sameOrigin = await loadFreshAffiliateOffers({
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://krepitv.ru/data/affiliate-offers.json");
      assert.deepEqual(options, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
      });
      return response(url);
    },
    now,
    origin: "https://krepitv.ru",
  });
  assert.deepEqual(sameOrigin, [offer]);

  const crossOrigin = await loadFreshAffiliateOffers({
    fetchImpl: async () => response("https://example.invalid/affiliate-offers.json"),
    now,
    origin: "https://krepitv.ru",
  });
  assert.deepEqual(crossOrigin, []);
});

test("refuses same-site, redirect and unmarked affiliate destinations", () => {
  const base = advertisingOffer();

  for (const affiliate_href of [
    "https://krepitv.ru/go/mount-fixed-01/?erid=eridFixture123",
    "https://redirect.example/offer?erid=eridFixture123",
    "https://market.yandex.ru/card/kronshteyn/123",
  ]) {
    assert.equal(
      getAffiliatePresentation(
        { ...base, affiliate_href },
        { now: Date.parse("2026-07-30T09:30:00Z") },
      ),
      null,
    );
  }
});

test("requires one sanitized check for every source card", async () => {
  const [source, batch] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
  ]);
  batch.checks.pop();

  assert.throws(
    () => buildSnapshot(source, batch, fixtureOptions),
    /missing check result/,
  );
});

test("does not retain an old offer after CLID or compliance mode changes", async () => {
  const [baseSource, baseBatch, previous] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  for (const change of ["clid", "mode"]) {
    const source = structuredClone(baseSource);
    const batch = structuredClone(baseBatch);
    const card = source.cards[0];
    const check = batch.checks[0];
    if (change === "clid") {
      card.clid = "87654321";
      check.clid = card.clid;
    } else {
      card.compliance_mode = "non_ad_storefront";
      card.creative = null;
      check.compliance_mode = card.compliance_mode;
    }
    Object.assign(check, {
      status: "error",
      affiliate_href: null,
      page_name: null,
      title: null,
      product_photo: null,
      promise: null,
      price: null,
      stock: null,
      checked_at: "2026-07-30T09:05:00Z",
      error_code: "api_error",
    });
    batch.generated_at = "2026-07-30T09:06:00Z";

    const actual = buildSnapshot(source, batch, {
      ...fixtureOptions,
      previousPrivateSnapshot: previous,
    });
    assert.equal(actual.offers[0].eligibility, "error");
    assert.equal(actual.offers[0].affiliate_href, null);
  }
});

test("writes generated snapshots with owner-only permissions", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "krepitv-affiliate-"));
  const file = path.join(directory, "snapshot.json");
  const snapshot = await readJson(path.join(fixtures, "snapshot.valid.json"));

  await writeFile(file, "{}\n", { mode: 0o644 });
  await writeJson(file, snapshot);
  assert.deepEqual(JSON.parse(await readFile(file, "utf8")), snapshot);
  assert.equal((await stat(file)).mode & 0o777, 0o600);
});

test("CLI refuses to write a snapshot outside .private", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "krepitv-affiliate-cli-"));
  const result = spawnSync(
    process.execPath,
    [
      path.join(root, "scripts/affiliate/build-snapshot.mjs"),
      "--source",
      path.join(fixtures, "source.valid.json"),
      "--batch",
      path.join(fixtures, "batch.valid.json"),
      "--out",
      path.join(directory, "must-not-write.json"),
      "--allow-example-hosts",
    ],
    { encoding: "utf8" },
  );

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /only under \.private/);
});
