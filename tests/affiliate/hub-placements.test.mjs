import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { buildMarketAffiliateRequestUrl } from "../../scripts/affiliate/lib.mjs";
import {
  buildHubPrivateSnapshot,
  buildHubPublicSnapshot,
  expandHubPlacementCards,
  HubPlacementValidationError,
  validateHubPlacementManifest,
  validateHubPrivateSnapshot,
  validateHubPublicSnapshot,
} from "../../scripts/affiliate/hub-placements.mjs";

const source = JSON.parse(
  await readFile(new URL("../fixtures/affiliate/source.valid.json", import.meta.url), "utf8"),
);
const seoPages = [
  { id: "fixture-hub", path: "/fixture-hub/", indexable: true },
];

function manifest() {
  return {
    schema_version: 1,
    clid: "12345678",
    expected_offer_count: 2,
    hubs: [
      {
        hub_id: "fixture-hub",
        hub_path: "/fixture-hub/",
        expected_offer_count: 2,
        placements: [
          {
            placement_id: "hub-fixture-r1-fixed",
            rank: 1,
            entity_id: "mount-fixed-01",
            source_card_id: "mount-fixed-01",
            vid: "krepitvHubFixtureR1Fixed",
          },
          {
            placement_id: "hub-fixture-r2-tilt",
            rank: 2,
            entity_id: "mount-tilt-02",
            source_card_id: "mount-tilt-02",
            vid: "krepitvHubFixtureR2Tilt",
          },
        ],
      },
    ],
  };
}

function okCheck(card) {
  const sourceUrl = new URL(card.market_source_url);
  const destination = new URL(
    `${sourceUrl.pathname}?clid=${card.clid}`,
    "https://affiliate.example.invalid",
  );
  destination.searchParams.set("vid", card.vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", card.clid);
  if (card.compliance_mode === "advertising") {
    destination.searchParams.set("erid", card.creative.erid);
  }
  const title = card.entity_id === "mount-fixed-01"
    ? "Кронштейн Fixture Fixed"
    : "Кронштейн Fixture Tilt";
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
    status: "ok",
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title,
    product_photo: `https://images.example.invalid/${card.id}.jpg`,
    promise: 100,
    price: 2500,
    stock: 5,
    checked_at: "2026-07-31T08:59:00Z",
    error_code: null,
  };
}

function unavailableCheck(card) {
  return {
    id: card.id,
    market_source_url: card.market_source_url,
    compliance_mode: card.compliance_mode,
    clid: card.clid,
    vid: card.vid,
    status: "unavailable",
    affiliate_href: null,
    page_name: null,
    title: null,
    product_photo: null,
    promise: null,
    price: null,
    stock: null,
    checked_at: "2026-07-31T08:59:00Z",
    error_code: "not_in_stock",
  };
}

function expanded(config = manifest()) {
  return expandHubPlacementCards(config, {
    source,
    seoPages,
    allowExampleHosts: true,
  });
}

function batch(checks) {
  return {
    schema_version: 2,
    generated_at: "2026-07-31T09:00:00Z",
    checks,
  };
}

