import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { getFreshHubAffiliateOffers } from "../src/lib/hubAffiliateOffers.mjs";
import {
  getCatalogItems,
  selectSeoHubAffiliateOffers,
} from "../src/lib/seoCatalogItems.mjs";

const now = Date.parse("2026-07-31T02:00:00Z");

function offer(entityId, { vid = `hub${entityId.replaceAll("-", "")}`, ...overrides } = {}) {
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const clid = "12345678";
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: `market-${entityId}-${vid}`.toLowerCase(),
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

function placement({
  hubId = "buy-tv-mount",
  hubPath = "/kupit-kronshteyn-dlya-televizora/",
  rank = 1,
  entityId = "itech-plb440nt",
  placementId = `seo-hub-${hubId}-r0${rank}-${entityId}`,
  vid = `hub${hubId.replaceAll("-", "")}r0${rank}${entityId.replaceAll("-", "")}`,
  offerOverrides,
} = {}) {
  return {
    placement_id: placementId,
    hub_id: hubId,
    hub_path: hubPath,
    rank,
    offer: offer(entityId, { vid, id: placementId, ...offerOverrides }),
  };
}

function snapshot(placements) {
  return {
    schema_version: 1,
    generated_at: "2026-07-31T01:45:00Z",
    placements,
  };
}

test("parser возвращает отдельные свежие placement-офферы без смешивания метаданных", () => {
  const placements = [
    placement({ rank: 2, entityId: "itech-ptrb440ln" }),
    placement({ rank: 1, entityId: "itech-plb440nt" }),
  ];
  const parsed = getFreshHubAffiliateOffers(snapshot(placements), { now });

  assert.equal(parsed.length, 2);
  assert.deepEqual(
    parsed.map(({ placement_id, hub_id, hub_path, rank, entity_id }) => ({
      placement_id,
      hub_id,
      hub_path,
      rank,
      entity_id,
    })),
    placements.map((item) => ({
      placement_id: item.placement_id,
      hub_id: item.hub_id,
      hub_path: item.hub_path,
      rank: item.rank,
      entity_id: item.offer.entity_id,
    })),
  );
});

test("parser fail-closed отклоняет просрочку, неверные метаданные и коллизии", () => {
  const base = snapshot([
    placement({ rank: 1, entityId: "itech-plb440nt" }),
    placement({ rank: 2, entityId: "itech-ptrb440ln" }),
  ]);
  const cases = [];

  cases.push({ ...base, generated_at: "2026-07-28T00:00:00Z" });
  cases.push({ ...base, schema_version: 2 });
  cases.push({ ...base, extra: true });

  for (const [field, value] of [
    ["placement_id", "Bad_ID"],
    ["hub_id", "Bad_ID"],
    ["hub_path", "/Bad/"],
    ["rank", 0],
    ["rank", 4],
  ]) {
    const invalid = structuredClone(base);
    invalid.placements[0][field] = value;
    cases.push(invalid);
  }

  const duplicatePlacement = structuredClone(base);
  duplicatePlacement.placements[1].placement_id = duplicatePlacement.placements[0].placement_id;
  cases.push(duplicatePlacement);

  const mismatchedPlacementId = structuredClone(base);
  mismatchedPlacementId.placements[0].offer.id = "another-placement-id";
  cases.push(mismatchedPlacementId);

  const duplicateRank = structuredClone(base);
  duplicateRank.placements[1].rank = duplicateRank.placements[0].rank;
  cases.push(duplicateRank);

  const duplicateVid = structuredClone(base);
  duplicateVid.placements[1].offer.vid = duplicateVid.placements[0].offer.vid;
  const duplicateVidHref = new URL(duplicateVid.placements[1].offer.affiliate_href);
  duplicateVidHref.searchParams.set("vid", duplicateVid.placements[0].offer.vid);
  duplicateVid.placements[1].offer.affiliate_href = duplicateVidHref.toString();
  cases.push(duplicateVid);

  const wrongCanonicalPath = structuredClone(base);
  wrongCanonicalPath.placements[0].offer.page_path = "/kronshteyny/drugaya-model/";
  cases.push(wrongCanonicalPath);

  const invalidInnerOffer = structuredClone(base);
  invalidInnerOffer.placements[0].offer.affiliate_href = "https://example.invalid/redirect";
  cases.push(invalidInnerOffer);

  for (const invalid of cases) {
    assert.deepEqual(getFreshHubAffiliateOffers(invalid, { now }), []);
  }
});

test("селектор использует exact hub id/path, фактический каталог и rank", () => {
  const page = {
    id: "buy-tv-mount",
    path: "/kupit-kronshteyn-dlya-televizora/",
    indexable: true,
  };
  const parsed = getFreshHubAffiliateOffers(snapshot([
    placement({ rank: 3, entityId: "itech-slt-460" }),
    placement({ rank: 1, entityId: "itech-plb440nt" }),
    placement({ rank: 2, entityId: "itech-ptrb440ln" }),
    placement({
      hubId: "mount-brand-onkron",
      hubPath: "/kronshteyny-onkron/",
      rank: 1,
      entityId: "onkron-tm6",
    }),
  ]), { now });
  const catalogItems = {
    type: "mounts",
    values: ["itech-plb440nt", "itech-ptrb440ln"].map((id) => ({ id })),
  };

  assert.deepEqual(
    selectSeoHubAffiliateOffers(page, catalogItems, parsed, { now })
      .map((item) => item.entity_id),
    ["itech-plb440nt", "itech-ptrb440ln"],
  );
  assert.deepEqual(
    selectSeoHubAffiliateOffers(
      { ...page, path: "/drugoy-hab/" },
      catalogItems,
      parsed,
      { now },
    ),
    [],
  );
  assert.deepEqual(
    selectSeoHubAffiliateOffers(
      { ...page, indexable: false },
      catalogItems,
      parsed,
      { now },
    ),
    [],
  );
  assert.deepEqual(
    selectSeoHubAffiliateOffers(page, { type: "models", values: [] }, parsed, { now }),
    [],
  );
});

test("manifest задаёт 16 уникальных placement-ссылок и порядок шести хабов", async () => {
  const [manifest, pages, mounts, models, publicSnapshot] = await Promise.all([
    readFile(new URL("../../data/affiliate/seo-hub-placements.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/seo_pages.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/mounts.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/tv_models.json", import.meta.url), "utf8").then(JSON.parse),
    readFile(new URL("../../data/affiliate/public-offers.json", import.meta.url), "utf8").then(JSON.parse),
  ]);
  const publicById = new Map(publicSnapshot.offers.map((item) => [item.id, item]));
  const placements = manifest.hubs.flatMap((hub) => hub.placements.map((item) => {
    const baseOffer = publicById.get(item.source_card_id);
    assert.ok(baseOffer, `Нет исходного оффера ${item.source_card_id}`);
    assert.equal(baseOffer.entity_id, item.entity_id);
    assert.equal(baseOffer.clid, manifest.clid);
    const href = new URL(baseOffer.affiliate_href);
    href.searchParams.set("vid", item.vid);
    return {
      placement_id: item.placement_id,
      hub_id: hub.hub_id,
      hub_path: hub.hub_path,
      rank: item.rank,
      offer: {
        ...baseOffer,
        id: item.placement_id,
        vid: item.vid,
        affiliate_href: href.toString(),
      },
    };
  }));
  const vids = placements.map((item) => item.offer.vid);
  const placementIds = placements.map((item) => item.placement_id);

  assert.equal(placements.length, manifest.expected_offer_count);
  assert.equal(placements.length, 16);
  assert.equal(new Set(vids).size, 16);
  assert.equal(new Set(placementIds).size, 16);
  assert.ok(vids.every((vid) => /^[A-Za-z0-9]{1,150}$/.test(vid)));
  assert.ok(Math.max(...vids.map((vid) => vid.length)) <= 40);

  const snapshotNow = Date.parse(publicSnapshot.generated_at) + 60_000;
  const parsed = getFreshHubAffiliateOffers({
    schema_version: 1,
    generated_at: publicSnapshot.generated_at,
    placements,
  }, { now: snapshotNow });
  assert.equal(parsed.length, 16);

  const catalog = { models, mounts };
  for (const hub of manifest.hubs) {
    assert.equal(hub.placements.length, hub.expected_offer_count);
    const page = pages.find((item) => item.id === hub.hub_id);
    assert.ok(page, `Нет SEO-хаба ${hub.hub_id}`);
    assert.equal(page.path, hub.hub_path);
    const selected = selectSeoHubAffiliateOffers(
      page,
      getCatalogItems(page, catalog),
      parsed,
      { now: snapshotNow },
    );
    assert.deepEqual(
      selected.map((item) => item.entity_id),
      hub.placements.map((item) => item.entity_id),
    );
    assert.deepEqual(
      selected.map((item) => item.rank),
      hub.placements.map((item) => item.rank),
    );
  }
});
