import assert from "node:assert/strict";
import test from "node:test";
import {
  loadFreshHubAffiliateOffers,
} from "../src/lib/catalog.js";

const now = Date.parse("2026-07-31T02:00:00Z");

function standardOffer({
  id,
  entityId,
  vid,
  checkedAt = "2026-07-31T01:30:00Z",
}) {
  const clid = "12345678";
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const href = new URL(`https://market.yandex.ru${pathname}`);
  href.searchParams.set("clid", clid);
  href.searchParams.set("vid", vid);
  href.searchParams.set("distr_type", "7");
  href.searchParams.set("utm_source", "partner_network");
  href.searchParams.set("utm_campaign", clid);
  return {
    id,
    market_source_url: `https://market.yandex.ru${pathname}`,
    page_path: `/kronshteyny/${entityId}/`,
    entity_kind: "mount",
    entity_id: entityId,
    compliance_mode: "non_ad_storefront",
    clid,
    vid,
    affiliate_href: href.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: `Кронштейн ${entityId}`,
    product_photo: "https://avatars.mds.yandex.net/get-mpic/1/example.jpeg/optimize",
    checked_at: checkedAt,
    eligibility: "publishable",
    publishable: true,
    creative: null,
  };
}

function hubSnapshot() {
  return {
    schema_version: 1,
    generated_at: "2026-07-31T01:45:00Z",
    placements: [{
      placement_id: "seo-hub-buy-tv-mount-r01-itech-plb440nt",
      hub_id: "buy-tv-mount",
      hub_path: "/kupit-kronshteyn-dlya-televizora/",
      rank: 1,
      offer: standardOffer({
        id: "seo-hub-buy-tv-mount-r01-itech-plb440nt",
        entityId: "itech-plb440nt",
        vid: "krepitvseohubbuyr01itechplb440nt",
      }),
    }],
  };
}

function productSnapshot() {
  return {
    schema_version: 2,
    generated_at: "2026-07-31T01:45:00Z",
    offers: [standardOffer({
      id: "market-onkron-tm6",
      entityId: "onkron-tm6",
      vid: "krepitvOnkronTM6",
    })],
  };
}

function response(url, payload) {
  return {
    ok: true,
    url,
    async json() {
      return structuredClone(payload);
    },
  };
}

test("hub loader принимает только свежий same-origin snapshot", async () => {
  const loaded = await loadFreshHubAffiliateOffers({
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://krepitv.ru/data/affiliate-hub-offers.json");
      assert.deepEqual(options, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
      });
      return response(url, hubSnapshot());
    },
    now,
    origin: "https://krepitv.ru",
  });
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].hub_id, "buy-tv-mount");

  const redirected = await loadFreshHubAffiliateOffers({
    fetchImpl: async () => response(
      "https://example.invalid/data/affiliate-hub-offers.json",
      hubSnapshot(),
    ),
    now,
    origin: "https://krepitv.ru",
  });
  assert.deepEqual(redirected, []);
});

test("catalog загружает product и hub affiliate snapshots в разные поля", async () => {
  const originalFetch = globalThis.fetch;
  const originalLocation = Object.getOwnPropertyDescriptor(globalThis, "location");
  const originalDateNow = Date.now;
  const core = new Map([
    ["/data/tv-models.json", []],
    ["/data/market-tv-models.json", {
      schema_version: 1,
      records: Array.from({ length: 133 }, (_, index) => ({ id: `market-${index}` })),
    }],
    ["/data/mounts.json", []],
    ["/data/model-search.json", []],
    ["/data/seo-pages.json", []],
    ["/data/compatibility-graph.json", []],
    ["/data/commercial-profiles.json", {
      schema_version: 1,
      updated_at: "2026-07-31",
      profiles: [],
    }],
  ]);
  const requested = [];

  Object.defineProperty(globalThis, "location", {
    configurable: true,
    value: { origin: "https://krepitv.ru", pathname: "/" },
  });
  Date.now = () => now;
  globalThis.fetch = async (input) => {
    const url = String(input);
    requested.push(url);
    if (core.has(url)) return response(url, core.get(url));
    if (url === "https://krepitv.ru/data/affiliate-offers.json") {
      return response(url, productSnapshot());
    }
    if (url === "https://krepitv.ru/data/affiliate-hub-offers.json") {
      return response(url, hubSnapshot());
    }
    return { ok: false, url };
  };

  try {
    const { loadCatalog } = await import(`../src/lib/catalog.js?hub-loader=${Date.now()}`);
    const catalog = await loadCatalog();

    assert.equal(catalog.affiliateOffers.length, 1);
    assert.equal(catalog.affiliateOffers[0].entity_id, "onkron-tm6");
    assert.equal(catalog.hubAffiliateOffers.length, 1);
    assert.equal(catalog.hubAffiliateOffers[0].entity_id, "itech-plb440nt");
    assert.equal(catalog.hubAffiliateOffers[0].hub_id, "buy-tv-mount");
    assert.deepEqual(catalog.modelAffiliateOffers, []);
    assert.ok(requested.includes("https://krepitv.ru/data/affiliate-offers.json"));
    assert.ok(requested.includes("https://krepitv.ru/data/affiliate-hub-offers.json"));
    assert.ok(!requested.includes("https://krepitv.ru/data/affiliate-model-offers.json"));
  } finally {
    Date.now = originalDateNow;
    globalThis.fetch = originalFetch;
    if (originalLocation) {
      Object.defineProperty(globalThis, "location", originalLocation);
    } else {
      delete globalThis.location;
    }
  }
});
