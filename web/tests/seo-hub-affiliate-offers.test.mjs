import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  getCatalogItems,
  SEO_HUB_OFFER_PRIORITIES,
  selectSeoHubAffiliateOffers,
} from "../src/lib/seoCatalogItems.mjs";

const now = Date.parse("2026-07-31T02:00:00Z");

function offer(entityId, overrides = {}) {
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const clid = "12345678";
  const vid = `hub${entityId.replaceAll("-", "")}`;
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: `market-${entityId}`,
    market_source_url: `https://market.yandex.ru${pathname}`,
    page_path: `/kronshteyny/${entityId}/`,
    entity_kind: "mount",
    entity_id: entityId,
    compliance_mode: "non_ad_storefront",
    clid,
    vid,
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: `Кронштейн ${entityId}`,
    product_photo: "https://avatars.mds.yandex.net/get-mpic/1/example.jpeg/optimize",
    checked_at: "2026-07-31T01:30:00Z",
    eligibility: "publishable",
    publishable: true,
    creative: null,
    ...overrides,
  };
}

test("селектор хаба сохраняет приоритет, точную сущность и лимит три", () => {
  const priorities = SEO_HUB_OFFER_PRIORITIES["buy-tv-mount"];
  const page = { id: "buy-tv-mount", indexable: true };
  const catalogItems = {
    type: "mounts",
    values: [...priorities, "foreign-mount"].map((id) => ({ id })),
  };
  const offers = [
    offer("foreign-mount"),
    offer(priorities[2]),
    offer(priorities[0]),
    offer(priorities[1]),
  ];

  assert.deepEqual(
    selectSeoHubAffiliateOffers(page, catalogItems, offers, { now })
      .map((item) => item.entity_id),
    priorities,
  );
});

test("селектор не пропускает чужой каталог, неверный путь и просроченный оффер", () => {
  const page = { id: "mount-brand-onkron", indexable: true };
  const priorities = SEO_HUB_OFFER_PRIORITIES[page.id];
  const catalogItems = { type: "mounts", values: priorities.map((id) => ({ id })) };
  const stale = offer(priorities[0], { checked_at: "2026-07-28T00:00:00Z" });
  const wrongPath = offer(priorities[1], { page_path: "/kronshteyny/drugaya-model/" });

  assert.deepEqual(
    selectSeoHubAffiliateOffers(page, catalogItems, [stale, wrongPath], { now }),
    [],
  );
  assert.deepEqual(
    selectSeoHubAffiliateOffers(
      page,
      { type: "mounts", values: [{ id: priorities[0] }] },
      [offer(priorities[1])],
      { now },
    ),
    [],
  );
});

test("неподдерживаемые, неиндексируемые и телевизионные хабы не получают офферы", () => {
  const validOffer = offer("onkron-tm6");
  for (const [page, catalogItems] of [
    [{ id: "mount-brand-onkron", indexable: false }, { type: "mounts", values: [{ id: "onkron-tm6" }] }],
    [{ id: "brand-lg", indexable: true }, { type: "models", values: [{ id: "lg-test" }] }],
    [{ id: "unknown", indexable: true }, { type: "mounts", values: [{ id: "onkron-tm6" }] }],
  ]) {
    assert.deepEqual(
      selectSeoHubAffiliateOffers(page, catalogItems, [validOffer], { now }),
      [],
    );
  }
});

test("публичный снимок даёт безопасное упорядоченное подмножество для шести хабов", async () => {
  const [pages, mounts, models, snapshot] = await Promise.all([
    readFile(new URL("../../data/seo_pages.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/mounts.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/tv_models.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/affiliate/public-offers.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const catalog = { models, mounts };
  const snapshotNow = Date.parse(snapshot.generated_at) + 60_000;

  for (const [pageId, expectedIds] of Object.entries(SEO_HUB_OFFER_PRIORITIES)) {
    const page = pages.find((item) => item.id === pageId);
    assert.ok(page, `Нет SEO-хаба ${pageId}`);
    const catalogItems = getCatalogItems(page, catalog);
    const selected = selectSeoHubAffiliateOffers(
      page,
      catalogItems,
      snapshot.offers,
      { now: snapshotNow },
    );
    const selectedIds = selected.map((item) => item.entity_id);
    assert.deepEqual(
      selectedIds,
      expectedIds.filter((entityId) => selectedIds.includes(entityId)),
      `Неверный порядок или чужая модель в витрине ${pageId}`,
    );
    assert.ok(selected.length <= 3);
    const allowed = new Set(catalogItems.values.map((item) => item.id));
    assert.ok(selected.every((item) => allowed.has(item.entity_id)));
  }
});
