import test from "node:test";
import assert from "node:assert/strict";
import {
  deduplicateMarketProducts,
  inferModelCandidate,
  matchCatalogModel,
  parseMarketCategoryPage,
  parsePurchaseCount,
} from "../../scripts/research/yandex-market-tv-lib.mjs";

function fixtureHtml() {
  const collections = {
    visibleSearchResult: { result: { page: 1, pageCount: 30, itemsPerPage: 8, total: 641, hasNextPage: true, sortId: "dpop", searchResultIds: { 1: "search" } } },
    searchResult: { search: { visibleEntityIds: ["visible"] } },
    visibleEntity: { visible: { productShowPlaceId: "place" } },
    productShowPlace: { place: { productId: 123, defaultOfferShowPlaceId: "offer-place", productSnippetId: "snippet", sponsored: false } },
    offerShowPlace: { "offer-place": { offerId: "offer" } },
    product: { 123: { id: 123, slug: "televizor-samsung-ue32h5000fuxru", titles: { raw: "Телевизор Samsung UE32H5000FUXRU" } } },
    offer: { offer: { productId: 123, vendorId: 77, titles: { raw: "Телевизор Samsung UE32H5000FUXRU" } } },
    vendor: { 77: { name: "Samsung" } },
    productSnippet: { snippet: { productPayload: { title: { value: "Телевизор Samsung UE32H5000FUXRU" }, rating: { ratingValue: 4.8, ratingCount: 90, snippet: { descriptionList: ["(90)", "1.7K купили"] } } } } },
  };
  return `<html><noframes data-apiary="patch">${JSON.stringify({ nested: { collections } })}</noframes></html>`;
}

test("purchase count supports plain and compact labels", () => {
  assert.equal(parsePurchaseCount("561 купили"), 561);
  assert.equal(parsePurchaseCount("1.7K купили"), 1700);
  assert.equal(parsePurchaseCount("2,4 тыс. купили"), 2400);
  assert.equal(parsePurchaseCount("нет данных"), null);
});

test("category parser keeps only a canonical untracked card URL", () => {
  const result = parseMarketCategoryPage(fixtureHtml(), 1);
  assert.equal(result.products.length, 1);
  assert.equal(result.products[0].market_url, "https://market.yandex.ru/card/televizor-samsung-ue32h5000fuxru/123");
  assert.equal(result.products[0].purchase_count, 1700);
  assert.equal(result.products[0].model_candidate, "UE32H5000FUXRU");
  assert.ok(!result.products[0].market_url.includes("?"));
});

test("catalog matching is exact-token and brand aware", () => {
  const market = parseMarketCategoryPage(fixtureHtml(), 1).products[0];
  const match = matchCatalogModel(market, [{ id: "samsung-ue32h5000fuxru", brand: "Samsung", model: "UE32H5000FUXRU" }]);
  assert.equal(match.catalog_model_id, "samsung-ue32h5000fuxru");
  assert.equal(matchCatalogModel(market, [{ id: "other", brand: "LG", model: "UE32H5000FUXRU" }]), null);
});

test("model inference handles diagonal before the brand", () => {
  assert.deepEqual(inferModelCandidate("Телевизор 32 дюйма Hisense 32E44SL (2026) Смарт ТВ HD", "Hisense"), {
    value: "32E44SL",
    confidence: "high",
  });
  assert.deepEqual(inferModelCandidate("32” Телевизор Tuvio HD-ready DLED Frameless на платформе YaOS, TD32HFBCH11, черный", "Tuvio"), {
    value: "TD32HFBCH11",
    confidence: "high",
  });
  assert.deepEqual(inferModelCandidate("Телевизор TCL 55\" Q6CS QD-Mini LED 4K HDR Google TV", "TCL"), {
    value: "Q6CS",
    confidence: "high",
  });
  assert.deepEqual(inferModelCandidate("Телевизор HAIER 40 Smart TV D1 Full HD", "Haier"), {
    value: "D1",
    confidence: "medium",
  });
});

test("deduplication keeps the best observed rank", () => {
  const rows = deduplicateMarketProducts([
    { market_product_id: "1", page: 3, page_rank: 2 },
    { market_product_id: "1", page: 1, page_rank: 2 },
    { market_product_id: "2", page: 1, page_rank: 3 },
  ]);
  assert.deepEqual(rows.map((row) => [row.page, row.page_rank]), [[1, 2], [1, 3]]);
});