test("manifest creates exact one-card API requests with placement-specific VID", () => {
  const config = manifest();
  assert.equal(
    validateHubPlacementManifest(config, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    config,
  );
  const placements = expanded(config);
  assert.equal(placements.length, 2);
  assert.equal(placements[0].card.id, config.hubs[0].placements[0].placement_id);
  assert.equal(placements[0].card.vid, config.hubs[0].placements[0].vid);
  assert.equal(placements[0].card.market_source_url, source.cards[0].market_source_url);
  assert.equal(source.cards[0].id, "mount-fixed-01", "source must not be mutated");

  const request = buildMarketAffiliateRequestUrl(placements[0].card);
  assert.equal(
    request.origin + request.pathname,
    "https://api.content.market.yandex.ru/v3/affiliate/partner/link/create",
  );
  assert.equal(request.searchParams.get("url"), source.cards[0].market_source_url);
  assert.equal(request.searchParams.get("clid"), config.clid);
  assert.equal(request.searchParams.get("vid"), "krepitvHubFixtureR1Fixed");
  assert.equal(request.searchParams.get("erid"), source.cards[0].creative.erid);
});

test("private snapshot keeps every decision and public snapshot removes private numbers", () => {
  const config = manifest();
  const placements = expanded(config);
  const privateSnapshot = buildHubPrivateSnapshot({
    manifest: config,
    source,
    seoPages,
    batch: batch(placements.map(({ card }) => okCheck(card))),
    allowExampleHosts: true,
  });
  assert.equal(privateSnapshot.placements.length, 2);
  assert.equal(privateSnapshot.placements[0].offer.promise, 100);
  validateHubPrivateSnapshot(privateSnapshot, {
    manifest: config,
    source,
    allowExampleHosts: true,
  });

  const publicSnapshot = buildHubPublicSnapshot(privateSnapshot, {
    manifest: config,
    source,
    allowExampleHosts: true,
  });
  assert.equal(publicSnapshot.placements.length, 2);
  for (const placement of publicSnapshot.placements) {
    assert.equal(placement.offer.publishable, true);
    assert.equal("promise" in placement.offer, false);
    assert.equal("price" in placement.offer, false);
    assert.equal("stock" in placement.offer, false);
    assert.equal(
      new URL(placement.offer.affiliate_href).searchParams.get("vid"),
      placement.offer.vid,
    );
  }
  validateHubPublicSnapshot(publicSnapshot, {
    manifest: config,
    source,
    allowExampleHosts: true,
  });
});

test("unavailable placement remains a private decision and disappears from public subset", () => {
  const config = manifest();
  const placements = expanded(config);
  const privateSnapshot = buildHubPrivateSnapshot({
    manifest: config,
    source,
    seoPages,
    batch: batch([
      okCheck(placements[0].card),
      unavailableCheck(placements[1].card),
    ]),
    allowExampleHosts: true,
  });
  assert.equal(privateSnapshot.placements.length, 2);
  assert.equal(privateSnapshot.placements[1].offer.publishable, false);
  assert.equal(privateSnapshot.placements[1].offer.affiliate_href, null);

  const publicSnapshot = buildHubPublicSnapshot(privateSnapshot, {
    manifest: config,
    source,
    allowExampleHosts: true,
  });
  assert.deepEqual(
    publicSnapshot.placements.map((entry) => entry.placement_id),
    ["hub-fixture-r1-fixed"],
  );
});

test("one-card core builder rejects a placement link bound to another VID", () => {
  const config = manifest();
  const placements = expanded(config);
  const checks = placements.map(({ card }) => okCheck(card));
  const wrong = new URL(checks[0].affiliate_href);
  wrong.searchParams.set("vid", "WrongPlacementVid");
  checks[0].affiliate_href = wrong.toString();

  assert.throws(
    () => buildHubPrivateSnapshot({
      manifest: config,
      source,
      seoPages,
      batch: batch(checks),
      allowExampleHosts: true,
    }),
    /VID query must match/,
  );
});

test("snapshot publication rejects tampered CLID and source-card binding", () => {
  const config = manifest();
  const placements = expanded(config);
  const privateSnapshot = buildHubPrivateSnapshot({
    manifest: config,
    source,
    seoPages,
    batch: batch(placements.map(({ card }) => okCheck(card))),
    allowExampleHosts: true,
  });

  const wrongClid = structuredClone(privateSnapshot);
  wrongClid.placements[0].offer.clid = "87654321";
  assert.throws(
    () => buildHubPublicSnapshot(wrongClid, {
      manifest: config,
      source,
      allowExampleHosts: true,
    }),
    /must match manifest CLID/,
  );

  const wrongSource = structuredClone(privateSnapshot);
  wrongSource.placements[0].offer.market_source_url = source.cards[1].market_source_url;
  assert.throws(
    () => buildHubPublicSnapshot(wrongSource, {
      manifest: config,
      source,
      allowExampleHosts: true,
    }),
    /market_source_url.*must match the source card/,
  );
});

test("manifest rejects duplicate or base-colliding VID", () => {
  const duplicate = manifest();
  duplicate.hubs[0].placements[1].vid = duplicate.hubs[0].placements[0].vid;
  assert.throws(
    () => validateHubPlacementManifest(duplicate, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    (error) => error instanceof HubPlacementValidationError && /duplicate.*VID/i.test(error.message),
  );

  const baseCollision = manifest();
  baseCollision.hubs[0].placements[0].vid = source.cards[0].vid;
  assert.throws(
    () => validateHubPlacementManifest(baseCollision, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /base-colliding VID/,
  );
});

test("manifest rejects duplicate and non-contiguous ranks", () => {
  const duplicate = manifest();
  duplicate.hubs[0].placements[1].rank = 1;
  assert.throws(
    () => validateHubPlacementManifest(duplicate, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /duplicate rank|missing 2/,
  );

  const gap = manifest();
  gap.hubs[0].placements[1].rank = 3;
  assert.throws(
    () => validateHubPlacementManifest(gap, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /missing 2/,
  );
});

test("manifest rejects an unknown, non-indexable or path-mismatched SEO page", () => {
  const unknown = manifest();
  unknown.hubs[0].hub_id = "unknown-hub";
  assert.throws(
    () => validateHubPlacementManifest(unknown, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /does not reference an SEO page/,
  );

  assert.throws(
    () => validateHubPlacementManifest(manifest(), {
      source,
      seoPages: [{ ...seoPages[0], indexable: false }],
      allowExampleHosts: true,
    }),
    /must be indexable/,
  );

  const wrongPath = manifest();
  wrongPath.hubs[0].hub_path = "/another-hub/";
  assert.throws(
    () => validateHubPlacementManifest(wrongPath, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /must match the SEO page path/,
  );
});

test("manifest binds source card entity and CLID and enforces expected counts", () => {
  const wrongEntity = manifest();
  wrongEntity.hubs[0].placements[0].entity_id = "mount-tilt-02";
  assert.throws(
    () => validateHubPlacementManifest(wrongEntity, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /must match the source card entity/,
  );

  const wrongClid = manifest();
  wrongClid.clid = "87654321";
  assert.throws(
    () => validateHubPlacementManifest(wrongClid, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /source card CLID must match/,
  );

  const wrongCount = manifest();
  wrongCount.expected_offer_count = 3;
  assert.throws(
    () => validateHubPlacementManifest(wrongCount, {
      source,
      seoPages,
      allowExampleHosts: true,
    }),
    /must equal the number of placements|sum of hub expected counts/,
  );
});

test("manifest rejects a mount outside the SEO hub brand or mechanism", () => {
  const config = manifest();
  config.hubs[0].hub_id = "mount-brand-kromax";
  config.hubs[0].hub_path = "/kronshteyny-kromax/";
  const semanticPages = [{
    id: "mount-brand-kromax",
    path: "/kronshteyny-kromax/",
    indexable: true,
    kind: "mount-brand",
  }];
  const mounts = source.cards.map((card) => ({
    id: card.entity_id,
    brand: "ONKRON",
    mechanism: "fixed",
  }));

  assert.throws(
    () => validateHubPlacementManifest(config, {
      source,
      seoPages: semanticPages,
      catalogMounts: mounts,
      allowExampleHosts: true,
    }),
    /does not belong to the configured SEO hub/,
  );

  const mechanismConfig = manifest();
  mechanismConfig.hubs[0].hub_id = "extendable-mount";
  mechanismConfig.hubs[0].hub_path = "/tipy-kronshteynov/vydvizhnoy/";
  assert.throws(
    () => validateHubPlacementManifest(mechanismConfig, {
      source,
      seoPages: [{
        id: "extendable-mount",
        path: "/tipy-kronshteynov/vydvizhnoy/",
        indexable: true,
        kind: "mechanism",
      }],
      catalogMounts: mounts,
      allowExampleHosts: true,
    }),
    /does not belong to the configured SEO hub/,
  );
});
