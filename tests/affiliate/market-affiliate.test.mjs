import assert from "node:assert/strict";
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  AffiliateValidationError,
  buildSnapshot,
  marketTitleMatchesExpected,
  readJson,
  validateBatch,
  validateSnapshot,
  validateSource,
  validateSourceAgainstMounts,
  writeJson,
} from "../../scripts/affiliate/lib.mjs";
import {
  AFFILIATE_LINK_REL,
  MAX_AFFILIATE_AGE_MS,
  getAffiliatePresentation,
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

test("validates example.invalid source, batch and snapshot fixtures", async () => {
  const [source, batch, snapshot] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  assert.equal(validateSource(source, fixtureOptions), source);
  assert.equal(validateBatch(batch, fixtureOptions), batch);
  assert.equal(validateSnapshot(snapshot, fixtureOptions), snapshot);
});

test("builds the expected snapshot and strips an unmarked href", async () => {
  const [source, batch, expected] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);

  const actual = buildSnapshot(source, batch, fixtureOptions);
  assert.deepEqual(actual, expected);
  assert.equal(actual.offers[1].publishable, false);
  assert.equal(actual.offers[1].affiliate_href, null);
});

test("updates healthy cards while retaining only fresh matching offers on API error", async () => {
  const [source, batch, previous] = await Promise.all([
    readJson(path.join(fixtures, "source.valid.json")),
    readJson(path.join(fixtures, "batch.valid.json")),
    readJson(path.join(fixtures, "snapshot.valid.json")),
  ]);
  batch.generated_at = "2026-07-30T20:00:00Z";
  batch.checks[0] = {
    id: source.cards[0].id,
    market_source_url: source.cards[0].market_source_url,
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
    previousSnapshot: previous,
  });
  assert.deepEqual(actual.offers[0], previous.offers[0]);
  assert.equal(actual.offers[1].promise, 95);
  assert.equal(actual.generated_at, batch.generated_at);

  batch.generated_at = "2026-08-02T20:00:00Z";
  const stale = buildSnapshot(source, batch, {
    ...fixtureOptions,
    previousSnapshot: previous,
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
    "https://affiliate.example.invalid/offer/mount-fixed-01?erid=wrongFixture999";

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
  const offer = {
    publishable: true,
    eligibility: "publishable",
    affiliate_href:
      "https://market.yandex.ru/card/kronshteyn/123?erid=eridFixture123",
    page_path: "/kronshteyny/test/",
    entity_kind: "mount",
    entity_id: "test",
    page_name: "POKUPKI_PRODUCT",
    title: "Кронштейн Test",
    product_photo: "https://avatars.mds.yandex.net/get-mpic/test/300x300",
    checked_at: "2026-07-30T09:00:00Z",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
  };

  const presentation = getAffiliatePresentation(offer, { now });
  assert.equal(
    presentation.href,
    "https://market.yandex.ru/card/kronshteyn/123?erid=eridFixture123",
  );
  assert.equal(presentation.rel, AFFILIATE_LINK_REL);
  assert.equal(presentation.label, "Реклама");
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

  assert.deepEqual(affiliateClickDetail(offer), {
    entityId: "onkron-tm5-bw",
    offerId: "market-onkron-tm5-bw",
    pagePath: "/kronshteyny/onkron-tm5-bw/",
    vid: "krepitv-mount",
  });
  assert.equal(emitAffiliateClick(windowObject, offer), true);
  assert.equal(dispatched.length, 1);
  assert.equal(dispatched[0].type, AFFILIATE_CLICK_EVENT);
  assert.deepEqual(dispatched[0].detail, affiliateClickDetail(offer));
  assert.equal("affiliate_href" in dispatched[0].detail, false);
});

test("affiliate-click emitter fails closed without a browser event API", () => {
  assert.equal(emitAffiliateClick(null, {}), false);
  assert.equal(emitAffiliateClick({}, {}), false);
});

test("hides stale offers and falls back to a fresh offer for the same page", () => {
  const now = Date.parse("2026-07-30T12:00:00Z");
  const base = {
    publishable: true,
    eligibility: "publishable",
    page_path: "/kronshteyny/test/",
    entity_kind: "mount",
    entity_id: "test",
    page_name: "POKUPKI_PRODUCT",
    title: "Кронштейн Test",
    product_photo: "https://avatars.mds.yandex.net/get-mpic/test/300x300",
    affiliate_href:
      "https://market.yandex.ru/card/kronshteyn/123?erid=eridFixture123",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
  };
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

test("refuses same-site, redirect and unmarked affiliate destinations", () => {
  const base = {
    publishable: true,
    eligibility: "publishable",
    page_path: "/kronshteyny/test/",
    entity_kind: "mount",
    entity_id: "test",
    page_name: "POKUPKI_PRODUCT",
    title: "Кронштейн Test",
    product_photo: "https://avatars.mds.yandex.net/get-mpic/test/300x300",
    checked_at: "2026-07-30T09:00:00Z",
    creative: {
      erid: "eridFixture123",
      disclosure: {
        label: "Реклама",
        advertiser_name: "ООО «Яндекс Маркет»",
        advertiser_inn: "9704254424",
      },
    },
  };

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
