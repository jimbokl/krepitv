import assert from "node:assert/strict";
import test from "node:test";
import {
  getFreshModelAffiliateOffers,
  selectModelAffiliateOffers,
} from "../src/lib/modelAffiliateOffers.mjs";
import {
  loadFreshModelAffiliateOffers,
  modelIdFromPath,
  modelOfferShardKey,
} from "../src/lib/catalog.js";

const now = Date.parse("2026-07-31T04:00:00Z");

function offer({
  modelId = "tcl-55c6k",
  rank = 1,
  entityId = "onkron-tm6",
  placementId = `model-${modelId}-r0${rank}-${entityId}`,
  vid = `krepitvmodel${modelId.replaceAll("-", "")}r0${rank}${entityId.replaceAll("-", "")}`,
} = {}) {
  const clid = "12345678";
  const pathname = `/card/kronshteyn-${entityId}/123`;
  const destination = new URL(`https://market.yandex.ru${pathname}`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", vid);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    placement_id: placementId,
    model_id: modelId,
    model_path: `/modeli/${modelId}/`,
    rank,
    offer: {
      id: placementId,
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
      checked_at: "2026-07-31T03:30:00Z",
      eligibility: "publishable",
      publishable: true,
      creative: null,
    },
  };
}

function snapshot(placements) {
  return {
    schema_version: 1,
    generated_at: "2026-07-31T03:45:00Z",
    placements,
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

test("model parser возвращает только placements запрошенной модели", () => {
  const parsed = getFreshModelAffiliateOffers(snapshot([
    offer({ rank: 2, entityId: "itech-slt-460" }),
    offer({ rank: 1, entityId: "onkron-tm6" }),
    offer({ modelId: "hisense-55u7s", entityId: "kromax-atlantis-45" }),
  ]), { modelId: "tcl-55c6k", now });

  assert.equal(parsed.length, 2);
  assert.ok(parsed.every((item) => item.model_id === "tcl-55c6k"));
  assert.deepEqual(parsed.map((item) => item.rank), [2, 1]);
  assert.ok(parsed.every((item) => item.id === item.placement_id));
});

test("model parser fail-closed отклоняет коллизии и неверную привязку", () => {
  const valid = snapshot([
    offer({ rank: 1, entityId: "onkron-tm6" }),
    offer({ rank: 2, entityId: "itech-slt-460" }),
  ]);
  const cases = [];

  const duplicateRank = structuredClone(valid);
  duplicateRank.placements[1].rank = 1;
  cases.push(duplicateRank);

  const wrongPath = structuredClone(valid);
  wrongPath.placements[0].model_path = "/modeli/drugaya-model/";
  cases.push(wrongPath);

  const wrongOfferId = structuredClone(valid);
  wrongOfferId.placements[0].offer.id = "another-placement";
  cases.push(wrongOfferId);

  const duplicateVid = structuredClone(valid);
  duplicateVid.placements[1].offer.vid = duplicateVid.placements[0].offer.vid;
  const destination = new URL(duplicateVid.placements[1].offer.affiliate_href);
  destination.searchParams.set("vid", duplicateVid.placements[0].offer.vid);
  duplicateVid.placements[1].offer.affiliate_href = destination.toString();
  cases.push(duplicateVid);

  cases.push({ ...valid, generated_at: "2026-07-28T00:00:00Z" });

  for (const invalid of cases) {
    assert.deepEqual(getFreshModelAffiliateOffers(invalid, { now }), []);
  }
});

test("model selector связывает rank с фактически совместимым кронштейном", () => {
  const model = { id: "tcl-55c6k" };
  const matches = [
    { compatible: true, mount: { id: "onkron-tm6" } },
    { compatible: true, mount: { id: "itech-slt-460" } },
  ];
  const parsed = getFreshModelAffiliateOffers(snapshot([
    offer({ rank: 2, entityId: "itech-slt-460" }),
    offer({ rank: 1, entityId: "onkron-tm6" }),
    offer({ rank: 3, entityId: "kromax-atlantis-45" }),
  ]), { now });

  const selected = selectModelAffiliateOffers(model, matches, parsed, { now });
  assert.deepEqual(selected.map((item) => item.mount.id), ["onkron-tm6", "itech-slt-460"]);
  assert.deepEqual(selected.map((item) => item.offer.rank), [1, 2]);
});

test("model snapshot загружается только same-origin и фильтруется по модели", async () => {
  const payload = snapshot([
    offer({ modelId: "tcl-55c6k" }),
    offer({ modelId: "hisense-55u7s", entityId: "kromax-atlantis-45" }),
  ]);
  const loaded = await loadFreshModelAffiliateOffers({
    fetchImpl: async (url, options) => {
      assert.equal(url, "https://krepitv.ru/data/affiliate-model-offers/tcl.json");
      assert.deepEqual(options, {
        cache: "no-store",
        credentials: "same-origin",
        redirect: "error",
      });
      return response(url, payload);
    },
    modelId: "tcl-55c6k",
    now,
    origin: "https://krepitv.ru",
  });
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].model_id, "tcl-55c6k");

  const redirected = await loadFreshModelAffiliateOffers({
    fetchImpl: async () => response(
      "https://example.invalid/data/affiliate-model-offers/tcl.json",
      payload,
    ),
    modelId: "tcl-55c6k",
    now,
    origin: "https://krepitv.ru",
  });
  assert.deepEqual(redirected, []);
});

test("model snapshot выбирает безопасный брендовый шард до сетевого запроса", async () => {
  assert.equal(modelOfferShardKey("tcl-65c7k"), "tcl");
  assert.equal(modelOfferShardKey("lg-oled65c5rla"), "lg");
  assert.equal(modelOfferShardKey("../tcl-65c7k"), null);
  assert.equal(modelOfferShardKey("TCL-65C7K"), null);

  let requests = 0;
  const loaded = await loadFreshModelAffiliateOffers({
    fetchImpl: async () => {
      requests += 1;
      throw new Error("Небезопасный modelId не должен доходить до fetch");
    },
    modelId: "../tcl-65c7k",
    now,
    origin: "https://krepitv.ru",
  });
  assert.deepEqual(loaded, []);
  assert.equal(requests, 0);
});

test("model route parser допускает только каноническую карточку", () => {
  assert.equal(modelIdFromPath("/modeli/TCL-55C6K/"), "tcl-55c6k");
  assert.equal(modelIdFromPath("/modeli/tcl-55c6k"), "tcl-55c6k");
  assert.equal(modelIdFromPath("/modeli/"), null);
  assert.equal(modelIdFromPath("/modeli/tcl-55c6k/extra/"), null);
});
