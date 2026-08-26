import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import path from "node:path";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import { createServer } from "vite";

function offer(entityId, rank) {
  const modelId = "tcl-55c6k";
  const placementId = `model-${modelId}-r0${rank}-${entityId}`;
  const clid = "12345678";
  const destination = new URL(`https://market.yandex.ru/card/kronshteyn-${entityId}/123`);
  destination.searchParams.set("clid", clid);
  destination.searchParams.set("vid", `krepitv${modelId.replaceAll("-", "")}${rank}${entityId.replaceAll("-", "")}`);
  destination.searchParams.set("distr_type", "7");
  destination.searchParams.set("utm_source", "partner_network");
  destination.searchParams.set("utm_campaign", clid);
  return {
    id: placementId,
    placement_id: placementId,
    model_id: modelId,
    model_path: `/modeli/${modelId}/`,
    rank,
    market_source_url: `https://market.yandex.ru/card/kronshteyn-${entityId}/123`,
    page_path: `/kronshteyny/${entityId}/`,
    entity_kind: "mount",
    entity_id: entityId,
    compliance_mode: "non_ad_storefront",
    clid,
    vid: destination.searchParams.get("vid"),
    affiliate_href: destination.toString(),
    page_name: "POKUPKI_PRODUCT",
    title: `Кронштейн ${entityId}`,
    product_photo: "https://avatars.mds.yandex.net/get-mpic/1/example.jpeg/optimize",
    checked_at: new Date().toISOString(),
    eligibility: "publishable",
    publishable: true,
    creative: null,
  };
}

test("model offer island рендерит только три прямых проверяемых CTA без цены и редиректа", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const vite = await createServer({
    root,
    logLevel: "silent",
    server: { middlewareMode: true },
    appType: "custom",
  });

  try {
    const { ModelOffersIsland } = await vite.ssrLoadModule("/src/components/ModelOffersIsland.jsx");
    const offers = [
      offer("kromax-atlantis-45", 1),
      offer("kromax-dix-18", 2),
      offer("kromax-flat-4", 3),
      offer("onkron-tm6", 4),
    ];
    const html = renderToStaticMarkup(React.createElement(ModelOffersIsland, { offers }));

    assert.equal((html.match(/data-affiliate-compact="true"/g) ?? []).length, 3);
    assert.equal((html.match(/href="https:\/\/market\.yandex\.ru\/card\//g) ?? []).length, 3);
    assert.equal((html.match(/rel="sponsored nofollow noopener noreferrer"/g) ?? []).length, 3);
    assert.equal((html.match(/data-mount-detail-placement="compatibility_result"/g) ?? []).length, 3);
    for (const item of offers.slice(0, 3)) {
      assert.equal(html.includes(`href="${item.page_path}"`), true);
      assert.equal(html.includes(item.title), true);
    }
    assert.equal(html.includes(offers[3].title), false);
    assert.equal(html.includes("/go/"), false);
    assert.equal(/(?:\d[\d\s.,]*\s*(?:₽|руб(?:\.|ля|лей)?))|(?:₽\s*\d)/iu.test(html), false);
  } finally {
    await vite.close();
  }
});
